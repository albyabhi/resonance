import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useCompetition } from './CompetitionContext';

const RealtimeContext = createContext();

export const useRealtime = () => useContext(RealtimeContext);

export const RealtimeProvider = ({ children }) => {
  const { token, isAuthReady } = useAuth();
  const { competition } = useCompetition();
  const [lastUpdate, setLastUpdate] = useState(null);
  const [latestEvent, setLatestEvent] = useState(null);

  useEffect(() => {
    const slug = competition?.slug;
    if (!slug) return;

    const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    console.log(`[RealtimeContext] Connecting to SSE stream for competition slug: ${slug}`);
    
    const eventSource = new EventSource(`${apiUrl}/api/live/${slug}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[RealtimeContext] SSE Live update received:', data);
        
        // Listen to relevant real-time update types
        if (
          data.type === 'RESULT_APPROVED' ||
          data.type === 'BULK_RESULTS_APPROVED' ||
          data.type === 'SCOREBOARD_UPDATED' ||
          data.type === 'EVENT_UPDATED' ||
          data.type === 'EVENT_CREATED' ||
          data.type === 'EVENT_DELETED'
        ) {
          setLatestEvent(data);
          setLastUpdate(Date.now());
        }
      } catch (err) {
        console.error('[RealtimeContext] Error parsing SSE data', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[RealtimeContext] SSE Stream Error:', error);
    };

    return () => {
      console.log(`[RealtimeContext] Closing SSE connection for competition: ${slug}`);
      eventSource.close();
    };
  }, [competition?.slug]);

  return (
    <RealtimeContext.Provider value={{ lastUpdate, latestEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};
