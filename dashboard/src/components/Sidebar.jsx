import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, MapPin, AlertOctagon, Flame, Activity, FileText, Users, BarChart, Settings } from 'lucide-react';

const Sidebar = () => {
  const monitorItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard, badge: null },
    { name: 'Live Tracking', path: '/live', icon: MapPin, badge: 13, badgeColor: 'bg-red-500' },
    { name: 'SOS Alerts', path: '/sos', icon: AlertOctagon, badge: 3, badgeColor: 'bg-red-500' },
  ];

  const analyticsItems = [
    { name: 'Crime Heatmap', path: '/heatmap', icon: Flame, badge: null },
    { name: 'AI Analytics', path: '/analytics', icon: Activity, badge: null },
    { name: 'Incidents', path: '/incidents', icon: FileText, badge: 7, badgeColor: 'bg-yellow-500 text-yellow-900' },
  ];

  const adminItems = [
    { name: 'Users', path: '/users', icon: Users, badge: null },
    { name: 'Reports', path: '/reports', icon: BarChart, badge: null },
    { name: 'Settings', path: '/settings', icon: Settings, badge: null },
  ];

  const NavSection = ({ title, items }) => (
    <div className="mb-4">
      <h3 className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 px-6">{title}</h3>
      <div className="space-y-0.5 px-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium shadow-[inset_2px_0_0_#3b82f6]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className={item.path === '/' ? 'text-blue-600' : item.path === '/live' ? 'text-pink-600' : item.path === '/sos' ? 'text-pink-600' : item.path === '/heatmap' ? 'text-orange-500' : item.path === '/analytics' ? 'text-purple-600' : 'text-slate-400'} />
              <span className="text-sm">{item.name}</span>
            </div>
            {item.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-red-500 text-white'}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-64 bg-white flex flex-col h-full border-r border-slate-200 overflow-y-auto custom-scrollbar pt-6 relative z-10 shadow-sm">
      <div className="flex items-center gap-3 mb-8 px-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Shield className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-wide">WalkSecure</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Command Console</p>
        </div>
      </div>
      
      <nav className="flex-1">
        <NavSection title="MONITOR" items={monitorItems} />
        <NavSection title="ANALYTICS" items={analyticsItems} />
        <NavSection title="ADMIN" items={adminItems} />
      </nav>
      
      {/* Profile Badge */}
      <div className="mt-4 p-4 border-t border-slate-200 bg-slate-50">
        <div className="bg-white p-3 rounded-xl flex items-center gap-3 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-200">
            AK
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">Arjun Kumar</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
