import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import toast from 'react-hot-toast';
import { UserCheck, KeyRound, ArrowRight } from 'lucide-react';
import { apiJson } from '../../utils/apiClient';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = await apiJson(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/invite/accept`, {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      
      toast.success('Invite accepted!');
      
      if (data.access_token) {
        login(data.user, data.access_token, data.refresh_token, data.competition);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
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
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            You've been invited
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Role: Coordinator • Welcome to Resonance
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Set Password (if new user)</label>
            <div className="relative">
              <span className={iconSpan}><KeyRound className="h-5 w-5" /></span>
              <input 
                type="password" 
                placeholder="••••••••"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4 bg-primary hover:bg-primary-strong"
          >
            {loading ? 'Processing...' : <><span>Enter Application</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}