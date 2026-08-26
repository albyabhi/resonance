import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, KeyRound, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { apiJson } from '../../utils/apiClient';

const API = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    if (!token) {
      setError('No setup token provided');
      setValidating(false);
      return;
    }

    apiJson(`${API()}/api/auth/validate-setup/${token}`)
      .then((data) => {
        if (data.valid) {
          setValid(true);
          setUserInfo({ name: data.name, email: data.email });
        } else {
          setError(data.message || 'Invalid or expired setup link');
        }
      })
      .catch(() => {
        setError('Failed to validate setup link');
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);

    try {
      const data = await apiJson(`${API()}/api/auth/setup-password`, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      toast.success(data.message || 'Password set successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3 bg-input-bg border border-input rounded-xl focus:ring-2 focus:ring-ring outline-none transition-all text-sm";
  const labelClass = "block text-sm font-semibold mb-1.5 text-foreground";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground";

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-strong" />
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-muted animate-pulse mx-auto mb-4" />
            <div className="h-7 w-48 bg-muted animate-pulse rounded-lg mx-auto mb-3" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded-lg mx-auto" />
          </div>
          <div className="space-y-5">
            <div>
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
            </div>
            <div>
              <div className="h-4 w-28 bg-muted animate-pulse rounded mb-2" />
              <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
            </div>
            <div className="h-12 w-full bg-muted animate-pulse rounded-xl mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive to-warning" />
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Link Invalid</h1>
            <p className="text-sm text-muted-foreground mt-2">{error || 'This setup link has expired or is invalid.'}</p>
          </div>
          <Link to="/login" className="block w-full py-3.5 text-primary-foreground font-bold rounded-xl text-center transition-all shadow-md bg-primary hover:bg-primary-strong">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-strong" />

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Set Your Password
          </h1>
          {userInfo && (
            <p className="text-sm text-muted-foreground mt-2">
              Welcome, <strong>{userInfo.name}</strong> ({userInfo.email})
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <span className={iconSpan}><KeyRound className="h-5 w-5" /></span>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Min 6 characters"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <span className={iconSpan}><Lock className="h-5 w-5" /></span>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Re-enter your password"
                className={inputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4 bg-primary hover:bg-primary-strong"
          >
            {loading ? 'Setting Password...' : <><span>Set Password & Sign In</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary-strong hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}