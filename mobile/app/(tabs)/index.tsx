import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, Platform, Keyboard, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { triggerSOS, getSafeRoute, reportIncident } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

export default function HomeScreen() {
  const [sourceText, setSourceText] = useState('Locating...');
  const [destinationText, setDestinationText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [routeData, setRouteData] = useState<any>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const [currentLoc, setCurrentLoc] = useState<any>(null);
  const [destinationCoords, setDestinationCoords] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  
  const [isNavigating, setIsNavigating] = useState(false);

  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incidentType, setIncidentType] = useState('Suspicious Activity');
  
  const mapRef = useRef<any>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentLoc({ latitude: 19.8762, longitude: 75.3433 }); 
        setSourceText('Fallback Location');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setCurrentLoc({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setSourceText('Current Location');
      
      // Keep tracking for navigation
      Location.watchPositionAsync({ distanceInterval: 10, timeInterval: 5000 }, (newLoc) => {
          if (isNavigating) {
              setCurrentLoc({ latitude: newLoc.coords.latitude, longitude: newLoc.coords.longitude });
              if (mapRef.current) {
                  mapRef.current.animateCamera({ center: { latitude: newLoc.coords.latitude, longitude: newLoc.coords.longitude }, zoom: 18, pitch: 60 });
              }
          }
      });
    })();
  }, [isNavigating]);

  const handleSearchChange = (text: string) => {
    setDestinationText(text);
    if (text.length < 3) {
      setShowDropdown(false);
      return;
    }
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`, {
          headers: { 'User-Agent': 'WalkSecureMobileApp/1.0', 'Accept': 'application/json' }
        });
        if (!response.ok) return;
        const data = await response.json();
        const results = data.map((item: any) => ({
          id: item.place_id,
          name: item.display_name.split(',')[0],
          address: item.display_name.split(',').slice(1).join(',').trim(),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }));
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (error) {}
    }, 600); 
  };

  const handleSelectPlace = async (place: any) => {
    if (!currentLoc) return alert('Waiting for GPS...');
    Keyboard.dismiss();
    setDestinationText(place.name);
    setShowDropdown(false);
    setDestinationCoords({ latitude: place.lat, longitude: place.lng });
    setLoadingRoute(true);
    
    try {
      const data = await getSafeRoute(currentLoc.latitude, currentLoc.longitude, place.lat, place.lng); 
      setRouteData(data);
      
      const routeResponse = await fetch(`http://router.project-osrm.org/route/v1/driving/${currentLoc.longitude},${currentLoc.latitude};${place.lng},${place.lat}?overview=full&geometries=geojson`);
      const routeJson = await routeResponse.json();
      
      if (routeJson.routes && routeJson.routes.length > 0) {
        const coordinates = routeJson.routes[0].geometry.coordinates;
        const mappedRoute = coordinates.map((coord: any) => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        
        setRouteCoords(mappedRoute);

        if (mapRef.current) {
          mapRef.current.fitToCoordinates(mappedRoute, {
             edgePadding: { right: 50, bottom: 350, left: 50, top: 150 },
             animated: true,
          });
        }
      } else {
        alert("Could not find a driveable street route.");
      }
    } catch (error) {
      console.log("Error calculating safe route.", error);
    }
    setLoadingRoute(false);
  };

  const startNavigation = () => {
      setIsNavigating(true);
      if (mapRef.current && currentLoc) {
          mapRef.current.animateCamera({ 
              center: { latitude: currentLoc.latitude, longitude: currentLoc.longitude }, 
              zoom: 18, 
              pitch: 60, 
              heading: 0 
          });
      }
  };

  const endNavigation = () => {
      setIsNavigating(false);
      setDestinationCoords(null);
      setRouteCoords([]);
      setDestinationText('');
      setRouteData(null);
      if (mapRef.current && currentLoc) {
          mapRef.current.animateCamera({ center: currentLoc, zoom: 15, pitch: 0 });
      }
  };

  const handleTriggerSOS = async () => {
    if (!currentLoc) return;
    try {
      await triggerSOS(currentLoc.latitude, currentLoc.longitude); 
      alert("SOS Activated! Sent to Web Dashboard.");
    } catch (error) {
      alert("Backend not reachable.");
    }
  };

  const handleReportIncident = async () => {
    if (!currentLoc) return;
    try {
      await reportIncident(incidentType, 'HIGH', currentLoc.latitude, currentLoc.longitude);
      alert("Incident reported! Heatmap updated.");
      setIncidentModalVisible(false);
    } catch (error) {
      alert("Error reporting incident.");
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && MapView && currentLoc ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: currentLoc.latitude,
            longitude: currentLoc.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
        >
           {destinationCoords && (
              <Marker coordinate={destinationCoords} title="Destination" pinColor="red" />
           )}
           {routeCoords.length > 0 && Polyline && (
              <Polyline 
                coordinates={routeCoords}
                strokeColor={isNavigating ? "#10b981" : "#3b82f6"}
                strokeWidth={isNavigating ? 8 : 5}
                lineJoin="round"
                lineCap="round"
              />
           )}
        </MapView>
      ) : (
         <View style={styles.webMapFallback}>
           <Text style={{color: '#94a3b8'}}>Maps disabled on Web Preview.</Text>
         </View>
      )}

      {/* TOP PANEL */}
      {!isNavigating ? (
        <View style={styles.topPanel} pointerEvents="box-none">
          <View style={styles.header}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="shield-checkmark" size={28} color="#3b82f6" style={{marginRight: 8}}/>
                <Text style={styles.title}>Walk<Text style={styles.titleSecure}>Secure</Text></Text>
            </View>
            <TouchableOpacity style={styles.reportBtn} onPress={() => setIncidentModalVisible(true)}>
              <Text style={styles.reportBtnText}>+ Report</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.inputWrapper}>
                <Ionicons name="radio-button-on" size={16} color="#3b82f6" style={styles.inputIcon}/>
                <TextInput 
                  style={[styles.input, { color: '#94a3b8' }]} 
                  value={sourceText}
                  editable={false}
                />
            </View>
            <View style={[styles.inputWrapper, {marginTop: 10}]}>
                <Ionicons name="location" size={16} color="#ef4444" style={styles.inputIcon}/>
                <TextInput 
                  style={styles.input} 
                  placeholder="Where to? Search globally..." 
                  placeholderTextColor="#64748b"
                  value={destinationText}
                  onChangeText={handleSearchChange}
                />
            </View>

            {showDropdown && (
              <View style={styles.dropdown}>
                {searchResults.length === 0 ? (
                  <Text style={styles.dropdownItemText}>Searching...</Text>
                ) : (
                  searchResults.map(place => (
                    <TouchableOpacity key={place.id} style={styles.dropdownItem} onPress={() => handleSelectPlace(place)}>
                      <Ionicons name="search" size={16} color="#94a3b8" style={{marginRight: 10, marginTop: 2}}/>
                      <View style={{flex: 1}}>
                          <Text style={styles.dropdownItemTitle}>{place.name}</Text>
                          <Text style={styles.dropdownItemSub} numberOfLines={1}>{place.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          {loadingRoute && !showDropdown && (
            <View style={styles.loadingRoute}>
              <ActivityIndicator color="#fff" style={{marginRight: 10}}/>
              <Text style={styles.loadingRouteText}>Analyzing AI Risk Path...</Text>
            </View>
          )}

          {routeData && !loadingRoute && !showDropdown && (
            <View style={styles.routeResult}>
              <View style={styles.scoreRow}>
                <Text style={styles.routeText}>AI Safety Score</Text>
                <View style={[styles.scoreBadge, { backgroundColor: routeData.safety_score > 70 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
                    <Text style={[styles.scoreVal, { color: routeData.safety_score > 70 ? '#ef4444' : '#10b981' }]}>
                        {routeData.safety_score}/100
                    </Text>
                </View>
              </View>
              <Text style={styles.routeSubtext}>Optimized to avoid high-risk zones.</Text>
              
              {/* BRAND NEW: Start Navigation Button */}
              <TouchableOpacity style={styles.startNavBtn} onPress={startNavigation}>
                  <Ionicons name="navigate" size={20} color="#fff" style={{marginRight: 8}}/>
                  <Text style={styles.startNavBtnText}>Start Secure Navigation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* ACTIVE NAVIGATION TOP PANEL */
        <View style={styles.navTopPanel}>
            <View style={styles.navHeader}>
                <Ionicons name="arrow-up-circle" size={40} color="#10b981" />
                <View style={{marginLeft: 15, flex: 1}}>
                    <Text style={styles.navDirection}>Head towards Destination</Text>
                    <Text style={styles.navStreet}>Follow the green path</Text>
                </View>
            </View>
            <View style={styles.navStats}>
                <Text style={styles.navStatText}>{Math.round(routeCoords.length * 2.5)} min</Text>
                <Text style={styles.navStatTextDivider}>•</Text>
                <Text style={styles.navStatText}>{routeData?.safety_score < 50 ? 'Safe Route' : 'Caution Advised'}</Text>
            </View>
        </View>
      )}

      {/* BOTTOM PANEL */}
      {!isNavigating ? (
        <View style={styles.bottomPanel} pointerEvents="box-none">
          <View style={styles.sosContainer}>
            <TouchableOpacity style={styles.sosButton} onPress={handleTriggerSOS} activeOpacity={0.8}>
              <Ionicons name="warning" size={32} color="#fff" />
              <Text style={styles.sosText}>S.O.S</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ACTIVE NAVIGATION BOTTOM PANEL */
        <View style={styles.navBottomPanel}>
            <TouchableOpacity style={styles.endNavBtn} onPress={endNavigation}>
                <Ionicons name="close" size={20} color="#ef4444" style={{marginRight: 5}}/>
                <Text style={styles.endNavBtnText}>Exit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.sosButton, {width: 60, height: 60, borderRadius: 30, borderWidth: 2}]} onPress={handleTriggerSOS}>
              <Text style={[styles.sosText, {fontSize: 14}]}>SOS</Text>
            </TouchableOpacity>
        </View>
      )}

      {/* Incident Modal */}
      <Modal visible={incidentModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Incident</Text>
            <Text style={styles.modalSub}>Alert others & update the live heatmap.</Text>
            
            <View style={styles.typeSelector}>
              {['Suspicious Activity', 'Poor Lighting', 'Crime / Theft'].map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.typeBtn, incidentType === type && styles.typeBtnActive]}
                  onPress={() => setIncidentType(type)}
                >
                  <Text style={[styles.typeBtnText, incidentType === type && styles.typeBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIncidentModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleReportIncident}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  
  topPanel: { position: 'absolute', top: 0, width: '100%', paddingTop: Platform.OS === 'web' ? 20 : 50, paddingHorizontal: 20, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#1e293b', textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 },
  titleSecure: { color: '#3b82f6' },
  reportBtn: { backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#f87171' },
  reportBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  
  searchContainer: { zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#334155' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#ffffff', height: 50, fontSize: 15 },
  
  dropdown: { backgroundColor: '#1e293b', borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#334155', maxHeight: 250 },
  dropdownItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#334155', alignItems: 'center' },
  dropdownItemTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
  dropdownItemSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  dropdownItemText: { color: '#94a3b8', padding: 15, textAlign: 'center' },
  
  loadingRoute: { flexDirection: 'row', backgroundColor: '#3b82f6', borderRadius: 12, padding: 15, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  loadingRouteText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  
  routeResult: { marginTop: 15, padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  routeText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  scoreVal: { fontWeight: '900', fontSize: 16 },
  routeSubtext: { color: '#94a3b8', fontSize: 13, marginTop: 5, marginBottom: 20 },
  
  startNavBtn: { backgroundColor: '#3b82f6', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  startNavBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  navTopPanel: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(16, 185, 129, 0.95)', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  navHeader: { flexDirection: 'row', alignItems: 'center' },
  navDirection: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  navStreet: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
  navStats: { flexDirection: 'row', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  navStatText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  navStatTextDivider: { color: 'rgba(255,255,255,0.5)', marginHorizontal: 10 },
  
  bottomPanel: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 20 },
  sosContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  sosButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10, borderWidth: 3, borderColor: '#fca5a5' },
  sosText: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginTop: 2 },

  navBottomPanel: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  endNavBtn: { backgroundColor: '#1e293b', flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  endNavBtnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },

  webMapFallback: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 10 },
  modalSub: { color: '#94a3b8', fontSize: 14, marginBottom: 25 },
  typeSelector: { marginBottom: 30 },
  typeBtn: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12, backgroundColor: '#0f172a' },
  typeBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  typeBtnText: { color: '#94a3b8', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  typeBtnTextActive: { color: '#ffffff' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 15, borderRadius: 12, flex: 1, marginRight: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  cancelBtnText: { color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  submitBtn: { padding: 15, borderRadius: 12, flex: 1, marginLeft: 10, backgroundColor: '#ef4444' },
  submitBtnText: { color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
});
