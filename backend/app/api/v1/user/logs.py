from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import apply_food_search, get_owned_child
from app.core.security import get_current_user
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas
from app.services.nutrition_calc import calculate_akg_fulfillment, daily_targets

router = APIRouter()


def age_in_months(birth_date: date, on: date | None = None) -> int:
    on = on or date.today()
    months = (on.year - birth_date.year) * 12 + (on.month - birth_date.month)
    if on.day < birth_date.day:
        months -= 1
    return max(months, 0)


@router.post("/nutrition/{child_id}/analyze")
def analyze_daily_intake(
    payload: user_schemas.NutritionIntake,
    child: models.Child = Depends(get_owned_child),
):
    # Age is always derived from the child's record; the payload's age_in_months is ignored.
    months = age_in_months(child.birth_date)
    analysis = calculate_akg_fulfillment(months, payload.total_protein, payload.total_energy)
    if "error" in analysis:
        raise HTTPException(status_code=400, detail=analysis["error"])
    return {"message": "Intake analyzed successfully", "data": analysis}


# ---------------------------------------------------------------------------
# Food search (read-only view of the admin-managed food database)
# ---------------------------------------------------------------------------


@router.get("/foods", response_model=List[user_schemas.FoodSearchItem])
def search_foods(
    q: Optional[str] = Query(None, min_length=1, description="Case-insensitive name search"),
    category: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _: models.ParentUser = Depends(get_current_user),
):
    query = apply_food_search(db.query(models.FoodItem), q)
    if category and category.lower() != "all":
        query = query.filter(models.FoodItem.category == category)
    # Toddler-safe items first, then alphabetical.
    return query.order_by(models.FoodItem.safe.desc(), models.FoodItem.name).limit(limit).all()


# ---------------------------------------------------------------------------
# Meal logs
# ---------------------------------------------------------------------------


def _round(x: float) -> float:
    return round(float(x or 0), 1)


def _summary(child: models.Child, day: date, meals: List[models.MealLog]) -> dict:
    totals = {
        "energy": _round(sum(m.energy for m in meals)),
        "protein": _round(sum(m.protein for m in meals)),
        "carbs": _round(sum(m.carbs for m in meals)),
        "fat": _round(sum(m.fat for m in meals)),
    }
    months = age_in_months(child.birth_date, day)
    targets = daily_targets(months)
    fulfillment = None
    if targets:
        fulfillment = {
            k: round(totals[k] / targets[k] * 100, 1) if targets[k] else 0.0
            for k in ("energy", "protein", "carbs", "fat")
        }
    return {
        "date": day,
        "age_in_months": months,
        "meals": meals,
        "totals": totals,
        "targets": {k: targets[k] for k in ("energy", "protein", "carbs", "fat")} if targets else None,
        "fulfillment_percent": fulfillment,
        "akg_bracket": targets["label"] if targets else None,
    }


@router.get("/child/{child_id}/meals", response_model=user_schemas.DailyMealSummary)
def get_daily_meals(
    day: date = Query(default_factory=date.today, alias="date"),
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    meals = (
        db.query(models.MealLog)
        .filter(models.MealLog.child_id == child.id, models.MealLog.date == day)
        .order_by(models.MealLog.id)
        .all()
    )
    return _summary(child, day, meals)


@router.post(
    "/child/{child_id}/meals",
    response_model=user_schemas.MealResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_meal(
    payload: user_schemas.MealCreate,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    if payload.date > date.today():
        raise HTTPException(status_code=400, detail="Meal date cannot be in the future")
    if payload.date < child.birth_date:
        raise HTTPException(status_code=400, detail="Meal date is before the child's birth date")

    food = db.query(models.FoodItem).filter(models.FoodItem.id == payload.food_id).first()
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found")

    meal = models.MealLog(
        child_id=child.id,
        food_id=food.id,
        food_name=food.name,
        meal_type=payload.meal_type,
        date=payload.date,
        servings=payload.servings,
        energy=_round(food.energy * payload.servings),
        protein=_round(food.protein * payload.servings),
        carbs=_round(food.carbs * payload.servings),
        fat=_round(food.fat * payload.servings),
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


@router.delete("/child/{child_id}/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: int,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    meal = (
        db.query(models.MealLog)
        .filter(models.MealLog.id == meal_id, models.MealLog.child_id == child.id)
        .first()
    )
    if meal is None:
        raise HTTPException(status_code=404, detail="Meal not found")
    db.delete(meal)
    db.commit()
    return None
