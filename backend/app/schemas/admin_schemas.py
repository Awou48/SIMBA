from pydantic import BaseModel
from typing import List, Optional

class AdminLogin(BaseModel):
    email: str
    password: str

class RegionStatsResponse(BaseModel):
    region_name: str
    total_children: int
    stunted_count: int
    severely_stunted_count: int
    normal_count: int

class FoodItemBase(BaseModel):
    name: str
    category: str
    energy: float
    protein: float
    carbs: float
    fat: float
    safe: bool

class FoodItemCreate(FoodItemBase):
    pass

class FoodItemResponse(FoodItemBase):
    id: int
    class Config:
        from_attributes = True

class AKGRow(BaseModel):
    id: Optional[int] = None
    ageGroup: str
    gender: str
    energy: str
    protein: str
    fat: str
    carbs: str
    vitA: str
    vitC: str
    iron: str
    calcium: str

class AKGUpdatePayload(BaseModel):
    akg_data: List[AKGRow]