import React from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import CaptainMyDetails from './components/actions/CaptainMyDetails';
import AppShell from './components/AppShell';
import Dashboard from './components/dashboard/Dashboard';
import RouteTransitionVeil from './components/loading/RouteTransitionVeil';
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
import ParticipantSetupPasswordPage from './pages/entry/ParticipantSetupPasswordPage';
import ParticipateRedirectPage from './components/ParticipateRedirectPage';
import ParticipantLoginPage from './pages/entry/ParticipantLoginPage';
import usePermission from './hooks/usePermission';
import InstallBanner from './components/pwa/InstallBanner';
import PWAUpdatePrompt from './components/pwa/PWAUpdatePrompt';

function TokenRedirect() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    fetch(`${backendUrl}/api/public/token/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => {
        const slug = data.competition?.slug;
        if (slug) {
          navigate(`/view/${slug}`, { replace: true });
        } else {
          setError('Competition not found');
        }
      })
      .catch(() => setError('Invalid or expired link'));
  }, [token, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="text-7xl font-black text-muted-foreground">!</div>
          <h1 className="text-xl font-bold">Link Invalid</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a href="/" className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-muted border border-border text-sm font-semibold hover:bg-muted/80 transition-colors">
            Back to Resonance
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

/**
 * DashboardGate — dashboard-only entry gate.
 *
 * Public routes render instantly without waiting for auth. Only this gate
 * holds for auth, and once auth resolves it renders the dashboard directly.
 */
function DashboardGate() {
  const { isAuthenticated, competition, isAuthReady, logout } = useAuth();
  const { hasRole } = usePermission();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAuthReady && !competition && !hasRole("super_admin")) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <AppShell onLogout={logout}>
      {({ mobileOpen, setMobileOpen, onCloseSidebar, sidebarOpen }) => (
        <Dashboard
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onCloseSidebar={onCloseSidebar}
          sidebarOpen={sidebarOpen}
        />
      )}
   </AppShell>
  );
}

export default function App() {
  const { role, isAuthenticated, isAuthReady, logout } = useAuth();
  const { hasRole } = usePermission();

  return (
    <>
      <Routes>
        {/* Landing page at "/" */}
        <Route path="/" element={<WelcomePage />} />

        {/* Entry Flows */}
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/setup" replace /> : <SignupPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/view/:slug" element={<PublicViewPage />} />
        <Route path="/view/token/:token" element={<TokenRedirect />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/setup-password/:token" element={<SetupPasswordPage />} />
        <Route path="/participant-setup-password/:token" element={<ParticipantSetupPasswordPage />} />
        <Route path="/participate/:eventId" element={<ParticipateRedirectPage />} />
        <Route path="/participant-login" element={<ParticipantLoginPage />} />

        {/* Dashboard wrapper pattern for action-based routes.
            Public routes above render instantly; DashboardGate handles
            auth/competition guards before mounting the dashboard. */}
        <Route path="/dashboard/*" element={<DashboardGate />} />

        {/* Captain My Details — dashboard-only by design.
            Renders nothing until auth resolves to avoid a redirect flash. */}
        <Route
          path="/my-details"
          element={
            !isAuthReady ? null : isAuthenticated && hasRole('house_captain') ? (
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

      {/* Route transition veil — 600ms minimum, brand-only (wordmark +
          hairline progress), fires only when entering /dashboard from
          outside. Sibling of <Routes> (not a tree transition) so pages
          still swap instantly underneath per AGENTS.md. */}
      <RouteTransitionVeil />

      {/* PWA: global install affordance + SW update prompt.
          Siblings of <Routes> so they render on every route. */}
      <InstallBanner />
      <PWAUpdatePrompt />
    </>
  );
}
