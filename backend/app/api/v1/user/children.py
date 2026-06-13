from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.schemas import user_schemas
from app.core.security import get_current_user

router = APIRouter()

@router.post("/", response_model=user_schemas.ChildResponse)
def register_child(child: user_schemas.ChildCreate, db: Session = Depends(get_db), current_user: models.ParentUser = Depends(get_current_user)):
    new_child = models.Child(**child.model_dump(), parent_id=current_user.id)
    db.add(new_child)
    db.commit()
    db.refresh(new_child)
    return new_child

@router.get("/")
def get_my_children(db: Session = Depends(get_db), current_user: models.ParentUser = Depends(get_current_user)):
    return db.query(models.Child).filter(models.Child.parent_id == current_user.id).all()