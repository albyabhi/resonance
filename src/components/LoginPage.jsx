// src/LoginPage.jsx
import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginPage({ onLogin = () => {} }) {
  // Roles must match backend values exactly
  const roles = [
    { value: "admin", label: "Administrator" },
    { value: "captain", label: "House Captain" },
    { value: "student_coordinator", label: "Student Coordinator" },
    { value: "faculty", label: "Faculty Coordinator" },
  ];

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, guestLogin } = useAuth();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setUsername("");
    setPassword("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // ignore parse errors
      }

      if (!res.ok) {
        let message = data?.message || "Login failed";
        if (res.status === 401) message = "Invalid username or password";
        else if (res.status === 404) message = "User not found";
        else if (res.status === 403) message = "Not authorized for this section";
        throw new Error(message);
      }

      // Validate server role vs selected role
      const serverRole = data?.user?.role;
      if (role !== serverRole) {
        throw new Error("Not authorized for this section");
      }

      login(data.user, data.token);
      setSuccess("Login successful");
      setPassword("");
      onLogin(serverRole);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Resonance</h1>
        <p className="text-gray-500 mb-6">
          Inter-House Competition Management System
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Role Selector */}
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Role
            </label>
            <select
              id="role"
              value={role}
              onChange={handleRoleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Credentials Inputs */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (demo: 1234)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (demo: 1234)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {loading
              ? "Logging in..."
              : `Login as ${roles.find((r) => r.value === role)?.label}`}
          </button>

          {/* Quick Guest Access - Always visible */}
          <button
            type="button"
            onClick={() => {
              guestLogin();
              setError("");
              setSuccess("Guest login successful");
              onLogin("guest");
            }}
            className="w-full mt-3 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            Quick Guest Access
          </button>
        </form>

        {/* Messages */}
        {success && (
          <p
            className="text-sm text-green-700 mt-4"
            role="status"
            aria-live="polite"
          >
            {success}
          </p>
        )}
        {error && (
          <p
            className="text-sm text-red-600 mt-2"
            role="status"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <p className="text-sm text-gray-500 mt-6 text-center">
          Demo Credentials:
          <br />
          <span className="font-medium">Username:</span> 1234 |{" "}
          <span className="font-medium">Password:</span> 1234
        </p>
      </div>
    </div>
  );
}
