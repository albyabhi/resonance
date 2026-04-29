import { useEffect } from 'react';

export const useLiveScore = (identifier, onUpdate) => {
  useEffect(() => {
    if (!identifier) return;

    const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const eventSource = new EventSource(`${apiUrl}/api/live/${identifier}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Live update received:', data);
        
        if (data.type === 'RESULT_APPROVED' || data.type === 'BULK_RESULTS_APPROVED' || data.type === 'SCOREBOARD_UPDATED') {
          if (onUpdate) onUpdate(data);
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [identifier, onUpdate]);
};
