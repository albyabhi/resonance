// src/components/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // { id, name, username, role, house? }
  const [role, setRole] = useState("guest");       // lowercased role mirror
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const normalizeRole = (r) => String(r || "").toLowerCase();

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

  const logout = () => {
    setUser(null);
    setRole("guest");
    setToken(null);
  };

  // Update only user.house and persist
  const setUserHouse = (house) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, house };
      // persist immediately using latest token/role
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
        logout,
        guestLogin,
        setUserHouse,
        setUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
