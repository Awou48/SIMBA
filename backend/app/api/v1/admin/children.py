"""Health Manager view of the children registry (read-only).

Parents own their data; Health Managers see it aggregated and per child for
follow-up. Parent emails are masked — the portal needs a contact hint, not the
full address.
"""
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.services.insights import age_in_months, build_report
from app.services.report_pdf import render_report_pdf
from app.services.zscore_calc import classify_stunting, classify_wasting, classify_weight

router = APIRouter(dependencies=[Depends(get_current_admin)])

STALE_DAYS = 30


def mask_email(email: str) -> str:
    name, _, domain = email.partition("@")
    return f"{name[:1]}***@{domain}" if domain else "***"


def _flags(latest: Optional[models.MeasurementLog]) -> List[str]:
    if latest is None:
        return ["no_data"]
    flags = []
    if latest.lhfa_zscore is not None and latest.lhfa_zscore < -2:
        flags.append("stunted")
    if latest.wfa_zscore is not None and latest.wfa_zscore < -2:
        flags.append("underweight")
    if latest.wfh_zscore is not None and latest.wfh_zscore < -2:
        flags.append("wasted")
    if latest.wfh_zscore is not None and latest.wfh_zscore > 2:
        flags.append("overweight")
    if (date.today() - latest.date_logged.date()).days > STALE_DAYS:
        flags.append("stale")
    return flags or ["normal"]


def _latest_by_child(db: Session, child_ids: List[int]) -> dict:
    if not child_ids:
        return {}
    logs = models.MeasurementLog
    latest_ids = (
        db.query(func.max(logs.id))
        .filter(logs.child_id.in_(child_ids))
        .group_by(logs.child_id)
        .all()
    )
    rows = db.query(logs).filter(logs.id.in_([i for (i,) in latest_ids])).all()
    return {r.child_id: r for r in rows}


def _summary_row(child: models.Child, latest: Optional[models.MeasurementLog], count: int) -> dict:
    return {
        "id": child.id,
        "name": child.name,
        "gender": child.gender,
        "birth_date": child.birth_date,
        "age_in_months": age_in_months(child.birth_date),
        "region": child.region,
        "parent_email_masked": mask_email(child.parent.email) if child.parent else "***",
        "measurements_count": count,
        "last_measured_on": latest.date_logged.date() if latest else None,
        "latest": None
        if latest is None
        else {
            "weight_kg": latest.weight_kg,
            "height_cm": latest.height_cm,
            "wfa_zscore": latest.wfa_zscore,
            "lhfa_zscore": latest.lhfa_zscore,
            "wfh_zscore": latest.wfh_zscore,
            "stunting_status": classify_stunting(latest.lhfa_zscore),
            "weight_status": classify_weight(latest.wfa_zscore),
            "wasting_status": classify_wasting(latest.wfh_zscore) if latest.wfh_zscore is not None else None,
        },
        "flags": _flags(latest),
    }


@router.get("")
def list_children(
    q: Optional[str] = Query(None, description="Name search"),
    region: Optional[str] = Query(None, description="Exact region; 'Unspecified' for none"),
    flag: Optional[str] = Query(None, description="stunted | underweight | wasted | overweight | stale | no_data | normal"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(models.Child)
    if q:
        query = query.filter(models.Child.name.ilike(f"%{q.strip()}%"))
    if region:
        query = query.filter(models.Child.region.is_(None) if region == "Unspecified" else models.Child.region == region)
    children = query.order_by(models.Child.name, models.Child.id).all()

    latest = _latest_by_child(db, [c.id for c in children])
    counts = dict(
        db.query(models.MeasurementLog.child_id, func.count(models.MeasurementLog.id))
        .filter(models.MeasurementLog.child_id.in_([c.id for c in children] or [-1]))
        .group_by(models.MeasurementLog.child_id)
        .all()
    )
    rows = [_summary_row(c, latest.get(c.id), counts.get(c.id, 0)) for c in children]
    if flag:
        rows = [r for r in rows if flag in r["flags"]]
    total = len(rows)
    return {"total": total, "items": rows[offset : offset + limit]}


@router.get("/{child_id}")
def child_detail(child_id: int, db: Session = Depends(get_db)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    report = build_report(child, db)
    report["child"]["parent_email_masked"] = mask_email(child.parent.email) if child.parent else "***"
    return report


@router.get("/{child_id}/report.pdf")
def child_report_pdf(child_id: int, db: Session = Depends(get_db)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    pdf = render_report_pdf(build_report(child, db))
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="simba-report-{child.id}.pdf"'})


@router.get("/{child_id}/meals")
def child_recent_meals(child_id: int, days: int = Query(7, ge=1, le=90), db: Session = Depends(get_db)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    since = date.today() - timedelta(days=days - 1)
    meals = (
        db.query(models.MealLog)
        .filter(models.MealLog.child_id == child.id, models.MealLog.date >= since)
        .order_by(models.MealLog.date.desc(), models.MealLog.id.desc())
        .all()
    )
    return [
        {
            "id": m.id, "date": m.date, "meal_type": m.meal_type, "food_name": m.food_name, "servings": m.servings,
            "energy": m.energy, "protein": m.protein, "carbs": m.carbs, "fat": m.fat,
        }
        for m in meals
    ]
