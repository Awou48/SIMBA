from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
from sqlalchemy import Boolean

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

class MeasurementLog(Base):
    __tablename__ = "measurement_logs"
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id"))
    date_logged = Column(DateTime, default=datetime.utcnow)
    age_in_days = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    wfa_zscore = Column(Float, nullable=True) 
    lhfa_zscore = Column(Float, nullable=True) 
    
    child = relationship("Child", back_populates="measurements")

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