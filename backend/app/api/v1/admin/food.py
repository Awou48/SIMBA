from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import apply_food_search
from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas

router = APIRouter(dependencies=[Depends(get_current_admin)])


def _get_food_or_404(food_id: int, db: Session) -> models.FoodItem:
    food = db.query(models.FoodItem).filter(models.FoodItem.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")
    return food


@router.get("", response_model=List[admin_schemas.FoodItemResponse])
def list_foods(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Case-insensitive name search"),
    category: Optional[str] = None,
    safe_only: bool = False,
    limit: int = Query(200, ge=1, le=2000),
    offset: int = Query(0, ge=0),
):
    query = apply_food_search(db.query(models.FoodItem), q)
    if category and category.lower() != "all":
        query = query.filter(models.FoodItem.category == category)
    if safe_only:
        query = query.filter(models.FoodItem.safe.is_(True))
    return query.order_by(models.FoodItem.name).offset(offset).limit(limit).all()


@router.post("", response_model=admin_schemas.FoodItemResponse, status_code=status.HTTP_201_CREATED)
def add_food(food: admin_schemas.FoodItemCreate, db: Session = Depends(get_db)):
    new_food = models.FoodItem(**food.model_dump())
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return new_food


@router.get("/{food_id}", response_model=admin_schemas.FoodItemResponse)
def get_food(food_id: int, db: Session = Depends(get_db)):
    return _get_food_or_404(food_id, db)


@router.put("/{food_id}", response_model=admin_schemas.FoodItemResponse)
def update_food(food_id: int, food: admin_schemas.FoodItemCreate, db: Session = Depends(get_db)):
    db_food = _get_food_or_404(food_id, db)
    for key, value in food.model_dump().items():
        setattr(db_food, key, value)
    db.commit()
    db.refresh(db_food)
    return db_food


@router.delete("/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    db_food = _get_food_or_404(food_id, db)
    # Keep parents' meal history intact: detach logs from the food before removing it.
    db.query(models.MealLog).filter(models.MealLog.food_id == food_id).update({models.MealLog.food_id: None})
    db.delete(db_food)
    db.commit()
    return {"status": "success", "message": "Food item deleted"}
