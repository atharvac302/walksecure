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
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-100 mb-6">Incident Management</h2>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/50 border-b border-gray-700">
              <th className="p-4 text-gray-400 font-medium">Type</th>
              <th className="p-4 text-gray-400 font-medium">User</th>
              <th className="p-4 text-gray-400 font-medium">Location</th>
              <th className="p-4 text-gray-400 font-medium">Time</th>
              <th className="p-4 text-gray-400 font-medium">Severity</th>
              <th className="p-4 text-gray-400 font-medium">Status</th>
              <th className="p-4 text-gray-400 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                <td className="p-4 text-white font-medium">{incident.type}</td>
                <td className="p-4 text-gray-300">{incident.user}</td>
                <td className="p-4 text-gray-300">{incident.location}</td>
                <td className="p-4 text-gray-400 text-sm">{incident.time}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${incident.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {incident.severity}
                  </span>
                </td>
                <td className="p-4">
                   <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                     incident.status === 'Active' ? 'border-red-500 text-red-400' : 
                     incident.status === 'Resolved' ? 'border-emerald-500 text-emerald-400' : 'border-blue-500 text-blue-400'
                   }`}>
                    {incident.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">Resolve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
