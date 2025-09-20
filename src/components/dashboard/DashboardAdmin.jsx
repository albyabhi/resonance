import React from "react";
import Header from "../Header";
import StatCard from "../StatCard";
import RecentEvents from "../RecentEvents";
import QuickActions from "../QuickActions";
import HouseStandings from "../HouseStandings";

function DashboardAdmin() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, System Administrator!
          </h1>
          <p className="text-gray-500">
            Good evening! Here's your system overview.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Total Houses" value="4" subtitle="+2 this month" />
          <StatCard
            title="Registered Students"
            value="8"
            subtitle="+15 this week"
          />
          <StatCard title="Active Events" value="4" subtitle="3 ongoing" />
          <StatCard title="Upcoming Events" value="2" subtitle="Next Tomorrow" />
          <StatCard
            title="Pending Results"
            value="1"
            subtitle="Requires approval"
          />
          <StatCard
            title="Total Points Awarded"
            value="100"
            subtitle="All competitions"
          />
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RecentEvents />
          <QuickActions />
          <HouseStandings />
        </div>
      </main>
    </div>
  );
}

export default DashboardAdmin;
