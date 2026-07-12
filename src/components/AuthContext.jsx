import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { resetApiLogoutGuard, isTokenExpired, refreshAccessToken } from "../utils/apiClient";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved).user || null : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved).role || "guest" : "guest";
    } catch {
      return "guest";
    }
  });

  const [token, setToken] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved).token || null : null;
    } catch {
      return null;
    }
  });

  const [refreshToken, setRefreshToken] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved).refreshToken || null : null;
    } catch {
      return null;
    }
  });

  const [loading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigate = useNavigate();

  // Derived: competition comes from the user object
  const competition = useMemo(() => user?.competition || null, [user]);

  const persist = (nextUser, nextRole, jwtToken, rToken) => {
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
  };

  // Migrate old format (competition stored at top level) to new format (inside user)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("auth");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Old format: competition was at root, user didn't have it
        if (parsed.competition && parsed.user && !parsed.user.competition) {
          parsed.user.competition = parsed.competition;
          delete parsed.competition;
          localStorage.setItem("auth", JSON.stringify(parsed));
        }
      }
    } catch {
      // no-op
    }
  }, []);

  // Validate stored JWT on mount — don't show dashboard with expired token
  useEffect(() => {
    const validateAuth = async () => {
      const stored = localStorage.getItem("auth");
      if (!stored) {
        setIsAuthReady(true);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stored);
      } catch {
        localStorage.removeItem("auth");
        setIsAuthReady(true);
        return;
      }

      const storedToken = parsed.token;
      if (!storedToken) {
        setIsAuthReady(true);
        return;
      }

      if (isTokenExpired(storedToken)) {
        const storedRefresh = parsed.refreshToken;
        if (storedRefresh) {
          try {
            const newToken = await refreshAccessToken();
            const auth = JSON.parse(localStorage.getItem("auth") || "{}");
            auth.token = newToken;
            localStorage.setItem("auth", JSON.stringify(auth));
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
    const nextUser = competitionData
      ? { ...serverUser, role: nextRole, competition: competitionData }
      : { ...serverUser, role: nextRole };
    setUser(nextUser);
    setRole(nextRole);
    setToken(jwtToken || null);
    setRefreshToken(rToken || null);
    persist(nextUser, nextRole, jwtToken, rToken);
  };

  const logout = (options) => {
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
  };

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
    const handleTokenUpdate = (event) => setToken(event.detail.token);

    window.addEventListener('LOGOUT', handleGlobalLogout);
    window.addEventListener('TOKEN_UPDATED', handleTokenUpdate);

    return () => {
      window.removeEventListener('LOGOUT', handleGlobalLogout);
      window.removeEventListener('TOKEN_UPDATED', handleTokenUpdate);
    };
  }, []);

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
