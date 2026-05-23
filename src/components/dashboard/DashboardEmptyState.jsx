import React from 'react';
import { Calendar } from 'lucide-react';
import { FadeIn } from '../AnimateReveal';
import { useNavigate } from 'react-router-dom';
import usePermission from '../../hooks/usePermission';

export default function DashboardEmptyState() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  return (
    <FadeIn className="w-full bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 py-8 px-6 text-center shadow-sm">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
        No data to display yet
      </h2>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-8">
        Your dashboard is looking a little empty because there are no events or results recorded yet.
      </p>
      
      {hasPermission('create_event') ? (
        <button 
          onClick={() => navigate('/dashboard/manage-events')}
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          Start by adding an Event!
        </button>
      ) : (
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Check back later when the administrator adds events.
        </p>
      )}
    </FadeIn>
  );
}
