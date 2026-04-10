import { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { roleConfig, normalizeRole } from "./roleConfig";
import Sidebar from "./Sidebar";
import HouseStandings from "../HouseStandings";
import RecentEvents from "../RecentEvents";
import CaptainsDirectory from "../CaptainsDirectory";
import { useAuth } from "../AuthContext";
import DashboardVisuals from "./DashboardVisuals";
import { FadeIn } from "../AnimateReveal";
import { ArrowLeft } from "lucide-react";

import ManageUsers from "../actions/ManageUser";
import ManageHouse from "../actions/ManageHouse";
import ManageEvents from "../actions/ManageEvents";
import Register from "../actions/QuickRegister";
import ManageStudents from "../actions/ManageStudents";
import ManageResult from "../actions/ManageResult";
import SubmissionManager from "../actions/SubmissionManager";
import PendingResult from "../actions/PendingResult";
import EditHouse from "../actions/EditHouse";
import AdminScoreboard from "../actions/AdminScoreboard";
import ActivityLogs from "../actions/ActivityLogs";
import CaptainMyDetails from "../actions/CaptainMyDetails";

const actionComponents = {
  "Manage Users": ManageUsers,
  "Manage Houses": ManageHouse,
  "Manage Events": ManageEvents,
  "System Override": AdminScoreboard,
  "Activity Logs": ActivityLogs,
  "My Teams": ManageStudents,
  "My Events": Register,
  "Event Registration": Register,
  "My Details": CaptainMyDetails,
  "Pending submissions": ManageResult,
  "My submissions": SubmissionManager,
  "Pending approvals": PendingResult,
  "Manage House Logo": EditHouse,
};

export default function Dashboard({
  mobileOpen = false,
  setMobileOpen,
  onCloseSidebar = () => {},
  sidebarOpen = true,
}) {
  const { user, role: contextRole, token } = useAuth();
  const safeRoleKey = normalizeRole(contextRole);
  const cfg = roleConfig[safeRoleKey] ?? roleConfig.guest;

  const standingsRef = useRef(null);
  const eventsRef = useRef(null);
  const contentRef = useRef(null);

  const [houseName, setHouseName] = useState(user?.house?.name || "");
  const [houseCode, setHouseCode] = useState(user?.house?.code || "");

  useEffect(() => {
    if (safeRoleKey === "captain" && user?.house) {
      setHouseName(user.house.name || "");
      setHouseCode(user.house.code || "");
    }
  }, [safeRoleKey, user?.house?.name, user?.house?.code]);

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
        }
      } catch {}
    })();
  }, [safeRoleKey, user?.house?.name, token]);

  const navigate = useNavigate();
  const location = useLocation();
  const actionPath = location.pathname.split("/").pop();
  const activeAction = actionPath !== "dashboard" ? actionPath : null;

  const handleActionClick = (label) => {
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    navigate(`/dashboard/${slug}`);
    contentRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const handleGoBack = () => navigate("/dashboard");

  const handleSectionClick = (id) => {
    if (id === "home") {
      navigate("/dashboard");
      contentRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }

    if (activeAction) {
      navigate("/dashboard");
      setTimeout(() => {
        const ref = id === "standings" ? standingsRef : eventsRef;
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    const ref = id === "standings" ? standingsRef : eventsRef;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleHouseUpdated = (house) => {
    setHouseName(house?.name || "");
    setHouseCode(house?.code || "");
  };

  const handleCloseSidebar = () => {
    setMobileOpen?.(false);
    onCloseSidebar();
  };

  return (
    <>
      <Sidebar
        open={mobileOpen}
        onClose={handleCloseSidebar}
        sidebarOpen={sidebarOpen}
        onActionClick={handleActionClick}
        activeAction={cfg.actions?.find((a) => a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction)?.label || null}
        onSectionClick={handleSectionClick}
        activeSection={activeAction ? null : "home"}
      />

      <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <FadeIn delay={0.1}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{cfg.title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {safeRoleKey === "captain" && houseName
                    ? `${houseName}${houseCode ? ` · ${houseCode}` : ""}`
                    : "Overview of the latest platform activity"}
                </p>
              </div>
            </div>
          </FadeIn>

          <Routes>
            <Route
              path=":actionSlug"
              element={
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button
                    onClick={handleGoBack}
                    className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-[#111827] dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-400"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  {(() => {
                    const slugObj = cfg.actions?.find((a) => a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction);
                    const MappedComponent = slugObj ? actionComponents[slugObj.label] : null;

                    if (!MappedComponent) {
                      return (
                        <div className="card-premium p-10 text-center">
                          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Module offline</h3>
                          <p className="text-gray-500 dark:text-gray-400">This dashboard module is currently unavailable.</p>
                        </div>
                      );
                    }

                    if (slugObj.label === "Manage House Logo") {
                      return <EditHouse onUpdated={handleHouseUpdated} />;
                    }

                    return (
                      <div className="card-premium p-6 sm:p-8">
                        <MappedComponent />
                      </div>
                    );
                  })()}
                </div>
              }
            />
            <Route
              path=""
              element={
                <div className="flex flex-col gap-6">
                  <DashboardVisuals />

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {cfg.modules.standings && (
                      <div ref={standingsRef} className="max-w-full overflow-hidden lg:col-span-8">
                        <HouseStandings />
                      </div>
                    )}
                    {cfg.modules.events && (
                      <div ref={eventsRef} className="max-w-full overflow-hidden lg:col-span-4">
                        <RecentEvents />
                      </div>
                    )}
                  </div>

                  {safeRoleKey === "guest" && (
                    <FadeIn delay={0.5}>
                      <CaptainsDirectory />
                    </FadeIn>
                  )}
                </div>
              }
            />
          </Routes>
        </div>
      </main>
    </>
  );
}
