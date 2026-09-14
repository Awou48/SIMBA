from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas

router = APIRouter(dependencies=[Depends(get_current_admin)])

STUNTING_WARNING_THRESHOLD = 0.20  # WHO "high" public-health prevalence threshold
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
