from pydantic import BaseModel
from datetime import date

class ChildBase(BaseModel):
    name: str
    gender: str
    birth_date: date

class ChildCreate(ChildBase):
    pass

class ChildResponse(ChildBase):
    id: int
    parent_id: int

    class Config:
        from_attributes = True 

class MeasurementCreate(BaseModel):
    weight_kg: float
    height_cm: float
    date_logged: date


class MeasurementResponse(BaseModel):
    age_in_days: int
    weight_kg: float
    height_cm: float
    wfa_zscore: float
    lhfa_zscore: float
    stunting_status: str
    weight_status: str

    class Config:
        from_attributes = True

class NutritionIntake(BaseModel):
    age_in_months: int
    total_protein: float
    total_energy: float