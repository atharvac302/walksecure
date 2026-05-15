import React from 'react';
import LiveMap from '../components/LiveMap';

export default function LiveTracking() {
  return (
    <div className="h-full flex flex-col relative z-0">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center z-10">
        <h2 className="text-xl font-bold text-white">Full-Screen Live Tracking & Crime Heatmap</h2>
        <div className="flex gap-2">
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold border border-red-500/30">High Risk Zones</span>
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold border border-yellow-500/30">Moderate Risk Zones</span>
        </div>
      </div>
      <div className="flex-1 relative z-0">
         <LiveMap />
      </div>
    </div>
  );
}
