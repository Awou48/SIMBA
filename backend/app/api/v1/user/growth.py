from datetime import date, datetime, time
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.core.security import get_current_user
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas
from app.services.zscore_calc import (
    analyze_stunting,
    analyze_weight,
    classify_stunting,
    classify_weight,
)

router = APIRouter()


def _to_response(log: models.MeasurementLog) -> dict:
    return {
        "id": log.id,
        "date_logged": log.date_logged,
        "age_in_days": log.age_in_days,
        "weight_kg": log.weight_kg,
        "height_cm": log.height_cm,
        "wfa_zscore": log.wfa_zscore,
        "lhfa_zscore": log.lhfa_zscore,
        "stunting_status": classify_stunting(log.lhfa_zscore),
        "weight_status": classify_weight(log.wfa_zscore),
    }


@router.post(
    "/child/{child_id}/measurements",
    response_model=user_schemas.MeasurementResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_measurement(
    measurement: user_schemas.MeasurementCreate,
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    if measurement.date_logged > date.today():
        raise HTTPException(status_code=400, detail="Measurement date cannot be in the future")
    if measurement.date_logged < child.birth_date:
        raise HTTPException(status_code=400, detail="Measurement date is before the child's birth date")

    age_in_days = (measurement.date_logged - child.birth_date).days
    lhfa = analyze_stunting(child.gender, age_in_days, measurement.height_cm)
    wfa = analyze_weight(child.gender, age_in_days, measurement.weight_kg)

    if "error" in lhfa:
        raise HTTPException(status_code=400, detail=f"Height error: {lhfa['error']}")
    if "error" in wfa:
        raise HTTPException(status_code=400, detail=f"Weight error: {wfa['error']}")

    new_log = models.MeasurementLog(
        child_id=child.id,
        date_logged=datetime.combine(measurement.date_logged, time.min),
        age_in_days=age_in_days,
        weight_kg=measurement.weight_kg,
        height_cm=measurement.height_cm,
        lhfa_zscore=lhfa["z_score"],
        wfa_zscore=wfa["z_score"],
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return _to_response(new_log)


@router.get("/child/{child_id}/measurements", response_model=List[user_schemas.MeasurementResponse])
def list_measurements(
    child: models.Child = Depends(get_owned_child),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(models.MeasurementLog)
        .filter(models.MeasurementLog.child_id == child.id)
        .order_by(models.MeasurementLog.date_logged, models.MeasurementLog.id)
        .all()
    )
    return [_to_response(log) for log in logs]


@router.get("/growth-standards", response_model=List[user_schemas.GrowthStandardPoint])
def get_growth_standards(
    metric: Literal["wfa", "lhfa"] = Query(..., description="wfa = weight-for-age, lhfa = length/height-for-age"),
    gender: Literal["male", "female"] = Query(...),
    db: Session = Depends(get_db),
    _: models.ParentUser = Depends(get_current_user),
):
    """Monthly WHO percentile curves (seeded by seed_db.py) for drawing chart reference bands."""
    rows = (
        db.query(models.GrowthStandard)
        .filter(models.GrowthStandard.metric == metric, models.GrowthStandard.gender == gender)
        .all()
    )
    points = [
        {
            "age_months": int(r.age),
            "p3": float(r.p3),
            "p15": float(r.p15),
            "p50": float(r.p50),
            "p85": float(r.p85),
            "p97": float(r.p97),
        }
        for r in rows
    ]
    return sorted(points, key=lambda p: p["age_months"])
