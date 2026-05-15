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
                  ? 'bg-[#1e293b] text-blue-400 font-medium shadow-[inset_2px_0_0_#3b82f6]'
                  : 'text-gray-400 hover:bg-[#1e293b]/50 hover:text-gray-200'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className={item.path === '/' ? 'text-blue-500' : item.path === '/live' ? 'text-pink-500' : item.path === '/sos' ? 'text-pink-500' : item.path === '/heatmap' ? 'text-orange-400' : item.path === '/analytics' ? 'text-purple-400' : ''} />
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
    <div className="w-64 bg-[#080d19] flex flex-col h-full border-r border-[#1e293b] overflow-y-auto custom-scrollbar pt-6 relative z-10 shadow-2xl">
      <div className="flex items-center gap-3 mb-8 px-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Shield className="text-blue-400" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 tracking-wide">WalkSecure</h1>
          <p className="text-[10px] text-indigo-300/70 font-bold uppercase tracking-widest mt-0.5">Command Console</p>
        </div>
      </div>
      
      <nav className="flex-1">
        <NavSection title="MONITOR" items={monitorItems} />
        <NavSection title="ANALYTICS" items={analyticsItems} />
        <NavSection title="ADMIN" items={adminItems} />
      </nav>
      
      {/* Profile Badge */}
      <div className="mt-4 p-4 border-t border-[#1e293b] bg-[#0f172a]">
        <div className="bg-[#1e293b] p-3 rounded-xl flex items-center gap-3 border border-[#334155] cursor-pointer hover:bg-[#334155]/50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-sm border border-blue-500/30">
            AK
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-tight">Arjun Kumar</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
