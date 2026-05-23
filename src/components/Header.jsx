import React, { useState, useEffect } from "react";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "../utils/apiClient";
import Logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

function Header({
  onMenuClick = () => {},
  theme = "light",
  setTheme = () => {},
  sidebarOpen = true,
  onToggleSidebar = () => {},
}) {
  const auth = useAuth();
  const { user, role, token, isAuthReady } = auth || { user: null, role: "guest", token: null, isAuthReady: false };
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (token && role !== "guest" && isAuthReady) {
      apiFetch(`${API_BASE_URL}/api/notifications`, { _token: token })
        .then((res) => {
          if (!res.ok) {
             if (res.status === 401 || res.status === 403) return { notifications: [] };
             throw new Error('API error');
          }
          return res.json();
        })
        .then((data) => setNotifications(data?.notifications || []))
        .catch(console.error);
    }
  }, [token, role, isAuthReady]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayName = user?.name || "Guest";

  const handleMarkAsRead = async (id) => {
    await apiFetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: "PUT"
    });
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  return (
    <header className="glass sticky top-0 z-50 h-16 transition-colors duration-300">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-full p-2 transition-colors hover:text-indigo-600 md:hidden"
            style={{ color: 'var(--chart-axis)' }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden rounded-full p-2 transition-colors hover:text-indigo-600 md:inline-flex"
            style={{ color: 'var(--chart-axis)' }}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>

          <button type="button" onClick={() => navigate("/dashboard")} className="flex min-w-0 items-center gap-3">
            <img
              src={Logo}
              alt="Resonance"
              className="h-10 w-10 rounded-2xl  object-cover "
            />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline" style={{ color: 'var(--text)' }}>
              Resonance
            </span>
          </button>
        </div>

        <div className="hidden flex-1 justify-center px-4 md:flex">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search dashboard"
              className="h-11 w-full rounded-full border pl-11 pr-4 text-sm outline-none transition-colors duration-300 focus:border-indigo-500"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <button className="md:hidden rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
            <Search className="h-5 w-5" />
          </button>
          <ThemeToggle />

          {role !== "guest" && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full border p-2.5 transition-colors duration-300 hover:text-indigo-600"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border shadow-xl" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
                  <div className="flex items-center justify-between border-b p-4" style={{ borderBottom: '1px solid var(--border-divider)', backgroundColor: 'var(--surface)' }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">All caught up.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => {
                            if (!n.read) handleMarkAsRead(n._id);
                            if (n.action_url) {
                              navigate(n.action_url);
                              setShowNotifications(false);
                            }
                          }}
                          className={`cursor-pointer border-b p-4 transition-colors hover:bg-indigo-500/5 ${!n.read ? "border-l-2 border-l-indigo-600" : ""}`}
                          style={{ borderBottom: '1px solid var(--border-divider)' }}
                        >
                          <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`} style={{ color: !n.read ? 'var(--card-fg)' : 'var(--chart-axis)' }}>
                            {n.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--chart-axis)' }}>
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}

export default Header;
