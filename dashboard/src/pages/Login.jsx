import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple mock auth for the MVP
    if (email === 'admin@walksafe.com' && password === 'admin') {
      onLogin();
    } else {
      setError('Invalid credentials. Use admin@walksafe.com / admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1121] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <ShieldAlert className="text-blue-400" size={36} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-wide">WalkSafe Console</h2>
        <p className="mt-2 text-center text-sm text-gray-400">Sign in to access the administrator dashboard</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#111827] py-8 px-4 shadow-xl sm:rounded-2xl border border-[#1e293b] sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="text-red-400 text-sm font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-300">Email address</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-[#334155] rounded-xl shadow-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#0b1121] text-white transition-all" 
                  placeholder="admin@walksafe.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-[#334155] rounded-xl shadow-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#0b1121] text-white transition-all" 
                  placeholder="admin" />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-[#0b1121] transition-colors">
                Secure Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
