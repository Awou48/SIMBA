"""Create tables and load reference data into the database.

Usage (from backend/):
    python seed_db.py            # create tables, seed any empty reference table
    python seed_db.py --reset    # wipe reference tables (foods, akg, growth standards, milestones) first

Seeding is idempotent: a table that already holds rows is skipped unless --reset
is given. Parent/child/measurement data is never touched.
"""
import argparse
import os
import re

import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db import models
from app.db.database import SessionLocal, engine
from app.db.migrate import sync_schema
from app.services.zscore_calc import WHO_DIR, lms_value_at_z

LOCAL_REF_DIR = os.path.join(settings.DATA_DIR, "local_reference")

# Percentile -> z-score (standard normal quantiles) for the GrowthStandard table.
PERCENTILE_Z = {"p3": -1.881, "p15": -1.036, "p50": 0.0, "p85": 1.036, "p97": 1.881}
DAYS_PER_MONTH = 30.4375

# Keyword -> FE category. Whole-word match; first category to match wins, so order
# matters (e.g. "susu" -> Dairy is checked before "kacang" -> Protein).
CATEGORY_KEYWORDS = [
    ("Dairy", ["susu", "yogurt", "yoghurt", "keju", "cheese", "milk", "es krim", "ice cream", "dairy"]),
    ("Fruit", ["buah", "pisang", "apel", "jeruk", "mangga", "pepaya", "semangka", "melon", "anggur",
               "alpukat", "nanas", "jambu", "salak", "durian", "rambutan", "duku", "sawo", "sirsak",
               "nangka", "kurma", "strawberry", "stroberi", "kiwi", "pir", "belimbing", "manggis",
               "kelengkeng", "srikaya", "markisa", "lemon", "berry", "fruit", "juice", "jus"]),
    ("Vegetable", ["sayur", "daun", "bayam", "kangkung", "wortel", "brokoli", "kol", "sawi", "buncis",
                   "labu", "terong", "tomat", "timun", "kacang panjang", "jamur", "tauge", "toge",
                   "selada", "pakis", "kubis", "seledri", "kembang", "vegetable", "lalap"]),
    ("Protein", ["ikan", "ayam", "daging", "sapi", "kambing", "telur", "tempe", "tahu", "udang",
                 "cumi", "kerang", "kepiting", "hati", "bebek", "teri", "tongkol", "bandeng", "lele",
                 "tuna", "salmon", "sarden", "bakso", "sosis", "nugget", "kacang", "beef", "chicken",
                 "fish", "egg", "meat", "protein"]),
    ("Carbs", ["nasi", "beras", "roti", "mie", "mi", "bihun", "kentang", "ubi", "singkong", "jagung",
               "sagu", "talas", "gembili", "oat", "sereal", "cereal", "pasta", "spaghetti", "tepung",
               "bread", "rice", "noodle", "lontong", "ketupat", "bubur"]),
    ("Snack", ["kerupuk", "keripik", "biskuit", "biscuit", "kue", "cake", "coklat", "chocolate",
               "permen", "candy", "wafer", "snack", "cookie", "donat", "donut", "cracker", "chips",
               "gorengan", "es", "sirup", "minuman", "drink", "kopi", "teh", "soda", "cola", "jelly",
               "pudding", "puding", "mooncake"]),
    ("Main Course", ["soto", "sop", "sup", "gulai", "rendang", "opor", "rawon", "sate", "pecel", "gado",
                     "nasi goreng", "capcay", "tumis", "masakan", "semur", "kari", "curry", "soup",
                     "lodeh", "balado", "rica", "pepes", "goreng", "bakar", "rebus", "kukus"]),
]


_CATEGORY_PATTERNS = [
    (category, re.compile(r"\b(?:" + "|".join(map(re.escape, keywords)) + r")\b"))
    for category, keywords in CATEGORY_KEYWORDS
]


def categorize_food(name: str) -> str:
    text = str(name).lower()
    for category, pattern in _CATEGORY_PATTERNS:
        if pattern.search(text):
            return category
    return "Other"


def create_tables() -> None:
    added = sync_schema(engine)
    for col in added:
        print(f"  added column {col}")


def _is_empty(db: Session, model) -> bool:
    return db.query(model.id).first() is None


def seed_superadmin(db: Session) -> int:
    """Guarantee at least one superadmin exists (admin registration requires one).

    If FIRST_ADMIN_EMAIL already exists as a plain admin it is promoted; otherwise
    a new superadmin is created. Returns the number of rows created/changed.
    """
    if db.query(models.AdminUser.id).filter(models.AdminUser.is_superadmin == 1).first():
        return 0

    email = settings.FIRST_ADMIN_EMAIL.lower()
    existing = db.query(models.AdminUser).filter(models.AdminUser.email == email).first()
    if existing:
        existing.is_superadmin = 1
    else:
        db.add(
            models.AdminUser(
                email=email,
                name=settings.FIRST_ADMIN_NAME,
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                is_superadmin=1,
            )
        )
    db.commit()
    return 1


def seed_foods(db: Session, reset: bool = False) -> int:
    if reset:
        db.query(models.FoodItem).delete()
        db.commit()
    elif not _is_empty(db, models.FoodItem):
        return 0

    df = pd.read_csv(os.path.join(LOCAL_REF_DIR, "nilai_gizi_toddler_safe.csv"))
    df = df.dropna(subset=["name"]).drop_duplicates(subset=["name"])
    rows = [
        models.FoodItem(
            name=str(r["name"]).strip()[:200],
            category=categorize_food(r["name"]),
            energy=float(r.get("energy_kcal", 0) or 0),
            protein=float(r.get("protein_g", 0) or 0),
            carbs=float(r.get("carbohydrate_g", 0) or 0),
            fat=float(r.get("fat_g", 0) or 0),
            safe=bool(r.get("is_toddler_safe", True)),
        )
        for _, r in df.iterrows()
    ]
    db.add_all(rows)
    db.commit()
    return len(rows)


def _fmt(value) -> str:
    """Store numbers as compact strings ('550', '0.5') to match the AKGTarget columns."""
    if pd.isna(value):
        return ""
    f = float(value)
    return str(int(f)) if f.is_integer() else str(f)


def seed_akg(db: Session, reset: bool = False) -> int:
    if reset:
        db.query(models.AKGTarget).delete()
        db.commit()
    elif not _is_empty(db, models.AKGTarget):
        return 0

    df = pd.read_csv(os.path.join(LOCAL_REF_DIR, "toddler_akg_2019.csv"))
    rows = [
        models.AKGTarget(
            ageGroup=str(r["Kelompok_Umur"]),
            gender="M/F",
            energy=_fmt(r["Energi_kkal"]),
            protein=_fmt(r["Protein_g"]),
            fat=_fmt(r["Lemak_Total_g"]),
            carbs=_fmt(r["Karbohidrat_g"]),
        )
        for _, r in df.iterrows()
    ]
    db.add_all(rows)
    db.commit()
    return len(rows)


def _parse_age_label(label: str) -> tuple[int, int]:
    """'0 - 6 Months' -> (0, 6); '2 - 3 Years' -> (24, 36)."""
    nums = [int(n) for n in re.findall(r"\d+", label)]
    lo, hi = nums[0], nums[1]
    if "year" in label.lower() or "tahun" in label.lower():
        return lo * 12, hi * 12
    return lo, hi


def seed_milestones(db: Session, reset: bool = False) -> int:
    if reset:
        db.query(models.MilestoneAnswer).delete()
        db.query(models.Milestone).delete()
        db.commit()
    elif not _is_empty(db, models.Milestone):
        return 0

    df = pd.read_csv(os.path.join(LOCAL_REF_DIR, "Digitize_the_KPSP.csv"))
    rows = []
    for order, (_, r) in enumerate(df.iterrows()):
        lo, hi = _parse_age_label(str(r["Age Bracket"]))
        rows.append(
            models.Milestone(
                min_months=lo,
                max_months=hi,
                age_label=str(r["Age Bracket"]).strip(),
                domain=str(r["Category"]).strip(),
                question=str(r["Milestone Question (Indonesian)"]).strip(),
                active=True,
                sort_order=order,
            )
        )
    db.add_all(rows)
    db.commit()
    return len(rows)


def seed_growth_standards(db: Session, reset: bool = False, max_months: int = 60) -> int:
    """Monthly WHO percentile curves (weight-, length/height- and BMI-for-age), 0..max_months.

    Idempotent per metric, so adding a new metric later only seeds the missing curves."""
    if reset:
        db.query(models.GrowthStandard).delete()
        db.commit()

    sources = {
        ("wfa", "male"): "wfa_boys.csv",
        ("wfa", "female"): "wfa_girls.csv",
        ("lhfa", "male"): "lhfa_boys.csv",
        ("lhfa", "female"): "lhfa_girls.csv",
        ("bfa", "male"): "bfa_boys.csv",
        ("bfa", "female"): "bfa_girls.csv",
    }
    existing = {m for (m,) in db.query(models.GrowthStandard.metric).distinct()}
    rows = []
    for (metric, gender), filename in sources.items():
        if metric in existing:
            continue
        table = pd.read_csv(os.path.join(WHO_DIR, filename)).set_index("Day")
        for month in range(max_months + 1):
            day = min(round(month * DAYS_PER_MONTH), int(table.index.max()))
            l, m, s = (float(table.loc[day, c]) for c in ("L", "M", "S"))
            percentiles = {p: round(lms_value_at_z(z, l, m, s), 2) for p, z in PERCENTILE_Z.items()}
            rows.append(
                models.GrowthStandard(
                    gender=gender,
                    metric=metric,
                    age=str(month),
                    **{p: str(v) for p, v in percentiles.items()},
                )
            )
    db.add_all(rows)
    db.commit()
    return len(rows)


def run(reset: bool = False) -> dict:
    create_tables()
    db = SessionLocal()
    try:
        return {
            "superadmin": seed_superadmin(db),
            "foods": seed_foods(db, reset),
            "akg_targets": seed_akg(db, reset),
            "growth_standards": seed_growth_standards(db, reset),
            "milestones": seed_milestones(db, reset),
        }
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="wipe reference tables before seeding")
    args = parser.parse_args()

    # Hide the password when echoing the target database.
    print("Database:", re.sub(r"://([^:]+):[^@]+@", r"://\1:***@", settings.DATABASE_URL))
    counts = run(reset=args.reset)
    for table, n in counts.items():
        print(f"  {table:<18} {'seeded ' + str(n) + ' rows' if n else 'skipped (already populated)'}")
    if counts["superadmin"]:
        print(f"  superadmin login: {settings.FIRST_ADMIN_EMAIL} / (FIRST_ADMIN_PASSWORD from .env)")
    print("Done.")


if __name__ == "__main__":
    main()
