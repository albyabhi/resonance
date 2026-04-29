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
import { ArrowLeft, LayoutDashboard, Trophy, CalendarDays } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import useDashboardData from "../../hooks/useDashboardData";
import { apiFetch } from "../../utils/apiClient";
import OnboardingChecklist from "./OnboardingChecklist";

import ManageUsers from "../actions/ManageUser";
import ManageHouse from "../actions/ManageHouse";
import ManageEvents from "../actions/ManageEvents";
import Register from "../actions/QuickRegister";
import ManageParticipants from "../actions/ManageParticipants";
import ManageResult from "../actions/ManageResult";
import SubmissionManager from "../actions/SubmissionManager";
import PendingResult from "../actions/PendingResult";
import EditHouse from "../actions/EditHouse";
import AdminScoreboard from "../actions/AdminScoreboard";
import ActivityLogs from "../actions/ActivityLogs";
import CaptainMyDetails from "../actions/CaptainMyDetails";
import ManageCompetition from "../actions/ManageCompetition";
import UserSettings from "../actions/UserSettings";


const actionComponents = {
  "Manage Users": ManageUsers,
  "Manage Groups": ManageHouse,
  "Manage Houses": ManageHouse,
  "Manage Events": ManageEvents,
  "Manage Competition": ManageCompetition,
  "System Override": AdminScoreboard,
  "Activity Logs": ActivityLogs,
  "My Teams": ManageParticipants,
  "My Events": Register,
  "Event Registration": Register,
  "My Details": CaptainMyDetails,
  "Pending submissions": ManageResult,
  "My submissions": SubmissionManager,
  "Pending approvals": PendingResult,
  "Manage Group Logo": EditHouse,
  "Manage House Logo": EditHouse,
};

export default function Dashboard({
  mobileOpen = false,
  setMobileOpen,
  onCloseSidebar = () => {},
  sidebarOpen = true,
}) {
  const { user, role: contextRole, token, isAuthReady } = useAuth();
  const { competition, groupLabel, groupLabelPlural } = useCompetition();
  const safeRoleKey = normalizeRole(contextRole);
  const cfg = roleConfig[safeRoleKey] ?? roleConfig.guest;

  const standingsRef = useRef(null);
  const eventsRef = useRef(null);
  const contentRef = useRef(null);
  
  // Need dashboard data to check if checklist should be shown
  const { data: dashData } = useDashboardData();

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
    const needFetch = safeRoleKey === "captain" && !user?.house?.name && token && isAuthReady;
    if (!needFetch) return;
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/house/me`);
        const payload = await res.json();
        if (res.ok && payload?.house?.name) {
          setHouseName(payload.house.name);
          setHouseCode(payload.house.code || "");
        }
      } catch {}
    })();
  }, [safeRoleKey, user?.house?.name, token, isAuthReady]);

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
        activeAction={activeAction === "settings" ? "Settings" : (cfg.actions?.find((a) => a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction)?.label || null)}

        onSectionClick={handleSectionClick}
        activeSection={activeAction ? null : "home"}
      />

      <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-20 sm:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <FadeIn delay={0.1}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex flex-col items-start gap-1">
                {competition?.logoUrl && (
                  <img src={competition.logoUrl} alt="Competition Logo" className="h-16 w-auto object-contain mb-2" />
                )}
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {competition?.name || "Competition Name"}
                </h1>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {cfg.title}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {safeRoleKey === "captain" && houseName
                      ? `${houseName}${houseCode ? ` · ${houseCode}` : ""}`
                      : `${groupLabel} Overview`}
                  </p>
                </div>
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
                    if (activeAction === "settings") {
                      return <UserSettings />;
                    }
                    const slugObj = cfg.actions?.find((a) => a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction);
                    const MappedComponent = slugObj ? actionComponents[slugObj.label] : null;


                    if (!MappedComponent) {
                      return (
                        <div className="card-premium p-10 text-center">
                          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Unavailable</h3>
                          <p className="text-gray-500 dark:text-gray-400">This section is not available right now.</p>
                        </div>
                      );
                    }

                    if (slugObj.label.includes("Logo")) {
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

        {safeRoleKey === "admin" && dashData && (
          <OnboardingChecklist 
            systemStats={dashData.systemStats} 
            eventsCount={dashData.events?.length || 0} 
          />
        )}

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur-lg dark:border-gray-800 dark:bg-[#0B1220]/90 pb-safe">
          <div className="flex h-16 justify-around items-center px-2">
            <button 
              onClick={() => handleSectionClick('home')} 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${!activeAction ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-medium">Dashboard</span>
            </button>
            {cfg.modules.standings && (
              <button 
                onClick={() => handleSectionClick('standings')} 
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200`}
              >
                <Trophy className="w-5 h-5" />
                <span className="text-[10px] font-medium">Standings</span>
              </button>
            )}
            {cfg.modules.events && (
              <button 
                onClick={() => handleSectionClick('events')} 
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200`}
              >
                <CalendarDays className="w-5 h-5" />
                <span className="text-[10px] font-medium">Events</span>
              </button>
            )}
          </div>
        </div>
      </>
    );
  }
