import React from 'react';
import { Calendar } from 'lucide-react';
import { FadeIn } from '../AnimateReveal';
import { useNavigate } from 'react-router-dom';
import usePermission from '../../hooks/usePermission';

export default function DashboardEmptyState() {
  const navigate = useNavigate();
  const { hasAnyRole } = usePermission();
  return (
    <FadeIn className="w-full bg-card border border-border rounded-2xl py-8 px-6 text-center shadow-sm">
      <div className="w-16 h-16 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        No data to display yet
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        Your dashboard is looking a little empty because there are no events or results recorded yet.
      </p>
      
      {hasAnyRole('organizer', 'event_coordinator', 'super_admin') ? (
        <button 
          onClick={() => navigate('/dashboard/manage-events')}
          className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary-strong text-primary-foreground font-medium rounded-lg transition-colors shadow-sm"
        >
          Start by adding an Event!
        </button>
      ) : (
        <p className="text-sm font-medium text-muted-foreground">
          Check back later when the administrator adds events.
        </p>
      )}
    </FadeIn>
  );
}