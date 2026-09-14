from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ParentRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class ChildBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    gender: Literal["male", "female"]
    birth_date: date


class ChildCreate(ChildBase):
    pass


class ChildResponse(ChildBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_id: int


class MeasurementCreate(BaseModel):
    weight_kg: float = Field(gt=0, le=60)
    height_cm: float = Field(gt=0, le=150)
    date_logged: date

    @field_validator("date_logged", mode="before")
    @classmethod
    def _strip_time(cls, v):
        # The mobile UI sends "YYYY-MM-DDT00:00:00"; keep only the calendar date.
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, str) and "T" in v:
            return v.split("T", 1)[0]
        return v


class MeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date_logged: datetime
    age_in_days: int
    weight_kg: float
    height_cm: float
    wfa_zscore: float
    lhfa_zscore: float
    wfh_zscore: Optional[float] = None
    bfa_zscore: Optional[float] = None
    bmi: Optional[float] = None
    stunting_status: str
    weight_status: str
    wasting_status: Optional[str] = None
    bmi_status: Optional[str] = None


class NutritionIntake(BaseModel):
    # Deprecated: age is derived from the child's birth date server-side.
    age_in_months: Optional[int] = None
    total_protein: float = Field(ge=0)
    total_energy: float = Field(ge=0)


class GrowthStandardPoint(BaseModel):
    age_months: int
    p3: float
    p15: float
    p50: float
    p85: float
    p97: float


MealType = Literal["Breakfast", "Lunch", "Dinner", "Snack"]


class FoodSearchItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    energy: float
    protein: float
    carbs: float
    fat: float
    safe: bool


class MealCreate(BaseModel):
    food_id: int
    meal_type: MealType
    date: date
    servings: float = Field(default=1.0, gt=0, le=20)


class MealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    food_id: Optional[int]
    food_name: str
    meal_type: MealType
    date: date
    servings: float
    energy: float
    protein: float
    carbs: float
    fat: float


class NutrientTotals(BaseModel):
    energy: float
    protein: float
    carbs: float
    fat: float


class DailyMealSummary(BaseModel):
    date: date
    age_in_months: int
    meals: List[MealResponse]
    totals: NutrientTotals
    targets: Optional[NutrientTotals] = None
    fulfillment_percent: Optional[NutrientTotals] = None
    akg_bracket: Optional[str] = None


class MilestoneItem(BaseModel):
    id: int
    min_months: int
    max_months: int
    age_label: str
    domain: str
    question: str
    expected: Optional[str] = None
    achieved: Optional[bool] = None  # None = not answered yet
    answered_on: Optional[date] = None


class MilestoneAnswerIn(BaseModel):
    achieved: bool


class MilestoneChecklist(BaseModel):
    age_in_months: int
    age_label: Optional[str] = None
    items: List[MilestoneItem]
    total: int
    answered: int
    achieved: int
    interpretation: Optional[str] = None  # Sesuai / Meragukan / Penyimpangan (KPSP), None until all answered
