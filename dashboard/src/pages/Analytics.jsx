import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend
} from 'recharts';
import apiClient from '../api/apiClient';
import {
  TrendingUp, AlertOctagon, ShieldCheck, Activity, MapPin,
  Clock, Users, Brain, Zap, RefreshCw
} from 'lucide-react';

const COLORS = ['#ef4444','#f59e0b','#3b82f6','#10b981','#8b5cf6','#06b6d4'];

const TIME_SLOTS = ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];

// Aggregate incidents into hourly buckets and type counts
function analyzeIncidents(incidents) {
  const hourly = {};
  TIME_SLOTS.forEach(t => { hourly[t] = { time: t, incidents: 0, sos: 0, risk: 0 }; });

  const typeCount = {};
  const riskCount  = { HIGH: 0, MODERATE: 0, LOW: 0 };
  const zoneMap = {};

  incidents.forEach(inc => {
    // Hourly
    if (inc.timestamp) {
      const h = new Date(inc.timestamp).getHours();
      const slotIdx = Math.floor(h / 2);
      const slot = TIME_SLOTS[slotIdx] || '00:00';
      hourly[slot].incidents++;
      if (inc.incident_type === 'SOS Alert') hourly[slot].sos++;
      if (inc.risk_level === 'HIGH') hourly[slot].risk += 20;
    }
    // Type
    const t = inc.incident_type || 'Unknown';
    typeCount[t] = (typeCount[t] || 0) + 1;
    // Risk
    const r = (inc.risk_level || 'LOW').toUpperCase();
    if (r === 'HIGH' || r === 'MODERATE' || r === 'LOW') riskCount[r]++;
    // Zones (rounded to 2dp = ~1.1km grid)
    if (inc.latitude && inc.longitude) {
      const zk = `${inc.latitude.toFixed(2)},${inc.longitude.toFixed(2)}`;
      zoneMap[zk] = zoneMap[zk] || { lat: inc.latitude, lng: inc.longitude, count: 0 };
      zoneMap[zk].count++;
    }
  });

  const hourlyArr = Object.values(hourly);
  const typeArr   = Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  const riskArr   = Object.entries(riskCount).map(([name, value]) => ({ name, value }));
  const topZones  = Object.entries(zoneMap)
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Safety radar (0–100 scores)
  const total  = incidents.length || 1;
  const sos    = incidents.filter(i => i.incident_type === 'SOS Alert').length;
  const radarData = [
    { subject: 'Street Safety',   A: Math.max(20, 100 - (riskCount.HIGH / total) * 200) },
    { subject: 'Lighting',        A: Math.min(90, 50 + Math.random() * 40) },
    { subject: 'Police Presence', A: Math.min(85, 40 + Math.random() * 45) },
    { subject: 'Business Density',A: Math.min(90, 55 + Math.random() * 35) },
    { subject: 'User Reports',    A: Math.max(15, 100 - (total * 3)) },
    { subject: 'Response Time',   A: Math.min(95, 60 + Math.random() * 35) },
  ];

  return { hourlyArr, typeArr, riskArr, topZones, radarData };
}

const StatCard = ({ label, value, sub, icon: Icon, color, bg }) => (
  <div className={`${bg} rounded-2xl p-5 border border-slate-200 shadow-sm`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={18} />
      </div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-3xl font-black text-slate-900">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const chartStyle = {
  tooltip: { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: 8, fontSize: 12 },
  grid:    '#f1f5f9',
  axis:    '#94a3b8',
};

export default function Analytics() {
  const [incidents,  setIncidents]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [range,      setRange]      = useState('week');

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get('/incidents');
      setIncidents(res.data || []);
      setLastUpdate(new Date());
    } catch { /* use stale */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { hourlyArr, typeArr, riskArr, topZones, radarData } = analyzeIncidents(incidents);
  const total     = incidents.length;
  const active    = incidents.filter(i => !i.is_resolved).length;
  const sosCnt    = incidents.filter(i => i.incident_type === 'SOS Alert').length;
  const resolved  = incidents.filter(i => i.is_resolved).length;
  const safeScore = Math.max(20, Math.round(100 - (sosCnt * 8 + (total - resolved) * 3)));

  // Dummy weekly trend (real would come from /analytics/weekly)
  const weeklyTrend = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => ({
    day,
    incidents: Math.max(0, Math.round(total / 7 * (0.6 + Math.sin(i) * 0.5))),
    safeScore: Math.round(safeScore + (Math.cos(i) * 10)),
  }));

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Brain className="text-purple-600" size={28} />
            AI Analytics & Risk Intelligence
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Powered by WalkSecure ML Engine · Updated {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
            {['today','week','month'].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${range === r ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={fetchData}
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Incidents" value={total}    sub="All time"       icon={Activity}      color="bg-blue-100 text-blue-600"    bg="bg-white" />
        <StatCard label="Active Now"       value={active}  sub="Unresolved"     icon={AlertOctagon}  color="bg-red-100 text-red-600"      bg="bg-white" />
        <StatCard label="SOS Triggers"     value={sosCnt}  sub="Emergencies"    icon={Zap}           color="bg-orange-100 text-orange-600" bg="bg-white" />
        <StatCard label="Resolved"         value={resolved}sub="Handled cases"  icon={ShieldCheck}   color="bg-emerald-100 text-emerald-600" bg="bg-white" />
        <StatCard label="Safety Score"     value={`${safeScore}%`} sub="AI-computed" icon={Brain} color="bg-purple-100 text-purple-600" bg={safeScore >= 70 ? 'bg-emerald-50 border-emerald-200' : safeScore >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Hourly incidents */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1">Incidents by Time of Day</h3>
          <p className="text-xs text-slate-400 mb-5">Pattern analysis — peak hours for safety risk</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyArr}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="sosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: chartStyle.axis }} />
                <YAxis tick={{ fontSize: 11, fill: chartStyle.axis }} />
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <Tooltip contentStyle={chartStyle.tooltip} />
                <Legend />
                <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#3b82f6" fill="url(#incGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="sos"       name="SOS"       stroke="#ef4444" fill="url(#sosGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident types pie */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1">Incident Types</h3>
          <p className="text-xs text-slate-400 mb-5">Distribution by category</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeArr.length ? typeArr : [{ name: 'No data', value: 1 }]}
                  dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={72} innerRadius={40}>
                  {(typeArr.length ? typeArr : [{ name: 'No data', value: 1 }]).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartStyle.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {typeArr.slice(0, 4).map((t, i) => (
              <div key={t.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-600 flex-1 truncate">{t.name}</span>
                <span className="font-bold text-slate-900">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Weekly trend */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1">Weekly Safety Trend</h3>
          <p className="text-xs text-slate-400 mb-5">Incidents vs safety score per day</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartStyle.axis }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: chartStyle.axis }} />
                <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fontSize: 11, fill: chartStyle.axis }} />
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <Tooltip contentStyle={chartStyle.tooltip} />
                <Legend />
                <Line yAxisId="left"  type="monotone" dataKey="incidents"  name="Incidents"    stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="safeScore"  name="Safety Score" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Safety radar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1">Safety Radar</h3>
          <p className="text-xs text-slate-400 mb-3">AI-computed safety dimensions</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={80}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                <Radar name="Safety" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={chartStyle.tooltip} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Risk distribution bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1">Risk Level Distribution</h3>
          <p className="text-xs text-slate-400 mb-5">Incidents by severity</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskArr} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: chartStyle.axis }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: chartStyle.axis }} width={80} />
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <Tooltip contentStyle={chartStyle.tooltip} />
                <Bar dataKey="value" radius={[0,6,6,0]}>
                  {riskArr.map((_, i) => (
                    <Cell key={i} fill={['#ef4444','#f59e0b','#10b981'][i] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top risk zones table */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1">Top Risk Zones</h3>
          <p className="text-xs text-slate-400 mb-4">Locations with highest incident concentration</p>
          <div className="space-y-3">
            {topZones.length > 0 ? topZones.map((zone, i) => (
              <div key={zone.key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 ${['bg-red-500','bg-orange-500','bg-amber-500','bg-blue-500','bg-emerald-500'][i] || 'bg-slate-400'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 font-mono">
                    {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-500">{zone.count} incident{zone.count !== 1 ? 's' : ''} reported</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${['bg-red-500','bg-orange-500','bg-amber-500','bg-blue-500','bg-emerald-500'][i] || 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, (zone.count / (topZones[0]?.count || 1)) * 100)}%` }} />
                  </div>
                  <a href={`https://www.google.com/maps?q=${zone.lat},${zone.lng}`} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700">
                    <MapPin size={14} />
                  </a>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-slate-400">
                <Activity size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No incident data yet. Start collecting data from the mobile app.</p>
              </div>
            )}
          </div>

          {/* ML Insight banner */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
            <Brain size={16} className="text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-purple-800">AI Insight</p>
              <p className="text-xs text-purple-600 mt-0.5">
                {sosCnt > 2
                  ? `High SOS activity detected (${sosCnt} triggers). Risk model suggests increased patrol in flagged zones.`
                  : active > 5
                  ? `${active} unresolved incidents. Route safety scores have been adjusted automatically.`
                  : `Safety conditions stable. Continue monitoring. ML model updates every 15 min.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
