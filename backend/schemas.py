from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True
        from_attributes = True

class IncidentCreate(BaseModel):
    latitude: float
    longitude: float
    incident_type: str
    risk_level: str

class Incident(IncidentCreate):
    id: int
    user_id: Optional[int]
    timestamp: datetime
    is_resolved: bool
    class Config:
        orm_mode = True
        from_attributes = True

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    user_id: int

class RiskPredictionRequest(BaseModel):
    latitude: float
    longitude: float
    time_of_day: str # e.g. "23:00"

class RouteRequest(BaseModel):
    source_lat: float
    source_lng: float
    dest_lat: float
    dest_lng: float
