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
import WelcomePage from './pages/WelcomePage';
import EntryPage from './pages/entry/EntryPage';
import SignupPage from './pages/entry/SignupPage';
import SetupPage from './pages/entry/SetupPage';
import JoinPage from './pages/entry/JoinPage';
import InvitePage from './pages/entry/InvitePage';
import PublicViewPage from './pages/entry/PublicViewPage';
import ForgotPasswordPage from './pages/entry/ForgotPasswordPage';
import ResetPasswordPage from './pages/entry/ResetPasswordPage';
export default function App() {
  const { role, isAuthenticated, lastCompetition, loading, isAuthReady, logout } = useAuth();
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

  if (loading || !isAuthReady) return <div>Loading...</div>;

  const normalizedRole = normalizeRole(role);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing page at "/" */}
        <Route path="/" element={
          <PageTransition>
            <WelcomePage />
          </PageTransition>
        } />

        {/* Entry Flows */}
        <Route path="/entry" element={<PageTransition><EntryPage /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><SignupPage /></PageTransition>} />
        <Route path="/setup" element={<PageTransition><SetupPage /></PageTransition>} />
        <Route path="/join" element={<PageTransition><JoinPage /></PageTransition>} />
        <Route path="/invite/:token" element={<PageTransition><InvitePage /></PageTransition>} />
        <Route path="/view/:slug" element={<PageTransition><PublicViewPage /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
        <Route path="/reset-password/:token" element={<PageTransition><ResetPasswordPage /></PageTransition>} />

        {/* Dashboard wrapper pattern for action-based routes */}
        <Route
          path="/dashboard/*"
          element={
            <PageTransition>
              {isAuthenticated ? (
                lastCompetition ? (
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
                ) : (
                  <Navigate to="/setup" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )}
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
              {isAuthenticated ? (
                lastCompetition ? <Navigate to="/dashboard" replace /> : <Navigate to="/setup" replace />
              ) : (
                <LoginPage />
              )}
            </PageTransition>
          }
        />

        {/* Catch-all -> "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
