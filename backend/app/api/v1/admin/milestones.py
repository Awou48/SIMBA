from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas

router = APIRouter(dependencies=[Depends(get_current_admin)])


def _get_or_404(milestone_id: int, db: Session) -> models.Milestone:
    m = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    return m


def _validate(payload: admin_schemas.MilestoneBase) -> None:
    if payload.max_months < payload.min_months:
        raise HTTPException(status_code=422, detail="max_months must be >= min_months")


@router.get("", response_model=List[admin_schemas.MilestoneResponse])
def list_milestones(db: Session = Depends(get_db)):
    return (
        db.query(models.Milestone)
        .order_by(models.Milestone.min_months, models.Milestone.sort_order, models.Milestone.id)
        .all()
    )


@router.post("", response_model=admin_schemas.MilestoneResponse, status_code=status.HTTP_201_CREATED)
def create_milestone(payload: admin_schemas.MilestoneCreate, db: Session = Depends(get_db)):
    _validate(payload)
    m = models.Milestone(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/{milestone_id}", response_model=admin_schemas.MilestoneResponse)
def update_milestone(milestone_id: int, payload: admin_schemas.MilestoneCreate, db: Session = Depends(get_db)):
    _validate(payload)
    m = _get_or_404(milestone_id, db)
    for key, value in payload.model_dump().items():
        setattr(m, key, value)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    m = _get_or_404(milestone_id, db)
    db.query(models.MilestoneAnswer).filter(models.MilestoneAnswer.milestone_id == milestone_id).delete()
    db.delete(m)
    db.commit()
    return None
