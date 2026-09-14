from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_owned_child
from app.db import models
from app.schemas import user_schemas
from app.services.nutrition_calc import calculate_akg_fulfillment

router = APIRouter()


def age_in_months(birth_date: date, on: date | None = None) -> int:
    on = on or date.today()
    months = (on.year - birth_date.year) * 12 + (on.month - birth_date.month)
    if on.day < birth_date.day:
        months -= 1
    return max(months, 0)


@router.post("/nutrition/{child_id}/analyze")
def analyze_daily_intake(
    payload: user_schemas.NutritionIntake,
    child: models.Child = Depends(get_owned_child),
):
    # Age is always derived from the child's record; the payload's age_in_months is ignored.
    months = age_in_months(child.birth_date)
    analysis = calculate_akg_fulfillment(months, payload.total_protein, payload.total_energy)
    if "error" in analysis:
        raise HTTPException(status_code=400, detail=analysis["error"])
    return {"message": "Intake analyzed successfully", "data": analysis}
