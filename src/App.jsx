import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AppShell from './components/AppShell';
import LoginPage from './components/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import CaptainMyDetails from './components/actions/CaptainMyDetails';
import { useAuth } from './components/AuthContext';
import { normalizeRole } from './components/dashboard/roleConfig';
import PageTransition from './components/PageTransition';

export default function App() {
  const { role, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_BACKEND_URL}/wake`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  if (loading) return <div>Loading...</div>;

  const normalizedRole = normalizeRole(role);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public dashboard at "/" */}
        {/* Redirect / to /dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard wrapper pattern for action-based routes */}
        <Route
          path="/dashboard/*"
          element={
            <PageTransition>
              <AppShell role={role} onLogout={logout}>
                {({ mobileOpen, setMobileOpen, onCloseSidebar, sidebarOpen }) => (
                  <Dashboard
                    role={role}
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                    onCloseSidebar={onCloseSidebar}
                    sidebarOpen={sidebarOpen}
                  />
                )}
              </AppShell>
            </PageTransition>
          }
        />

        {/* Captain My Details */}
        <Route
          path="/my-details"
          element={
            <PageTransition>
              {isAuthenticated && normalizedRole === 'captain' ? (
                <AppShell role={role} onLogout={logout}>
                  <CaptainMyDetails />
                </AppShell>
              ) : (
                <Navigate to="/" replace />
              )}
            </PageTransition>
          }
        />

        {/* Login only when not authenticated */}
        <Route
          path="/login"
          element={
            <PageTransition>
              {isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
            </PageTransition>
          }
        />

        {/* Catch-all -> "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
