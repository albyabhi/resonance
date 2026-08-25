import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingChecklist({ systemStats, eventsCount }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax
    const dismissed = localStorage.getItem('onboarding_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('onboarding_dismissed', 'true');
  };

  // If all done or dismissed, don't show
  if (isDismissed || !isVisible) return null;

  const hasCoordinator = systemStats?.totalUsers > 1; // Assuming admin + at least 1 other
  const hasEvents = eventsCount >= 3;
  
  if (hasCoordinator && hasEvents) return null; // Checklist completed

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderBottom: '1px solid var(--border-divider)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>Setup Checklist</span>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <button 
          onClick={() => navigate('/dashboard/manage-users')}
          className="w-full flex items-start gap-3 text-left group"
        >
          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${hasCoordinator ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-neutral-300 dark:border-neutral-600'}`}>
            {hasCoordinator && <Check className="w-3 h-3" />}
          </div>
          <div>
            <p className={`text-sm font-medium ${hasCoordinator ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
              Invite your first Coordinator
            </p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/dashboard/manage-events')}
          className="w-full flex items-start gap-3 text-left group"
        >
          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${hasEvents ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-neutral-300 dark:border-neutral-600'}`}>
            {hasEvents && <Check className="w-3 h-3" />}
          </div>
          <div>
            <p className={`text-sm font-medium ${hasEvents ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
              Create at least 3 Events
            </p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/dashboard/manage-houses')}
          className="w-full flex items-start gap-3 text-left group"
        >
          <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border border-neutral-300 dark:border-neutral-600">
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              Verify Group/House logos
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
