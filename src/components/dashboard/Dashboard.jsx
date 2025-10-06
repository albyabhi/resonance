// Dashboard.jsx
import {useState ,useEffect } from 'react';
import { roleConfig } from './roleConfig';
import HouseStandings from '../HouseStandings';
import RecentEvents from '../RecentEvents';
import StatCard from '../StatCard';
import { useAuth } from "../AuthContext";

import ManageUsers from '../actions/ManageUser';
import ManageHouse from '../actions/ManageHouse';
import ManageEvents from '../actions/ManageEvents';
import Register from '../actions/QuickRegister';
import ManageStudents from '../actions/ManageStudents';
import ManageResult from '../actions/ManageResult';
import SubmissionManager from '../actions/SubmissionManager';
import PendingResult from '../actions/PendingResult';

// Map action labels to components
const actionComponents = {
  //admin
  "Manage Users": ManageUsers,
  "Manage House": ManageHouse,
  "Add Events": ManageEvents,

  //captain
  "Event Registration" : Register,
  "Manage Students" : ManageStudents,

  //student coordinator
  "Enter Results" : ManageResult,
  "My Submissions" : SubmissionManager,
  "Pending Results" : PendingResult,


  
  
  
};

export default function Dashboard({ data = {}, onLogout = () => {} }) {
  const { user, role: contextRole, token } = useAuth();
  const safeRoleKey = (contextRole ? String(contextRole).toLowerCase().trim() : "guest");
  const cfg = roleConfig[safeRoleKey] ?? roleConfig.guest;
  const [houseName, setHouseName] = useState(user?.house?.name || "");

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
    const needFetch = safeRoleKey === "captain" && !user?.house?.name && token;
    if (!needFetch) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/house/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data?.house?.name) setHouseName(data.house.name);
      } catch {
        // ignore
      }
    })();
  }, [safeRoleKey, user?.house?.name, token]);

  const [activeAction, setActiveAction] = useState(null); // currently clicked action

  const handleActionClick = (label) => {
    setActiveAction(label);
  };

  const handleGoBack = () => {
    setActiveAction(null);
  };

  const ActiveComponent = activeAction ? actionComponents[activeAction] : null;

  console.log("Logged-in user:", user);
  console.log("Logged-in role:", contextRole);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 p-6 space-y-6">
        <header className="flex items-center justify-between">
  <div>
    <h1 className="text-xl font-semibold">Welcome back, {cfg.title}!</h1>
    {safeRoleKey === "captain" && (
      <p className="text-sm text-gray-600 mt-1">
        House: <span className="font-medium">{user?.house?.name || "—"}</span>
        {user?.house?.code ? ` (${user.house.code})` : ""}
      </p>
    )}
  </div>
</header>

        {/* If an action is active, show the component */}
        {ActiveComponent ? (
          <div>
            <button
              onClick={handleGoBack}
              className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Go Back
            </button>
            <ActiveComponent /> {/* render action component */}
          </div>
        ) : (
          <>
            {/* Dashboard stats */}
            {cfg.modules.stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(data.stats ?? []).map((s, idx) => (
                  <StatCard key={idx} {...s} />
                ))}
              </div>
            )}

            {/* Quick Actions */}
            {cfg.actions?.length > 0 && (
              <section>
                <h3 className="text-sm font-medium mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cfg.actions.map(({ label, icon: Icon }, i) => (
                    <button
                      key={i}
                      onClick={() => handleActionClick(label)}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted"
                    >
                      <Icon size={16} /> <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Standings & Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {cfg.modules.standings && (
                <div className="lg:col-span-2">
                  <HouseStandings />
                </div>
              )}
              {cfg.modules.events && <RecentEvents />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
