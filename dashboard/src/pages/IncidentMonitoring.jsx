import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/apiClient';
import {
  AlertOctagon, ShieldCheck, Activity, Filter, Search,
  MapPin, Phone, Mail, Clock, RefreshCw, CheckCircle,
  ExternalLink, ChevronDown, Loader2, X
} from 'lucide-react';

const TYPE_COLORS = {
  'SOS Alert':           'bg-red-100 text-red-700 border-red-200',
  'Suspicious Activity': 'bg-amber-100 text-amber-700 border-amber-200',
  'Poor Lighting':       'bg-slate-100 text-slate-700 border-slate-200',
  'Crime / Theft':       'bg-orange-100 text-orange-700 border-orange-200',
  'Route Deviation':     'bg-blue-100 text-blue-700 border-blue-200',
};
const riskColors = {
  HIGH:     'bg-red-100 text-red-700',
  MODERATE: 'bg-amber-100 text-amber-700',
  LOW:      'bg-emerald-100 text-emerald-700',
};

function IncidentRow({ inc, onResolve, onSelect }) {
  const status = inc.is_resolved ? 'Resolved' : 'Active';
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${inc.is_resolved ? 'opacity-60' : ''}`}
      onClick={() => onSelect(inc)}>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${TYPE_COLORS[inc.incident_type] || 'bg-blue-100 text-blue-700 border-blue-200'}`}>
          {inc.incident_type === 'SOS Alert' && <span className="animate-pulse">🚨</span>}
          {inc.incident_type || 'Unknown'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <p className="text-sm font-semibold text-slate-900">{inc.user_name || `User #${inc.user_id || 'Anon'}`}</p>
        {inc.user_email && <p className="text-xs text-slate-400 truncate max-w-[140px]">{inc.user_email}</p>}
      </td>
      <td className="px-5 py-3.5">
        <a href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
          target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-mono">
          <MapPin size={11} />{inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
          <ExternalLink size={10} />
        </a>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={11} />
          {inc.timestamp ? new Date(inc.timestamp).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' }) : '—'}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${riskColors[(inc.risk_level || 'LOW').toUpperCase()] || riskColors.LOW}`}>
          {inc.risk_level || 'LOW'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${status === 'Active' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {status === 'Active' ? <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> : <CheckCircle size={11} />}
          {status}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
        {!inc.is_resolved && (
          <button onClick={() => onResolve(inc.id)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all">
            Resolve
          </button>
        )}
      </td>
    </tr>
  );
}

export default function IncidentMonitoring() {
  const [incidents,    setIncidents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter,   setRiskFilter]   = useState('all');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [selected,     setSelected]     = useState(null);
  const [resolving,    setResolving]    = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get('/incidents');
      // Include resolved too: get all
      setIncidents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch incidents:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await apiClient.patch(`/incidents/${id}/resolve`);
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, is_resolved: true } : i));
      if (selected?.id === id) setSelected({ ...selected, is_resolved: true });
    } catch { alert('Failed to resolve'); }
    setResolving(null);
  };

  const types = ['all', ...Array.from(new Set(incidents.map(i => i.incident_type).filter(Boolean)))];

  const filtered = incidents.filter(inc => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (inc.incident_type || '').toLowerCase().includes(q) ||
      (inc.user_name    || '').toLowerCase().includes(q) ||
      (inc.user_email   || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? !inc.is_resolved : inc.is_resolved);
    const matchRisk   = riskFilter   === 'all' || (inc.risk_level || '').toUpperCase() === riskFilter;
    const matchType   = typeFilter   === 'all' || inc.incident_type === typeFilter;
    return matchSearch && matchStatus && matchRisk && matchType;
  });

  const stats = {
    total:    incidents.length,
    active:   incidents.filter(i => !i.is_resolved).length,
    sos:      incidents.filter(i => i.incident_type === 'SOS Alert').length,
    resolved: incidents.filter(i => i.is_resolved).length,
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="text-red-500" size={28} />
            Incident Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time safety incident tracking and response</p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-all">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total',    value: stats.total,    color: 'bg-blue-50 text-blue-600',    border: 'border-blue-100',    icon: Activity     },
          { label: 'Active',   value: stats.active,   color: 'bg-red-50 text-red-600',      border: 'border-red-100',     icon: AlertOctagon },
          { label: 'SOS',      value: stats.sos,      color: 'bg-orange-50 text-orange-600',border: 'border-orange-100',  icon: AlertOctagon },
          { label: 'Resolved', value: stats.resolved, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100', icon: ShieldCheck },
        ].map(s => (
          <div key={s.label} className={`bg-white border ${s.border} rounded-2xl p-5 shadow-sm`}>
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon size={18} />
            </div>
            <p className="text-3xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by type, user, email…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
          {['all','active','resolved'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${statusFilter === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
          <option value="all">All Risk Levels</option>
          <option value="HIGH">High Risk</option>
          <option value="MODERATE">Moderate</option>
          <option value="LOW">Low Risk</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Incident Type','User','Location','Time','Risk','Status','Action'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading incidents…</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                  <ShieldCheck size={36} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No incidents match your filters</p>
                </td></tr>
              ) : (
                filtered.map(inc => (
                  <IncidentRow key={inc.id} inc={inc} onResolve={handleResolve} onSelect={setSelected} />
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">{filtered.length} of {incidents.length} incidents</p>
          </div>
        )}
      </div>

      {/* Detail sidebar */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Incident #{selected.id}</h3>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 p-1">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 flex-1 space-y-4">
            <div className={`rounded-2xl p-4 border ${TYPE_COLORS[selected.incident_type] || 'bg-blue-50 border-blue-200'}`}>
              <p className="font-bold text-sm">{selected.incident_type}</p>
              <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${selected.is_resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {selected.is_resolved ? 'RESOLVED' : 'ACTIVE'}
              </span>
            </div>

            {[
              { icon: Activity,  label: 'Risk Level', val: selected.risk_level || 'N/A' },
              { icon: Phone, label: 'User', val: selected.user_name || `User #${selected.user_id || 'Anon'}` },
              { icon: Mail,  label: 'Email', val: selected.user_email || '—' },
              { icon: Phone, label: 'Phone', val: selected.user_phone && selected.user_phone !== '0000000000' ? selected.user_phone : '—' },
              { icon: Clock, label: 'Time', val: selected.timestamp ? new Date(selected.timestamp).toLocaleString() : '—' },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex gap-3">
                <Icon size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-semibold text-slate-900">{val}</p>
                </div>
              </div>
            ))}

            {selected.latitude && (
              <div className="flex gap-3">
                <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Location</p>
                  <a href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                    {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            )}
            {selected.description && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reporter Description</p>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">{selected.description}</p>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-100 space-y-2">
            {!selected.is_resolved && (
              <button onClick={() => handleResolve(selected.id)} disabled={resolving === selected.id}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                {resolving === selected.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Mark as Resolved
              </button>
            )}
            {selected.user_phone && selected.user_phone !== '0000000000' && (
              <a href={`tel:${selected.user_phone}`}
                className="w-full py-3 border border-blue-200 text-blue-600 font-bold rounded-xl text-sm text-center block hover:bg-blue-50 transition-all">
                📞 Call {selected.user_phone}
              </a>
            )}
            <a href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm text-center block hover:bg-slate-50 transition-all">
              📍 Open in Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
