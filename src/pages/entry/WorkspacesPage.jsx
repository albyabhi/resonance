import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import { apiFetch } from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { Trophy, Plus, ArrowRight, Loader2, Building2, Calendar, LogOut } from 'lucide-react';

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { setLastCompetition, login, logout, user, token, refreshToken } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const res = await apiFetch(`${backendUrl}/api/competition/my`);
        if (!res.ok) throw new Error('Failed to fetch competitions');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCompetitions(data);
        } else if (data && Array.isArray(data.adminCompetitions)) {
          setCompetitions(data.adminCompetitions);
        } else {
          setCompetitions([]);
        }
      } catch (err) {
        toast.error(err.message || 'Error loading workspaces');
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitions();
  }, [backendUrl]);

  const handleSelectCompetition = async (comp) => {
    try {
      const res = await apiFetch(`${backendUrl}/api/auth/competition/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: comp._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to select competition');
      
      // Update local auth context
      login(data.user, data.access_token || token, data.refresh_token || refreshToken, data.competition);
      setLastCompetition(data.competition);
      
      toast.success(`Active workspace: ${comp.name}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to switch workspace');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex items-center justify-center text-neutral-900 dark:text-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-sm font-medium text-neutral-500">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              Select Workspace
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Welcome back, {user?.name}. Continue with a workspace or set up a new competition.
            </p>
          </div>
          
          <button 
            onClick={handleLogout}
            className="self-start md:self-center flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-sm font-semibold rounded-xl transition-all text-neutral-600 dark:text-neutral-400 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          
          {/* Create New Workspace Card */}
          <div 
            onClick={() => navigate('/setup')}
            className="group relative flex flex-col justify-between p-6 bg-blue-600/5 hover:bg-blue-600/10 dark:bg-blue-500/5 dark:hover:bg-blue-500/10 border-2 border-dashed border-blue-500/30 hover:border-blue-500 dark:border-blue-400/30 dark:hover:border-blue-400 rounded-3xl cursor-pointer transition-all duration-300 min-h-[160px]"
          >
            <div className="h-10 w-10 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center border border-blue-200 dark:border-blue-900/40">
              <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                Create New Competition
                <ArrowRight className="h-4 w-4" />
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Establish a clean slate for a completely new tournament, meet, or event.
              </p>
            </div>
          </div>

          {/* Existing Workspaces */}
          {competitions.map((comp) => (
            <div 
              key={comp._id}
              onClick={() => handleSelectCompetition(comp)}
              className="group p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-3xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[160px]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {comp.logoUrl ? (
                    <img 
                      src={comp.logoUrl} 
                      alt={comp.name} 
                      className="h-12 w-12 rounded-xl object-cover border border-slate-100 dark:border-slate-850"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-amber-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {comp.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{comp.year}</span>
                      <span>•</span>
                      <span className="capitalize">{comp.type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  comp.status === 'live' 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : comp.status === 'completed'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  {comp.status}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Configure groups, matches & houses</span>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}

        </div>

        {/* Empty State */}
        {competitions.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl mt-4">
            <Trophy className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-850 dark:text-slate-200">No active workspaces</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-450 mt-1 max-w-sm mx-auto">
              You haven't set up any competitions yet. Click "Create New Competition" to get started.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
