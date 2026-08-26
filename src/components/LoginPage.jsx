import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { User, KeyRound, Lock, ArrowRight, Trophy } from "lucide-react";
import { apiJson } from "../utils/apiClient";

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

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiJson(`${backendUrl}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      login(data.user, data.access_token, data.refresh_token, data.competition);
      onLogin(data.user?.role || 'admin');
      
      toast.success("Welcome back!");

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

  const inputClass = "w-full pl-11 pr-4 py-3 bg-input-bg border border-input rounded-xl focus:ring-2 focus:ring-ring outline-none transition-all text-foreground placeholder:text-muted-foreground";
  const labelClass = "block text-sm font-semibold mb-1.5 text-foreground";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-accent-amber-tint flex items-center justify-center mx-auto mb-4 border border-border">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Resonance
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
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
              <label className="text-sm font-semibold text-foreground">Password</label>
              <button 
                type="button" 
                className="text-xs text-muted-foreground hover:text-primary font-medium hover:underline cursor-pointer"
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
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl transition-all shadow-md hover:bg-primary/90 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying Credentials...' : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>
        
        {/* Decoupled Participant Portal Link */}
        <div className="mt-8 pt-6 border-t border-border text-center flex flex-col gap-3 items-center justify-center">
          <Link 
            to="/signup" 
            className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline"
          >
            Don't have an account? Sign Up
          </Link>

          <button 
            type="button" 
            onClick={() => navigate('/participant-login')} 
            className="text-sm text-secondary hover:text-secondary/80 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            Are you a Participant? Go to Participant Portal
          </button>
          
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary hover:underline">
            Back to Main Options
          </Link>
        </div>
      </div>
    </div>
  );
}
