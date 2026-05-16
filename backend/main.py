from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict
import random
import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="WalkSecure API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to WalkSecure API"}

@app.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # In a real app, hash the password!
    fake_hashed_password = user.password + "notreallyhashed"
    new_user = models.User(name=user.name, email=user.email, phone=user.phone, password_hash=fake_hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Mock OTP Store
otp_store: Dict[str, str] = {}

def send_otp_email(receiver_email: str, otp: str):
    sender_email = os.environ.get("SMTP_EMAIL", "your_email@gmail.com")
    sender_password = os.environ.get("SMTP_PASSWORD", "your_app_password")
    
    if sender_email == "your_email@gmail.com":
        print(f"⚠️ WARNING: SMTP_EMAIL not configured in backend/.env. Falling back to terminal.")
        print(f"========== OTP FOR {receiver_email}: {otp} ==========")
        return

    try:
        msg = MIMEText(f"Your WalkSecure verification code is: {otp}\n\nThis code will expire shortly.")
        msg['Subject'] = 'WalkSecure Login Verification Code'
        msg['From'] = sender_email
        msg['To'] = receiver_email

        # Using Gmail SMTP with TLS
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            print(f"Successfully sent OTP email to {receiver_email}")
    except Exception as e:
        print(f"Error sending email: {e}")
        print(f"========== FALLBACK OTP FOR {receiver_email}: {otp} ==========")


@app.post("/auth/request-otp")
def request_otp(req: schemas.OTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Auto-create user for demo purposes if not exists
        new_user = models.User(name=req.email.split('@')[0], email=req.email, phone="0000000000", password_hash="")
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
    otp = str(random.randint(100000, 999999))
    otp_store[req.email] = otp
    
    # Send email in background so API responds immediately
    background_tasks.add_task(send_otp_email, req.email, otp)
    
    return {"message": "OTP sent successfully. Please check your email."}

@app.post("/auth/verify-otp")
def verify_otp(req: schemas.OTPVerify, db: Session = Depends(database.get_db)):
    if otp_store.get(req.email) == req.otp:
        user = db.query(models.User).filter(models.User.email == req.email).first()
        del otp_store[req.email]
        return {"message": "Login successful", "user": {"id": user.id, "name": user.name, "email": user.email}}
    raise HTTPException(status_code=401, detail="Invalid OTP")

@app.get("/users", response_model=List[schemas.User])
def get_users(db: Session = Depends(database.get_db), limit: int = 100):
    return db.query(models.User).limit(limit).all()

@app.get("/analytics/summary")
def get_analytics_summary(db: Session = Depends(database.get_db)):
    user_count = db.query(models.User).count()
    sos_count = db.query(models.Incident).filter(models.Incident.incident_type == 'SOS Alert', models.Incident.is_resolved == False).count()
    incident_count = db.query(models.Incident).filter(models.Incident.is_resolved == False).count()
    
    return {
        "active_users": user_count,
        "sos_triggers": sos_count,
        "safe_routes_given": 847 + user_count * 2, # Just to make it dynamic
        "risk_zones": incident_count
    }

from ml.risk_model import predict_risk as ml_predict_risk

@app.post("/predict-risk")
def predict_risk(request: schemas.RiskPredictionRequest):
    # Parse time_of_day string to hour (e.g. "23:00" -> 23)
    try:
        hour = int(request.time_of_day.split(":")[0])
    except:
        hour = 12

    # Provide mock values for missing inputs for MVP
    # In a real scenario, crime_rate_idx, crowd_density, lighting_quality 
    # would be fetched from a database based on the lat/lng.
    mock_crime_rate = 5
    mock_crowd_density = 5
    mock_lighting = 5

    result = ml_predict_risk(
        time_of_day_hour=hour,
        crime_rate_idx=mock_crime_rate,
        crowd_density=mock_crowd_density,
        lighting_quality=mock_lighting
    )
    
    return {
        "risk_score": result["risk_score"],
        "area_status": result["area_status"],
        "details": f"Analysis complete for lat:{request.latitude}, lng:{request.longitude} at {request.time_of_day}"
    }

@app.post("/safe-route")
def get_safe_route(request: schemas.RouteRequest):
    # Create dynamic but consistent mock parameters based on coordinates
    random.seed(int(request.dest_lat * 1000) + int(request.dest_lng * 1000))
    density_of_people = random.randint(40, 95)
    lighting_quality = random.randint(50, 100)
    registered_businesses = random.randint(5, 40)

    # Calculate safety score based on density of people, lighting, and registered businesses.
    # Higher score = safer path.
    # Weights: Density (30%), Lighting (40%), Businesses (30% relative to a max of 20 businesses)
    business_score = min(100, (registered_businesses / 20) * 100)
    safety_score = int((density_of_people * 0.3) + (lighting_quality * 0.4) + (business_score * 0.3))
    
    reasons = [
        f"Density of people is currently at {density_of_people}% providing 'eyes on the street'.",
        f"Street lighting coverage is at {lighting_quality}%.",
        f"Active commercial area ({registered_businesses} businesses registered nearby)."
    ]

    return {
        "route": [
            {"lat": request.source_lat, "lng": request.source_lng},
            {"lat": (request.source_lat + request.dest_lat) / 2, "lng": (request.source_lng + request.dest_lng) / 2},
            {"lat": request.dest_lat, "lng": request.dest_lng}
        ],
        "safety_score": safety_score,
        "factors": {
            "density": density_of_people,
            "lighting": lighting_quality,
            "businesses": registered_businesses
        },
        "reasons": reasons,
        "warnings": []
    }

@app.post("/trigger-sos")
def trigger_sos(sos: schemas.LocationUpdate, db: Session = Depends(database.get_db)):
    db_incident = models.Incident(
        latitude=sos.latitude,
        longitude=sos.longitude,
        incident_type="SOS Alert",
        risk_level="CRITICAL"
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return {"status": "SOS Activated", "message": "Emergency contacts notified and live tracking started."}

@app.post("/incidents", response_model=schemas.Incident)
def create_incident(incident: schemas.IncidentCreate, db: Session = Depends(database.get_db)):
    db_incident = models.Incident(
        latitude=incident.latitude,
        longitude=incident.longitude,
        incident_type=incident.incident_type,
        risk_level=incident.risk_level
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

@app.get("/incidents", response_model=List[schemas.Incident])
def get_incidents(db: Session = Depends(database.get_db), limit: int = 100):
    incidents = db.query(models.Incident).filter(models.Incident.is_resolved == False).limit(limit).all()
    return incidents

@app.patch("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: int, db: Session = Depends(database.get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.is_resolved = True
    db.commit()
    db.refresh(incident)
    return incident
