import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardOverview from './pages/DashboardOverview';
import IncidentMonitoring from './pages/IncidentMonitoring';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import LiveTracking from './pages/LiveTracking';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#0b1121] text-white font-sans overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto bg-[#0b1121] relative custom-scrollbar">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/live" element={<LiveTracking />} />
            <Route path="/sos" element={<IncidentMonitoring />} />
            <Route path="/heatmap" element={<LiveTracking />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/incidents" element={<IncidentMonitoring />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/reports" element={<Analytics />} />
            <Route path="/settings" element={<DashboardOverview />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
