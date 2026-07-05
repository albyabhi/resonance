import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, KeyRound, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

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

    fetch(`${API()}/api/auth/validate-setup/${token}`)
      .then((r) => r.json())
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
      const res = await fetch(`${API()}/api/auth/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set password');

      toast.success(data.message || 'Password set successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";
  const labelClass = "block text-sm font-semibold mb-1.5 text-neutral-700 dark:text-neutral-300";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400";

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse mx-auto mb-4" />
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg mx-auto mb-3" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg mx-auto" />
          </div>
          <div className="space-y-5">
            <div>
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mb-2" />
              <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
            </div>
            <div>
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mb-2" />
              <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
            </div>
            <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-600" />
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/40">
              <ShieldCheck className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Link Invalid</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{error || 'This setup link has expired or is invalid.'}</p>
          </div>
          <Link to="/login" className="block w-full py-3.5 text-white font-bold rounded-xl text-center transition-all shadow-md" style={{ backgroundColor: "#2563EB" }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/40">
            <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Set Your Password
          </h1>
          {userInfo && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
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
            className="w-full py-3.5 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4"
            style={{ backgroundColor: "#2563EB" }}
          >
            {loading ? 'Setting Password...' : <><span>Set Password & Sign In</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/40 text-center">
          <Link to="/login" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
