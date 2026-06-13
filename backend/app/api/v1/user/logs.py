from fastapi import APIRouter, Depends
from app.services.nutrition_calc import calculate_akg_fulfillment
from app.core.security import get_current_user
from app.schemas import user_schemas 

router = APIRouter()

@router.post("/nutrition/{child_id}/analyze")
def analyze_daily_intake(
    child_id: int, 
    payload: user_schemas.NutritionIntake, 
    current_user = Depends(get_current_user)
):
    analysis = calculate_akg_fulfillment(payload.age_in_months, payload.total_protein, payload.total_energy)
    return {"message": "Intake analyzed successfully", "data": analysis}