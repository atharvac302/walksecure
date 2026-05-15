import React, { useState } from 'react';

export default function UserManagement() {
  const [users, setUsers] = useState([
    { id: 'WS-001', name: 'Emma Watson', email: 'emma@example.com', status: 'Active', joined: '2023-10-12' },
    { id: 'WS-002', name: 'John Doe', email: 'john@example.com', status: 'Suspended', joined: '2023-11-05' },
    { id: 'WS-003', name: 'Alice Smith', email: 'alice@example.com', status: 'Active', joined: '2024-01-22' },
  ]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-100">User Management</h2>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Export Users
        </button>
      </div>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/50 border-b border-gray-700">
              <th className="p-4 text-gray-400 font-medium">User ID</th>
              <th className="p-4 text-gray-400 font-medium">Name</th>
              <th className="p-4 text-gray-400 font-medium">Email</th>
              <th className="p-4 text-gray-400 font-medium">Status</th>
              <th className="p-4 text-gray-400 font-medium">Joined Date</th>
              <th className="p-4 text-gray-400 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                <td className="p-4 text-gray-400 font-mono text-sm">{user.id}</td>
                <td className="p-4 text-white font-medium">{user.name}</td>
                <td className="p-4 text-gray-300">{user.email}</td>
                <td className="p-4">
                   <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                     user.status === 'Active' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-red-500 text-red-400 bg-red-500/10'
                   }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-sm">{user.joined}</td>
                <td className="p-4 text-right flex justify-end gap-3">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">View</button>
                  {user.status === 'Active' ? (
                     <button className="text-red-400 hover:text-red-300 text-sm font-medium">Suspend</button>
                  ) : (
                     <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
