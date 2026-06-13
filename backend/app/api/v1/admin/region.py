from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db import models
from app.core.security import get_current_admin

router = APIRouter()

@router.get("/dashboard/stunting-stats")
def get_regional_stunting_stats(db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    total_logs = db.query(models.MeasurementLog).count()
    stunted = db.query(models.MeasurementLog).filter(models.MeasurementLog.lhfa_zscore < -2.0).count()
    
    return {
        "region_name": "Tangerang Raya (Aggregated)",
        "total_measurements": total_logs,
        "stunted_cases": stunted,
        "warning": "Stunting rate exceeds 20%" if (stunted/total_logs > 0.2) else "Normal"
    }