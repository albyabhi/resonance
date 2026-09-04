import { useState, useEffect } from "react";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  const { role, token, isAuthReady, competition } = auth || { role: "guest", token: null, isAuthReady: false, competition: null };
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-[4%] lg:px-[7%]">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={onMenuClick}
              className="rounded-full md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={onToggleSidebar}
              className="rounded-full hidden md:inline-flex" aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </Button>

            <button type="button" onClick={() => navigate("/dashboard")} className="flex min-w-0 items-center gap-3 cursor-pointer">
              <span className="text-[20px] font-bold tracking-tight sm:text-[25px]" style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
                Reson<span style={{ color: "var(--destructive)" }}>ance</span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
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
                  <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-lg shadow-xl"
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

            {role !== "guest" && competition && (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                title={competition.name || "Competition"}
                aria-label="Competition logo"
                className="shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
              >
                <Avatar className="h-9 w-9 rounded-full" style={{ border: "1px solid var(--border)" }}>
                  {competition.logoUrl ? (
                    <img src={competition.logoUrl} alt={competition.name || "Competition logo"} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <AvatarFallback
                      className="rounded-full text-sm font-bold"
                      style={{ backgroundColor: "var(--accent-blue-tint)", color: "var(--accent-blue)" }}
                    >
                      {competition.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
