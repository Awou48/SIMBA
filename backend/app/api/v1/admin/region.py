from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas

router = APIRouter(dependencies=[Depends(get_current_admin)])

STUNTING_WARNING_THRESHOLD = 0.20  # WHO "high" public-health prevalence threshold


@router.get("/dashboard/stunting-stats", response_model=admin_schemas.RegionStatsResponse)
def get_regional_stunting_stats(db: Session = Depends(get_db)):
    logs = models.MeasurementLog
    total_children = db.query(func.count(models.Child.id)).scalar() or 0
    total_logs = db.query(func.count(logs.id)).scalar() or 0
    stunted = db.query(func.count(logs.id)).filter(logs.lhfa_zscore < -2.0).scalar() or 0
    severely = db.query(func.count(logs.id)).filter(logs.lhfa_zscore < -3.0).scalar() or 0

    rate = round(stunted / total_logs, 4) if total_logs else 0.0
    return {
        "region_name": "Tangerang Raya (Aggregated)",
        "total_children": total_children,
        "total_measurements": total_logs,
        "stunted_cases": stunted,
        "severely_stunted_cases": severely,
        "stunting_rate": rate,
        "warning": "Stunting rate exceeds 20%" if rate > STUNTING_WARNING_THRESHOLD else "Normal",
    }
