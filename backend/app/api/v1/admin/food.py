from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db import models
from app.schemas import admin_schemas

router = APIRouter()

@router.get("/list", response_model=List[admin_schemas.FoodItemResponse])
def get_all_foods(db: Session = Depends(get_db)):
    return db.query(models.FoodItem).all()

@router.post("/add", response_model=admin_schemas.FoodItemResponse)
def add_food(food: admin_schemas.FoodItemCreate, db: Session = Depends(get_db)):
    new_food = models.FoodItem(**food.model_dump())
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return new_food

@router.put("/update/{food_id}", response_model=admin_schemas.FoodItemResponse)
def update_food(food_id: int, food: admin_schemas.FoodItemCreate, db: Session = Depends(get_db)):
    db_food = db.query(models.FoodItem).filter(models.FoodItem.id == food_id).first()
    if not db_food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    for key, value in food.model_dump().items():
        setattr(db_food, key, value)
        
    db.commit()
    db.refresh(db_food)
    return db_food

@router.delete("/delete/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    db_food = db.query(models.FoodItem).filter(models.FoodItem.id == food_id).first()
    if not db_food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    db.delete(db_food)
    db.commit()
    return {"status": "success", "message": "Food item deleted"}