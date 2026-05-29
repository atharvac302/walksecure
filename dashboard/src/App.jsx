import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardOverview from './pages/DashboardOverview';
import IncidentMonitoring from './pages/IncidentMonitoring';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import AdminManagement from './pages/AdminManagement';
import LiveTracking from './pages/LiveTracking';
import Login from './pages/Login';

// Global context so every page knows the current admin
export const AdminContext = React.createContext(null);

function App() {
  const [currentAdmin, setCurrentAdmin] = useState(null);

  if (!currentAdmin) {
    return <Login onLogin={(admin) => setCurrentAdmin(admin)} />;
  }

  const handleLogout = () => setCurrentAdmin(null);

  return (
    <AdminContext.Provider value={currentAdmin}>
      <Router>
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
          <Sidebar currentAdmin={currentAdmin} onLogout={handleLogout} />
          <div className="flex-1 overflow-y-auto relative custom-scrollbar">
            <Routes>
              <Route path="/"             element={<DashboardOverview />} />
              <Route path="/live"         element={<LiveTracking />} />
              <Route path="/sos"          element={<IncidentMonitoring />} />
              <Route path="/heatmap"      element={<LiveTracking />} />
              <Route path="/analytics"    element={<Analytics />} />
              <Route path="/incidents"    element={<IncidentMonitoring />} />
              <Route path="/users"        element={<UserManagement />} />
              <Route path="/staff"        element={<AdminManagement currentAdmin={currentAdmin} />} />
              <Route path="/reports"      element={<Analytics />} />
              <Route path="/settings"     element={<DashboardOverview />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AdminContext.Provider>
  );
}

export default App;
