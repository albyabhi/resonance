import React from "react";
import { Trophy, LogIn, UserCheck, Eye, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function GatekeeperModal({ isOpen, onClose, competitionName, competitionSlug }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const handleLoginClick = () => {
    onClose();
    // Redirect to login, locking the competition slug and returning here afterwards
    const redirectDest = `${location.pathname}${location.search}`;
    navigate(`/login?slug=${encodeURIComponent(competitionSlug)}&redirect=${encodeURIComponent(redirectDest)}`);
  };

  const handleRegisterClick = () => {
    onClose();
    // Redirect to join/signup with the competition slug pre-populated
    navigate(`/join?slug=${encodeURIComponent(competitionSlug)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal content box */}
      <div className="relative max-w-md w-full border rounded-3xl p-8 shadow-2xl transition-all duration-300 z-10 transform scale-100 overflow-hidden animate-fade-in-up" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
        
        {/* Glow effect in background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-5">
          {/* Main Icon */}
          <div className="relative inline-flex p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl">
            <Trophy className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome to {competitionName || "the Event"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 px-2">
              Are you a registered participant of this competition? We will set up your experience.
            </p>
          </div>

          {/* Path Options */}
          <div className="space-y-3 pt-3">
            {/* Log In Option */}
            <button
              onClick={handleLoginClick}
              className="w-full flex items-center justify-between p-4 border hover:border-indigo-500 rounded-2xl group transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-105 transition-transform">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Yes, I am registered
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Log in with your ID to view your dashboard
                  </div>
                </div>
              </div>
            </button>

            {/* Register Option */}
            <button
              onClick={handleRegisterClick}
              className="w-full flex items-center justify-between p-4 border hover:border-emerald-500 rounded-2xl group transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    I am a new participant
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Join this competition or register
                  </div>
                </div>
              </div>
            </button>

            {/* Just Browsing Option */}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-between p-4 bg-transparent border border-dashed hover:border-slate-400 rounded-2xl group transition-all duration-200 cursor-pointer"
              style={{ borderColor: 'var(--border-divider)' }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl group-hover:scale-105 transition-transform">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Just browsing for now
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Continue as guest to view the standings
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Styles for transition animations */}
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(16px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
