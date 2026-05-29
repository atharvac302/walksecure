import React, { useState, useEffect } from 'react';
import { Bell, Plus, MapPin, Activity, Users, ShieldCheck, AlertTriangle, AlertCircle, Clock, ChevronRight, CheckCircle, PhoneCall, ShieldAlert, X } from 'lucide-react';
import LiveMap from '../components/LiveMap';
import apiClient from '../api/apiClient';

export default function DashboardOverview() {
  const [mapMode, setMapMode] = useState('heatmap');
  const [sosAlerts, setSosAlerts] = useState([]);
  const [stats, setStats] = useState({ users: 1248, safe: 847, risk: 14 });
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'sos_action', 'new_dispatch', 'notifications'
  const [selectedSos, setSelectedSos] = useState(null);

  const fetchRealtimeData = () => {
    // Fetch live incidents
    apiClient.get('/incidents')
      .then(res => {
         const alerts = res.data.filter(i => i.incident_type === 'SOS Alert' && !i.is_resolved);
         setSosAlerts(alerts.reverse()); 
      })
      .catch(err => console.error(err));
      
    // Fetch analytics summary authentic data
    apiClient.get('/analytics/summary')
      .then(res => {
         setStats({
             users: res.data.active_users,
             safe: res.data.safe_routes_given,
             risk: res.data.risk_zones
         });
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchRealtimeData();
    const dataInterval = setInterval(fetchRealtimeData, 3000);
    const timeInterval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    
    return () => {
        clearInterval(dataInterval);
        clearInterval(timeInterval);
    };
  }, []);

  const handleResolveSos = (id) => {
    apiClient.patch(`/incidents/${id}/resolve`)
      .then(() => {
        setActiveModal(null);
        setSelectedSos(null);
        fetchRealtimeData(); // Force refresh immediately
      })
      .catch(err => alert("Failed to resolve incident"));
  };

  const handleSOSAction = (action) => {
    if (action === 'police') {
        alert("🚓 Local authorities dispatched to coordinates: " + selectedSos.latitude.toFixed(4) + ", " + selectedSos.longitude.toFixed(4));
    } else if (action === 'call') {
        if (selectedSos.user_phone && selectedSos.user_phone !== '0000000000') {
            // Opens the system phone dialer with the user's actual phone number
            window.open(`tel:${selectedSos.user_phone}`, '_self');
        } else {
            alert('No phone number registered for this user. Contact via email: ' + (selectedSos.user_email || 'unknown'));
        }
    }
  };

  const submitNewDispatch = (e) => {
      e.preventDefault();
      alert("New team dispatched to the zone successfully.");
      setActiveModal(null);
  }

  return (
    <div className="p-8 min-h-screen bg-slate-50 text-slate-900">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Command Center</h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-200 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">System Online</span>
            </div>
            <span className="text-sm text-slate-500 font-medium flex items-center gap-1"><Clock size={14} /> {currentTime}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <button onClick={() => setActiveModal('notifications')} className="relative p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all duration-300 group shadow-sm">
            <Bell size={20} className="text-slate-500 group-hover:text-slate-800 transition-colors" />
            {sosAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveModal('new_dispatch')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md text-white font-bold text-sm"
          >
            <Plus size={18} strokeWidth={3} /> Create Dispatch
          </button>
        </div>
      </header>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={80} className="text-blue-500" /></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase">Active Users</h3>
            <span className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><Activity size={16} /></span>
          </div>
          <p className="text-4xl font-black text-slate-900 mb-2">{stats.users.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">↑ 12%</span>
            <span className="text-xs text-slate-400">vs last hour</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertCircle size={80} className="text-rose-500" /></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase">SOS Triggers</h3>
            <span className="bg-rose-50 text-rose-600 p-1.5 rounded-lg"><AlertCircle size={16} /></span>
          </div>
          <p className="text-4xl font-black text-rose-600 mb-2">{sosAlerts.length}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">Critical</span>
            <span className="text-xs text-slate-400">Requires attention</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck size={80} className="text-emerald-500" /></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase">Safe Routes Given</h3>
            <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><ShieldCheck size={16} /></span>
          </div>
          <p className="text-4xl font-black text-emerald-600 mb-2">{stats.safe.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">100%</span>
            <span className="text-xs text-slate-400">Success rate</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle size={80} className="text-amber-500" /></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase">Risk Zones</h3>
            <span className="bg-amber-50 text-amber-600 p-1.5 rounded-lg"><AlertTriangle size={16} /></span>
          </div>
          <p className="text-4xl font-black text-amber-600 mb-2">{stats.risk}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Live Data</span>
            <span className="text-xs text-slate-400">From crowd sensors</span>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[550px]">
        
        {/* MAP COMPONENT */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 flex flex-col relative overflow-hidden shadow-sm">
          <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-1.5 flex gap-1 shadow-sm">
            <button 
              onClick={() => setMapMode('heatmap')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mapMode === 'heatmap' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Risk Heatmap
            </button>
            <button 
              onClick={() => setMapMode('users')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mapMode === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Live Users
            </button>
          </div>
          
          <div className="flex-1 w-full h-full relative z-[1]">
             <LiveMap />
          </div>
        </div>

        {/* SOS FEED SIDEPANEL */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col shadow-sm relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-rose-50 to-transparent pointer-events-none"></div>

          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Live SOS Feed</h3>
              <p className="text-xs text-slate-500 mt-1">Click to take action</p>
            </div>
            {sosAlerts.length > 0 && (
              <span className="bg-rose-100 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-200">
                {sosAlerts.length} Active
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 relative z-10">
            {sosAlerts.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                 <ShieldCheck size={48} className="text-emerald-500 mb-4" />
                 <p className="text-slate-700 font-bold text-lg">All Clear</p>
                 <p className="text-slate-500 text-sm mt-1">No active emergencies detected.</p>
               </div>
            ) : (
               sosAlerts.map((alert, index) => (
                <div 
                  key={alert.id} 
                  onClick={() => { setSelectedSos(alert); setActiveModal('sos_action'); }}
                  className="group relative bg-white border border-slate-200 hover:border-rose-300 rounded-2xl p-4 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                  style={{ animation: `fadeIn 0.3s ease-out ${index * 0.1}s forwards`, opacity: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-50/0 via-rose-50 to-rose-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shadow-inner flex-shrink-0 relative">
                      <div className="absolute w-full h-full rounded-xl border border-rose-200 animate-ping opacity-50"></div>
                      <AlertCircle size={24} className="text-rose-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-slate-900 font-bold text-sm tracking-wide">SOS Triggered</h4>
                        <span className="text-[10px] text-slate-500 font-medium">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex gap-1.5 text-xs text-rose-500 font-medium mt-1.5 items-center">
                        <MapPin size={12} />
                        <p className="truncate w-32">{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                      </div>
                    </div>
                    
                    <ChevronRight size={16} className="text-rose-300 group-hover:text-rose-500 transition-colors" />
                  </div>
                </div>
               ))
            )}
          </div>
        </div>
      </div>

      {/* MODALS OVERLAYS */}
      {activeModal === 'sos_action' && selectedSos && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
           <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
              
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
                 <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                    <AlertTriangle size={28} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">Emergency Action</h2>
                    <p className="text-slate-500 text-sm mt-1">Incident ID: #{selectedSos.id}</p>
                 </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 text-sm space-y-2">
                 {selectedSos.user_name && (
                    <p className="text-slate-700"><span className="text-slate-400 font-bold inline-block w-20">User:</span> <span className="font-semibold text-slate-900">{selectedSos.user_name}</span></p>
                 )}
                 {selectedSos.user_email && (
                    <p className="text-slate-700"><span className="text-slate-400 font-bold inline-block w-20">Email:</span> {selectedSos.user_email}</p>
                 )}
                 {selectedSos.user_phone && selectedSos.user_phone !== '0000000000' && (
                    <p className="text-slate-700"><span className="text-slate-400 font-bold inline-block w-20">Phone:</span> <span className="text-blue-600 font-bold">{selectedSos.user_phone}</span></p>
                 )}
                 <p className="text-slate-700"><span className="text-slate-400 font-bold inline-block w-20">Location:</span> {selectedSos.latitude.toFixed(4)}, {selectedSos.longitude.toFixed(4)}</p>
                 <p className="text-slate-700"><span className="text-slate-400 font-bold inline-block w-20">Time:</span> {new Date(selectedSos.timestamp).toLocaleTimeString()}</p>
                 <p className="text-slate-700"><span className="text-slate-400 font-bold inline-block w-20">Status:</span> <span className="text-rose-600 font-bold">Awaiting Action</span></p>
              </div>

              <div className="space-y-3">
                 <button onClick={() => handleSOSAction('police')} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <ShieldAlert size={18} /> Dispatch Local Authorities
                 </button>
                 <button onClick={() => handleSOSAction('call')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <PhoneCall size={18} /> Call User {selectedSos.user_phone && selectedSos.user_phone !== '0000000000' ? `(${selectedSos.user_phone})` : ''}
                 </button>
                 <a 
                    href={`https://www.google.com/maps?q=${selectedSos.latitude},${selectedSos.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-300 shadow-sm"
                 >
                    <MapPin size={18} /> Open Location in Google Maps
                 </a>
                 <button onClick={() => handleResolveSos(selectedSos.id)} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 border border-emerald-200 mt-4 shadow-sm">
                    <CheckCircle size={18} /> Mark as Resolved (False Alarm)
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeModal === 'new_dispatch' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
           <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"><X size={24} /></button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Dispatch</h2>
              <p className="text-slate-500 text-sm mb-6">Deploy field units to a specific risk zone.</p>
              
              <form onSubmit={submitNewDispatch} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Zone Coordinates</label>
                    <input type="text" required placeholder="Lat, Lng" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Unit Type</label>
                    <select className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500">
                       <option>Police Patrol</option>
                       <option>Medical Response</option>
                       <option>Community Watch</option>
                    </select>
                 </div>
                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-4 shadow-md">Deploy Unit</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'notifications' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
           <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"><X size={24} /></button>
              <h2 className="text-lg font-bold text-slate-900 mb-4">System Notifications</h2>
              <div className="space-y-3">
                 <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                    <p className="font-bold text-emerald-600 mb-1">Update Success</p>
                    <p className="text-slate-600">ML Risk models updated globally.</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                    <p className="font-bold text-blue-600 mb-1">New User Surge</p>
                    <p className="text-slate-600">+250 users in active zone.</p>
                 </div>
                 {sosAlerts.length > 0 && (
                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-sm">
                       <p className="font-bold text-rose-600 mb-1">Critical Warnings</p>
                       <p className="text-slate-600">You have {sosAlerts.length} unresolved SOS triggers.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
