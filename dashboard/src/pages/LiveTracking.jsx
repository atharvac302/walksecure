import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiClient from '../api/apiClient';
import {
  Users, AlertOctagon, ShieldCheck, Activity, RefreshCw,
  MapPin, Clock, Phone, Mail, Eye, Radio
} from 'lucide-react';

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const sosIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#ef4444;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(239,68,68,0.3),0 2px 8px rgba(0,0,0,0.3);animation:sosPulse 1.5s infinite;">
    <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
  </div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
});

const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12],
});

const incidentIcon = (color) => new L.DivIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:${color};border:2px solid #fff;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10],
});

// Auto-fit map to all markers
function MapFitter({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => L.latLng(m[0], m[1])));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [markers.length]);
  return null;
}

// Mock live user locations (replace with real WebSocket in production)
const MOCK_LIVE_USERS = [
  { id: 101, name: 'Priya S.',  lat: 19.0760, lng: 72.8777, status: 'safe',    lastSeen: '2m ago' },
  { id: 102, name: 'Arjun M.', lat: 19.0830, lng: 72.8905, status: 'walking', lastSeen: '1m ago' },
  { id: 103, name: 'Neha K.',  lat: 19.0700, lng: 72.8650, status: 'safe',    lastSeen: '5m ago' },
  { id: 104, name: 'Rohan T.', lat: 19.0920, lng: 72.8800, status: 'sos',     lastSeen: 'now'    },
];

export default function LiveTracking() {
  const [incidents,   setIncidents]   = useState([]);
  const [liveUsers,   setLiveUsers]   = useState(MOCK_LIVE_USERS);
  const [selectedInc, setSelectedInc] = useState(null);
  const [filterMode,  setFilterMode]  = useState('all');
  const [lastUpdate,  setLastUpdate]  = useState(new Date());
  const [loading,     setLoading]     = useState(false);

  const mapCenter = [19.076, 72.877]; // Mumbai default

  const fetchData = useCallback(async () => {
    try {
      const [incRes, locRes] = await Promise.allSettled([
        apiClient.get('/incidents'),
        apiClient.get('/location/live'),
      ]);
      if (incRes.status === 'fulfilled') setIncidents(incRes.value.data || []);
      if (locRes.status === 'fulfilled' && locRes.value.data?.length > 0) {
        setLiveUsers(locRes.value.data.map((u) => ({
          id: u.user_id, name: u.user_name, lat: u.latitude, lng: u.longitude,
          status: 'walking', lastSeen: 'live',
        })));
      } else {
        // Animate mock users to simulate live movement
        setLiveUsers(prev => prev.map(u => ({
          ...u, lat: u.lat + (Math.random() - 0.5) * 0.0005,
          lng: u.lng + (Math.random() - 0.5) * 0.0005,
        })));
      }
      setLastUpdate(new Date());
    } catch { /* use existing data */ }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const sosAlerts    = incidents.filter(i => i.incident_type === 'SOS Alert' && !i.is_resolved);
  const activeIncs   = incidents.filter(i => !i.is_resolved);
  const resolvedIncs = incidents.filter(i => i.is_resolved);

  const allMarkers = [
    ...liveUsers.map(u => [u.lat, u.lng]),
    ...incidents.filter(i => i.latitude).map(i => [i.latitude, i.longitude]),
  ];

  const handleResolve = async (id) => {
    try {
      await apiClient.patch(`/incidents/${id}/resolve`);
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, is_resolved: true } : i));
      setSelectedInc(null);
    } catch { alert('Failed to resolve incident'); }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <style>{`
        @keyframes sosPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(239,68,68,0.3), 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0.1), 0 2px 8px rgba(0,0,0,0.3); }
        }
      `}</style>

      {/* ── Left sidebar ── */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-black text-slate-900">Live Tracking</h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-600 font-bold">LIVE</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Updated {lastUpdate.toLocaleTimeString()}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {[
            { label: 'Active Users',    value: liveUsers.length, color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Users },
            { label: 'SOS Alerts',      value: sosAlerts.length, color: 'text-red-600',    bg: 'bg-red-50',    icon: AlertOctagon },
            { label: 'Active Incidents',value: activeIncs.length,color: 'text-amber-600',  bg: 'bg-amber-50',  icon: Activity },
            { label: 'Resolved Today',  value: resolvedIncs.length,color: 'text-emerald-600',bg: 'bg-emerald-50',icon: ShieldCheck },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3`}>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="px-4 pb-3">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {['all','sos','incidents','users'].map(m => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${filterMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {/* Live users */}
          {(filterMode === 'all' || filterMode === 'users') && liveUsers.map(user => (
            <div key={user.id} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:border-blue-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${user.status === 'sos' ? 'bg-red-500' : 'bg-blue-500'}`}>
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    {user.status === 'sos' && (
                      <span className="text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full animate-pulse">SOS</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{user.lastSeen} · {user.lat.toFixed(4)}, {user.lng.toFixed(4)}</p>
                </div>
                <Radio size={14} className={user.status === 'sos' ? 'text-red-500 animate-pulse' : 'text-emerald-500'} />
              </div>
            </div>
          ))}

          {/* SOS incidents */}
          {(filterMode === 'all' || filterMode === 'sos') && sosAlerts.map(inc => (
            <div key={inc.id} onClick={() => setSelectedInc(inc)}
              className="bg-red-50 border border-red-200 rounded-2xl p-3 cursor-pointer hover:border-red-400 transition-all">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                  <AlertOctagon size={14} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800">🚨 SOS Alert</p>
                  <p className="text-xs text-red-600">{inc.user_name || `User #${inc.user_id}`}</p>
                  <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} />{inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
                  </p>
                </div>
                <span className="text-[10px] text-red-500 font-medium">{new Date(inc.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}

          {/* Other incidents */}
          {(filterMode === 'all' || filterMode === 'incidents') &&
            incidents.filter(i => i.incident_type !== 'SOS Alert' && !i.is_resolved).map(inc => (
              <div key={inc.id} onClick={() => setSelectedInc(inc)}
                className="bg-white border border-slate-100 rounded-2xl p-3 cursor-pointer hover:border-amber-300 transition-all shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Activity size={14} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{inc.incident_type}</p>
                    <p className="text-xs text-slate-500">{inc.user_name || 'Anonymous'}</p>
                    <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${inc.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inc.risk_level}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {allMarkers.length > 0 && <MapFitter markers={allMarkers} />}

          {/* Live users */}
          {(filterMode === 'all' || filterMode === 'users') && liveUsers.map(user => (
            <Marker key={user.id} position={[user.lat, user.lng]}
              icon={user.status === 'sos' ? sosIcon : userIcon}>
              <Popup>
                <div className="font-bold text-slate-900">{user.name}</div>
                <div className="text-sm text-slate-500">Status: {user.status}</div>
                <div className="text-sm text-slate-500">Last seen: {user.lastSeen}</div>
              </Popup>
            </Marker>
          ))}

          {/* Incidents */}
          {incidents.filter(i => i.latitude && !i.is_resolved).map(inc => {
            const isSOS  = inc.incident_type === 'SOS Alert';
            const isHigh = inc.risk_level === 'HIGH';
            return (
              <React.Fragment key={inc.id}>
                <Circle
                  center={[inc.latitude, inc.longitude]}
                  radius={isSOS ? 500 : isHigh ? 400 : 250}
                  pathOptions={{
                    color:       isSOS ? '#ef4444' : isHigh ? '#f59e0b' : '#3b82f6',
                    fillColor:   isSOS ? '#ef4444' : isHigh ? '#f59e0b' : '#3b82f6',
                    fillOpacity: 0.18,
                    weight:      1.5,
                  }}
                />
                {isSOS && (
                  <Marker position={[inc.latitude, inc.longitude]} icon={sosIcon}>
                    <Popup>
                      <div className="font-bold text-red-600">🚨 SOS Alert</div>
                      <div className="text-sm">{inc.user_name || `User #${inc.user_id}`}</div>
                      <div className="text-xs text-slate-500">{new Date(inc.timestamp).toLocaleString()}</div>
                      <button onClick={() => handleResolve(inc.id)}
                        className="mt-2 w-full bg-emerald-600 text-white text-xs py-1 rounded font-bold">
                        Mark Resolved
                      </button>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Map legend */}
        <div className="absolute bottom-6 right-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-lg z-[1000]">
          <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Legend</p>
          <div className="space-y-2">
            {[
              { color: 'bg-blue-500',  label: 'Live Users' },
              { color: 'bg-red-500',   label: 'SOS Alert' },
              { color: 'bg-amber-500', label: 'High Risk Incident' },
              { color: 'bg-blue-400',  label: 'Moderate Incident' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${l.color}`} />
                <span className="text-xs text-slate-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Refresh button */}
        <button onClick={fetchData}
          className="absolute top-4 right-4 z-[1000] bg-white border border-slate-200 rounded-xl p-2.5 shadow-md hover:bg-slate-50 transition-all">
          <RefreshCw size={18} className="text-slate-600" />
        </button>
      </div>

      {/* ── Incident detail panel ── */}
      {selectedInc && (
        <div className="w-72 bg-white border-l border-slate-200 p-5 flex flex-col shadow-sm overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-slate-900">Incident #{selectedInc.id}</h3>
            <button onClick={() => setSelectedInc(null)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>

          <div className={`rounded-2xl p-4 mb-4 ${selectedInc.incident_type === 'SOS Alert' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-bold text-slate-900 text-sm">{selectedInc.incident_type}</p>
            <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${selectedInc.is_resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {selectedInc.is_resolved ? 'RESOLVED' : 'ACTIVE'}
            </span>
          </div>

          <div className="space-y-3 text-sm flex-1">
            {selectedInc.user_name && (
              <div className="flex gap-2">
                <Users size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div><p className="text-xs text-slate-400">User</p><p className="font-semibold text-slate-900">{selectedInc.user_name}</p></div>
              </div>
            )}
            {selectedInc.user_phone && selectedInc.user_phone !== '0000000000' && (
              <div className="flex gap-2">
                <Phone size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div><p className="text-xs text-slate-400">Phone</p><a href={`tel:${selectedInc.user_phone}`} className="font-semibold text-blue-600">{selectedInc.user_phone}</a></div>
              </div>
            )}
            {selectedInc.user_email && (
              <div className="flex gap-2">
                <Mail size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div><p className="text-xs text-slate-400">Email</p><p className="font-semibold text-slate-900 text-xs">{selectedInc.user_email}</p></div>
              </div>
            )}
            <div className="flex gap-2">
              <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Location</p>
                <a href={`https://www.google.com/maps?q=${selectedInc.latitude},${selectedInc.longitude}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 text-xs">
                  {selectedInc.latitude?.toFixed(5)}, {selectedInc.longitude?.toFixed(5)} ↗
                </a>
              </div>
            </div>
            <div className="flex gap-2">
              <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <div><p className="text-xs text-slate-400">Time</p><p className="font-semibold text-slate-900">{new Date(selectedInc.timestamp).toLocaleString()}</p></div>
            </div>
            {selectedInc.description && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reporter Description</p>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">{selectedInc.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4">
            {!selectedInc.is_resolved && (
              <button onClick={() => handleResolve(selectedInc.id)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all">
                ✓ Mark as Resolved
              </button>
            )}
            <a href={`https://www.google.com/maps?q=${selectedInc.latitude},${selectedInc.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm text-center block hover:bg-slate-50 transition-all">
              📍 Open in Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
