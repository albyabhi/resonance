import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { resetApiLogoutGuard, isTokenExpired, refreshAccessToken, apiFetch, getAuthState } from "../utils/apiClient";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const initialAuth = useMemo(() => getAuthState(), []);

  const [user, setUser] = useState(() => initialAuth?.user || null);
  const [role, setRole] = useState(() => initialAuth?.role || "guest");
  const [token, setToken] = useState(() => initialAuth?.token || null);
  const [refreshToken, setRefreshToken] = useState(() => initialAuth?.refreshToken || null);

  const [loading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigate = useNavigate();

  // Derived: competition comes from the user object
  const competition = useMemo(() => user?.competition || null, [user]);

  // Auto-resolve a competition workspace for staff sessions that lack one
  // (stale localStorage sessions from before competition context existed).
  useEffect(() => {
    if (!isAuthReady || !token || !user || competition) return;
    if (["guest", "viewer", "participant"].includes(role)) return;

    let cancelled = false;

    const resolveWorkspace = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        const res = await apiFetch(`${backendUrl}/api/competition/my`);
        if (!res.ok) return;
        const data = await res.json();
        const comps = data?.adminCompetitions || [];
        if (cancelled || comps.length === 0) return;

        const target =
          comps.find((c) => (c._id || c.id) === user.last_competition_id) || comps[0];

        const selRes = await apiFetch(`${backendUrl}/api/auth/competition/select`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competition_id: target._id || target.id }),
        });
        if (!selRes.ok) return;
        const selData = await selRes.json();
        if (cancelled || !selData.competition) return;

        login(
          selData.user,
          selData.access_token,
          selData.refresh_token,
          selData.competition
        );
      } catch {
        // Best-effort resolution — the UI shows workspace hints when none exists
      }
    };

    resolveWorkspace();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, token, user, role, competition]);

  const persist = useCallback((nextUser, nextRole, jwtToken, rToken) => {
    if (nextUser && jwtToken) {
      localStorage.setItem("auth", JSON.stringify({
        user: nextUser,
        role: nextRole,
        token: jwtToken,
        refreshToken: rToken,
      }));
    } else {
      localStorage.removeItem("auth");
    }
  }, []);

  // Migrate old format (competition stored at top level) to new format (inside user)
  // + backfill `_id` for sessions stored with the setup-shaped `{id}` object
  // (fresh competitions before central login() normalization existed).
  useEffect(() => {
    try {
      const saved = getAuthState();
      if (saved) {
        let dirty = false;
        // Old format: competition was at root, user didn't have it
        if (saved.competition && saved.user && !saved.user.competition) {
          saved.user.competition = saved.competition;
          delete saved.competition;
          dirty = true;
        }
        const storedComp = saved.user?.competition;
        if (storedComp && !storedComp._id && (storedComp.id || storedComp.competition_id)) {
          storedComp._id = storedComp.id || storedComp.competition_id;
          dirty = true;
        }
        if (dirty) localStorage.setItem("auth", JSON.stringify(saved));
      }
    } catch {
      // no-op
    }
  }, []);

  // Validate stored JWT on mount — don't show dashboard with expired token
  useEffect(() => {
    const validateAuth = async () => {
      const stored = getAuthState();
      if (!stored) {
        setIsAuthReady(true);
        return;
      }

      const storedToken = stored.token;
      if (!storedToken) {
        setIsAuthReady(true);
        return;
      }

      if (isTokenExpired(storedToken)) {
        const storedRefresh = stored.refreshToken;
        if (storedRefresh) {
          try {
            const newToken = await refreshAccessToken();
            setToken(newToken);
          } catch {
            localStorage.removeItem("auth");
            setUser(null);
            setRole("guest");
            setToken(null);
            setRefreshToken(null);
          }
        } else {
          localStorage.removeItem("auth");
          setUser(null);
          setRole("guest");
          setToken(null);
          setRefreshToken(null);
        }
      }
      setIsAuthReady(true);
    };

    validateAuth();
  }, []);

  const guestLogin = () => {
    setUser({ name: "Guest User" });
    setRole("guest");
    setToken(null);
  };

  const login = (serverUser, jwtToken, rToken, competitionData) => {
    resetApiLogoutGuard();
    const nextRole = serverUser?.role || "viewer";
    // Canonicalize the competition id shape: producers disagree (setup maps
    // `{id}`, select/login return `{_id}`), so backfill `_id` once here and
    // every `competition._id` consumer stays correct. Original keys are kept.
    const normalizedCompetition = competitionData
      ? {
          ...competitionData,
          _id: competitionData._id || competitionData.id || competitionData.competition_id,
        }
      : competitionData;
    const nextUser = normalizedCompetition
      ? { ...serverUser, role: nextRole, competition: normalizedCompetition }
      : { ...serverUser, role: nextRole };
    setUser(nextUser);
    setRole(nextRole);
    setToken(jwtToken || null);
    setRefreshToken(rToken || null);
    persist(nextUser, nextRole, jwtToken, rToken);
  };

  const logout = useCallback((options) => {
    setUser(null);
    setRole("guest");
    setToken(null);
    setRefreshToken(null);
    persist(null, "guest", null, null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    if (!options || options.redirect !== false) {
      navigate("/", { replace: true });
    }
  }, [navigate, persist]);

  const setUserHouse = (house) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, house };
      if (token) persist(next, role, token, refreshToken);
      return next;
    });
  };

  const setUserData = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      if (token) persist(next, role, token, refreshToken);
      return next;
    });
  };

  useEffect(() => {
    const handleGlobalLogout = () => logout({ redirect: true });
    const handleTokenUpdate = (event) => {
      const nextToken = event.detail?.token;
      if (!nextToken) return;
      setToken(nextToken);
      // Keep localStorage in sync so apiFetch (storage) and components (state) never diverge
      try {
        const saved = getAuthState();
        if (saved) {
          saved.token = nextToken;
          localStorage.setItem("auth", JSON.stringify(saved));
        }
      } catch {
        // no-op — in-memory token still updates
      }
    };

    window.addEventListener('LOGOUT', handleGlobalLogout);
    window.addEventListener('TOKEN_UPDATED', handleTokenUpdate);

    return () => {
      window.removeEventListener('LOGOUT', handleGlobalLogout);
      window.removeEventListener('TOKEN_UPDATED', handleTokenUpdate);
    };
  }, [logout, setToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        refreshToken,
        competition,
        loading,
        isAuthReady,
        isAuthenticated: !!token,
        login,
        logout,
        guestLogin,
        setUserHouse,
        setUserData,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
