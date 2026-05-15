import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# Ensure the directory exists
os.makedirs(os.path.dirname(__file__), exist_ok=True)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')

def train_model():
    """Trains a mock risk prediction model and saves it."""
    # Synthetic data: 0: Safe, 1: Moderate, 2: Dangerous
    data = {
        'time_of_day_hour': [2, 14, 23, 10, 3, 15, 20, 8, 1, 12, 22, 11, 4, 16],
        'crime_rate_idx': [8, 2, 9, 3, 7, 1, 6, 2, 9, 1, 7, 2, 8, 3],
        'crowd_density': [1, 8, 2, 7, 1, 9, 5, 8, 1, 9, 3, 7, 2, 6], # 1: Low, 10: High
        'lighting_quality': [2, 9, 3, 8, 1, 9, 4, 8, 2, 9, 4, 8, 2, 7], # 1: Poor, 10: Good
        'risk_level': [2, 0, 2, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0] 
    }
    df = pd.DataFrame(data)
    
    X = df[['time_of_day_hour', 'crime_rate_idx', 'crowd_density', 'lighting_quality']]
    y = df['risk_level']
    
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X, y)
    
    joblib.dump(model, MODEL_PATH)

def predict_risk(time_of_day_hour: int, crime_rate_idx: int, crowd_density: int, lighting_quality: int):
    """Predicts risk using the trained model."""
    if not os.path.exists(MODEL_PATH):
        train_model()
        
    model = joblib.load(MODEL_PATH)
    prediction = model.predict([[time_of_day_hour, crime_rate_idx, crowd_density, lighting_quality]])[0]
    
    risk_mapping = {0: "SAFE", 1: "MODERATE RISK", 2: "HIGH RISK"}
    risk_status = risk_mapping.get(prediction, "UNKNOWN")
    
    # Calculate a rough risk score out of 100 based on inputs
    score = (crime_rate_idx * 5) + (24 - time_of_day_hour if time_of_day_hour < 6 or time_of_day_hour > 18 else time_of_day_hour) * 2 - (crowd_density * 2) - (lighting_quality * 2)
    score = max(10, min(99, int(score))) # Clamp between 10 and 99
    
    return {
        "risk_score": score,
        "area_status": risk_status
    }

if __name__ == "__main__":
    train_model()
