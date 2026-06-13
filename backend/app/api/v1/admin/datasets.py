from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.schemas import admin_schemas
from typing import List

router = APIRouter()

@router.get("/akg")
def get_akg_data(db: Session = Depends(get_db)):
    return db.query(models.AKGTarget).all()

@router.post("/update-akg")
def update_akg(payload: admin_schemas.AKGUpdatePayload, db: Session = Depends(get_db)):
    db.query(models.AKGTarget).delete()
    new_rows = []
    for row_data in payload.akg_data:
        row_dict = row_data.model_dump(exclude={"id"})
        new_row = models.AKGTarget(**row_dict)
        new_rows.append(new_row)
        
    db.add_all(new_rows)
    db.commit()
    
    return {"status": "success", "message": "AKG targets successfully updated in database!"}