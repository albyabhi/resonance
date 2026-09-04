import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { User, KeyRound, Lock, ArrowRight } from "lucide-react";
import { apiJson } from "../utils/apiClient";
import { Button } from "./ui/button";
import MandalaBackground from "./MandalaBackground";

export default function LoginPage({ onLogin = () => {} }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Read redirect parameter from URL
  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get("redirect");

  // Subtle background animation
  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % 5);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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
        navigate("/?scroll=competitions", { replace: true });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground relative">
      {/* Subtle Mandala Background */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <MandalaBackground currentIndex={bgIndex} />
      </div>

      <div className="max-w-md w-full card-premium relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 accent-stripe" style={{ height: "4px" }} />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>
            Reson<span style={{ color: "var(--destructive)" }}>ance</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Staff & Captain Portal • Sign in to manage competitions
          </p>
        </div>

        <form onSubmit={handleUserSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--foreground)" }}>Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center" style={{ color: "var(--muted-foreground)" }}><User className="h-5 w-5" /></span>
              <input 
                type="email" 
                required 
                placeholder="name@organization.com" 
                className="theme-input pl-11 pr-4 py-3 rounded-xl" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                autoComplete="email" 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Password</label>
              <button 
                type="button" 
                className="text-xs font-medium hover:underline cursor-pointer transition-colors"
                style={{ color: "var(--muted-foreground)" }}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center" style={{ color: "var(--muted-foreground)" }}><KeyRound className="h-5 w-5" /></span>
              <input 
                type="password" 
                required 
                placeholder="••••••••" 
                className="theme-input pl-11 pr-4 py-3 rounded-xl" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="current-password" 
              />
            </div>
          </div>

          <div className="pt-3">
            <Button 
              type="submit" 
              disabled={loading} 
              size="lg" 
              className="w-full"
            >
              {loading ? 'Verifying Credentials...' : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </form>
        
        {/* Participant Portal Link */}
        <div className="mt-8 pt-6 border-t text-center flex flex-col gap-3 items-center justify-center" style={{ borderColor: "var(--border)" }}>
          <Link 
            to="/signup" 
            className="text-sm font-semibold hover:underline cursor-pointer transition-colors"
            style={{ color: "var(--primary)" }}
          >
            Don't have an account? Sign Up
          </Link>

          <button 
            type="button" 
            onClick={() => navigate('/participant-login')} 
            className="text-sm font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
            style={{ color: "var(--secondary)" }}
          >
            Are you a Participant? Go to Participant Portal
          </button>
          
          <Link to="/" className="text-xs hover:underline cursor-pointer transition-colors" style={{ color: "var(--muted-foreground)" }}>
            Back to Main Options
          </Link>
        </div>
      </div>
    </div>
  );
}
