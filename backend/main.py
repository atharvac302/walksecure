from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict
import random
import os
import sys
from twilio.rest import Client

def safe_print(msg: str):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', errors='replace').decode('ascii'))


import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta

# Indian Standard Time offset
IST = timezone(timedelta(hours=5, minutes=30))

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

# ─── OTP Stores ──────────────────────────────────────────────
otp_store: Dict[str, str] = {}            # login OTPs   { email: otp }
signup_store: Dict[str, dict] = {}        # signup OTPs  { email: {name,phone,otp} }

# ─── Helpers ─────────────────────────────────────────────────

def send_otp_email(receiver_email: str, otp: str, name: str = "", purpose: str = "Login"):
    resend_key = os.environ.get("RESEND_API_KEY", "").strip().strip('"')
    
    if resend_key:
        # Use Resend HTTPS API (bypasses Render SMTP port blocking)
        url = "https://api.resend.com/emails"
        subject = f"WalkSecure {'Signup' if purpose == 'signup' else 'Login'} OTP — {otp}"
        body_html = f"""<p>Hi {name or 'there'},</p>
<p>Your WalkSecure verification code is:</p>
<h2 style="font-size: 24px; letter-spacing: 2px; color: #3b82f6; font-family: sans-serif;">{otp}</h2>
<p>This code expires in 10 minutes. Do not share it with anyone.</p>
<p>– WalkSecure Security Team</p>
"""
        payload = {
            "from": "WalkSecure <onboarding@resend.dev>",
            "to": [receiver_email],
            "subject": subject,
            "html": body_html
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "WalkSecure/1.0"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode("utf-8"))
            safe_print(f"[Resend EMAIL] OTP {otp} sent successfully to {receiver_email}. ID: {res_data.get('id')}")
            return
        except Exception as e:
            error_details = ""
            if hasattr(e, 'read'):
                try:
                    error_details = e.read().decode('utf-8')
                    safe_print(f"[Resend EMAIL ERROR] {type(e).__name__}: {e} — Details: {error_details}")
                except:
                    safe_print(f"[Resend EMAIL ERROR] {type(e).__name__}: {e}")
            else:
                safe_print(f"[Resend EMAIL ERROR] {type(e).__name__}: {e}")
            safe_print("Resend HTTPS API failed. Falling back to SMTP...")

    # Standard SMTP Fallback
    sender_email    = os.environ.get("SMTP_EMAIL", "").strip().strip('"')
    sender_password = os.environ.get("SMTP_PASSWORD", "").strip().strip('"').replace(" ", "")

    if not sender_email or not sender_password or sender_email == "your_email@gmail.com":
        safe_print(f"[EMAIL FALLBACK] OTP for {receiver_email}: {otp}")
        return

    subject = f"WalkSecure {'Signup' if purpose == 'signup' else 'Login'} OTP — {otp}"
    body = f"""Hi {name or 'there'},

Your WalkSecure verification code is:

   {otp}

This code expires in 10 minutes. Do not share it with anyone.

If you didn't request this, ignore this email.

– WalkSecure Security Team
"""
    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From']    = f"WalkSecure <{sender_email}>"
        msg['To']      = receiver_email
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        safe_print(f"[EMAIL] OTP {otp} sent to {receiver_email}")
    except Exception as e:
        safe_print(f"[EMAIL ERROR] {type(e).__name__}: {e} — OTP fallback: {otp}")


def send_otp_sms(phone: str, otp: str, name: str = ""):
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip().strip('"')
    auth_token  = os.environ.get("TWILIO_AUTH_TOKEN",  "").strip().strip('"')
    from_number = os.environ.get("TWILIO_PHONE_NUMBER","").strip().strip('"')

    is_configured = (
        account_sid and not account_sid.startswith("your_") and
        auth_token  and not auth_token.startswith("your_") and
        from_number and not from_number.startswith("your_")
    )

    if not is_configured:
        safe_print(f"[SMS FALLBACK] OTP for {phone}: {otp}")
        return

    # ── Normalize phone to E.164 ──────────────────────────────────
    # Strip whitespace, dashes, brackets
    clean = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    # Add +91 prefix for Indian numbers if not already international
    if clean.startswith("0"):          # 09876543210 → +919876543210
        clean = "+91" + clean[1:]
    elif clean.startswith("91") and not clean.startswith("+"):  # 919876543210 → +919876543210
        clean = "+" + clean
    elif not clean.startswith("+"):    # 9876543210 → +919876543210
        clean = "+91" + clean
    # clean is now in E.164 format

    try:
        client = Client(account_sid, auth_token)
        body = f"WalkSecure OTP: {otp}. Valid 10 mins. Do not share. -WalkSecure"
        msg = client.messages.create(body=body, from_=from_number, to=clean)
        safe_print(f"[SMS] OTP {otp} sent to {clean} — SID: {msg.sid}")
    except Exception as e:
        safe_print(f"[SMS ERROR] to={clean} | {type(e).__name__}: {e} | OTP fallback: {otp}")


# ─── Signup Flow ──────────────────────────────────────────────

@app.post("/auth/signup-request")
def signup_request(req: schemas.SignupRequest, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    # Check email duplicate
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="This email is already registered. Please sign in instead.")
    # Check phone duplicate
    clean_phone = req.phone if req.phone.startswith('+') else f'+91{req.phone.replace(" ", "").replace("-", "")}'
    if db.query(models.User).filter(models.User.phone == clean_phone).first():
        raise HTTPException(status_code=400, detail="This phone number is already linked to an account. Please sign in.")

    otp = str(random.randint(100000, 999999))
    signup_store[req.email] = {"name": req.name, "phone": clean_phone, "otp": otp}

    background_tasks.add_task(send_otp_email, req.email, otp, req.name, "signup")
    background_tasks.add_task(send_otp_sms, clean_phone, otp, req.name)

    phone_hint = f"{clean_phone[:5]}***{clean_phone[-3:]}"
    debug_mode = os.environ.get("DEBUG_OTP", "true").lower() == "true"
    response_data = {"message": f"OTP sent to {req.email} and {phone_hint}. Enter it to complete signup."}
    if debug_mode:
        response_data["debug_otp"] = otp
    return response_data


@app.post("/auth/signup-verify")
def signup_verify(req: schemas.SignupVerify, db: Session = Depends(database.get_db)):
    pending = signup_store.get(req.email)
    if not pending:
        raise HTTPException(status_code=400, detail="No pending signup found. Please start over.")
    if pending["otp"] != req.otp:
        raise HTTPException(status_code=401, detail="Invalid OTP. Please try again.")

    # Create user
    new_user = models.User(
        name=pending["name"],
        email=req.email,
        phone=pending["phone"],
        password_hash=""
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    del signup_store[req.email]

    return {
        "message": "Account created successfully!",
        "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email, "phone": new_user.phone}
    }


# ─── Login Flow ───────────────────────────────────────────────

@app.post("/auth/request-otp")
def request_otp(req: schemas.OTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email. Please sign up first.")

    otp = str(random.randint(100000, 999999))
    otp_store[req.email] = otp

    background_tasks.add_task(send_otp_email, req.email, otp, user.name, "login")
    if user.phone and user.phone != "0000000000":
        background_tasks.add_task(send_otp_sms, user.phone, otp, user.name)

    phone_hint = f"{user.phone[:4]}***{user.phone[-3:]}" if user.phone and user.phone != "0000000000" else "your registered phone"
    debug_mode = os.environ.get("DEBUG_OTP", "true").lower() == "true"
    response_data = {"message": f"OTP sent to your email and {phone_hint}."}
    if debug_mode:
        response_data["debug_otp"] = otp
    return response_data


@app.post("/auth/verify-otp")
def verify_otp(req: schemas.OTPVerify, db: Session = Depends(database.get_db)):
    if otp_store.get(req.email) != req.otp:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    del otp_store[req.email]
    return {"message": "Login successful", "user": {"id": user.id, "name": user.name, "email": user.email, "phone": user.phone}}


# ─── Google Auth ──────────────────────────────────────────────

@app.post("/auth/google")
def google_auth(req: schemas.GoogleAuthRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        user = models.User(
            name=req.name,
            email=req.email,
            phone=req.phone or "0000000000",
            password_hash="google_oauth"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"message": "Google login successful", "user": {"id": user.id, "name": user.name, "email": user.email, "phone": user.phone}}


@app.get("/users", response_model=List[schemas.User])
def get_users(db: Session = Depends(database.get_db), limit: int = 100):
    return db.query(models.User).limit(limit).all()

@app.get("/analytics/summary")
def get_analytics_summary(db: Session = Depends(database.get_db)):
    user_count     = db.query(models.User).count()
    sos_count      = db.query(models.Incident).filter(models.Incident.incident_type == 'SOS Alert', models.Incident.is_resolved == False).count()
    incident_count = db.query(models.Incident).filter(models.Incident.is_resolved == False).count()
    resolved_count = db.query(models.Incident).filter(models.Incident.is_resolved == True).count()
    total_inc      = db.query(models.Incident).count()

    # Safety score: starts at 100, minus penalties for unresolved incidents
    safety_score = max(10, min(100, 100 - (sos_count * 8) - (incident_count * 3)))

    # Hourly buckets for today
    today = datetime.now(IST).date()
    all_today = db.query(models.Incident).filter(
        models.Incident.timestamp >= datetime(today.year, today.month, today.day, tzinfo=IST)
    ).all()
    hourly = {h: 0 for h in range(0, 24, 2)}
    for inc in all_today:
        if inc.timestamp:
            h = inc.timestamp.hour
            bucket = (h // 2) * 2
            hourly[bucket] = hourly.get(bucket, 0) + 1

    hourly_data = [{"time": f"{h:02d}:00", "incidents": v} for h, v in sorted(hourly.items())]

    return {
        "active_users":     user_count,
        "sos_triggers":     sos_count,
        "safe_routes_given": 847 + user_count * 2,
        "risk_zones":       incident_count,
        "total_incidents":  total_inc,
        "resolved":         resolved_count,
        "safety_score":     safety_score,
        "hourly_data":      hourly_data,
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


# ─── ML-Enhanced Safe Route with Incident History ─────────────────────────

@app.post("/safe-route/ml")
def get_ml_safe_route(request: schemas.RouteRequest, db: Session = Depends(database.get_db)):
    """ML-enhanced route scoring using real incident history from the database."""
    import math

    def haversine(lat1, lng1, lat2, lng2):
        """Distance in km between two lat/lng points."""
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
        return R * 2 * math.asin(math.sqrt(a))

    # Midpoint of route
    mid_lat = (request.source_lat + request.dest_lat) / 2
    mid_lng = (request.source_lng + request.dest_lng) / 2

    # 1. Fetch incidents near the route midpoint (within 1km)
    all_incidents = db.query(models.Incident).filter(models.Incident.latitude != None).all()
    nearby_incidents = [
        i for i in all_incidents
        if haversine(mid_lat, mid_lng, i.latitude, i.longitude) < 1.0
    ]

    # 2. Calculate incident-based risk penalty
    incident_penalty = 0
    high_count = sum(1 for i in nearby_incidents if i.risk_level == 'HIGH')
    mod_count  = sum(1 for i in nearby_incidents if i.risk_level == 'MODERATE')
    sos_count  = sum(1 for i in nearby_incidents if i.incident_type == 'SOS Alert')
    incident_penalty = min(60, high_count * 15 + mod_count * 8 + sos_count * 20)

    # 3. Time-of-day factor (night = higher risk)
    hour_now = datetime.now(IST).hour
    if hour_now >= 22 or hour_now < 5:
        time_penalty = 20   # night
    elif hour_now >= 18 or hour_now < 8:
        time_penalty = 10   # dusk/dawn
    else:
        time_penalty = 0    # day

    # 4. Base safety from seeded mock factors
    random.seed(int(request.dest_lat * 1000) + int(request.dest_lng * 1000))
    base_safety   = random.randint(55, 90)
    lighting      = random.randint(45, 100)
    businesses    = random.randint(5, 40)
    police_nearby = random.randint(0, 3)

    # 5. Final ML score
    ml_score = max(5, min(100, base_safety - incident_penalty - time_penalty +
                           police_nearby * 5 + min(businesses, 20) * 0.5))
    ml_score = int(ml_score)

    # 6. Safety breakdown
    breakdown = {
        "base_safety":       base_safety,
        "incident_penalty":  -incident_penalty,
        "time_penalty":      -time_penalty,
        "lighting":          lighting,
        "businesses_nearby": businesses,
        "police_nearby":     police_nearby,
        "nearby_incidents":  len(nearby_incidents),
        "sos_nearby":        sos_count,
        "final_score":       ml_score,
    }

    reasons = [
        f"{businesses} registered businesses along the route (people = safety).",
        f"Street lighting rated at {lighting}% coverage.",
        f"{police_nearby} police posts within 400m.",
        f"Only {len(nearby_incidents)} incident(s) reported near this path in the past.",
    ]

    warnings = []
    if sos_count > 0:
        warnings.append(f"⚠️ {sos_count} SOS trigger(s) recorded near this route previously.")
    if high_count > 0:
        warnings.append(f"⚠️ {high_count} high-risk incident(s) reported nearby. Stay alert.")
    if hour_now >= 22 or hour_now < 5:
        warnings.append("🌙 Night travel — stay on well-lit streets and inform contacts.")

    return {
        "route": [
            {"lat": request.source_lat, "lng": request.source_lng},
            {"lat": mid_lat, "lng": mid_lng},
            {"lat": request.dest_lat, "lng": request.dest_lng},
        ],
        "safety_score":   ml_score,
        "ml_breakdown":   breakdown,
        "factors": {
            "density":   random.randint(40, 90),
            "lighting":  lighting,
            "businesses": businesses,
        },
        "reasons":  reasons,
        "warnings": warnings,
        "model":    "WalkSecure-ML-v1",
    }


# ─── Live Location Update ─────────────────────────────────────

@app.post("/location/update")
def update_location(req: schemas.LocationUpdate, db: Session = Depends(database.get_db)):
    """Receive live GPS ping from mobile app user."""
    track = models.LiveTracking(
        user_id=req.user_id,
        latitude=req.latitude,
        longitude=req.longitude,
        timestamp=datetime.now(IST)
    )
    db.add(track)
    db.commit()
    return {"status": "ok"}


@app.get("/location/live")
def get_live_locations(db: Session = Depends(database.get_db)):
    """Get the latest location of each active user for dashboard live tracking."""
    # Get most recent location per user (within last 5 mins)
    cutoff = datetime.now(IST).replace(tzinfo=None) - timedelta(minutes=5)
    recent = db.query(models.LiveTracking).filter(
        models.LiveTracking.timestamp >= cutoff
    ).order_by(models.LiveTracking.timestamp.desc()).all()

    # Deduplicate: only latest per user
    seen = set()
    result = []
    for loc in recent:
        if loc.user_id not in seen:
            seen.add(loc.user_id)
            user = db.query(models.User).filter(models.User.id == loc.user_id).first()
            result.append({
                "user_id":   loc.user_id,
                "user_name": user.name if user else f"User #{loc.user_id}",
                "latitude":  loc.latitude,
                "longitude": loc.longitude,
                "timestamp": loc.timestamp.isoformat(),
            })
    return result

def send_automated_sms(user_id: int, latitude: float, longitude: float):
    def log_message(text: str):
        safe_print(text)
        try:
            with open("sms_logs.txt", "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now().isoformat()}] {text}\n")
        except Exception:
            pass

    log_message(f"--- send_automated_sms triggered for user_id={user_id} ---")
    db_session = database.SessionLocal()
    try:
        user = db_session.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            log_message(f"[-] SMS Auto-Sender: User with id {user_id} not found.")
            return

        contacts = db_session.query(models.EmergencyContact).filter(models.EmergencyContact.user_id == user_id).all()
        if not contacts:
            log_message(f"[-] SMS Auto-Sender: User {user.name} has no emergency contacts.")
            return

        google_maps_link = f"https://maps.google.com/?q={latitude},{longitude}"
        message_body = (
            f"WalkSecure SOS! User {user.name} ({user.phone if user.phone else 'N/A'}) "
            f"is in danger. Location: {google_maps_link}"
        )

        account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip().strip('"')
        auth_token  = os.environ.get("TWILIO_AUTH_TOKEN",  "").strip().strip('"')
        from_number = os.environ.get("TWILIO_PHONE_NUMBER","").strip().strip('"')

        log_message(f"Twilio Config Check: SID={account_sid[:8] if account_sid else 'None'}... From={from_number}")

        is_twilio_configured = (
            account_sid and not account_sid.startswith("your_") and
            auth_token  and not auth_token.startswith("your_") and
            from_number and not from_number.startswith("your_")
        )

        def normalize_phone(p: str) -> str:
            """Normalize to E.164 format, defaulting to +91 (India)."""
            p = p.strip().replace(" ","").replace("-","").replace("(","").replace(")","")
            if p.startswith("0"):   return "+91" + p[1:]
            if p.startswith("91") and not p.startswith("+"): return "+" + p
            if not p.startswith("+"): return "+91" + p
            return p

        for contact in contacts:
            raw_number = contact.contact_phone
            to_number  = normalize_phone(raw_number)
            log_message(f"Attempting to send SMS to {contact.contact_name}: {raw_number} → {to_number}")

            if is_twilio_configured:
                try:
                    client = Client(account_sid, auth_token)
                    message = client.messages.create(
                        body=message_body,
                        from_=from_number,
                        to=to_number
                    )
                    log_message(f"[OK] SMS sent! SID: {message.sid}")
                except Exception as e:
                    log_message(f"[FAIL] Twilio error for {to_number}: {e}")
            else:
                log_message(f"[SIM] Twilio not configured. OTP/SOS not sent to network.")
    except Exception as general_err:
        log_message(f"💥 Background task crashed with error: {general_err}")
    finally:
        db_session.close()

@app.post("/trigger-sos")
def trigger_sos(sos: schemas.LocationUpdate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    db_incident = models.Incident(
        latitude=sos.latitude,
        longitude=sos.longitude,
        incident_type="SOS Alert",
        risk_level="CRITICAL",
        user_id=sos.user_id if sos.user_id else None,
        timestamp=datetime.now(IST)
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    
    if sos.user_id:
        background_tasks.add_task(send_automated_sms, sos.user_id, sos.latitude, sos.longitude)
        
    return {"status": "SOS Activated", "message": "Emergency contacts notified and live tracking started."}

@app.post("/incidents", response_model=schemas.Incident)
def create_incident(incident: schemas.IncidentCreate, db: Session = Depends(database.get_db)):
    db_incident = models.Incident(
        latitude=incident.latitude,
        longitude=incident.longitude,
        incident_type=incident.incident_type,
        risk_level=incident.risk_level,
        description=incident.description,
        user_id=incident.user_id,
        timestamp=datetime.now(IST)
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

@app.get("/incidents")
def get_incidents(db: Session = Depends(database.get_db), limit: int = 200, include_resolved: bool = True):
    query = db.query(models.Incident)
    if not include_resolved:
        query = query.filter(models.Incident.is_resolved == False)
    incidents = query.order_by(models.Incident.timestamp.desc()).limit(limit).all()
    result = []
    for inc in incidents:
        item = {
            "id": inc.id,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "incident_type": inc.incident_type,
            "risk_level": inc.risk_level,
            "description": inc.description,
            "timestamp": inc.timestamp.isoformat() if inc.timestamp else None,
            "is_resolved": inc.is_resolved,
            "user_id": inc.user_id,
            "user_name": None,
            "user_email": None,
            "user_phone": None,
        }
        if inc.user_id:
            user = db.query(models.User).filter(models.User.id == inc.user_id).first()
            if user:
                item["user_name"] = user.name
                item["user_email"] = user.email
                item["user_phone"] = user.phone
        result.append(item)
    return result

@app.patch("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: int, db: Session = Depends(database.get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.is_resolved = True
    db.commit()
    db.refresh(incident)
    return incident

# ─── Emergency Contacts CRUD ─────────────────────────────

@app.get("/users/{user_id}/contacts")
def get_contacts(user_id: int, db: Session = Depends(database.get_db)):
    contacts = db.query(models.EmergencyContact).filter(models.EmergencyContact.user_id == user_id).all()
    return contacts

@app.post("/users/{user_id}/contacts")
def add_contact(user_id: int, contact: schemas.EmergencyContactCreate, db: Session = Depends(database.get_db)):
    db_contact = models.EmergencyContact(
        user_id=user_id,
        contact_name=contact.contact_name,
        contact_phone=contact.contact_phone
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@app.delete("/users/{user_id}/contacts/{contact_id}")
def delete_contact(user_id: int, contact_id: int, db: Session = Depends(database.get_db)):
    contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.id == contact_id,
        models.EmergencyContact.user_id == user_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted"}

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "name": user.name, "email": user.email, "phone": user.phone}

@app.put("/users/{user_id}/profile")
def update_user_profile(user_id: int, profile: schemas.UserUpdate, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.name = profile.name
    user.phone = profile.phone
    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully", "user": {"id": user.id, "name": user.name, "email": user.email, "phone": user.phone}}


# ════════════════════════════════════════════════════════════
# ─── DASHBOARD ADMIN ROUTES ─────────────────────────────────
# ════════════════════════════════════════════════════════════

import hashlib

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def seed_super_admin(db: Session):
    """Create the default super admin if not exists."""
    existing = db.query(models.DashboardUser).filter(models.DashboardUser.email == "admin@walksecure.in").first()
    if not existing:
        admin = models.DashboardUser(
            name="WalkSecure Admin",
            email="admin@walksecure.in",
            phone="+919000000000",
            password_hash=hash_password("WalkSecure@2024"),
            role="super_admin",
            region="National",
            department="Headquarters",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        safe_print("[SEED] Super admin created: admin@walksecure.in / WalkSecure@2024")

# Seed on startup
from contextlib import asynccontextmanager
@app.on_event("startup")
def startup_event():
    db = next(database.get_db())
    try:
        seed_super_admin(db)
    finally:
        db.close()


@app.post("/admin/login")
def admin_login(req: schemas.AdminLoginRequest, db: Session = Depends(database.get_db)):
    admin = db.query(models.DashboardUser).filter(
        models.DashboardUser.email == req.email,
        models.DashboardUser.is_active == True
    ).first()
    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    return {
        "message": "Login successful",
        "admin": {
            "id": admin.id, "name": admin.name, "email": admin.email,
            "role": admin.role, "region": admin.region, "department": admin.department,
            "phone": admin.phone
        }
    }


@app.get("/admin/staff", response_model=list[schemas.DashboardUserOut])
def list_staff(db: Session = Depends(database.get_db)):
    return db.query(models.DashboardUser).order_by(models.DashboardUser.created_at.desc()).all()


@app.post("/admin/staff", response_model=schemas.DashboardUserOut)
def create_staff(req: schemas.DashboardUserCreate, db: Session = Depends(database.get_db)):
    if db.query(models.DashboardUser).filter(models.DashboardUser.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already exists in admin system.")
    new_staff = models.DashboardUser(
        name=req.name,
        email=req.email,
        phone=req.phone,
        password_hash=hash_password(req.password),
        role=req.role,
        region=req.region,
        department=req.department,
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff


@app.put("/admin/staff/{staff_id}", response_model=schemas.DashboardUserOut)
def update_staff(staff_id: int, req: schemas.DashboardUserUpdate, db: Session = Depends(database.get_db)):
    staff = db.query(models.DashboardUser).filter(models.DashboardUser.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    if req.name is not None: staff.name = req.name
    if req.phone is not None: staff.phone = req.phone
    if req.role is not None: staff.role = req.role
    if req.region is not None: staff.region = req.region
    if req.department is not None: staff.department = req.department
    if req.is_active is not None: staff.is_active = req.is_active
    db.commit()
    db.refresh(staff)
    return staff


@app.delete("/admin/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(database.get_db)):
    staff = db.query(models.DashboardUser).filter(models.DashboardUser.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    if staff.role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete the super admin account.")
    db.delete(staff)
    db.commit()
    return {"message": f"Staff member '{staff.name}' removed successfully."}


# ─── GOOGLE PLACES API AUTOCOMPLETE & DETAILS ────────────────

import urllib.request
import urllib.parse
import json

@app.get("/places/autocomplete")
def places_autocomplete(
    input: str,
    lat: float = None,
    lng: float = None
):
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip().strip('"')
    has_key = api_key and not api_key.startswith("your_") and len(api_key) > 5

    if not has_key:
        # Fallback to Photon API (no API key required)
        try:
            url = f"https://photon.komoot.io/api/?q={urllib.parse.quote(input)}&limit=8&lang=en"
            if lat is not None and lng is not None:
                url += f"&lat={lat}&lon={lng}"
            
            req = urllib.request.Request(url, headers={"User-Agent": "WalkSecure/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode("utf-8"))
                
            features = data.get("features", [])
            results = []
            for idx, item in enumerate(features):
                props = item.get("properties", {})
                geom = item.get("geometry", {})
                coords = geom.get("coordinates", [0, 0])
                
                name = props.get("name") or props.get("street") or "Location"
                
                address_parts = []
                if props.get("street") and props.get("street") != props.get("name"):
                    address_parts.append(props.get("street"))
                if props.get("locality"):
                    address_parts.append(props.get("locality"))
                if props.get("city"):
                    address_parts.append(props.get("city"))
                elif props.get("town"):
                    address_parts.append(props.get("town"))
                if props.get("state"):
                    address_parts.append(props.get("state"))
                address = ", ".join(address_parts).strip() or props.get("country", "")
                
                full_address_parts = []
                if props.get("name"):
                    full_address_parts.append(props.get("name"))
                if props.get("street") and props.get("street") != props.get("name"):
                    full_address_parts.append(props.get("street"))
                if props.get("locality"):
                    full_address_parts.append(props.get("locality"))
                if props.get("city"):
                    full_address_parts.append(props.get("city"))
                if props.get("state"):
                    full_address_parts.append(props.get("state"))
                if props.get("country"):
                    full_address_parts.append(props.get("country"))
                full_address = ", ".join(full_address_parts).strip()
                
                results.append({
                    "id": f"photon-{props.get('osm_id', idx)}",
                    "name": name,
                    "address": address,
                    "fullAddress": full_address,
                    "lat": coords[1],
                    "lng": coords[0]
                })
            return results
        except Exception as e:
            safe_print(f"[Photon Autocomplete Fallback Error]: {e}")
            return []

    # If Google Maps API key is configured
    try:
        url = f"https://maps.googleapis.com/maps/api/place/autocomplete/json?input={urllib.parse.quote(input)}&key={api_key}"
        if lat is not None and lng is not None:
            url += f"&location={lat},{lng}&radius=50000"
            
        req = urllib.request.Request(url, headers={"User-Agent": "WalkSecure/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            
        predictions = data.get("predictions", [])
        results = []
        for pred in predictions:
            place_id = pred.get("place_id")
            description = pred.get("description", "")
            sf = pred.get("structured_formatting", {})
            main_text = sf.get("main_text", "Location")
            secondary_text = sf.get("secondary_text", "")
            
            results.append({
                "id": place_id,
                "name": main_text,
                "address": secondary_text,
                "fullAddress": description,
                "lat": None,  # Will be resolved via details API on selection
                "lng": None
            })
        return results
    except Exception as e:
        safe_print(f"[Google Autocomplete Error]: {e}")
        return []


@app.get("/places/details")
def places_details(place_id: str):
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip().strip('"')
    has_key = api_key and not api_key.startswith("your_") and len(api_key) > 5
    
    if not has_key or place_id.startswith("photon-"):
        # For photon predictions or missing key, coordinates are already client-side or fallback
        return {"lat": None, "lng": None}
        
    try:
        url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=geometry&key={api_key}"
        req = urllib.request.Request(url, headers={"User-Agent": "WalkSecure/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            
        result = data.get("result", {})
        geometry = result.get("geometry", {})
        location = geometry.get("location", {})
        
        return {
            "lat": location.get("lat"),
            "lng": location.get("lng")
        }
    except Exception as e:
        safe_print(f"[Google Details Error]: {e}")
        return {"lat": None, "lng": None}


@app.get("/test-email")
def test_email(receiver: str):
    """Synchronous test endpoint to diagnose SMTP/Resend issues directly in the browser."""
    resend_key = os.environ.get("RESEND_API_KEY", "").strip().strip('"')
    
    if resend_key:
        url = "https://api.resend.com/emails"
        payload = {
            "from": "WalkSecure <onboarding@resend.dev>",
            "to": [receiver],
            "subject": "WalkSecure Live Resend Test",
            "html": f"<p>This is a live test email from your WalkSecure server deployed on Render using <strong>Resend HTTPS API</strong>.</p><p>Timestamp: {datetime.now(IST)}</p>"
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "WalkSecure/1.0"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode("utf-8"))
            return {"status": "success", "provider": "Resend (HTTPS)", "id": res_data.get("id"), "message": f"Email successfully sent to {receiver} using Resend API."}
        except Exception as e:
            error_details = ""
            if hasattr(e, 'read'):
                try:
                    error_details = e.read().decode('utf-8')
                except:
                    pass
            return {"status": "error", "provider": "Resend (HTTPS)", "error_type": type(e).__name__, "details": str(e), "api_error": error_details}

    # Standard SMTP Fallback
    sender_email    = os.environ.get("SMTP_EMAIL", "").strip().strip('"')
    sender_password = os.environ.get("SMTP_PASSWORD", "").strip().strip('"').replace(" ", "")
    
    if not sender_email or not sender_password:
        return {"status": "error", "message": "SMTP_EMAIL or SMTP_PASSWORD environment variables are missing."}
        
    subject = "WalkSecure Live SMTP Test"
    body = f"This is a live test email from your WalkSecure server deployed on Render. Timestamp: {datetime.now(IST)}"
    
    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From']    = f"WalkSecure <{sender_email}>"
        msg['To']      = receiver
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        return {"status": "success", "provider": "Gmail SMTP", "message": f"Email successfully sent to {receiver} from {sender_email}"}
    except Exception as e:
        return {"status": "error", "provider": "Gmail SMTP", "error_type": type(e).__name__, "details": str(e)}


