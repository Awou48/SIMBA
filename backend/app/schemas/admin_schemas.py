from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    is_superadmin: bool = False


class AdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    is_superadmin: bool


class RegionStatsResponse(BaseModel):
    region_name: str
    total_children: int
    total_measurements: int
    stunted_cases: int
    severely_stunted_cases: int
    stunting_rate: float
    warning: str


class FoodItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=50)
    energy: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    safe: bool = True


class FoodItemCreate(FoodItemBase):
    pass


class FoodItemResponse(FoodItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class AKGRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    ageGroup: str
    gender: str
    energy: str
    protein: str
    fat: str
    carbs: str
    vitA: Optional[str] = None
    vitC: Optional[str] = None
    iron: Optional[str] = None
    calcium: Optional[str] = None


class AKGUpdatePayload(BaseModel):
    akg_data: List[AKGRow]


class MilestoneBase(BaseModel):
    min_months: int = Field(ge=0, le=72)
    max_months: int = Field(ge=0, le=72)
    age_label: str = Field(min_length=1, max_length=50)
    domain: str = Field(min_length=1, max_length=50)
    question: str = Field(min_length=3, max_length=500)
    expected: Optional[str] = Field(default=None, max_length=200)
    active: bool = True
    sort_order: int = 0


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneResponse(MilestoneBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
