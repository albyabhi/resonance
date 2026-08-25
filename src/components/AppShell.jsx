import { useState, useCallback } from "react";
import Header from "./Header";
import ThemeSyncBridge from "./ThemeSyncBridge";
import { useTheme } from "../context/ThemeContext";

export default function AppShell({ onLogout = () => {}, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Theme is now managed by ThemeProvider (Phase 2)
  const { theme, setTheme } = useTheme();

  const handleMenuClick = useCallback(() => setMobileOpen(true), []);
  const handleClose = useCallback(() => setMobileOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <div className="h-screen h-[100dvh] max-h-screen flex flex-col overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <ThemeSyncBridge />
      <Header
        onLogout={onLogout}
        onMenuClick={handleMenuClick}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {typeof children === "function"
          ? children({
              mobileOpen,
              setMobileOpen,
              onCloseSidebar: handleClose,
              sidebarOpen,
              setSidebarOpen,
              theme,
              setTheme,
            })
          : (
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-20 sm:px-6 md:py-6">
              {children}
            </main>
          )}
      </div>
    </div>
  );
}
