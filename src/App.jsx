import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoginPage from './components/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import CaptainMyDetails from './components/actions/CaptainMyDetails';
import { useAuth } from './components/AuthContext';
import WelcomePage from './pages/WelcomePage';
import SignupPage from './pages/entry/SignupPage';
import SetupPage from './pages/entry/SetupPage';
import JoinPage from './pages/entry/JoinPage';
import InvitePage from './pages/entry/InvitePage';
import PublicViewPage from './pages/entry/PublicViewPage';
import ForgotPasswordPage from './pages/entry/ForgotPasswordPage';
import ResetPasswordPage from './pages/entry/ResetPasswordPage';
import SetupPasswordPage from './pages/entry/SetupPasswordPage';
import ParticipateRedirectPage from './components/ParticipateRedirectPage';
import ParticipantLoginPage from './pages/entry/ParticipantLoginPage';
import usePermission from './hooks/usePermission';

export default function App() {
  const { role, isAuthenticated, competition, loading, isAuthReady, logout } = useAuth();
  const { hasRole } = usePermission();

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line no-restricted-syntax
    fetch(`${import.meta.env.VITE_BACKEND_URL}/wake`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  if (loading || !isAuthReady) return <div>Loading...</div>;

  return (
    <Routes>
      {/* Landing page at "/" */}
      <Route path="/" element={<WelcomePage />} />

      {/* Entry Flows */}
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/setup" replace /> : <SignupPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/view/:slug" element={<PublicViewPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/setup-password/:token" element={<SetupPasswordPage />} />
      <Route path="/participate/:eventId" element={<ParticipateRedirectPage />} />
      <Route path="/participant-login" element={<ParticipantLoginPage />} />

      {/* Dashboard wrapper pattern for action-based routes */}
      <Route
        path="/dashboard/*"
        element={
          isAuthenticated ? (
            (competition || hasRole("super_admin")) ? (
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
          )
        }
      />

      {/* Captain My Details */}
      <Route
        path="/my-details"
        element={
          isAuthenticated && hasRole('house_captain') ? (
            <AppShell role={role} onLogout={logout}>
              <CaptainMyDetails />
            </AppShell>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Catch-all -> "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
