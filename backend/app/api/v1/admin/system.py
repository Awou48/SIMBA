from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_admin, get_current_superadmin
from app.db import models
from app.db.database import engine, get_db
from app.schemas import admin_schemas

router = APIRouter(dependencies=[Depends(get_current_admin)])

APP_VERSION = "1.2.0"


@router.get("/summary", response_model=admin_schemas.SystemSummary)
def system_summary(db: Session = Depends(get_db)):
    def count(model) -> int:
        return db.query(func.count(model.id)).scalar() or 0

    last_measurement = db.query(func.max(models.MeasurementLog.date_logged)).scalar()
    last_meal = db.query(func.max(models.MealLog.date)).scalar()
    return {
        "version": APP_VERSION,
        "database": f"{engine.dialect.name} · {settings.DATABASE_URL.rsplit('/', 1)[-1]}",
        "counts": {
            "parents": count(models.ParentUser),
            "children": count(models.Child),
            "measurements": count(models.MeasurementLog),
            "meals": count(models.MealLog),
            "milestone_answers": count(models.MilestoneAnswer),
            "health_events": count(models.HealthEvent),
            "admins": count(models.AdminUser),
        },
        "reference": {
            "foods": count(models.FoodItem),
            "akg_targets": count(models.AKGTarget),
            "growth_standards": count(models.GrowthStandard),
            "milestones": count(models.Milestone),
            "articles": count(models.Article),
        },
        "last_measurement_at": last_measurement,
        "last_meal_on": last_meal.isoformat() if last_meal else None,
    }


@router.get("/admins", response_model=List[admin_schemas.AdminResponse])
def list_admins(db: Session = Depends(get_db)):
    return db.query(models.AdminUser).order_by(models.AdminUser.id).all()


@router.post("/seed")
def seed_reference_data(_: models.AdminUser = Depends(get_current_superadmin), db: Session = Depends(get_db)):
    """Load any reference table that is still empty (same as `python seed_db.py`, never resets)."""
    import seed_db

    return {
        "foods": seed_db.seed_foods(db),
        "akg_targets": seed_db.seed_akg(db),
        "growth_standards": seed_db.seed_growth_standards(db),
        "milestones": seed_db.seed_milestones(db),
        "articles": seed_db.seed_articles(db),
    }
