import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, KeyRound, ArrowRight, Trophy } from 'lucide-react';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth(); // using the existing auth context contextually
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      
      login(data.user, data.access_token, data.refresh_token, data.competition);
      const role = data.user?.role || "participant";
      const target = ["super_admin", "organizer", "event_coordinator"].includes(role)
        ? "/dashboard/manage-users"
        : "/dashboard";
      navigate(target);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create Account
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            Sign up to establish a new competition workspace
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Full Name</label>
            <div className="relative">
              <span className={iconSpan}><User className="h-5 w-5" /></span>
              <input 
                type="text" 
                required
                placeholder="John Doe"
                className={inputClass}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <span className={iconSpan}><Mail className="h-5 w-5" /></span>
              <input 
                type="email" 
                required
                placeholder="name@organization.com"
                className={inputClass}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <span className={iconSpan}><KeyRound className="h-5 w-5" /></span>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className={inputClass}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
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
            {loading ? 'Creating Workspace...' : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/40 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Already have an account?{' '}
            <Link to={`/login${location.search}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
