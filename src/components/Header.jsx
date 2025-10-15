import React from "react";
import { LogOut, Bell, Menu, ChevronDown } from "lucide-react";
import { useAuth } from "./AuthContext";
import Logo from "../assets/Rlogo.jpg";

/**
 * ERP-standard Header
 * - No new functionality added; only UX, visuals, a11y, and animations
 * - Works on mobile and desktop
 * - Tailwind-based micro-interactions with reduced-motion support
 */
function Header({
  onLogout = () => {},
  onBellClick = () => {},
  onMenuClick = () => {},
}) {
  const { user, role, logout } = useAuth();

  const roleLabelMap = {
    admin: "Admin",
    captain: "House Captain",
    student_coordinator: "Student Coordinator",
    faculty: "Faculty Coordinator",
    guest: "Guest",
  };

  const displayName = user?.name || "Guest User";
  const roleLabel = roleLabelMap[role] || "Guest";

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <header
      className={[
        // Layout and backdrop
        "sticky top-0 z-50",
        "bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65",
        "border-b border-slate-200/70",
        "px-3 sm:px-5 lg:px-6 py-2.5",
      ].join(" ")}
      role="banner"
    >
      <div
        className={[
          "mx-auto w-full",
          "flex items-center justify-between gap-2",
          "max-w-[120rem]",
        ].join(" ")}
      >
        {/* Left: Menu + Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div aria-hidden="true">
              <img
                src={Logo}
                alt="Resonance Logo"
                className="w-14 h-14 rounded-full shadow-md border border-indigo-100 mb-2"
              />
            </div>
            <div className="leading-tight">
              <h1
                className={[
                  "text-base sm:text-lg font-semibold",
                  "text-slate-800 tracking-tight",
                ].join(" ")}
              >
                Resonance
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Inter‑House Competition Management
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <button
            className={[
              "relative inline-flex items-center justify-center",
              "rounded-md p-2 text-slate-600",
              "hover:bg-slate-100 hover:text-slate-800",
              "active:scale-[0.98]",
              "transition-all duration-150 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
              "motion-reduce:transition-none",
            ].join(" ")}
            onClick={onBellClick}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {/* Example unread dot (decorative only, no new logic) */}
            <span
              className={[
                "pointer-events-none absolute -top-0.5 -right-0.5",
                "inline-block h-2 w-2 rounded-full",
                "bg-rose-500 ring-2 ring-white",
                "shadow-[0_0_0_2px_rgba(255,255,255,0.6)]",
              ].join(" ")}
              aria-hidden="true"
            />
          </button>

          {/* Identity block */}
          <div
            className={[
              "hidden xs:flex items-center gap-2",
              "px-2.5 py-2 rounded-md",
              "hover:bg-slate-50",
              "transition-colors duration-150",
              "motion-reduce:transition-none",
            ].join(" ")}
          >
            <div
              className={[
                "h-8 w-8 rounded-full",
                "bg-gradient-to-br from-slate-200 to-slate-300",
                "ring-1 ring-inset ring-slate-300/70",
                "grid place-items-center text-[11px] font-medium text-slate-700",
                "select-none",
              ].join(" ")}
              aria-hidden="true"
              title={displayName}
            >
              {displayName
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="leading-tight text-right">
              <p className="text-sm font-medium text-slate-900">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500">{roleLabel}</p>
            </div>
            <ChevronDown
              className="w-4 h-4 text-slate-400"
              aria-hidden="true"
            />
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className={[
              "inline-flex items-center gap-1.5",
              "rounded-md px-2.5 py-2 text-sm font-medium",
              "text-rose-600 hover:text-rose-700",
              "hover:bg-rose-50 active:bg-rose-100",
              "active:scale-[0.98]",
              "transition-all duration-150 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50",
              "motion-reduce:transition-none",
            ].join(" ")}
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Subtle divider glow for depth */}
      <div
        className={[
          "pointer-events-none mt-2 -mb-2",
          "h-px w-full",
          "bg-gradient-to-r from-transparent via-slate-200 to-transparent",
        ].join(" ")}
        aria-hidden="true"
      />
    </header>
  );
}

export default Header;
