// src/components/Dashboard.jsx
import { useState, useEffect } from "react";
import { roleConfig } from "./roleConfig";
import HouseStandings from "../HouseStandings";
import RecentEvents from "../RecentEvents";
import StatCard from "../StatCard";
import { useAuth } from "../AuthContext";

import ManageUsers from "../actions/ManageUser";
import ManageHouse from "../actions/ManageHouse";
import ManageEvents from "../actions/ManageEvents";
import Register from "../actions/QuickRegister";
import ManageStudents from "../actions/ManageStudents";
import ManageResult from "../actions/ManageResult";
import SubmissionManager from "../actions/SubmissionManager";
import PendingResult from "../actions/PendingResult";
import EditHouse from "../actions/EditHouse";

// Map action labels to components
const actionComponents = {
  // admin
  "Manage Users": ManageUsers,
  "Manage House": ManageHouse,
  "Add Events": ManageEvents,

  // captain
  "Event Registration": Register,
  "Manage Students": ManageStudents,

  // student coordinator
  "Enter Results": ManageResult,
  "My Submissions": SubmissionManager,
  "Pending Results": PendingResult,

  // captain self-service
  "Manage House Details": EditHouse,
};

export default function Dashboard({ data = {}, onLogout = () => {} }) {
  const { user, role: contextRole, token } = useAuth();

  const safeRoleKey = contextRole ? String(contextRole).toLowerCase().trim() : "guest";
  const cfg = roleConfig[safeRoleKey] ?? roleConfig.guest;

  // Local mirrors for header display, synced with AuthContext user.house
  const [houseName, setHouseName] = useState(user?.house?.name || "");
  const [houseCode, setHouseCode] = useState(user?.house?.code || "");

  // Sync when user.house changes in AuthContext (e.g., after EditHouse updates it)
  useEffect(() => {
    if (safeRoleKey === "captain" && user?.house) {
      setHouseName(user.house.name || "");
      setHouseCode(user.house.code || "");
    }
  }, [safeRoleKey, user?.house?.name, user?.house?.code]);

  // Initial fetch if missing (first load after login, no house details embedded)
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
    const needFetch = safeRoleKey === "captain" && !user?.house?.name && token;
    if (!needFetch) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/house/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json();
        if (res.ok && payload?.house?.name) {
          setHouseName(payload.house.name);
          setHouseCode(payload.house.code || "");
          // Optionally push back to AuthContext here if desired:
          // setUserHouse(payload.house);
        }
      } catch {
        // ignore fetch errors in dashboard header
      }
    })();
  }, [safeRoleKey, user?.house?.name, token]);

  const [activeAction, setActiveAction] = useState(null);

  const handleActionClick = (label) => {
    setActiveAction(label);
  };

  const handleGoBack = () => {
    setActiveAction(null);
  };

  // Handle house updated callback from EditHouse
  const handleHouseUpdated = (house) => {
    setHouseName(house?.name || "");
    setHouseCode(house?.code || "");
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
                House: <span className="font-medium">{houseName || "—"}</span>
                {houseCode ? ` (${houseCode})` : ""}
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

            {/* Pass onUpdated only to EditHouse; others render as-is */}
            {activeAction === "Manage House Details" ? (
              <EditHouse onUpdated={handleHouseUpdated} />
            ) : (
              <ActiveComponent />
            )}
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
