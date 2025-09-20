// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("guest");
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on first mount
  useEffect(() => {
    console.log("AuthProvider mounted. Loading auth from localStorage...");
    const saved = localStorage.getItem("auth");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log("Loaded from localStorage:", parsed);
        setUser(parsed.user || null);
        setRole(parsed.role || "guest");
        setToken(parsed.token || null);
      } catch (err) {
        console.error("Failed to parse auth from localStorage:", err);
        localStorage.removeItem("auth");
      }
    } else {
      console.log("No auth data found in localStorage.");
    }
    setLoading(false);
  }, []);

  const guestLogin = () => {
  setUser({ name: "Guest User" });
  setRole("guest");
  setToken(null);
};

  // Save whenever state changes
  useEffect(() => {
    console.log("Auth state changed:", { user, role, token });
    if (user && token) {
      localStorage.setItem(
        "auth",
        JSON.stringify({ user, role, token })
      );
      console.log("Auth saved to localStorage");
    } else {
      localStorage.removeItem("auth");
      console.log("Auth removed from localStorage (logged out or guest)");
    }
  }, [user, role, token]);

  const login = (serverUser, jwtToken) => {
    console.log("Login called with:", serverUser, jwtToken);
    setUser(serverUser);
    setRole(serverUser?.role || "guest");
    setToken(jwtToken || null);
    console.log("Auth state after login:", { user: serverUser, role: serverUser?.role, token: jwtToken });
  };

  const logout = () => {
    console.log("Logout called");
    setUser(null);
    setRole("guest");
    setToken(null);
    console.log("Auth state after logout:", { user: null, role: "guest", token: null });
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
