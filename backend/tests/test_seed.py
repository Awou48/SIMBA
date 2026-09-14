from sqlalchemy.orm import sessionmaker

import seed_db
from app.db import models


def test_categorize_food():
    assert seed_db.categorize_food("Susu kental manis") == "Dairy"
    assert seed_db.categorize_food("Pisang kepok") == "Fruit"
    assert seed_db.categorize_food("Ikan tongkol goreng") == "Protein"
    assert seed_db.categorize_food("Nasi putih") == "Carbs"
    assert seed_db.categorize_food("Zzz unknown thing") == "Other"


def test_seed_reference_tables_is_idempotent(engine):
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        first = {
            "superadmin": seed_db.seed_superadmin(db),
            "foods": seed_db.seed_foods(db),
            "akg": seed_db.seed_akg(db),
            "growth": seed_db.seed_growth_standards(db),
        }
        assert first["superadmin"] == 1
        assert first["foods"] > 1600
        assert first["akg"] == 4
        assert first["growth"] == 4 * 61

        second = {
            "superadmin": seed_db.seed_superadmin(db),
            "foods": seed_db.seed_foods(db),
            "akg": seed_db.seed_akg(db),
            "growth": seed_db.seed_growth_standards(db),
        }
        assert all(n == 0 for n in second.values())
        assert db.query(models.FoodItem).count() == first["foods"]

        # --reset re-seeds without duplicating.
        assert seed_db.seed_akg(db, reset=True) == 4
        assert db.query(models.AKGTarget).count() == 4

        admin = db.query(models.AdminUser).one()
        assert admin.is_superadmin == 1

        # WHO 12-month boy median weight is ~9.6 kg.
        row = db.query(models.GrowthStandard).filter_by(metric="wfa", gender="male", age="12").one()
        assert abs(float(row.p50) - 9.6) < 0.1
        assert float(row.p3) < float(row.p50) < float(row.p97)
    finally:
        db.close()


def test_seed_promotes_existing_first_admin(engine):
    from app.core.config import settings
    from app.core.security import get_password_hash

    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        db.add(models.AdminUser(email=settings.FIRST_ADMIN_EMAIL.lower(), name="x",
                                hashed_password=get_password_hash("pw"), is_superadmin=0))
        db.commit()
        assert seed_db.seed_superadmin(db) == 1
        assert db.query(models.AdminUser).count() == 1
        assert db.query(models.AdminUser).one().is_superadmin == 1
    finally:
        db.close()
