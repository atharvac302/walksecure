import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const riskData = [
  { time: '00:00', riskLevel: 65, incidents: 4 },
  { time: '04:00', riskLevel: 80, incidents: 7 },
  { time: '08:00', riskLevel: 30, incidents: 1 },
  { time: '12:00', riskLevel: 25, incidents: 2 },
  { time: '16:00', riskLevel: 45, incidents: 3 },
  { time: '20:00', riskLevel: 75, incidents: 8 },
  { time: '23:59', riskLevel: 85, incidents: 12 },
];

export default function Analytics() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-100">AI Analytics & Risk Trends</h2>
        <p className="text-gray-400 mt-1">Data powered by WalkSecure AI Risk Prediction Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-6">Average Risk Level by Time of Day</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }} />
                <Area type="monotone" dataKey="riskLevel" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-6">Reported Incidents vs Time</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }} cursor={{fill: '#334155'}} />
                <Bar dataKey="incidents" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
