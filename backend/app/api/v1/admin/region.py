from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas
from app.services.immunization import NATIONAL_SCHEDULE, dose_status
from app.services.insights import age_in_months
from app.services.zscore_calc import classify_stunting

router = APIRouter(dependencies=[Depends(get_current_admin)])

STUNTING_WARNING_THRESHOLD = 0.20
UNSPECIFIED = "Unspecified"


def _stats(db: Session, region_clause, label: str) -> dict:
    """Stunting prevalence for the children matching `region_clause` (None = everyone).

    Prevalence counts *children* by their most recent measurement, not raw logs,
    so a child measured monthly is not over-represented."""
    logs, child = models.MeasurementLog, models.Child
    latest = db.query(logs.child_id, func.max(logs.id).label("latest_id")).group_by(logs.child_id).subquery()

    children_q = db.query(func.count(child.id))
    logs_q = db.query(func.count(logs.id)).join(child, child.id == logs.child_id)
    latest_q = db.query(logs.lhfa_zscore).join(latest, latest.c.latest_id == logs.id).join(child, child.id == logs.child_id)
    if region_clause is not None:
        children_q, logs_q, latest_q = (q.filter(region_clause) for q in (children_q, logs_q, latest_q))

    latest_z = [z for (z,) in latest_q.all() if z is not None]
    stunted = sum(1 for z in latest_z if z < -2.0)
    rate = round(stunted / len(latest_z), 4) if latest_z else 0.0
    return {
        "region_name": label,
        "total_children": children_q.scalar() or 0,
        "children_measured": len(latest_z),
        "total_measurements": logs_q.scalar() or 0,
        "stunted_cases": stunted,
        "severely_stunted_cases": sum(1 for z in latest_z if z < -3.0),
        "stunting_rate": rate,
        "warning": "Stunting rate exceeds 20%" if rate > STUNTING_WARNING_THRESHOLD else "Normal",
    }


def _clause_for(region: Optional[str]):
    if region is None:
        return None
    return models.Child.region.is_(None) if region == UNSPECIFIED else models.Child.region == region


@router.get("/dashboard/stunting-stats", response_model=admin_schemas.RegionStatsResponse)
def get_regional_stunting_stats(region: Optional[str] = None, db: Session = Depends(get_db)):
    """Aggregate stunting stats, optionally for one region (use 'Unspecified' for children without one)."""
    return _stats(db, _clause_for(region), region or "All regions")


@router.get("/dashboard/regions", response_model=List[admin_schemas.RegionStatsResponse])
def get_stats_by_region(db: Session = Depends(get_db)):
    """One row per region, highest stunting rate first."""
    regions = [r or UNSPECIFIED for (r,) in db.query(models.Child.region).distinct().all()]
    rows = [_stats(db, _clause_for(r), r) for r in sorted(set(regions))]
    return sorted(rows, key=lambda s: (-s["stunting_rate"], s["region_name"]))


@router.get("/dashboard/overview")
def dashboard_overview(db: Session = Depends(get_db)):
    """Headline numbers for the portal home: nutritional status of every child (latest measurement),
    activity in the last 30 days and immunization backlog."""
    child, logs = models.Child, models.MeasurementLog
    today = date.today()
    since_30 = today - timedelta(days=30)

    children = db.query(child).all()
    latest_ids = [i for (i,) in db.query(func.max(logs.id)).group_by(logs.child_id).all()]
    latest = {r.child_id: r for r in db.query(logs).filter(logs.id.in_(latest_ids or [-1])).all()}

    status = {"normal": 0, "stunted": 0, "severely_stunted": 0, "underweight": 0, "wasted": 0, "overweight": 0, "stale": 0, "unmeasured": 0}
    for c in children:
        m = latest.get(c.id)
        if m is None:
            status["unmeasured"] += 1
            continue
        flagged = False
        if m.lhfa_zscore is not None and m.lhfa_zscore < -3:
            status["severely_stunted"] += 1; status["stunted"] += 1; flagged = True
        elif m.lhfa_zscore is not None and m.lhfa_zscore < -2:
            status["stunted"] += 1; flagged = True
        if m.wfa_zscore is not None and m.wfa_zscore < -2:
            status["underweight"] += 1; flagged = True
        if m.wfh_zscore is not None and m.wfh_zscore < -2:
            status["wasted"] += 1; flagged = True
        if m.wfh_zscore is not None and m.wfh_zscore > 2:
            status["overweight"] += 1; flagged = True
        if (today - m.date_logged.date()).days > 30:
            status["stale"] += 1
        if not flagged:
            status["normal"] += 1

    given = {}
    for e in db.query(models.HealthEvent).filter(models.HealthEvent.vaccine_code.isnot(None), models.HealthEvent.done.is_(True)).all():
        given.setdefault(e.child_id, {})[e.vaccine_code] = e.date
    overdue_children = 0
    overdue_doses = 0
    for c in children:
        n = sum(1 for d in NATIONAL_SCHEDULE if dose_status(d, c.birth_date, given.get(c.id, {}).get(d.code))["status"] == "overdue")
        if n:
            overdue_children += 1
            overdue_doses += n

    measured = len([c for c in children if c.id in latest])
    return {
        "children_total": len(children),
        "children_measured": measured,
        "stunting_rate": round(status["stunted"] / measured, 4) if measured else 0.0,
        "status": status,
        "parents_total": db.query(func.count(models.ParentUser.id)).scalar() or 0,
        "regions_total": db.query(func.count(func.distinct(child.region))).filter(child.region.isnot(None)).scalar() or 0,
        "last_30_days": {
            "measurements": db.query(func.count(logs.id)).filter(logs.date_logged >= datetime.combine(since_30, datetime.min.time())).scalar() or 0,
            "children_measured": db.query(func.count(func.distinct(logs.child_id))).filter(logs.date_logged >= datetime.combine(since_30, datetime.min.time())).scalar() or 0,
            "meals": db.query(func.count(models.MealLog.id)).filter(models.MealLog.date >= since_30).scalar() or 0,
            "milestone_answers": db.query(func.count(models.MilestoneAnswer.id)).filter(models.MilestoneAnswer.answered_on >= since_30).scalar() or 0,
        },
        "immunization": {"children_with_overdue": overdue_children, "overdue_doses": overdue_doses},
    }


@router.get("/dashboard/recent-measurements")
def recent_measurements(limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    rows = (
        db.query(models.MeasurementLog, models.Child)
        .join(models.Child, models.Child.id == models.MeasurementLog.child_id)
        .order_by(models.MeasurementLog.date_logged.desc(), models.MeasurementLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": m.id,
            "child_id": c.id,
            "child_name": c.name,
            "gender": c.gender,
            "region": c.region,
            "age_in_months": age_in_months(c.birth_date, m.date_logged.date()),
            "date": m.date_logged.date(),
            "weight_kg": m.weight_kg,
            "height_cm": m.height_cm,
            "lhfa_zscore": m.lhfa_zscore,
            "wfa_zscore": m.wfa_zscore,
            "wfh_zscore": m.wfh_zscore,
            "stunting_status": classify_stunting(m.lhfa_zscore),
        }
        for m, c in rows
    ]
