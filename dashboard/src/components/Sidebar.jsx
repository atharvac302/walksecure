import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield, LayoutDashboard, MapPin, AlertOctagon, Flame,
  Activity, FileText, Users, BarChart, Settings, UserCog, LogOut, ChevronRight
} from 'lucide-react';

const ROLE_LABELS = {
  super_admin:       'Super Admin',
  region_supervisor: 'Region Supervisor',
  area_head:         'Area Head',
  police:            'Police',
  hospital:          'Hospital',
};

const ROLE_COLORS = {
  super_admin:       'text-purple-600 bg-purple-50 border-purple-200',
  region_supervisor: 'text-blue-600 bg-blue-50 border-blue-200',
  area_head:         'text-teal-600 bg-teal-50 border-teal-200',
  police:            'text-orange-600 bg-orange-50 border-orange-200',
  hospital:          'text-red-600 bg-red-50 border-red-200',
};

const Sidebar = ({ currentAdmin, onLogout }) => {
  const monitorItems = [
    { name: 'Overview',      path: '/',        icon: LayoutDashboard },
    { name: 'Live Tracking', path: '/live',    icon: MapPin,     badge: 13, badgeColor: 'bg-red-100 text-red-600' },
    { name: 'SOS Alerts',    path: '/sos',     icon: AlertOctagon, badge: 3, badgeColor: 'bg-red-100 text-red-600' },
  ];
  const analyticsItems = [
    { name: 'Crime Heatmap', path: '/heatmap',   icon: Flame },
    { name: 'AI Analytics',  path: '/analytics', icon: Activity },
    { name: 'Incidents',     path: '/incidents', icon: FileText, badge: 7, badgeColor: 'bg-amber-100 text-amber-700' },
  ];
  const adminItems = [
    { name: 'App Users',  path: '/users',   icon: Users },
    { name: 'Reports',    path: '/reports', icon: BarChart },
    { name: 'Settings',   path: '/settings',icon: Settings },
  ];
  const staffItems = currentAdmin?.role === 'super_admin'
    ? [{ name: 'Staff Management', path: '/staff', icon: UserCog }]
    : [];

  const NavSection = ({ title, items }) => (
    <div className="mb-5">
      <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase px-4 mb-2">{title}</p>
      <div className="space-y-0.5">
        {items.map(item => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-[13px] font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <item.icon size={16} className="opacity-70" />
              {item.name}
            </div>
            {item.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>{item.badge}</span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );

  const initials = currentAdmin?.name
    ? currentAdmin.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'SA';

  return (
    <div className="w-64 bg-white flex flex-col h-full border-r border-slate-200 overflow-y-auto pt-6 relative z-10 shadow-sm shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
          <Shield className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-[15px] font-black text-slate-900 tracking-tight leading-tight">WalkSecure</h1>
          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Command Console</p>
        </div>
      </div>

      {/* Super Admin indicator */}
      {currentAdmin?.role === 'super_admin' && (
        <div className="mx-3 mb-5 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2">
          <Shield size={13} className="text-purple-500 shrink-0" />
          <div>
            <p className="text-[11px] font-black text-purple-700 uppercase tracking-wide">Super Admin</p>
            <p className="text-[10px] text-purple-400">Full system access</p>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3">
        <NavSection title="Monitor"   items={monitorItems} />
        <NavSection title="Analytics" items={analyticsItems} />
        <NavSection title="Admin"     items={adminItems} />
        {staffItems.length > 0 && <NavSection title="System" items={staffItems} />}
      </nav>

      {/* Profile card */}
      <div className="p-3 border-t border-slate-100 mt-4">
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-900 leading-tight truncate">{currentAdmin?.name || 'Admin'}</p>
              <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md border mt-0.5 ${ROLE_COLORS[currentAdmin?.role] || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                {ROLE_LABELS[currentAdmin?.role] || 'Admin'}
              </span>
            </div>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all text-xs font-semibold">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
