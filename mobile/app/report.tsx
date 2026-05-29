import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportIncident } from '../services/api';

const INCIDENT_TYPES = [
  { value: 'Suspicious Activity', label: 'Suspicious', icon: 'eye-outline', color: '#FBBC05', bg: '#FEF7E0' },
  { value: 'Poor Lighting', label: 'Poor Light', icon: 'flashlight-outline', color: '#5F6368', bg: '#F1F3F4' },
  { value: 'Crime / Theft', label: 'Theft/Crime', icon: 'alert-circle-outline', color: '#EA4335', bg: '#FCE8E6' },
  { value: 'Road Hazard', label: 'Road Hazard', icon: 'warning-outline', color: '#E37400', bg: '#FFF0E4' },
  { value: 'Harassment', label: 'Harassment', icon: 'shield-alert-outline', color: '#A50E0E', bg: '#FCE8E6' },
  { value: 'Other', label: 'Other', icon: 'help-circle-outline', color: '#1A73E8', bg: '#E8F0FE' },
];

const RISK_LEVELS = [
  { value: 'LOW', label: 'Low Risk', color: '#34A853', bg: '#E6F4EA' },
  { value: 'MODERATE', label: 'Moderate', color: '#FBBC05', bg: '#FEF7E0' },
  { value: 'HIGH', label: 'High Risk', color: '#EA4335', bg: '#FCE8E6' },
];

export default function ReportScreen() {
  const router = useRouter();

  const [incidentType, setIncidentType] = useState('Suspicious Activity');
  const [riskLevel, setRiskLevel] = useState('MODERATE');
  const [description, setDescription] = useState('');
  
  const [currentCoords, setCurrentCoords] = useState<any>(null);
  const [address, setAddress] = useState('Fetching address...');
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(0);

  useEffect(() => {
    (async () => {
      // 1. Load User ID
      try {
        const stored = await AsyncStorage.getItem('user_token');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserId(parsed.id);
        }
      } catch (err) {}

      // 2. Get Location & Address
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddress('Location permission denied.');
          setLoadingLoc(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        
        // Reverse Geocode
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });

        if (geocode && geocode.length > 0) {
          const first = geocode[0];
          const parts = [
            first.name,
            first.street,
            first.district || first.subregion,
            first.city
          ].filter(Boolean);
          setAddress(parts.join(', ') || 'Current Coordinates');
        } else {
          setAddress(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
        }
      } catch (err) {
        setAddress('Could not fetch address.');
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!currentCoords) {
      Alert.alert('Error', 'Please wait for your location coordinates to load.');
      return;
    }
    
    setSubmitting(true);
    try {
      await reportIncident(
        incidentType,
        riskLevel,
        currentCoords.latitude,
        currentCoords.longitude,
        description,
        userId
      );
      Alert.alert('Success', 'Incident reported successfully! Thank you for keeping the community safe.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#202124" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Location Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Reporting Location</Text>
          <View style={styles.locationContainer}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={22} color="#EA4335" />
            </View>
            <View style={styles.locationInfo}>
              {loadingLoc ? (
                <ActivityIndicator size="small" color="#4285F4" style={{ alignSelf: 'flex-start' }} />
              ) : (
                <>
                  <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
                  {currentCoords && (
                    <Text style={styles.coordsText}>
                      Lat: {currentCoords.latitude.toFixed(5)} · Lng: {currentCoords.longitude.toFixed(5)}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Incident Type Grid */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Select Incident Type</Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map(type => {
              const isSelected = incidentType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    { backgroundColor: isSelected ? type.color : '#fff', borderColor: isSelected ? type.color : '#DADCE0' }
                  ]}
                  onPress={() => setIncidentType(type.value)}
                >
                  <View style={[styles.typeIconWrapper, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : type.bg }]}>
                    <Ionicons name={type.icon as any} size={22} color={isSelected ? '#fff' : type.color} />
                  </View>
                  <Text style={[styles.typeLabel, { color: isSelected ? '#fff' : '#202124' }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Risk Level Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assessment of Risk</Text>
          <View style={styles.riskRow}>
            {RISK_LEVELS.map(risk => {
              const isSelected = riskLevel === risk.value;
              return (
                <TouchableOpacity
                  key={risk.value}
                  style={[
                    styles.riskCard,
                    {
                      borderColor: isSelected ? risk.color : '#DADCE0',
                      backgroundColor: isSelected ? risk.bg : '#fff',
                      borderWidth: isSelected ? 2 : 1
                    }
                  ]}
                  onPress={() => setRiskLevel(risk.value)}
                >
                  <View style={[styles.riskDot, { backgroundColor: risk.color }]} />
                  <Text style={[styles.riskText, { color: '#202124', fontWeight: isSelected ? '700' : '500' }]}>
                    {risk.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Detailed Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add Description (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what you see (e.g. broken street lights, dark alley, suspicious activity, blocked pavement...)"
            placeholderTextColor="#9AA0A6"
          />
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    height: Platform.OS === 'ios' ? 100 : 88,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FCE8E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C4043',
    lineHeight: 18,
  },
  coordsText: {
    fontSize: 12,
    color: '#70757A',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  riskCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    gap: 6,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 12,
  },
  descriptionInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    padding: 14,
    fontSize: 14,
    color: '#202124',
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 24,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
