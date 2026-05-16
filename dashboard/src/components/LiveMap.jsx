import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiClient from '../api/apiClient';

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom red icon for SOS
const sosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function LiveMap() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    // Poll the backend every 3 seconds for real-time updates from mobile app
    const fetchIncidents = () => {
      apiClient.get('/incidents')
        .then(res => setIncidents(res.data))
        .catch(err => console.error(err));
    };
    
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  const position = [37.7749, -122.4194]; 

  return (
    <MapContainer center={position} zoom={12} style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}>
      {/* Google Maps Tiles */}
      <TileLayer
        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        attribution='&copy; Google Maps'
      />
      
      {incidents.map((inc) => {
        if (inc.incident_type === 'SOS Alert') {
          return (
            <Marker key={inc.id} position={[inc.latitude, inc.longitude]} icon={sosIcon}>
              <Popup>
                <div className="text-red-600 font-bold">ACTIVE SOS ALERT</div>
                <div className="text-gray-700 text-sm">{new Date(inc.timestamp).toLocaleTimeString()}</div>
              </Popup>
            </Marker>
          );
        } else {
          // Heatmap zone for other reports
          const isHigh = inc.risk_level === 'HIGH';
          return (
            <Circle
              key={inc.id}
              center={[inc.latitude, inc.longitude]}
              radius={isHigh ? 600 : 400}
              pathOptions={{ 
                color: isHigh ? '#ef4444' : '#eab308', 
                fillColor: isHigh ? '#ef4444' : '#eab308', 
                fillOpacity: 0.4, 
                weight: 0 
              }}
            >
              <Popup>
                <div className="font-bold text-gray-900">{inc.incident_type}</div>
                <div className="text-gray-600 text-sm">Risk: {inc.risk_level}</div>
              </Popup>
            </Circle>
          );
        }
      })}
    </MapContainer>
  );
}
