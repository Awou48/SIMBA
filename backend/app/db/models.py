from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base
from sqlalchemy import Boolean


def utcnow() -> datetime:
    """Naive UTC timestamp (columns are timezone-less DateTime)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class ParentUser(Base):
    __tablename__ = "parents"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    children = relationship("Child", back_populates="parent")

class AdminUser(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    is_superadmin = Column(Integer, default=0)

class Child(Base):
    __tablename__ = "children"
    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parents.id"))
    name = Column(String)
    gender = Column(String)
    birth_date = Column(Date)
    
    parent = relationship("ParentUser", back_populates="children")
    measurements = relationship("MeasurementLog", back_populates="child")
    meals = relationship("MealLog", back_populates="child", cascade="all, delete-orphan")
    milestone_answers = relationship("MilestoneAnswer", back_populates="child", cascade="all, delete-orphan")

class MeasurementLog(Base):
    __tablename__ = "measurement_logs"
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id"))
    date_logged = Column(DateTime, default=utcnow)
    age_in_days = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    wfa_zscore = Column(Float, nullable=True)
    lhfa_zscore = Column(Float, nullable=True)
    wfh_zscore = Column(Float, nullable=True)  # weight-for-length/height (wasting)
    bfa_zscore = Column(Float, nullable=True)  # BMI-for-age
    
    child = relationship("Child", back_populates="measurements")

class MealLog(Base):
    """One food item eaten by a child at a meal. Nutrients are snapshotted at
    log time (already multiplied by `servings`) so history survives later edits
    or deletions in the food database."""
    __tablename__ = "meal_logs"
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="SET NULL"), nullable=True)
    food_name = Column(String, nullable=False)
    meal_type = Column(String, nullable=False)  # Breakfast / Lunch / Dinner / Snack
    date = Column(Date, nullable=False, index=True)
    servings = Column(Float, nullable=False, default=1.0)
    energy = Column(Float, nullable=False, default=0.0)
    protein = Column(Float, nullable=False, default=0.0)
    carbs = Column(Float, nullable=False, default=0.0)
    fat = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=utcnow)

    child = relationship("Child", back_populates="meals")


class FoodItem(Base):
    __tablename__ = "foods"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    energy = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    safe = Column(Boolean, default=True)

class AKGTarget(Base):
    __tablename__ = "akg_targets"
    id = Column(Integer, primary_key=True, index=True)
    ageGroup = Column(String)  # Matching frontend camelCase for easy JSON parsing
    gender = Column(String)
    energy = Column(String)
    protein = Column(String)
    fat = Column(String)
    carbs = Column(String)
    vitA = Column(String, nullable=True)
    vitC = Column(String, nullable=True)
    iron = Column(String, nullable=True)
    calcium = Column(String, nullable=True)

class GrowthStandard(Base):
    __tablename__ = "growth_standards"
    id = Column(Integer, primary_key=True, index=True)
    gender = Column(String)
    metric = Column(String)
    age = Column(String)
    p3 = Column(String)
    p15 = Column(String)
    p50 = Column(String)
    p85 = Column(String)
    p97 = Column(String)

class Milestone(Base):
    """KPSP (Kuesioner Pra Skrining Perkembangan) screening question, managed by admins."""
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True, index=True)
    min_months = Column(Integer, nullable=False)
    max_months = Column(Integer, nullable=False)  # exclusive upper bound (half-open bracket)
    age_label = Column(String, nullable=False)  # e.g. "6 - 12 Months"
    domain = Column(String, nullable=False)  # Motorik Kasar / Motorik Halus / Bicara & Bahasa / Sosialisasi / Kemandirian
    question = Column(Text, nullable=False)
    expected = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)


class MilestoneAnswer(Base):
    """A parent's yes/no answer for one child and one milestone."""
    __tablename__ = "milestone_answers"
    __table_args__ = (UniqueConstraint("child_id", "milestone_id", name="uq_child_milestone"),)
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone_id = Column(Integer, ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False, index=True)
    achieved = Column(Boolean, nullable=False)
    answered_on = Column(Date, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    child = relationship("Child", back_populates="milestone_answers")
    milestone = relationship("Milestone")
