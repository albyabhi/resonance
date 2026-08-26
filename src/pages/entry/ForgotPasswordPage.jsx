import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, KeyRound, ArrowRight, Trophy } from 'lucide-react';
import { apiJson } from '../../utils/apiClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiJson(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      
      toast.success(data.message || 'Reset link sent to your email.');
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-strong" />

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <span className={iconSpan}><Mail className="h-5 w-5" /></span>
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

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4 bg-primary hover:bg-primary-strong"
          >
            {loading ? 'Sending Request...' : <><span>Send Reset Link</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-border text-center">
          <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary-strong hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}