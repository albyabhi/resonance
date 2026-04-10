import React, { useEffect } from "react";
import {
  LogOut,
  LogIn,
  LayoutDashboard,
  Trophy,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { roleConfig, normalizeRole } from "./roleConfig";
import { useNavigate } from "react-router-dom";

const sectionNav = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "standings", label: "Standings", icon: Trophy },
  { id: "events", label: "Events", icon: CalendarDays },
];

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
  const navigate = useNavigate();

  const roleKey = normalizeRole(role);
  const cfg = roleConfig[roleKey] ?? roleConfig.guest;
  const displayName = user?.name || "Guest";

  const roleLabelMap = {
    admin: "Administrator",
    captain: "House Captain",
    student_coordinator: "Coordinator",
    faculty: "Faculty",
    guest: "Guest",
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleAction = (label) => {
    onActionClick(label);
    onClose();
  };

  const handleSection = (id) => {
    onSectionClick(id);
    onClose();
  };

  const navButtonClass = (active) =>
    `flex w-full items-center rounded-2xl px-3 py-3 text-sm transition-all duration-200 ${
      active
        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
    } ${sidebarOpen ? "gap-3 justify-start" : "justify-center"}`;

  const SidebarContent = (
    <div className="flex h-full flex-col transition-all duration-300" style={{ backgroundColor: 'var(--card)' }}>
      <div className={`flex items-center gap-3 px-5 py-5 ${sidebarOpen ? "" : "justify-center px-3"}`} style={{ borderBottom: '1px solid var(--border-divider)' }}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <Trophy className="h-5 w-5" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">Resonance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dashboard</p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div>
          {sidebarOpen && <p className="mb-3 px-3 text-xs text-gray-400 dark:text-gray-500">Navigation</p>}
          <ul className="space-y-1.5">
            {sectionNav
              .filter((s) => {
                if (s.id === "home") return true;
                if (s.id === "standings") return cfg.modules?.standings;
                if (s.id === "events") return cfg.modules?.events;
                return true;
              })
              .map(({ id, label, icon: Icon }) => {
                const active = !activeAction && activeSection === id;
                return (
                  <li key={id} className="group">
                    <button
                      onClick={() => handleSection(id)}
                      title={!sidebarOpen ? label : undefined}
                      className={navButtonClass(active)}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                        }`}
                      />
                      {sidebarOpen && <span className="truncate">{label}</span>}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>

        {cfg.actions?.length > 0 && (
          <div>
            {sidebarOpen && <p className="mb-3 px-3 text-xs text-gray-400 dark:text-gray-500">Management</p>}
            <ul className="space-y-1.5">
              {cfg.actions.map(({ label, icon: Icon }, i) => {
                const active = activeAction === label;
                return (
                  <li key={i} className="group">
                    <button
                      onClick={() => handleAction(label)}
                      title={!sidebarOpen ? label : undefined}
                      className={navButtonClass(active)}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                        }`}
                      />
                      {sidebarOpen && <span className="truncate">{label}</span>}
                      {sidebarOpen && (
                        <ChevronRight
                          className={`ml-auto h-4 w-4 text-gray-300 transition-transform ${
                            active ? "rotate-90" : "group-hover:translate-x-1"
                          }`}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-auto p-4" style={{ borderTop: '1px solid var(--border-divider)' }}>
        <div className={`rounded-2xl p-3 ${sidebarOpen ? "" : "px-2"}`} style={{ backgroundColor: 'var(--surface)', border: 'var(--border-card)' }}>
          <div className={`mb-3 flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold shadow-sm" style={{ backgroundColor: 'var(--card)', border: 'var(--border-card)', color: 'var(--accent)' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-slate-300 font-medium">{roleLabelMap[roleKey] || "Guest"}</p>
              </div>
            )}
          </div>
          <button
            onClick={isAuthenticated ? logout : () => navigate("/login")}
            title={!sidebarOpen ? (isAuthenticated ? "Log out" : "Login") : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 hover:text-indigo-600 dark:hover:text-indigo-400"
            style={{ backgroundColor: 'var(--card)', border: 'var(--border-card)', color: 'var(--text)' }}
          >
            {isAuthenticated ? (
              <>
                <LogOut className="h-4 w-4" /> Log out
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Login
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className={`sticky top-16 z-40 hidden h-[calc(100vh-4rem)] shrink-0 overflow-hidden transition-all duration-300 md:flex ${sidebarOpen ? "w-64" : "w-20"}`} style={{ borderRight: '1px solid var(--border-divider)' }}>
        {SidebarContent}
      </aside>

      <div
        className={`fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 left-0 z-[70] w-72 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: 'var(--card)' }}
      >
        {SidebarContent}
      </div>
    </>
  );
}
