from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.api.v1.user.logs import age_in_months
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas

router = APIRouter()


def interpret_kpsp(achieved: int, total: int) -> str:
    """KPSP scoring (10 questions: 9-10 sesuai, 7-8 meragukan, <=6 penyimpangan), scaled to the bracket size."""
    if total == 0:
        return "Sesuai"
    ratio = achieved / total
    if ratio >= 0.9:
        return "Sesuai (on track)"
    if ratio >= 0.7:
        return "Meragukan (needs re-check in 2 weeks)"
    return "Penyimpangan (refer to a health worker)"


def _checklist(child: models.Child, db: Session, bracket_months: Optional[int]) -> dict:
    months = age_in_months(child.birth_date)
    target = months if bracket_months is None else bracket_months

    milestones = (
        db.query(models.Milestone)
        .filter(
            models.Milestone.active.is_(True),
            models.Milestone.min_months <= target,
            models.Milestone.max_months > target,
        )
        .order_by(models.Milestone.sort_order, models.Milestone.id)
        .all()
    )
    answers = {
        a.milestone_id: a
        for a in db.query(models.MilestoneAnswer).filter(models.MilestoneAnswer.child_id == child.id).all()
    }
    items = []
    for m in milestones:
        a = answers.get(m.id)
        items.append(
            {
                "id": m.id,
                "min_months": m.min_months,
                "max_months": m.max_months,
                "age_label": m.age_label,
                "domain": m.domain,
                "question": m.question,
                "expected": m.expected,
                "achieved": a.achieved if a else None,
                "answered_on": a.answered_on if a else None,
            }
        )
    answered = sum(1 for i in items if i["achieved"] is not None)
    achieved = sum(1 for i in items if i["achieved"])
    return {
        "age_in_months": months,
        "age_label": milestones[0].age_label if milestones else None,
        "items": items,
        "total": len(items),
        "answered": answered,
        "achieved": achieved,
        "interpretation": interpret_kpsp(achieved, len(items)) if items and answered == len(items) else None,
    }


@router.get("/child/{child_id}/milestones", response_model=user_schemas.MilestoneChecklist)
def get_milestone_checklist(
    bracket_months: Optional[int] = Query(None, ge=0, le=72, description="Override the age used to pick the bracket"),
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    return _checklist(child, db, bracket_months)


@router.put("/child/{child_id}/milestones/{milestone_id}", response_model=user_schemas.MilestoneChecklist)
def answer_milestone(
    milestone_id: int,
    payload: user_schemas.MilestoneAnswerIn,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if milestone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")

    answer = (
        db.query(models.MilestoneAnswer)
        .filter(models.MilestoneAnswer.child_id == child.id, models.MilestoneAnswer.milestone_id == milestone_id)
        .first()
    )
    if answer is None:
        answer = models.MilestoneAnswer(child_id=child.id, milestone_id=milestone_id)
        db.add(answer)
    answer.achieved = payload.achieved
    answer.answered_on = date.today()
    db.commit()
    return _checklist(child, db, milestone.min_months)
