import { useState, useEffect, useRef, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { roleConfig, normalizeRole, getUserActions } from "./roleConfig";
import Sidebar from "./Sidebar";
import RecentEvents from "../RecentEvents";
import CaptainsDirectory from "../CaptainsDirectory";
import { useAuth } from "../AuthContext";
import DashboardVisuals from "./DashboardVisuals";
import { FadeIn } from "../AnimateReveal";
import { ArrowLeft, LayoutDashboard, Trophy, CalendarDays } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import useDashboardData from "../../hooks/useDashboardData";
import OnboardingChecklist from "./OnboardingChecklist";
import usePermission from "../../hooks/usePermission";

import ManageUsers from "../actions/ManageUser";
import ManageHouse from "../actions/ManageHouse";
import ManageEvents from "../actions/ManageEvents";
import ParticipantRegister from "../actions/ParticipantRegister";
import ManageParticipants from "../actions/ManageParticipants";
import ManageResult from "../actions/ManageResult";
import SubmissionManager from "../actions/SubmissionManager";
import PendingResult from "../actions/PendingResult";
import EditHouse from "../actions/EditHouse";
import AdminScoreboard from "../actions/AdminScoreboard";
import ActivityLogs from "../actions/ActivityLogs";
import CaptainMyDetails from "../actions/CaptainMyDetails";
import DashboardStatusWidget from "../actions/DashboardStatusWidget";
import ManageCompetition from "../actions/ManageCompetition";
import UserSettings from "../actions/UserSettings";
import ExportReport from "../actions/ExportReport";
import JudgeScoring from "../actions/JudgeScoring";
import MyScores from "../actions/MyScores";
import ManageVenue from "../actions/ManageVenue";


const actionComponents = {
  "Manage Users": ManageUsers,
  "Manage Groups": ManageHouse,
  "Manage Houses": ManageHouse,
  "Manage Events": ManageEvents,
  "Manage Competition": ManageCompetition,
  "Scoreboard Contributions": AdminScoreboard,
  "Activity Logs": ActivityLogs,
  "Manage Participants": ManageParticipants,
  "My Teams": ManageParticipants,
  "My Events": ParticipantRegister,
  "Event Registration": ParticipantRegister,
  "My Details": CaptainMyDetails,
  "Submit Results": ManageResult,
  "My submissions": SubmissionManager,
  "Pending approvals": PendingResult,
  "Manage Group Logo": EditHouse,
  "Manage House Logo": EditHouse,
  "Export Report": ExportReport,
  "My Assignments": JudgeScoring,
  "My Scores": MyScores,
  "Manage Venues": ManageVenue,
};

export default function Dashboard({
  mobileOpen = false,
  setMobileOpen,
  onCloseSidebar = () => {},
  sidebarOpen = true,
}) {
  const { user, role: contextRole } = useAuth();
  const { competition, groupLabel, groupLabelPlural } = useCompetition();
  const { hasAnyRole } = usePermission();
  const safeRoleKey = normalizeRole(contextRole);
  const cfg = roleConfig[safeRoleKey] ?? roleConfig.viewer;
  const userActions = useMemo(() => {
    return getUserActions(safeRoleKey);
  }, [safeRoleKey]);

  const standingsRef = useRef(null);
  const eventsRef = useRef(null);
  const contentRef = useRef(null);
  
  // Need dashboard data to check if checklist should be shown
  const { data: dashData } = useDashboardData();

  const [houseName, setHouseName] = useState(user?.house?.name || "");
  const [houseCode, setHouseCode] = useState(user?.house?.name?.substring(0, 3).toUpperCase() || "");

  useEffect(() => {
    if (safeRoleKey === "captain" && user?.house) {
      setHouseName(user.house.name || "");
      setHouseCode(user.house.name?.substring(0, 3).toUpperCase() || "");
    }
  }, [safeRoleKey, user?.house?.name]);

  useEffect(() => {
    // Captain group data is now populated from auth context (user.house = captainGroup)
    // No separate API call needed — data comes from login/competition select response
  }, []);

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

  const handleHouseUpdated = (group) => {
    setHouseName(group?.name || "");
    setHouseCode(group?.name?.substring(0, 3).toUpperCase() || "");
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
        activeAction={activeAction === "settings" ? "Settings" : (userActions.find((a) => a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction)?.label || null)}

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
                    className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:border-indigo-500 hover:text-indigo-500"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  {(() => {
                    if (activeAction === "settings") {
                      return <UserSettings />;
                    }
                    const slugObj = userActions.find((a) => {
                      const dynamicLabel = a.label
                        .replace('House', groupLabel || 'House')
                        .replace('Houses', groupLabelPlural || 'Houses');
                      return dynamicLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction;
                    });
                    
                    if (slugObj?.label === "Event Registration" && safeRoleKey === "participant") {
                      return <ParticipantRegister />;
                    }

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
                      <div className="card-premium p-4 sm:p-6 md:p-8">
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
                  {hasAnyRole("super_admin", "organizer", "event_coordinator") && (
                    <DashboardStatusWidget />
                  )}
                  <DashboardVisuals />

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {cfg.modules.events && (
                      <div ref={eventsRef} className="max-w-full overflow-hidden lg:col-span-12">
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

        {safeRoleKey === "super_admin" && dashData && (
          <OnboardingChecklist 
            systemStats={dashData.systemStats} 
            eventsCount={dashData.events?.length || 0} 
          />
        )}

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg pb-safe" style={{ borderTop: '1px solid var(--border-divider)', backgroundColor: 'var(--card)', opacity: 0.95 }}>
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
