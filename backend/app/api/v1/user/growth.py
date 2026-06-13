from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.schemas import user_schemas
from app.services.zscore_calc import analyze_stunting, analyze_weight
from datetime import date

router = APIRouter()

@router.post("/child/{child_id}/measurements", response_model=user_schemas.MeasurementResponse)
def log_measurement(child_id: int, measurement: user_schemas.MeasurementCreate, db: Session = Depends(get_db)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    age_timedelta = measurement.date_logged - child.birth_date
    age_in_days = age_timedelta.days
    lhfa_analysis = analyze_stunting(child.gender, age_in_days, measurement.height_cm)
    wfa_analysis = analyze_weight(child.gender, age_in_days, measurement.weight_kg)
    
    if "error" in lhfa_analysis:
        raise HTTPException(status_code=400, detail=f"Height Error: {lhfa_analysis['error']}")
    if "error" in wfa_analysis:
        raise HTTPException(status_code=400, detail=f"Weight Error: {wfa_analysis['error']}")
    
    new_log = models.MeasurementLog(
        child_id=child.id,
        age_in_days=age_in_days,
        weight_kg=measurement.weight_kg,
        height_cm=measurement.height_cm,
        lhfa_zscore=lhfa_analysis["z_score"],
        wfa_zscore=wfa_analysis["z_score"]
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    return {
        "age_in_days": age_in_days,
        "weight_kg": new_log.weight_kg,
        "height_cm": new_log.height_cm,
        "wfa_zscore": wfa_analysis["z_score"],
        "lhfa_zscore": lhfa_analysis["z_score"],
        "stunting_status": lhfa_analysis["status"],
        "weight_status": wfa_analysis["status"] 
    }