import React from "react";
import { LogOut, Bell, Users, Home, Trophy, Calendar } from "lucide-react";
import HouseStandings from "../HouseStandings";
import RecentEvents from "../RecentEvents";
import StatCard from "../StatCard";

function DashboardGuest() {
  return (
    <div className="min-h-screen bg-gray-100">
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
            <p className="font-semibold text-gray-800">Guest User</p>
            <p className="text-xs text-gray-500">Guest</p>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 transition">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Stats + Body */}
      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Houses" value="4" subtitle="+2 this month" icon={Home} />
          <StatCard title="Registered Students" value="120" subtitle="+15 this week" icon={Users} />
          <StatCard title="Active Events" value="4" subtitle="3 ongoing" status="Live" icon={Trophy} />
          <StatCard title="Upcoming Events" value="2" subtitle="Tomorrow" icon={Calendar} />
        </div>

        {/* Main grid */}
        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HouseStandings />
          <RecentEvents />
         
        </main>
      </div>
    </div>
  );
}

export default DashboardGuest;
