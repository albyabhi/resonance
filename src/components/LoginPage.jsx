import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { User, KeyRound, Lock, ArrowRight, Trophy } from "lucide-react";

export default function LoginPage({ onLogin = () => {} }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Read redirect parameter from URL
  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get("redirect");
  const intent = queryParams.get("intent");

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }

      login(data.user, data.access_token, data.refresh_token, data.competition);
      onLogin(data.user?.role || 'admin');
      
      toast.success("Welcome back!");
      
      const isUserAdmin = data.user?.role === 'admin' || data.user?.membership_role === 'admin';

      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelClass = "block text-sm font-semibold mb-1.5 text-neutral-700 dark:text-neutral-300";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/40">
            <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Resonance
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            Staff & Captain Portal • Sign in to manage competitions
          </p>
        </div>

        <form onSubmit={handleUserSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <span className={iconSpan}><User className="h-5 w-5" /></span>
              <input 
                type="email" 
                required 
                placeholder="name@organization.com" 
                className={inputClass} 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                autoComplete="email" 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Password</label>
              <button 
                type="button" 
                className="text-xs text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 font-medium hover:underline cursor-pointer"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className={iconSpan}><KeyRound className="h-5 w-5" /></span>
              <input 
                type="password" 
                required 
                placeholder="••••••••" 
                className={inputClass} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="current-password" 
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4 pt-3">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3.5 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2" 
              style={{ backgroundColor: "#2563EB" }}
            >
              {loading ? 'Verifying Credentials...' : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>
        
        {/* Decoupled Participant Portal Link */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/40 text-center flex flex-col gap-3 items-center justify-center">
          <button 
            type="button" 
            onClick={() => navigate('/participant-login')} 
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            Are you a Participant? Go to Participant Portal
          </button>
          
          <Link to="/" className="text-xs text-neutral-400 hover:text-blue-500 hover:underline">
            Back to Main Options
          </Link>
        </div>
      </div>
    </div>
  );
}
