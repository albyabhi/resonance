// src/components/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // NEW
import { normalizeRole } from './dashboard/roleConfig';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // { id, name, username, role, house? }
  const [role, setRole] = useState("guest");       
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();                  // NEW

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("auth");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed.user || null);
        setRole(parsed.role || "guest");
        setToken(parsed.token || null);
      }
    } catch {
      localStorage.removeItem("auth");
    } finally {
      setLoading(false);
    }
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (user && token) {
      localStorage.setItem("auth", JSON.stringify({ user, role, token }));
    } else {
      localStorage.removeItem("auth");
    }
  }, [user, role, token]);

  // use shared normalizer from roleConfig so role keys are consistent across app

  const guestLogin = () => {
    setUser({ name: "Guest User" });
    setRole("guest");
    setToken(null);
  };

  // Login updates user, role, token, and persists
  const login = (serverUser, jwtToken) => {
    const nextRole = normalizeRole(serverUser?.role);
    const nextUser = { ...serverUser, role: nextRole };
    setUser(nextUser);
    setRole(nextRole || "guest");
    setToken(jwtToken || null);
  };

  // Logout then navigate to /login
  const logout = (options) => {
    setUser(null);
    setRole("guest");
    setToken(null);
    localStorage.removeItem("auth");
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
          localStorage.setItem("auth", JSON.stringify({ user: next, role, token }));
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
          localStorage.setItem("auth", JSON.stringify({ user: next, role, token }));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        logout,           // now redirects to /login
        guestLogin,
        setUserHouse,
        setUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
