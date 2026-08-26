import { useState, useEffect, useRef } from "react";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, ChevronDown, Trophy } from "lucide-react";
import { useAuth } from "./AuthContext";
import { api, API_ROUTES } from "../utils/apiClient";

import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

function Header({
  onMenuClick = () => {},
  sidebarOpen = true,
  onToggleSidebar = () => {},
}) {
  const auth = useAuth();
  const { role, token, isAuthReady, competition, login } = auth || { role: "guest", token: null, isAuthReady: false, competition: null, login: () => {} };
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCompSwitcher, setShowCompSwitcher] = useState(false);
  const [compList, setCompList] = useState([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const compDropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (compDropdownRef.current && !compDropdownRef.current.contains(e.target)) {
        setShowCompSwitcher(false);
      }
    };
    if (showCompSwitcher) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCompSwitcher]);

  useEffect(() => {
    if (showCompSwitcher && token && role !== "guest") {
      setLoadingComps(true);
      api.get(API_ROUTES.COMPETITIONS.MY)
        .then((data) => {
          const list = data?.adminCompetitions || data || [];
          setCompList(Array.isArray(list) ? list : []);
        })
        .catch(() => setCompList([]))
        .finally(() => setLoadingComps(false));
    }
  }, [showCompSwitcher, token, role]);

  const handleSwitchCompetition = async (compId) => {
    try {
      const res = await api.post(API_ROUTES.AUTH.SELECT_COMPETITION, { competition_id: compId });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to switch");
      login(data.user, data.access_token, data.refresh_token, data.competition);
      setShowCompSwitcher(false);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token && role !== "guest" && isAuthReady) {
      api.get(API_ROUTES.NOTIFICATIONS.LIST({}))
        .then((data) => setNotifications(data?.notifications || []))
        .catch(console.error);
    }
  }, [token, role, isAuthReady]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id) => {
    await api.put(API_ROUTES.NOTIFICATIONS.MARK_READ(id));
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  return (
    <header className="sticky top-0 z-50 transition-colors duration-300">
      <div className="accent-stripe" />
      <div className="glass">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4" style={{ padding: "12px 7%" }}>
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onMenuClick}
              className="rounded-full md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={onToggleSidebar}
              className="rounded-full hidden md:inline-flex" aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </Button>

            <button type="button" onClick={() => navigate("/dashboard")} className="flex min-w-0 items-center gap-3 cursor-pointer">
              <span className="hidden text-[25px] font-bold tracking-tight sm:inline" style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
                Reson<span style={{ color: "var(--destructive)" }}>ance</span>
              </span>
            </button>

            {role !== "guest" && (competition || ["super_admin", "organizer", "event_coordinator", "judge", "house_captain"].includes(role)) && (
              <div className="relative ml-2" ref={compDropdownRef}>
                <button onClick={() => setShowCompSwitcher(!showCompSwitcher)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border-gold)",
                    color: "var(--muted-foreground)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                  }}>
                  <Trophy className="h-3.5 w-3.5" />
                  {!competition && <span className="font-bold">Select</span>}
                  <span style={{ color: "var(--accent-amber)" }}>&#9733;</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showCompSwitcher && (
                  <div className="absolute left-0 top-full mt-2 w-64 overflow-hidden rounded-lg shadow-xl z-50"
                    style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
                      Switch Competition
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loadingComps ? (
                        <div className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>Loading...</div>
                      ) : compList.length === 0 ? (
                        <div className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>No other competitions</div>
                      ) : (
                        compList.map((comp) => {
                          const isActive = comp._id === (competition?._id || competition?.id);
                          return (
                            <button key={comp._id} type="button" disabled={isActive}
                              onClick={() => handleSwitchCompetition(comp._id)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ color: isActive ? "var(--primary)" : "var(--card-foreground)" }}>
                              <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarFallback className="rounded-lg text-xs font-bold"
                                  style={{ backgroundColor: "var(--accent-blue-tint)", color: "var(--accent-blue)" }}>
                                  {comp.name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{comp.name}</div>
                                <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                                  {comp.year || ""} · {comp.type?.replace(/_/g, " ") || ""}
                                </div>
                              </div>
                              {isActive && (
                                <span className="text-xs font-semibold" style={{ color: "var(--accent-green)" }}>Active</span>
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
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
              <input type="text" placeholder="Search dashboard" className="theme-input h-11 rounded-full pl-11 pr-4 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>
            <ThemeToggle />

            {role !== "guest" && (
              <div className="relative">
                <Button variant="outline" size="icon" onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-full">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: "var(--accent-red)" }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-lg shadow-xl"
                    style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between border-b p-4"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}>
                      <span className="text-sm font-semibold" style={{ color: "var(--card-foreground)" }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                          style={{ backgroundColor: "var(--primary)" }}>
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>All caught up.</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n._id} onClick={() => { if (!n.read) handleMarkAsRead(n._id); if (n.action_url) { navigate(n.action_url); setShowNotifications(false); } }}
                            className="cursor-pointer border-b p-4 transition-colors hover:bg-muted/50"
                            style={{ borderColor: "var(--border)", borderLeft: !n.read ? "3px solid var(--primary)" : "3px solid transparent" }}>
                            <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}
                              style={{ color: !n.read ? "var(--card-foreground)" : "var(--muted-foreground)" }}>
                              {n.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
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
      </div>
    </header>
  );
}

export default Header;
