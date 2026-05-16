import { Platform } from 'react-native';
import Constants from 'expo-constants';

let BASE_URL = 'http://localhost:8000';
const debuggerHost = Constants.expoConfig?.hostUri;

if (debuggerHost) {
  // If running in Expo Go on a physical device, extract the computer's local Wi-Fi IP address!
  const ip = debuggerHost.split(':')[0];
  BASE_URL = `http://${ip}:8000`;
} else if (Platform.OS === 'android') {
  // Fallback for Android Emulator
  BASE_URL = 'http://10.0.2.2:8000';
}

console.log("WalkSecure Backend URL dynamically set to:", BASE_URL);

export const triggerSOS = async (lat: number, lng: number) => {
  const response = await fetch(`${BASE_URL}/trigger-sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng, user_id: 1 })
  });
  return response.json();
};

export const getSafeRoute = async (sourceLat: number, sourceLng: number, destLat: number, destLng: number) => {
  const response = await fetch(`${BASE_URL}/safe-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_lat: sourceLat, source_lng: sourceLng, dest_lat: destLat, dest_lng: destLng })
  });
  return response.json();
};

export const reportIncident = async (type: string, riskLevel: string, lat: number, lng: number) => {
  const response = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng, incident_type: type, risk_level: riskLevel })
  });
  return response.json();
};

export const requestOTP = async (email: string) => {
  const response = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!response.ok) throw new Error("Failed to request OTP");
  return response.json();
};

export const verifyOTP = async (email: string, otp: string) => {
  const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  if (!response.ok) throw new Error("Invalid OTP");
  return response.json();
};
