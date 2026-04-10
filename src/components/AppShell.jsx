import { useState, useCallback } from "react";
import Header from "./Header";
import { useTheme } from "../context/ThemeContext";

export default function AppShell({ onLogout = () => {}, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Theme is now managed by ThemeProvider (Phase 2)
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleMenuClick = useCallback(() => setMobileOpen(true), []);
  const handleClose = useCallback(() => setMobileOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <Header
        onLogout={onLogout}
        onMenuClick={handleMenuClick}
        theme={theme}
        setTheme={setTheme}
        resolvedTheme={resolvedTheme}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex flex-1 min-h-0">
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
          : children}
      </div>
    </div>
  );
}
