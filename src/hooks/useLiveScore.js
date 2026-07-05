import { useEffect } from 'react';

export const useLiveScore = (identifier, onUpdate) => {
  useEffect(() => {
    if (!identifier) return;

    const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const eventSource = new EventSource(`${apiUrl}/api/live/${identifier}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'RESULT_APPROVED' || data.type === 'BULK_RESULTS_APPROVED' || data.type === 'SCOREBOARD_UPDATED' || data.type === 'EVENT_STATUS_CHANGED') {
          if (onUpdate) onUpdate(data);
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    eventSource.onerror = () => {};

    return () => {
      eventSource.close();
    };
  }, [identifier, onUpdate]);
};
