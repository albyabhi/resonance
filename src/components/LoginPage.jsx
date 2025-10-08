// src/LoginPage.jsx
import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginPage({ onLogin = () => {} }) {
  const roles = [
    { value: "admin", label: "Administrator" },
    { value: "captain", label: "House Captain" },
    { value: "student_coordinator", label: "Student Coordinator" },
    { value: "faculty", label: "Faculty Coordinator" },
  ];

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
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
      } catch {}

      if (!res.ok) {
        let message = data?.message || "Login failed";
        if (res.status === 401) message = "Invalid username or password";
        else if (res.status === 404) message = "User not found";
        else if (res.status === 403) message = "Not authorized for this section";
        throw new Error(message);
      }

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
    <div className="min-h-dvh bg-[radial-gradient(circle_at_20%_0%,#eef2ff_0%,#f8fafc_50%,#f1f5f9_100%)] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),24px)] flex items-center">
      <div className="w-full max-w-sm mx-auto">
        {/* Brand */}
        <div className="flex items-center justify-center mb-4">
          <div className="size-10 rounded-xl bg-indigo-600/90 text-white grid place-items-center shadow-lg shadow-indigo-600/20">
            <span className="text-sm font-semibold">R</span>
          </div>
          <div className="ml-2">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">Resonance</h1>
            <p className="text-xs text-gray-500">Inter-House Competition</p>
          </div>
        </div>

        {/* Card */}
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 via-transparent to-sky-500/20 rounded-3xl blur-lg" aria-hidden="true" />
          <div className="relative rounded-3xl border border-white/50 bg-white/60 backdrop-blur-xl shadow-xl">
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Select role
                </label>
                <div className="relative">
                  <select
                    id="role"
                    value={role}
                    onChange={handleRoleChange}
                    className="w-full appearance-none rounded-xl bg-white/70 border border-gray-200 px-3 py-3 text-[15px] text-gray-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
                  </svg>
                </div>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  inputMode="text"
                  autoComplete="username"
                  placeholder="e.g. 1234"
                  className="w-full rounded-xl bg-white/70 border border-gray-200 px-3 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••"
                    className="w-full rounded-xl bg-white/70 border border-gray-200 px-3 py-3 pr-10 text-[15px] text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPass ? "Hide password" : "Show password"}
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 rounded-md focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
                  >
                    {showPass ? (
                      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 3l18 18" strokeWidth="1.5" />
                        <path d="M10.5 6.5A8.5 8.5 0 0121 12c-1.2 2.9-4.7 6-9 6-1.4 0-2.8-.3-4-.9" strokeWidth="1.5" />
                        <path d="M9.9 9.9a3 3 0 104.2 4.2" strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white py-3 text-[15px] font-medium shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-sky-700 active:from-indigo-800 active:to-sky-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
              >
                {loading ? "Logging in..." : `Login as ${roles.find((r) => r.value === role)?.label}`}
              </button>

              {/* Guest */}
              <button
                type="button"
                onClick={() => {
                  guestLogin();
                  setError("");
                  setSuccess("Guest login successful");
                  onLogin("guest");
                }}
                className="w-full rounded-xl border border-gray-200 bg-white/70 text-gray-800 py-3 text-[15px] font-medium shadow-sm hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
              >
                Quick guest access
              </button>

              {/* Help row */}
              <div className="flex items-center justify-between pt-1">
               
                
              </div>
            </form>
          </div>
        </div>

        {/* Alerts */}
        <div className="mt-4 space-y-2">
          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2" role="status" aria-live="polite">
              {success}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2" role="status" aria-live="polite">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-gray-500 mt-6">
          By continuing, you agree to the Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
