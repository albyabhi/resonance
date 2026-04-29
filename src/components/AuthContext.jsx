// src/components/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // NEW
import { normalizeRole } from './dashboard/roleConfig';
import { resetApiLogoutGuard } from "../utils/apiClient";

const AuthContext = createContext(null);
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

  const [lastCompetition, setLastCompetition] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved).competition || null : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(true);
  const navigate = useNavigate();


  // Persist whenever state changes
  useEffect(() => {
    if (user && token) {
      localStorage.setItem("auth", JSON.stringify({ user, role, token, refreshToken, competition: lastCompetition }));
    } else {
      localStorage.removeItem("auth");
    }
  }, [user, role, token, refreshToken, lastCompetition]);

  // use shared normalizer from roleConfig so role keys are consistent across app

  const guestLogin = () => {
    setUser({ name: "Guest User" });
    setRole("guest");
    setToken(null);
  };

  // Login updates user, role, token, and persists
  const login = (serverUser, jwtToken, refreshToken, competition) => {
    resetApiLogoutGuard();
    const nextRole = normalizeRole(serverUser?.role);
    const nextUser = { ...serverUser, role: nextRole };
    setUser(nextUser);
    setRole(nextRole || "guest");
    setToken(jwtToken || null);
    setRefreshToken(refreshToken || null);
    if (competition) {
      setLastCompetition(competition);
    }
    
    // Persist immediately with competition
    localStorage.setItem("auth", JSON.stringify({ 
      user: nextUser, 
      role: nextRole || "guest", 
      token: jwtToken,
      refreshToken: refreshToken,
      competition: competition || lastCompetition 
    }));
  };

  // Logout then navigate to /login
  const logout = (options) => {
    setUser(null);
    setRole("guest");
    setToken(null);
    setRefreshToken(null);
    setLastCompetition(null);
    localStorage.removeItem("auth");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    if (!options || options.redirect !== false) {
      navigate("/login", { replace: true }); // redirect to login
    }
  };

  // Update only user.house and persist
  const setUserHouse = (house) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, house };
      if (token) {
        try {
          localStorage.setItem("auth", JSON.stringify({ user: next, role, token, competition: lastCompetition }));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  // General user updater, accepts a partial object or a function(prev)=>next
  const setUserData = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      if (token) {
        try {
          localStorage.setItem("auth", JSON.stringify({ user: next, role, token, competition: lastCompetition }));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  // Set up LOGOUT event listener
  useEffect(() => {
    const handleGlobalLogout = () => {
      logout({ redirect: true });
    };

    const handleTokenUpdate = (event) => {
      setToken(event.detail.token);
    };

    window.addEventListener('LOGOUT', handleGlobalLogout);
    window.addEventListener('TOKEN_UPDATED', handleTokenUpdate);

    return () => {
      window.removeEventListener('LOGOUT', handleGlobalLogout);
      window.removeEventListener('TOKEN_UPDATED', handleTokenUpdate);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        refreshToken,
        lastCompetition,
        setLastCompetition,
        loading,
        isAuthReady,
        isAuthenticated: !!token,
        login,
        logout,           // now redirects to /login
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
