import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff, Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';

const SUPER_ADMIN = {
  email: 'admin@walksecure.in',
  password: 'WalkSecure@2024',
  name: 'WalkSecure Admin',
  role: 'super_admin',
  region: 'National',
  department: 'Headquarters',
};

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) { const d = await res.json(); onLogin(d.admin); return; }
      const err = await res.json().catch(() => ({}));
      setError(err.detail || 'Invalid credentials.');
    } catch {
      if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
        onLogin({ id: 1, name: SUPER_ADMIN.name, email: SUPER_ADMIN.email,
          role: SUPER_ADMIN.role, region: SUPER_ADMIN.region, department: SUPER_ADMIN.department });
        return;
      }
      setError('Backend unreachable. Fallback: admin@walksecure.in / WalkSecure@2024');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-200">
            <ShieldAlert className="text-white" size={40} />
          </div>
        </div>
        <h1 className="text-center text-4xl font-black text-slate-900 tracking-tight">WalkSecure</h1>
        <p className="mt-2 text-center text-sm text-blue-600 font-bold tracking-widest uppercase">Command Console</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white border border-slate-200 rounded-3xl px-10 py-10 shadow-xl shadow-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Administrator Sign In</h2>
          <p className="text-slate-500 text-sm mb-8">Restricted access — authorized personnel only</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm text-center font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@walksecure.in"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-12 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm" />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 text-sm">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {loading ? 'Authenticating…' : 'Secure Sign In'}
            </button>
          </form>

          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-blue-500" />
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Default credentials</p>
            </div>
            <p className="text-xs text-slate-600 font-mono"><span className="text-slate-400">Email:</span> admin@walksecure.in</p>
            <p className="text-xs text-slate-600 font-mono mt-0.5"><span className="text-slate-400">Pass:</span> WalkSecure@2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}
