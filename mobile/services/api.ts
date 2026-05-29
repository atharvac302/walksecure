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

export const triggerSOS = async (lat: number, lng: number, userId: number = 0) => {
  const response = await fetch(`${BASE_URL}/trigger-sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng, user_id: userId })
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

// ML-powered route scoring with incident history
export const getSafeRouteML = async (sourceLat: number, sourceLng: number, destLat: number, destLng: number) => {
  try {
    const response = await fetch(`${BASE_URL}/safe-route/ml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_lat: sourceLat, source_lng: sourceLng, dest_lat: destLat, dest_lng: destLng })
    });
    if (!response.ok) return null;
    return response.json();
  } catch { return null; }
};

// Send live location to backend for dashboard tracking
export const updateLocation = async (userId: number, lat: number, lng: number) => {
  try {
    await fetch(`${BASE_URL}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, latitude: lat, longitude: lng })
    });
  } catch { /* fail silently */ }
};

export const reportIncident = async (type: string, riskLevel: string, lat: number, lng: number, description: string = "", userId: number = 0) => {
  const response = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: lat,
      longitude: lng,
      incident_type: type,
      risk_level: riskLevel,
      description,
      user_id: userId > 0 ? userId : null
    })
  });
  return response.json();
};

export const requestOTP = async (email: string) => {
  const response = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to request OTP");
  }
  return response.json();
};

export const verifyOTP = async (email: string, otp: string) => {
  const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Invalid OTP");
  }
  return response.json();
};

export const signupRequest = async (name: string, email: string, phone: string) => {
  const response = await fetch(`${BASE_URL}/auth/signup-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Signup failed");
  }
  return response.json();
};

export const signupVerify = async (email: string, phone: string, otp: string) => {
  const response = await fetch(`${BASE_URL}/auth/signup-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, otp })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "OTP verification failed");
  }
  return response.json();
};

export const googleAuth = async (name: string, email: string, phone?: string) => {
  const response = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Google auth failed");
  }
  return response.json();
};

export const getContacts = async (userId: number) => {
  const response = await fetch(`${BASE_URL}/users/${userId}/contacts`);
  return response.json();
};

export const addContact = async (userId: number, name: string, phone: string) => {
  const response = await fetch(`${BASE_URL}/users/${userId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact_name: name, contact_phone: phone })
  });
  return response.json();
};

export const deleteContact = async (userId: number, contactId: number) => {
  const response = await fetch(`${BASE_URL}/users/${userId}/contacts/${contactId}`, {
    method: 'DELETE'
  });
  return response.json();
};

export const updateProfile = async (userId: number, name: string, phone: string) => {
  const response = await fetch(`${BASE_URL}/users/${userId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone })
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
};

export const getUser = async (userId: number) => {
  const response = await fetch(`${BASE_URL}/users/${userId}`);
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
};

export const searchPlaces = async (query: string, lat?: number, lng?: number) => {
  let url = `${BASE_URL}/places/autocomplete?input=${encodeURIComponent(query)}`;
  if (lat !== undefined && lng !== undefined) {
    url += `&lat=${lat}&lng=${lng}`;
  }
  const response = await fetch(url);
  if (!response.ok) return [];
  return response.json();
};

export const getPlaceDetails = async (placeId: string) => {
  const response = await fetch(`${BASE_URL}/places/details?place_id=${encodeURIComponent(placeId)}`);
  if (!response.ok) return { lat: null, lng: null };
  return response.json();
};


