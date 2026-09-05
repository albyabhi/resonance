import { useEffect, useRef, useMemo, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { roleConfig, normalizeRole, getUserActions } from "./roleConfig";
import Sidebar from "./Sidebar";
import RecentEvents from "../RecentEvents";
import CaptainsDirectory from "../CaptainsDirectory";
import { useAuth } from "../AuthContext";
import DashboardVisuals from "./DashboardVisuals";
import { FadeIn } from "../AnimateReveal";
import { Button } from "../ui/button";
import { ArrowLeft, LayoutDashboard, Trophy, CalendarDays } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import useDashboardData from "../../hooks/useDashboardData";
import OnboardingChecklist from "./OnboardingChecklist";
import usePermission from "../../hooks/usePermission";
import { VeilPanel } from "../loading/RouteTransitionVeil";

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
  const { groupLabel, groupLabelPlural } = useCompetition();
  const { hasAnyRole } = usePermission();
  const safeRoleKey = normalizeRole(contextRole);
  const cfg = roleConfig[safeRoleKey] ?? roleConfig.viewer;
  const userActions = useMemo(() => {
    return getUserActions(safeRoleKey);
  }, [safeRoleKey]);

  const toDynamicLabel = (label) =>
    String(label || "")
      .replace("Houses", groupLabelPlural || "Houses")
      .replace("Groups", groupLabelPlural || "Groups")
      .replace("House", groupLabel || "House")
      .replace("Group", groupLabel || "Group");

  // Mobile bottom bar: Home + up to 2-3 primary route actions.
  // Captain order in roleConfig is My House -> Event Registration so both survive here.
  const mobileQuickActions = useMemo(() => {
    const shortLabels = {
      "Manage Users": "Users",
      "Manage Events": "Manage",
      "Manage Participants": "Participants",
      "Manage Competition": "Comp",
      "Result Submissions": "Results",
      "Activity Logs": "Logs",
      "Manage Venues": "Venues",
      "Export Report": "Reports",
      "Event Participants": "Participants",
      "Assign Chest Numbers": "Chest #",
      "Judge Dashboard": "Judging",
      "My Scores": "Scores",
      "Events": "Register",
      "Event Registration": "Register",
      "My Events": "My Events",
      "My House": "My House",
      "Manage House Logo": "Logo",
    };
    return userActions
      .filter((a) => {
        if (!actionComponents[a.label]) return false;
        // Drop legacy Department tabs only — keep House/Group actions (captain needs them)
        if (/department/i.test(a.label)) return false;
        return true;
      })
      .slice(0, 2)
      .map((a) => {
        const dynamicLabel = toDynamicLabel(a.label);
        return {
          ...a,
          dynamicLabel,
          slug: dynamicLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          shortLabel: shortLabels[a.label] || dynamicLabel,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userActions, groupLabel, groupLabelPlural]);

  const standingsRef = useRef(null);
  const eventsRef = useRef(null);
  const contentRef = useRef(null);

  // Need dashboard data to check if checklist should be shown
  const { data: dashData, loading: dashLoading } = useDashboardData();

  const [showDashboardLoader, setShowDashboardLoader] = useState(true);
  const hasLoadedRef = useRef(false);
  const mountStartedAtRef = useRef(0);
  const loaderHideTimerRef = useRef(null);
  const MIN_LOADER_MS = 600;

  useEffect(() => {
    mountStartedAtRef.current = performance.now();
    return () => {
      if (loaderHideTimerRef.current) {
        clearTimeout(loaderHideTimerRef.current);
        loaderHideTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (dashLoading) return;
    if (hasLoadedRef.current) {
      if (showDashboardLoader) setShowDashboardLoader(false);
      return;
    }
    hasLoadedRef.current = true;
    const elapsed = performance.now() - mountStartedAtRef.current;
    const delay = Math.max(0, MIN_LOADER_MS - elapsed);
    loaderHideTimerRef.current = setTimeout(() => {
      setShowDashboardLoader(false);
      loaderHideTimerRef.current = null;
    }, delay);
  }, [dashLoading, showDashboardLoader]);

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
        activeAction={["settings", "profile"].includes(activeAction) ? "Profile" : (userActions.find((a) => toDynamicLabel(a.label).toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction)?.label || (activeAction === "events" && safeRoleKey === "house_captain" ? "Event Registration" : null))}

        onSectionClick={handleSectionClick}
        activeSection={activeAction ? null : "home"}
      />

      <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-24 sm:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 sm:gap-6">
          <Routes>
            <Route
              path=":actionSlug"
              element={
                <div className="min-w-0">
                  <Button variant="outline" onClick={handleGoBack} className="mb-4 min-h-[44px] rounded-full sm:mb-6">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  {(() => {
                    if (activeAction === "settings" || activeAction === "profile") {
                      return <ProfileSettings />;
                    }
                    const slugObj = userActions.find((a) => {
                      const dynamicLabel = a.label
                        .replace('Houses', groupLabelPlural || 'Houses')
                        .replace('Groups', groupLabelPlural || 'Groups')
                        .replace('House', groupLabel || 'House')
                        .replace('Group', groupLabel || 'Group');
                      return dynamicLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeAction;
                    }) || (
                      // Legacy alias: old captain "Events" slug now lives at Event Registration
                      activeAction === "events" && safeRoleKey === "house_captain"
                        ? { label: "Event Registration" }
                        : null
                    );
                    
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

                    // Pages own their Card styling — avoid nested card-premium wrappers
                    return (
                      <div className="w-full min-w-0">
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
                <div className="flex flex-col gap-4 sm:gap-6">
                  {hasAnyRole("super_admin", "organizer", "event_coordinator") && (
                    <DashboardStatusWidget summary={dashData?.statusSummary} loading={dashLoading} />
                  )}
                  <div ref={standingsRef} className="scroll-mt-20 min-w-0">
                    <DashboardVisuals />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
                    {cfg.modules.events && (
                      <div ref={eventsRef} className="max-w-full scroll-mt-20 overflow-hidden lg:col-span-12">
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

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg pb-safe" style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
          <div className="flex h-16 justify-around items-stretch px-1">
            <button onClick={() => handleSectionClick("home")} aria-label="Dashboard home"
              className="flex min-h-[56px] flex-col items-center justify-center w-full h-full space-y-1 px-1"
              style={{ color: !activeAction ? "var(--primary)" : "var(--muted-foreground)" }}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight">Home</span>
            </button>
            {safeRoleKey === "house_captain" ? (
              <>
                {/* Captain IA: Home | My House | Register | Profile — no duplicate scroll tabs */}
                {mobileQuickActions.map((action) => {
                  const Icon = action.icon;
                  const isActive = activeAction === action.slug;
                  return (
                    <button key={action.label} onClick={() => handleActionClick(action.dynamicLabel)}
                      aria-label={action.shortLabel}
                      className="flex min-h-[56px] flex-col items-center justify-center w-full h-full space-y-1 px-1"
                      style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}>
                      {Icon && <Icon className="w-5 h-5" />}
                      <span className="text-[10px] font-medium leading-tight truncate max-w-full">{action.shortLabel}</span>
                    </button>
                  );
                })}
                <button onClick={() => handleActionClick("Profile")} aria-label="Profile"
                  className="flex min-h-[56px] flex-col items-center justify-center w-full h-full space-y-1 px-1"
                  style={{ color: activeAction === "profile" ? "var(--primary)" : "var(--muted-foreground)" }}>
                  <LayoutDashboard className="w-5 h-5 hidden" />
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold" style={{ borderColor: "currentColor" }}>Me</span>
                  <span className="text-[10px] font-medium leading-tight">Profile</span>
                </button>
              </>
            ) : (
              <>
            {cfg.modules.standings && (
              <button onClick={() => handleSectionClick("standings")}
                className="flex min-h-[56px] flex-col items-center justify-center w-full h-full space-y-1 px-1"
                style={{ color: "var(--muted-foreground)" }}>
                <Trophy className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">Standings</span>
              </button>
            )}
            {cfg.modules.events && (
              <button onClick={() => handleSectionClick("events")}
                className="flex min-h-[56px] flex-col items-center justify-center w-full h-full space-y-1 px-1"
                style={{ color: "var(--muted-foreground)" }}>
                <CalendarDays className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">Events</span>
              </button>
            )}

            {/* Role-specific quick actions — working options only (no Department old-version tabs) */}
            {mobileQuickActions.map((action) => {
              const Icon = action.icon;
              const isActive = activeAction === action.slug;
              return (
                <button key={action.label} onClick={() => handleActionClick(action.dynamicLabel)}
                  className="flex min-h-[56px] flex-col items-center justify-center w-full h-full space-y-1 px-1"
                  style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}>
                  {Icon && <Icon className="w-5 h-5" />}
                  <span className="text-[10px] font-medium leading-tight truncate max-w-full">{action.shortLabel}</span>
                </button>
              );
            })}
              </>
            )}
         </div>
       </div>

      {showDashboardLoader && (
        <VeilPanel instant />
      )}
      </>
    );
  }
