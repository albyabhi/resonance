// src/LoginPage.jsx
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { LogIn, User, Lock, Shield, Eye, EyeOff, Sparkles, Command } from "lucide-react";
import Logo from "../assets/Rlogo.jpg";

export default function LoginPage({ onLogin = () => {} }) {
  const roles = [
    { value: "admin", label: "Executive Administrator", icon: Command },
    { value: "captain", label: "Strategic House Captain", icon: Shield },
    { value: "student_coordinator", label: "Operations Coordinator", icon: User },
    { value: "faculty", label: "Faculty Intelligence", icon: Shield },
  ];

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); 

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

      let data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Authentication transmission failed");
      }

      const serverRole = data?.user?.role;
      if (role !== serverRole) {
        throw new Error("Operational mismatch: Role unauthorized");
      }

      login(data.user, data.token);
      setSuccess("Authentication success");
      onLogin(serverRole);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-[440px] relative z-10 space-y-8">
        
        {/* Brand Section */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img
              src={Logo}
              alt="Logo"
              className="w-20 h-20 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/5 relative z-10 transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tighter text-slate-900 dark:text-white font-heading">
                RESONANCE
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
                Intelligence Command Center
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="card-premium p-8 bg-white/70 dark:bg-[#111827]/80 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Initialize Session</h2>
            <p className="text-xs font-medium text-slate-500 italic">Access restricted to authorized personnel only.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Strategy */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Command className="w-3 h-3 text-indigo-500" /> Administrative Access
              </label>
              <div className="relative group">
                <select
                  value={role}
                  onChange={handleRoleChange}
                  className="w-full appearance-none rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value} className="bg-white dark:bg-[#0B1220] py-2">
                      {r.label}
                    </option>
                  ))}
                </select>
                <LogIn className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Credential Node */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3 text-indigo-500" /> Operational Identifier
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Unique key (e.g. 1024)"
                className="w-full rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-12 py-3.5 text-sm font-medium text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                required
              />
              <User className="absolute left-10 mt-[-40px] w-4 h-4 text-slate-400" />
            </div>

            {/* Secret Vector */}
            <div className="space-y-2 relative">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3 text-indigo-500" /> Security Vector
              </label>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-12 py-3.5 text-sm font-medium text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                required
              />
              <Lock className="absolute left-4 mt-[14px] w-4 h-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 mt-[14px] text-slate-400 hover:text-indigo-500 transition-colors"
                aria-label="Toggle security visibility"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Alert Layers */}
            {(error || success) && (
              <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 ${error ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                <Shield className="w-3.5 h-3.5 shrink-0" /> {error || success}
              </div>
            )}

            {/* Execute Strategy */}
            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                    {loading ? "Authenticating Platform..." : `Connect as ${role}`}
                    <Sparkles className="w-3.5 h-3.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  guestLogin();
                  onLogin("guest");
                  navigate("/", { replace: true });
                }}
                className="w-full bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest border border-slate-200/60 dark:border-white/5 transition-all"
              >
                Enter as Public Observer
              </button>
            </div>
          </form>
        </div>

        {/* Footer Integrity */}
        <div className="text-center space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Cloud infrastructure verified by <span className="text-indigo-600 dark:text-indigo-400">UpScript Dynamics</span>
          </p>
          <div className="flex items-center justify-center gap-4 text-[9px] font-black text-slate-300 dark:text-white/10 uppercase tracking-[0.3em]">
             <span>Node SF-10</span>
             <span className="w-1 h-1 rounded-full bg-current" />
             <span>Core v2.4.0</span>
          </div>
        </div>

      </div>
    </div>
  );
}
