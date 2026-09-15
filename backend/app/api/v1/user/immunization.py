from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas
from app.services.immunization import NATIONAL_SCHEDULE, SCHEDULE_BY_CODE, dose_status

router = APIRouter()


def _immunization_summary(child: models.Child, db: Session) -> dict:
    given_events = {
        e.vaccine_code: e
        for e in db.query(models.HealthEvent)
        .filter(models.HealthEvent.child_id == child.id, models.HealthEvent.vaccine_code.isnot(None))
        .all()
    }
    schedule = []
    for dose in NATIONAL_SCHEDULE:
        event = given_events.get(dose.code)
        given_on = event.date if event and event.done else None
        item = dose_status(dose, child.birth_date, given_on)
        item["event_id"] = event.id if event else None
        schedule.append(item)

    counts = {k: sum(1 for s in schedule if s["status"] == k) for k in ("given", "due", "overdue", "upcoming")}
    pending = [s for s in schedule if s["status"] != "given"]
    order = {"overdue": 0, "due": 1, "upcoming": 2}
    next_dose = min(pending, key=lambda s: (order[s["status"]], s["due_date"])) if pending else None
    return {"schedule": schedule, **counts, "next_dose": next_dose}


@router.get("/child/{child_id}/immunizations", response_model=user_schemas.ImmunizationSummary)
def get_immunizations(child: models.Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    return _immunization_summary(child, db)


@router.post("/child/{child_id}/immunizations/{code}/given", response_model=user_schemas.ImmunizationSummary)
def mark_dose_given(
    code: str,
    payload: user_schemas.MarkGivenIn,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    dose = SCHEDULE_BY_CODE.get(code.upper())
    if dose is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown vaccine dose code")
    given_on = payload.given_on or date.today()
    if given_on > date.today():
        raise HTTPException(status_code=400, detail="Given date cannot be in the future")
    if given_on < child.birth_date:
        raise HTTPException(status_code=400, detail="Given date is before the child's birth date")

    event = (
        db.query(models.HealthEvent)
        .filter(models.HealthEvent.child_id == child.id, models.HealthEvent.vaccine_code == dose.code)
        .first()
    )
    if event is None:
        event = models.HealthEvent(child_id=child.id, vaccine_code=dose.code, event_type="Vaccination")
        db.add(event)
    event.title = dose.name
    event.date = given_on
    event.done = True
    if payload.notes is not None:
        event.notes = payload.notes
    db.commit()
    return _immunization_summary(child, db)


@router.delete("/child/{child_id}/immunizations/{code}/given", response_model=user_schemas.ImmunizationSummary)
def unmark_dose_given(code: str, child: models.Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    event = (
        db.query(models.HealthEvent)
        .filter(models.HealthEvent.child_id == child.id, models.HealthEvent.vaccine_code == code.upper())
        .first()
    )
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose has not been recorded")
    db.delete(event)
    db.commit()
    return _immunization_summary(child, db)


@router.get("/child/{child_id}/events", response_model=List[user_schemas.HealthEventResponse])
def list_events(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="YYYY-MM; omit for all"),
    upcoming_only: bool = False,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    q = db.query(models.HealthEvent).filter(models.HealthEvent.child_id == child.id)
    if month:
        year, mon = (int(x) for x in month.split("-"))
        q = q.filter(extract("year", models.HealthEvent.date) == year, extract("month", models.HealthEvent.date) == mon)
    if upcoming_only:
        q = q.filter(models.HealthEvent.date >= date.today(), models.HealthEvent.done.is_(False))
    return q.order_by(models.HealthEvent.date, models.HealthEvent.time, models.HealthEvent.id).all()


@router.post("/child/{child_id}/events", response_model=user_schemas.HealthEventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: user_schemas.HealthEventCreate,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    event = models.HealthEvent(child_id=child.id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _get_event(event_id: int, child: models.Child, db: Session) -> models.HealthEvent:
    event = (
        db.query(models.HealthEvent)
        .filter(models.HealthEvent.id == event_id, models.HealthEvent.child_id == child.id)
        .first()
    )
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.put("/child/{child_id}/events/{event_id}", response_model=user_schemas.HealthEventResponse)
def update_event(
    event_id: int,
    payload: user_schemas.HealthEventUpdate,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    event = _get_event(event_id, child, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/child/{child_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, child: models.Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    db.delete(_get_event(event_id, child, db))
    db.commit()
    return None
