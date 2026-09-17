from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.core.security import get_current_user
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas

router = APIRouter()


@router.post("/", response_model=user_schemas.ChildResponse, status_code=status.HTTP_201_CREATED)
def register_child(
    child: user_schemas.ChildCreate,
    db: Session = Depends(get_db),
    current_user: models.ParentUser = Depends(get_current_user),
):
    new_child = models.Child(**child.model_dump(), parent_id=current_user.id)
    db.add(new_child)
    db.commit()
    db.refresh(new_child)
    return new_child


@router.get("/", response_model=List[user_schemas.ChildResponse])
def get_my_children(
    db: Session = Depends(get_db),
    current_user: models.ParentUser = Depends(get_current_user),
):
    return (
        db.query(models.Child)
        .filter(models.Child.parent_id == current_user.id)
        .order_by(models.Child.id)
        .all()
    )


@router.get("/{child_id}", response_model=user_schemas.ChildResponse)
def get_child(child: models.Child = Depends(get_owned_child)):
    return child


@router.put("/{child_id}", response_model=user_schemas.ChildResponse)
def update_child(
    payload: user_schemas.ChildUpdate,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(child, key, value)
    db.commit()
    db.refresh(child)
    return child
