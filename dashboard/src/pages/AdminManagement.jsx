import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Users, Search, Plus, X, Shield, MapPin, Phone, Mail,
  Edit2, Trash2, CheckCircle, Loader2, AlertCircle, ChevronDown, UserCog
} from 'lucide-react';

const BASE_URL = 'http://localhost:8000';

// ─── Role config ──────────────────────────────────────────────
const ROLES = [
  { value: 'super_admin',       label: 'Super Admin',       color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { value: 'region_supervisor', label: 'Region Supervisor', color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500'   },
  { value: 'area_head',         label: 'Area Head',         color: 'bg-teal-100 text-teal-700 border-teal-200',       dot: 'bg-teal-500'   },
  { value: 'police',            label: 'Police',            color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { value: 'hospital',          label: 'Hospital',          color: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-500'    },
];
const getRoleConfig = (role) => ROLES.find(r => r.value === role) || ROLES[1];

const AVATAR_COLORS = [
  'from-purple-400 to-purple-600', 'from-blue-400 to-blue-600',
  'from-teal-400 to-teal-600',     'from-orange-400 to-orange-600',
  'from-red-400 to-red-600',       'from-indigo-400 to-indigo-600',
];
const avatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

// ─── API helpers ──────────────────────────────────────────────
const api = {
  list:   ()       => fetch(`${BASE_URL}/admin/staff`).then(r => r.json()),
  create: (d)      => fetch(`${BASE_URL}/admin/staff`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d)
  }).then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.detail); } return r.json(); }),
  update: (id, d)  => fetch(`${BASE_URL}/admin/staff/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d)
  }).then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.detail); } return r.json(); }),
  remove: (id)     => fetch(`${BASE_URL}/admin/staff/${id}`, { method: 'DELETE' }).then(async r => {
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail); } return r.json();
  }),
};

// ─── Field — DEFINED OUTSIDE StaffModal to prevent focus loss on re-render ───
// When a component is defined INSIDE another component function, React treats it
// as a new component type on every render, unmounting/remounting → cursor lost.
const FormField = memo(({ label, value, onChange, type = 'text', placeholder = '', required = true }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
    />
  </div>
));

const FormSelect = memo(({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  </div>
));

// ─── Add/Edit Modal ───────────────────────────────────────────
function StaffModal({ staff, onSave, onClose }) {
  const isEdit = !!staff;
  const [form, setForm] = useState({
    name: staff?.name || '', email: staff?.email || '',
    phone: staff?.phone || '', password: '',
    role: staff?.role || 'region_supervisor',
    region: staff?.region || '', department: staff?.department || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Stable setters for each field — useCallback prevents re-renders in memo children
  const setName       = useCallback(v => setForm(f => ({ ...f, name: v })),       []);
  const setEmail      = useCallback(v => setForm(f => ({ ...f, email: v })),      []);
  const setPhone      = useCallback(v => setForm(f => ({ ...f, phone: v })),      []);
  const setPassword   = useCallback(v => setForm(f => ({ ...f, password: v })),   []);
  const setRole       = useCallback(v => setForm(f => ({ ...f, role: v })),       []);
  const setRegion     = useCallback(v => setForm(f => ({ ...f, region: v })),     []);
  const setDepartment = useCallback(v => setForm(f => ({ ...f, department: v })), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.password) { setError('Password is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = isEdit
        ? { name: form.name, phone: form.phone, role: form.role, region: form.region, department: form.department }
        : form;
      await onSave(payload);
    } catch (err) { setError(err.message || 'Failed to save.'); }
    setSaving(false);
  };

  const roleOptions = ROLES.filter(r => r.value !== 'super_admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl shadow-slate-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
            <p className="text-slate-500 text-sm mt-1">{isEdit ? `Updating ${staff.name}` : 'Create a new dashboard user'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-xl hover:bg-slate-100 ml-4">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-red-600 text-sm">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Full Name" value={form.name} onChange={setName} placeholder="e.g. Rajesh Kumar" />
            </div>
            <FormField label="Email" value={form.email} onChange={setEmail} type="email" placeholder="rajesh@walksecure.in" />
            <FormField label="Phone" value={form.phone} onChange={setPhone} placeholder="+91 9876543210" />
          </div>

          {!isEdit && (
            <FormField label="Password" value={form.password} onChange={setPassword} type="password" placeholder="Min. 8 characters" />
          )}

          <FormSelect
            label="Role"
            value={form.role}
            onChange={setRole}
            options={roleOptions}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Region" value={form.region} onChange={setRegion} placeholder="e.g. Mumbai North" required={false} />
            <FormField label="Department" value={form.department} onChange={setDepartment} placeholder="e.g. Crime Cell" required={false} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 shadow-md shadow-blue-100">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────
function DeleteModal({ staff, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-red-100 rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-slate-100 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <Trash2 className="text-red-500" size={28} />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Remove Staff Member?</h3>
        <p className="text-slate-500 text-sm mb-6">
          <span className="text-slate-800 font-semibold">{staff.name}</span> will lose dashboard access immediately.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm font-semibold">
            Cancel
          </button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────
const StatCard = memo(({ label, value, icon: Icon, color }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-3xl font-black text-slate-900">{value}</p>
  </div>
));

// ─── Main Page ────────────────────────────────────────────────
export default function AdminManagement({ currentAdmin }) {
  const [staff, setStaff]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAdd, setShowAdd]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]           = useState('');

  const isSuperAdmin = currentAdmin?.role === 'super_admin';

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await api.list();
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      setStaff([{
        id: 1, name: 'WalkSecure Admin', email: 'admin@walksecure.in',
        phone: '+919000000000', role: 'super_admin', region: 'National',
        department: 'Headquarters', is_active: true, created_at: new Date().toISOString()
      }]);
    }
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, []);

  const handleCreate = async (data) => {
    const created = await api.create(data);
    setStaff(s => [created, ...s]);
    setShowAdd(false);
    showToast(`✓ ${created.name} added successfully`);
  };

  const handleUpdate = async (data) => {
    const updated = await api.update(editTarget.id, data);
    setStaff(s => s.map(m => m.id === editTarget.id ? updated : m));
    setEditTarget(null);
    showToast(`✓ ${updated.name} updated`);
  };

  const handleDelete = async () => {
    await api.remove(deleteTarget.id);
    setStaff(s => s.filter(m => m.id !== deleteTarget.id));
    showToast(`✓ ${deleteTarget.name} removed`);
    setDeleteTarget(null);
  };

  const handleToggleActive = async (member) => {
    const updated = await api.update(member.id, { is_active: !member.is_active });
    setStaff(s => s.map(m => m.id === member.id ? updated : m));
    showToast(`${updated.is_active ? '✓ Activated' : '⊘ Deactivated'}: ${updated.name}`);
  };

  const filtered = staff.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.region || '').toLowerCase().includes(q);
    const matchRole   = roleFilter === 'all' || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total:   staff.length,
    active:  staff.filter(m => m.is_active).length,
    roles:   [...new Set(staff.map(m => m.role))].length,
    regions: [...new Set(staff.map(m => m.region).filter(Boolean))].length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-emerald-200 text-emerald-700 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserCog className="text-blue-600" size={28} />
            Staff Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage all dashboard users and their access levels</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-md shadow-blue-100 transition-all">
            <Plus size={18} /> Add Staff Member
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Staff"   value={stats.total}   icon={Users}         color="bg-blue-50 text-blue-600" />
        <StatCard label="Active"        value={stats.active}  icon={CheckCircle}   color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Roles"         value={stats.roles}   icon={Shield}        color="bg-purple-50 text-purple-600" />
        <StatCard label="Regions"       value={stats.regions} icon={MapPin}        color="bg-orange-50 text-orange-600" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, or region…"
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm" />
        </div>
        <div className="relative">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 shadow-sm">
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
          <div className="col-span-3">Staff Member</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3">Contact</div>
          <div className="col-span-2">Region / Dept.</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading staff…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No staff members found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(member => {
              const rc = getRoleConfig(member.role);
              return (
                <div key={member.id}
                  className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 transition-colors ${!member.is_active ? 'opacity-40' : ''}`}>

                  <div className="col-span-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarColor(member.id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-400 font-mono">ID #{member.id}</p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${rc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                      {rc.label}
                    </span>
                  </div>

                  <div className="col-span-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <Mail size={12} className="text-slate-400" />{member.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone size={12} className="text-slate-400" />{member.phone}
                    </div>
                  </div>

                  <div className="col-span-2">
                    {member.region && (
                      <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                        <MapPin size={11} className="text-slate-400" />{member.region}
                      </div>
                    )}
                    {member.department && <p className="text-xs text-slate-400">{member.department}</p>}
                  </div>

                  <div className="col-span-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${member.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {member.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>

                  <div className="col-span-1 flex items-center gap-1 justify-end">
                    {member.role !== 'super_admin' && isSuperAdmin ? (
                      <>
                        <button onClick={() => handleToggleActive(member)}
                          title={member.is_active ? 'Deactivate' : 'Activate'}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs border transition-all ${member.is_active ? 'border-orange-200 text-orange-500 hover:bg-orange-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                          {member.is_active ? '⊘' : '✓'}
                        </button>
                        <button onClick={() => setEditTarget(member)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(member)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all">
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-300 italic">Protected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd      && <StaffModal onSave={handleCreate} onClose={() => setShowAdd(false)} />}
      {editTarget   && <StaffModal staff={editTarget} onSave={handleUpdate} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeleteModal staff={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
