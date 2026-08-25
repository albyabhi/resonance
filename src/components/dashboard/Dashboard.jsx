import { useEffect, useRef, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { roleConfig, normalizeRole, getUserActions } from "./roleConfig";
import Sidebar from "./Sidebar";
import RecentEvents from "../RecentEvents";
import CaptainsDirectory from "../CaptainsDirectory";
import { useAuth } from "../AuthContext";
import DashboardVisuals from "./DashboardVisuals";
import { FadeIn } from "../AnimateReveal";
import { Button } from "../ui/button";
import { ArrowLeft, LayoutDashboard, Trophy, CalendarDays, Users, UserPlus, Calendar, Hash, ClipboardList, CheckCircle } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import useDashboardData from "../../hooks/useDashboardData";
import OnboardingChecklist from "./OnboardingChecklist";
import usePermission from "../../hooks/usePermission";

import ManageUsers from "../actions/ManageUser";
import ManageHouse from "../actions/ManageHouse";
import ManageEvents from "../actions/ManageEvents";
import ParticipantRegister from "../actions/ParticipantRegister";
import ManageParticipants from "../actions/ManageParticipants";
import EditHouse from "../actions/EditHouse";
import ActivityLogs from "../actions/ActivityLogs";
import CaptainMyDetails from "../actions/CaptainMyDetails";
import CaptainMyGroup from "../actions/CaptainMyGroup";
import CaptainEventRegister from "../actions/CaptainEventRegister";
import DashboardStatusWidget from "../actions/DashboardStatusWidget";
import ManageCompetition from "../actions/ManageCompetition";
import ProfileSettings from "../actions/ProfileSettings";
import UserSettings from "../actions/UserSettings";
import ExportReport from "../actions/ExportReport";
import JudgeDashboard from "../actions/JudgeDashboard";
import MyScores from "../actions/MyScores";
import ManageVenue from "../actions/ManageVenue";
import CoordinatorParticipants from "../actions/CoordinatorParticipants";
import CoordinatorEventManagement from "../actions/CoordinatorEventManagement";
import ScoringHub from "../actions/ScoringHub";


const actionComponents = {
  "Manage Users": ManageUsers,
  "Manage Houses": ManageHouse,
  "Manage Events": ManageEvents,
  "Manage Competition": ManageCompetition,
  "Result Submissions": ScoringHub,
  "Activity Logs": ActivityLogs,
  "Manage Participants": ManageParticipants,
  "My Events": ParticipantRegister,
  "Event Registration": CaptainEventRegister,
  "Events": CaptainEventRegister,
  "My House": CaptainMyGroup,
  "My Details": CaptainMyDetails,
  "Manage House Logo": EditHouse,
  "Export Report": ExportReport,
  "Judge Dashboard": JudgeDashboard,
  "My Scores": MyScores,
  "Manage Venues": ManageVenue,
  "Event Participants": CoordinatorParticipants,
  "Assign Chest Numbers": CoordinatorEventManagement,
};

export default function Dashboard({
  mobileOpen = false,
  setMobileOpen,
  onCloseSidebar = () => {},
  sidebarOpen = true,
}) {
  const { role: contextRole } = useAuth();
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
  const { data: dashData, loading: dashLoading } = useDashboardData();

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

  const handleHouseUpdated = () => {};

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
        activeAction={["settings", "profile"].includes(activeAction) ? "Profile" : (userActions.find((a) => a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction)?.label || null)}

        onSectionClick={handleSectionClick}
        activeSection={activeAction ? null : "home"}
      />

      <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-20 sm:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <FadeIn delay={0.1}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex flex-col items-start gap-1">
                {competition?.logoUrl && (
                  <button type="button" onClick={() => navigate("/dashboard")} className="cursor-pointer">
                    <img src={competition.logoUrl} alt="Competition Logo" className="h-16 w-auto object-contain mb-2" />
                  </button>
                )}
              </div>
            </div>
          </FadeIn>

          <Routes>
            <Route
              path=":actionSlug"
              element={
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Button variant="outline" onClick={handleGoBack} className="mb-6 rounded-full">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  {(() => {
                    if (activeAction === "settings" || activeAction === "profile") {
                      return <ProfileSettings />;
                    }
                    const slugObj = userActions.find((a) => {
                      const dynamicLabel = a.label
                        .replace('House', groupLabel || 'House')
                        .replace('Houses', groupLabelPlural || 'Houses')
                        .replace('Group', groupLabel || 'Group')
                        .replace('Groups', groupLabelPlural || 'Groups');
                      return dynamicLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction;
                    });
                    
                    if (slugObj?.label === "Event Registration" && safeRoleKey === "participant") {
                      return <ParticipantRegister />;
                    }

                    const MappedComponent = slugObj ? actionComponents[slugObj.label] : null;

                    if (!MappedComponent) {
                      return (
                        <div className="card-premium p-10 text-center">
                          <h3 className="mb-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>Unavailable</h3>
                          <p style={{ color: "var(--muted-foreground)" }}>This section is not available right now.</p>
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
                    <DashboardStatusWidget summary={dashData?.statusSummary} loading={dashLoading} />
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

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg pb-safe" style={{ borderTop: "1px solid var(--border-divider)", backgroundColor: "var(--card)" }}>
          <div className="flex h-16 justify-around items-center px-2">
            <button onClick={() => handleSectionClick("home")}
              className="flex flex-col items-center justify-center w-full h-full space-y-1"
              style={{ color: !activeAction ? "var(--primary)" : "var(--muted-foreground)" }}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-medium">Dashboard</span>
            </button>
            {cfg.modules.standings && (
              <button onClick={() => handleSectionClick("standings")}
                className="flex flex-col items-center justify-center w-full h-full space-y-1"
                style={{ color: "var(--muted-foreground)" }}>
                <Trophy className="w-5 h-5" />
                <span className="text-[10px] font-medium">Standings</span>
              </button>
            )}
            {cfg.modules.events && (
              <button onClick={() => handleSectionClick("events")}
                className="flex flex-col items-center justify-center w-full h-full space-y-1"
                style={{ color: "var(--muted-foreground)" }}>
                <CalendarDays className="w-5 h-5" />
                <span className="text-[10px] font-medium">Events</span>
              </button>
            )}

            {/* Role-specific quick actions */}
            {safeRoleKey === "super_admin" && (
              <>
                <button onClick={() => handleActionClick("Manage Users")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Users</span>
                </button>
                <button onClick={() => handleActionClick("Manage Houses")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <UserPlus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{groupLabelPlural || "Groups"}</span>
                </button>
              </>
            )}
            {safeRoleKey === "organizer" && (
              <>
                <button onClick={() => handleActionClick("Manage Events")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Calendar className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Events</span>
                </button>
                <button onClick={() => handleActionClick("Manage Participants")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Participants</span>
                </button>
              </>
            )}
            {safeRoleKey === "event_coordinator" && (
              <>
                <button onClick={() => handleActionClick("Manage Events")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Calendar className="w-5 h-5" />
                  <span className="text-[10px] font-medium">My Events</span>
                </button>
                <button onClick={() => handleActionClick("Assign Chest Numbers")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Hash className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Chest #</span>
                </button>
              </>
            )}
            {safeRoleKey === "judge" && (
              <>
                <button onClick={() => handleActionClick("Judge Dashboard")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Judging</span>
                </button>
                <button onClick={() => handleActionClick("My Scores")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-[10px] font-medium">My Scores</span>
                </button>
              </>
            )}
            {safeRoleKey === "house_captain" && (
              <>
                <button onClick={() => handleActionClick("Events")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Calendar className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Events</span>
                </button>
                <button onClick={() => handleActionClick("My House")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-medium">My {groupLabel || "Group"}</span>
                </button>
              </>
            )}
            {safeRoleKey === "participant" && (
              <>
                <button onClick={() => handleActionClick("Event Registration")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <UserPlus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Register</span>
                </button>
                <button onClick={() => handleActionClick("My Events")}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Calendar className="w-5 h-5" />
                  <span className="text-[10px] font-medium">My Events</span>
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }
