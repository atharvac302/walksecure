import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function IncidentMonitoring() {
  const [incidents, setIncidents] = useState([
    { id: 1, type: 'SOS Alert', user: 'Emma Watson', location: 'Downtown Alley', time: '10 mins ago', status: 'Active', severity: 'High' },
    { id: 2, type: 'Route Deviation', user: 'John Doe', location: 'Central Park', time: '25 mins ago', status: 'Resolved', severity: 'Medium' },
    { id: 3, type: 'Suspicious Activity', user: 'Anonymous', location: 'Subway Station', time: '1 hour ago', status: 'Investigating', severity: 'High' },
  ]);

  useEffect(() => {
    // Fetch real incidents
    apiClient.get('/incidents')
      .then(res => {
         if(res.data && res.data.length > 0) setIncidents(res.data);
      })
      .catch(err => console.error("Error fetching incidents", err));
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
      <h2 className="text-3xl font-bold text-slate-900 mb-6">Incident Management</h2>
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/50 border-b border-slate-200">
              <th className="p-4 text-slate-500 font-medium">Type</th>
              <th className="p-4 text-slate-500 font-medium">User</th>
              <th className="p-4 text-slate-500 font-medium">Location</th>
              <th className="p-4 text-slate-500 font-medium">Time</th>
              <th className="p-4 text-slate-500 font-medium">Severity</th>
              <th className="p-4 text-slate-500 font-medium">Status</th>
              <th className="p-4 text-slate-500 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {incidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-slate-900 font-bold text-sm">{incident.type || incident.incident_type}</td>
                <td className="p-4 text-slate-600 text-sm">{incident.user || `User #${incident.user_id}`}</td>
                <td className="p-4 text-slate-600 text-sm">
                  {incident.location || `${incident.latitude?.toFixed(4)}, ${incident.longitude?.toFixed(4)}`}
                </td>
                <td className="p-4 text-slate-500 text-sm">
                  {incident.time || new Date(incident.timestamp).toLocaleTimeString()}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-widest ${
                    (incident.severity || incident.risk_level) === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {incident.severity || incident.risk_level || 'High'}
                  </span>
                </td>
                <td className="p-4">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                     (incident.status || (incident.is_resolved ? 'Resolved' : 'Active')) === 'Active' ? 'border-rose-200 text-rose-700 bg-rose-50' : 
                     (incident.status || (incident.is_resolved ? 'Resolved' : 'Active')) === 'Resolved' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-blue-200 text-blue-700 bg-blue-50'
                   }`}>
                    {incident.status || (incident.is_resolved ? 'Resolved' : 'Active')}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm">Review</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
