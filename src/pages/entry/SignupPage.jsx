import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, KeyRound, ArrowRight } from 'lucide-react';
import { apiJson } from '../../utils/apiClient';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = await apiJson(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/signup`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
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

  const inputClass = "w-full pl-11 pr-4 py-3 bg-input-bg border border-input rounded-xl focus:ring-2 focus:ring-ring outline-none transition-all text-sm";
  const labelClass = "block text-sm font-semibold mb-1.5 text-foreground";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Create Account
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
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
            className="w-full py-3.5 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4 bg-primary hover:bg-primary-strong"
          >
            {loading ? 'Creating Workspace...' : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to={`/login${location.search}`} className="font-semibold text-primary hover:text-primary-strong hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}