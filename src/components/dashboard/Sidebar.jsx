import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  Trophy,
  CalendarDays,
  User,
  Shield,
  Settings,

} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { roleConfig, normalizeRole, getUserActions } from "./roleConfig";
import usePermission from "../../hooks/usePermission";

const sectionNav = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "standings", label: "Standings", icon: Trophy },
  { id: "events", label: "Events", icon: CalendarDays },
];

const sidebarVariants = {
  expanded: { width: 260 },
  collapsed: { width: 80 },
};

function SidebarButton({
  active = false,
  collapsed = false,
  label,
  icon: Icon,
  onClick,
  withArrow = false,
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative flex w-full items-center transition-all duration-200 
        ${collapsed ? "justify-center px-0 py-3" : "px-4 py-2.5 gap-3"}
        ${
          active
            ? "text-slate-900 dark:text-white"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
    >
      {active && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-y-1 left-2 right-2 -z-10 rounded-lg"
          style={{ backgroundColor: 'var(--surface)' }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      <Icon className={`h-5 w-5 shrink-0 ${active ? "text-slate-900 dark:text-white" : ""}`} />
      
      {!collapsed && (
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
      )}

      {!collapsed && withArrow && (
        <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

export default function Sidebar({
  open = false,
  onClose = () => {},
  sidebarOpen = true,
  onActionClick = () => {},
  activeAction = null,
  onSectionClick = () => {},
  activeSection = "home",
}) {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { groupLabel, groupLabelPlural } = useCompetition();
  const navigate = useNavigate();

  const roleKey = normalizeRole(role);
  const cfg = roleConfig[roleKey] ?? roleConfig.viewer;
  const displayName = user?.name || "Guest";

  const visibleSections = useMemo(
    () => sectionNav.filter((s) => {
      if (s.id === "home") return true;
      if (s.id === "standings") return cfg.modules?.standings;
      if (s.id === "events") return cfg.modules?.events;
      return true;
    }),
    [cfg.modules]
  );

  const visibleActions = useMemo(() => {
    const actions = getUserActions(roleKey);
    return actions.map(action => ({
      ...action,
      label: action.label.replace('House', groupLabel).replace('Houses', groupLabelPlural)
    }));
  }, [roleKey, groupLabel, groupLabelPlural]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const SidebarContent = (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border-divider)' }}>
      

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-6 space-y-8">
        <section>
          {sidebarOpen && (
            <p className="px-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Menu
            </p>
          )}
          <div className={sidebarOpen ? "px-2" : ""}>
            {visibleSections.map((s) => (
              <SidebarButton
                key={s.id}
                label={s.label}
                icon={s.icon}
                collapsed={!sidebarOpen}
                active={!activeAction && activeSection === s.id}
                onClick={() => { onSectionClick(s.id); onClose(); }}
              />
            ))}
            <SidebarButton
              label="Settings"
              icon={Settings}
              collapsed={!sidebarOpen}
              active={activeAction === "Settings"}
              onClick={() => { onActionClick("Settings"); onClose(); }}
            />

          </div>
        </section>

        {visibleActions.length > 0 && (
          <section>
            {sidebarOpen && (
              <p className="px-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Management
              </p>
            )}
            <div className={sidebarOpen ? "px-2" : ""}>
              {visibleActions.map((a) => (
                <SidebarButton
                  key={a.label}
                  label={a.label}
                  icon={a.icon}
                  withArrow={sidebarOpen}
                  collapsed={!sidebarOpen}
                  active={activeAction === a.label}
                  onClick={() => { onActionClick(a.label); onClose(); }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-divider)', backgroundColor: 'var(--bg)' }}>
        <div className={`flex items-center ${sidebarOpen ? "mb-4 gap-3" : "justify-center mb-0"}`}>
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
            {user?.profile_image ? (
              <img src={user.profile_image} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-slate-500" />
            )}
          </div>

          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--card-fg)' }}>{displayName}</p>
              <div className="flex items-center gap-1 text-slate-500">
                <Shield className="h-3 w-3" />
                <p className="text-[11px] truncate uppercase">{roleKey}</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={isAuthenticated ? logout : () => navigate("/login")}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors"
          style={sidebarOpen ? { backgroundColor: 'var(--card-fg)', color: 'var(--card)' } : { color: 'var(--chart-axis)' }}
        >
          {isAuthenticated ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {sidebarOpen && <span>{isAuthenticated ? "Logout" : "Login"}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={sidebarOpen ? "expanded" : "collapsed"}
        variants={sidebarVariants}
        className="sticky top-0 hidden h-full shrink-0 md:block"
      >
        {SidebarContent}
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm md:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[70] w-full max-w-[280px] md:hidden"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}