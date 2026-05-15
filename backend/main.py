from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

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
    # TODO: Integrate Google Maps API and our ML route scoring
    # Mock response
    return {
        "route": [
            {"lat": request.source_lat, "lng": request.source_lng},
            {"lat": (request.source_lat + request.dest_lat) / 2, "lng": (request.source_lng + request.dest_lng) / 2},
            {"lat": request.dest_lat, "lng": request.dest_lng}
        ],
        "safety_score": 45,
        "warnings": ["Poor lighting near midpoint"]
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
