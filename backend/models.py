from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    emergency_contacts = relationship("EmergencyContact", back_populates="user")
    incidents = relationship("Incident", back_populates="user")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    contact_name = Column(String)
    contact_phone = Column(String)
    
    user = relationship("User", back_populates="emergency_contacts")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Can be reported anonymously
    latitude = Column(Float)
    longitude = Column(Float)
    incident_type = Column(String)
    risk_level = Column(String) # HIGH, MODERATE, LOW
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    is_resolved = Column(Boolean, default=False)
    description = Column(String, nullable=True)
    
    user = relationship("User", back_populates="incidents")

class DangerZone(Base):
    __tablename__ = "danger_zones"
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    risk_score = Column(Float)
    radius_meters = Column(Float, default=100.0)

class LiveTracking(Base):
    __tablename__ = "live_tracking"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class DashboardUser(Base):
    __tablename__ = "dashboard_users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="region_supervisor")
    # Roles: super_admin | region_supervisor | area_head | police | hospital
    region = Column(String, nullable=True)
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("dashboard_users.id"), nullable=True)

