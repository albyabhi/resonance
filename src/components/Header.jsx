import React, { useState, useEffect, useRef } from "react";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, ChevronDown, Trophy } from "lucide-react";
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
  const { user, role, token, isAuthReady, competition, login } = auth || { user: null, role: "guest", token: null, isAuthReady: false, competition: null, login: () => {} };
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCompSwitcher, setShowCompSwitcher] = useState(false);
  const [compList, setCompList] = useState([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const compDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (compDropdownRef.current && !compDropdownRef.current.contains(e.target)) {
        setShowCompSwitcher(false);
      }
    };
    if (showCompSwitcher) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCompSwitcher]);

  // Fetch competition list when dropdown opens
  useEffect(() => {
    if (showCompSwitcher && token && role !== "guest") {
      setLoadingComps(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      apiFetch(`${backendUrl}/api/competition/my`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then((data) => {
          const list = data?.adminCompetitions || data || [];
          setCompList(Array.isArray(list) ? list : []);
        })
        .catch(() => setCompList([]))
        .finally(() => setLoadingComps(false));
    }
  }, [showCompSwitcher, token, role]);

  const handleSwitchCompetition = async (compId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    try {
      const res = await apiFetch(`${backendUrl}/api/auth/competition/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: compId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to switch');
      login(data.user, data.access_token, data.refresh_token, data.competition);
      setShowCompSwitcher(false);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };


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
              className="h-10 w-10 rounded-2xl object-cover"
            />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline" style={{ color: 'var(--text)' }}>
              {competition?.name || 'Resonance'}
            </span>
          </button>

          {role !== "guest" && competition && (
            <div className="relative ml-2" ref={compDropdownRef}>
              <button
                type="button"
                onClick={() => setShowCompSwitcher(!showCompSwitcher)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--chart-axis)' }}
              >
                <Trophy className="h-3.5 w-3.5" />
                <ChevronDown className="h-3 w-3" />
              </button>

              {showCompSwitcher && (
                <div
                  className="absolute left-0 top-full mt-2 w-64 overflow-hidden rounded-xl border shadow-xl z-50"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}
                >
                  <div className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--chart-axis)', borderBottom: '1px solid var(--border-divider)' }}>
                    Switch Competition
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {loadingComps ? (
                      <div className="px-4 py-3 text-xs" style={{ color: 'var(--chart-axis)' }}>Loading...</div>
                    ) : compList.length === 0 ? (
                      <div className="px-4 py-3 text-xs" style={{ color: 'var(--chart-axis)' }}>No other competitions</div>
                    ) : (
                      compList.map((comp) => {
                        const isActive = comp._id === (competition?._id || competition?.id);
                        return (
                          <button
                            key={comp._id}
                            type="button"
                            disabled={isActive}
                            onClick={() => handleSwitchCompetition(comp._id)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-white/10"
                            style={{ color: isActive ? 'var(--accent)' : 'var(--card-fg)' }}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-xs font-bold dark:bg-blue-950/40 dark:text-blue-400">
                              {comp.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{comp.name}</div>
                              <div className="text-xs truncate" style={{ color: 'var(--chart-axis)' }}>
                                {comp.year || ''} · {comp.type?.replace(/_/g, ' ') || ''}
                              </div>
                            </div>
                            {isActive && (
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">Active</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
