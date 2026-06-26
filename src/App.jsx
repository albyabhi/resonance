import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AppShell from './components/AppShell';
import LoginPage from './components/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import CaptainMyDetails from './components/actions/CaptainMyDetails';
import { useAuth } from './components/AuthContext';
import PageTransition from './components/PageTransition';
import WelcomePage from './pages/WelcomePage';
import SignupPage from './pages/entry/SignupPage';
import SetupPage from './pages/entry/SetupPage';
import JoinPage from './pages/entry/JoinPage';
import InvitePage from './pages/entry/InvitePage';
import PublicViewPage from './pages/entry/PublicViewPage';
import ForgotPasswordPage from './pages/entry/ForgotPasswordPage';
import ResetPasswordPage from './pages/entry/ResetPasswordPage';
import ParticipateRedirectPage from './components/ParticipateRedirectPage';
import ParticipantLoginPage from './pages/entry/ParticipantLoginPage';
import usePermission from './hooks/usePermission';

export default function App() {
  const { role, isAuthenticated, competition, loading, isAuthReady, logout } = useAuth();
  const { hasRole } = usePermission();
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
        <Route path="/signup" element={
          <PageTransition>
            {isAuthenticated ? <Navigate to="/setup" replace /> : <SignupPage />}
          </PageTransition>
        } />
        <Route path="/setup" element={<PageTransition><SetupPage /></PageTransition>} />
        <Route path="/join" element={<PageTransition><JoinPage /></PageTransition>} />
        <Route path="/invite/:token" element={<PageTransition><InvitePage /></PageTransition>} />
        <Route path="/view/:slug" element={<PageTransition><PublicViewPage /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
        <Route path="/reset-password/:token" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
        <Route path="/participate/:eventId" element={<PageTransition><ParticipateRedirectPage /></PageTransition>} />
        <Route path="/participant-login" element={<PageTransition><ParticipantLoginPage /></PageTransition>} />

        {/* Dashboard wrapper pattern for action-based routes */}
        <Route
          path="/dashboard/*"
          element={
            <PageTransition>
              {isAuthenticated ? (
                competition ? (
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
              {isAuthenticated && hasRole('house_captain') ? (
                <AppShell role={role} onLogout={logout}>
                  <CaptainMyDetails />
                </AppShell>
              ) : (
                <Navigate to="/" replace />
              )}
            </PageTransition>
          }
        />

        <Route
          path="/login"
          element={
            <PageTransition>
              {isAuthenticated ? (
                <Navigate to="/" replace />
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
