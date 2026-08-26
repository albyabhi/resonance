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
        className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal content box */}
      <div className="relative max-w-md w-full border rounded-3xl p-8 shadow-2xl transition-all duration-300 z-10 transform scale-100 overflow-hidden animate-fade-in-up" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
        
        {/* Glow effect in background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-5">
          {/* Main Icon */}
          <div className="relative inline-flex p-4 bg-primary/10 border border-primary/30 rounded-2xl">
            <Trophy className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome to {competitionName || "the Event"}
            </h3>
            <p className="text-sm text-muted-foreground px-2">
              Are you a registered participant of this competition? We will set up your experience.
            </p>
          </div>

          {/* Path Options */}
          <div className="space-y-3 pt-3">
            {/* Log In Option */}
            <button
              onClick={handleLoginClick}
              className="w-full flex items-center justify-between p-4 border hover:border-primary/50 rounded-2xl group transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-105 transition-transform">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Yes, I am registered
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Log in with your ID to view your dashboard
                  </div>
                </div>
              </div>
            </button>

            {/* Register Option */}
            <button
              onClick={handleRegisterClick}
              className="w-full flex items-center justify-between p-4 border hover:border-success/50 rounded-2xl group transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-success/10 text-success rounded-xl group-hover:scale-105 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    I am a new participant
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Join this competition or register
                  </div>
                </div>
              </div>
            </button>

            {/* Just Browsing Option */}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-between p-4 bg-transparent border border-dashed hover:border-muted-foreground/50 rounded-2xl group transition-all duration-200 cursor-pointer"
              style={{ borderColor: 'var(--border-divider)' }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-muted text-muted-foreground rounded-xl group-hover:scale-105 transition-transform">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">
                    Just browsing for now
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
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