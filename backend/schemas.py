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
        from_attributes = True

class IncidentCreate(BaseModel):
    latitude: float
    longitude: float
    incident_type: str
    risk_level: str
    description: Optional[str] = None
    user_id: Optional[int] = None

class Incident(IncidentCreate):
    id: int
    user_id: Optional[int]
    timestamp: datetime
    is_resolved: bool
    class Config:
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

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class EmergencyContactCreate(BaseModel):
    contact_name: str
    contact_phone: str

class UserUpdate(BaseModel):
    name: str
    phone: str

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str

class SignupVerify(BaseModel):
    email: EmailStr
    phone: str
    otp: str

class GoogleAuthRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

# ─── Dashboard Admin Schemas ──────────────────────────────────
class DashboardUserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    role: str  # super_admin | region_supervisor | area_head | police | hospital
    region: Optional[str] = None
    department: Optional[str] = None

class DashboardUserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    region: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class DashboardUserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    region: Optional[str]
    department: Optional[str]
    is_active: bool
    created_at: datetime
    created_by: Optional[int]
    class Config:
        from_attributes = True

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str
