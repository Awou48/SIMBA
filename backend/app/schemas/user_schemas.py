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
    region: Optional[str] = Field(default=None, max_length=100)


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
    wfa_zscore: Optional[float] = None
    lhfa_zscore: Optional[float] = None
    wfh_zscore: Optional[float] = None
    bfa_zscore: Optional[float] = None
    bmi: Optional[float] = None
    stunting_status: str
    weight_status: str
    wasting_status: Optional[str] = None
    bmi_status: Optional[str] = None


class NutritionIntake(BaseModel):
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
    achieved: Optional[bool] = None
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
    interpretation: Optional[str] = None


EventType = Literal["Vaccination", "Doctor Visit", "Checkup", "Other"]


class HealthEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    event_type: EventType = "Vaccination"
    date: date
    time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    notes: Optional[str] = Field(default=None, max_length=500)
    done: bool = False


class HealthEventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    event_type: Optional[EventType] = None
    date: Optional[date] = None
    time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    notes: Optional[str] = Field(default=None, max_length=500)
    done: Optional[bool] = None


class HealthEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    event_type: EventType
    date: date
    time: Optional[str] = None
    notes: Optional[str] = None
    done: bool
    vaccine_code: Optional[str] = None


class VaccineDoseStatus(BaseModel):
    code: str
    name: str
    vaccine: str
    dose: str
    due_age_months: int
    due_date: date
    late_after: date
    note: str
    status: Literal["given", "due", "overdue", "upcoming"]
    given_on: Optional[date] = None
    event_id: Optional[int] = None


class ImmunizationSummary(BaseModel):
    schedule: List[VaccineDoseStatus]
    given: int
    due: int
    overdue: int
    upcoming: int
    next_dose: Optional[VaccineDoseStatus] = None


class MarkGivenIn(BaseModel):
    given_on: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class ChildUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    gender: Optional[Literal["male", "female"]] = None
    birth_date: Optional[date] = None
    region: Optional[str] = Field(default=None, max_length=100)


class AlertItem(BaseModel):
    id: str
    category: Literal["Growth", "Nutrition", "Development", "Immunization"]
    severity: Literal["high", "medium", "low"]
    title: str
    description: str
    date: date
    action_path: str


class ArticleView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    author: str
    read_time_min: int
    summary: str
    body: Optional[str] = None
    updated_at: datetime
