from typing import List, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/akg", response_model=List[admin_schemas.AKGRow])
def get_akg_data(db: Session = Depends(get_db)):
    return db.query(models.AKGTarget).order_by(models.AKGTarget.id).all()


@router.post("/update-akg")
def update_akg(payload: admin_schemas.AKGUpdatePayload, db: Session = Depends(get_db)):
    """Replace the whole AKG table with the submitted rows (single transaction)."""
    db.query(models.AKGTarget).delete()
    db.add_all(models.AKGTarget(**row.model_dump(exclude={"id"})) for row in payload.akg_data)
    db.commit()
    return {
        "status": "success",
        "rows": len(payload.akg_data),
        "message": "AKG targets successfully updated in database!",
    }


@router.get("/growth-standards", response_model=List[admin_schemas.GrowthStandardRow])
def get_growth_standards(
    metric: Literal["wfa", "lhfa", "bfa"] = Query("wfa"),
    gender: Literal["male", "female"] = Query("male"),
    db: Session = Depends(get_db),
):
    """Seeded WHO percentile curves (read-only; refresh with seed_db.py --reset)."""
    rows = (
        db.query(models.GrowthStandard)
        .filter(models.GrowthStandard.metric == metric, models.GrowthStandard.gender == gender)
        .all()
    )
    points = [
        {"age_months": int(r.age), "p3": float(r.p3), "p15": float(r.p15), "p50": float(r.p50), "p85": float(r.p85), "p97": float(r.p97)}
        for r in rows
    ]
    return sorted(points, key=lambda p: p["age_months"])
