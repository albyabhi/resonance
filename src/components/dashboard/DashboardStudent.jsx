import React from "react";
import {
  LogOut,
  Bell,
  ClipboardList,
  CheckCircle,
} from "lucide-react";
import HouseStandings from "../HouseStandings";
import RecentEvents from "../RecentEvents";
import StatCard from "../StatCard";

function DashboardStudent() {
  // ✅ Quick Actions
  const actions = [
  { name: "Enter Results", icon: <ClipboardList className="w-4 h-4 text-blue-600" /> },
    { name: "My Events", icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
  ];

  // ✅ Current date & time
  const now = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center bg-white shadow-sm px-6 py-3">
        <div>
          <h1 className="text-lg font-bold text-blue-700">Resonance</h1>
          <p className="text-xs text-gray-500">Inter-House Competition Management</p>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-gray-600 hover:text-gray-800">
            <Bell className="w-5 h-5" />
          </button>
          <div className="text-sm text-right">
            <p className="font-semibold text-gray-800">House Coordinator</p>
            <p className="text-xs text-gray-500">House Coordinator </p>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 transition">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

     
      <div className="px-6 py-4">
        <h2 className="text-xl font-bold text-gray-800">
          Welcome back, House Coordinator!
        </h2>
        <p className="text-gray-500 text-sm">
          Good evening! Manage your teams, check events, and view standings.
        </p>
      </div>

      {/* Stats Row */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           <StatCard title="Assigned Events" value="2" subtitle="Managing" status="Live" icon={ClipboardList} />
      <StatCard title="Results to Submit" value="3" subtitle="Pending entry" status="Live" icon={CheckCircle} />
      
      </div>

      {/* Main Layout */}
      <main className="px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Events */}
        <RecentEvents />

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            ⚡ Quick Actions
          </h3>
          <p className="text-sm text-gray-500 mb-3">Common tasks for your role</p>
          {actions.map((action, index) => (
            <button
              key={index}
              className="flex items-center gap-2 w-full p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left text-sm font-medium text-gray-700"
            >
              {action.icon}
              {action.name}
            </button>
          ))}
        </div>

        {/* House Standings */}
        <HouseStandings />
      </main>
    </div>
  );
}

export default DashboardStudent;
