"""Remove prototype-era test data from a development database.

Usage (from backend/):
    python scripts/cleanup_legacy.py --dry-run
    python scripts/cleanup_legacy.py --parents parent@simba.com bapak@simba.com --admins admin@simba.com --drop-orphans --yes

What it does
- Deletes the given parent accounts with all their children, measurements, meals, milestone answers
  and calendar events (cascade).
- Deletes the given admin accounts (superadmins are never deleted unless --allow-superadmin).
- --drop-orphans drops tables that exist in the database but not in the models (leftovers from
  older prototypes), after printing their row counts.
- --purge-impossible deletes measurement rows that cannot be real (any |z| > 6 or z missing), which
  only exist from before validation was added.

Never runs against a database without --yes; prints a full plan first.
"""
import argparse
import os
import sys

from sqlalchemy import inspect, text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import models  # noqa: E402
from app.db.database import Base, SessionLocal, engine  # noqa: E402

Z_LIMIT = 6.0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--parents", nargs="*", default=[], help="parent emails to delete (with everything they own)")
    ap.add_argument("--admins", nargs="*", default=[], help="admin emails to delete")
    ap.add_argument("--allow-superadmin", action="store_true")
    ap.add_argument("--drop-orphans", action="store_true", help="drop tables not present in the models")
    ap.add_argument("--purge-impossible", action="store_true", help="delete measurements with |z| > 6 or missing z")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--yes", action="store_true", help="actually apply the changes")
    args = ap.parse_args()

    db = SessionLocal()
    plan: list[str] = []

    parents = db.query(models.ParentUser).filter(models.ParentUser.email.in_([e.lower() for e in args.parents])).all()
    for p in parents:
        kids = db.query(models.Child).filter(models.Child.parent_id == p.id).all()
        n_meas = db.query(models.MeasurementLog).filter(models.MeasurementLog.child_id.in_([k.id for k in kids] or [-1])).count()
        plan.append(f"delete parent {p.email} -> {len(kids)} children ({', '.join(k.name for k in kids) or '-'}), {n_meas} measurements")

    admins = db.query(models.AdminUser).filter(models.AdminUser.email.in_([e.lower() for e in args.admins])).all()
    admins = [a for a in admins if args.allow_superadmin or not a.is_superadmin]
    for a in admins:
        plan.append(f"delete admin {a.email}")

    impossible = []
    if args.purge_impossible:
        logs = models.MeasurementLog
        impossible = (
            db.query(logs)
            .filter(
                (logs.lhfa_zscore.is_(None))
                | (logs.wfa_zscore.is_(None))
                | (logs.lhfa_zscore > Z_LIMIT) | (logs.lhfa_zscore < -Z_LIMIT)
                | (logs.wfa_zscore > Z_LIMIT) | (logs.wfa_zscore < -Z_LIMIT)
            )
            .all()
        )
        for r in impossible:
            plan.append(f"delete measurement #{r.id} (child {r.child_id}, {r.weight_kg} kg / {r.height_cm} cm, hfa={r.lhfa_zscore}, wfa={r.wfa_zscore})")

    orphans = []
    if args.drop_orphans:
        known = set(Base.metadata.tables) | {"alembic_version"}
        with engine.connect() as conn:
            for t in inspect(engine).get_table_names():
                if t not in known:
                    n = conn.execute(text(f'SELECT count(*) FROM "{t}"')).scalar()
                    orphans.append(t)
                    plan.append(f"drop orphan table {t} ({n} rows)")

    if not plan:
        print("Nothing to do.")
        return
    print("Plan:")
    for line in plan:
        print("  -", line)
    if args.dry_run or not args.yes:
        print("\nDry run. Re-run with --yes to apply.")
        return

    db.rollback()
    with engine.begin() as conn:
        for t in orphans:
            conn.execute(text(f'DROP TABLE "{t}" CASCADE'))

    if impossible:
        db.query(models.MeasurementLog).filter(models.MeasurementLog.id.in_([r.id for r in impossible])).delete(synchronize_session=False)
        db.commit()

    for p in parents:
        for kid in db.query(models.Child).filter(models.Child.parent_id == p.id).all():
            db.query(models.MeasurementLog).filter(models.MeasurementLog.child_id == kid.id).delete(synchronize_session=False)
            db.delete(kid)
        db.delete(p)
    for a in admins:
        db.delete(a)
    db.commit()
    print("Done.")


if __name__ == "__main__":
    main()
