import { useState, useEffect, useCallback } from 'react';
import { apiFetch, API_ROUTES } from '../utils/apiClient';

const MAX_RETRIES = 5;
const BASE_DELAY = 3000;

export default function useWake() {
  const [isReady, setIsReady] = useState(false);
  const [isWarming, setIsWarming] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkHealth = useCallback(async () => {
    try {
      const res = await apiFetch(API_ROUTES.HEALTH, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();

      if (res.ok && data.status === 'awake') {
        setIsReady(true);
        setIsWarming(false);
        setError(null);
        return true;
      }

      if (res.status === 503) {
        setIsWarming(true);
        return false;
      }

      setIsWarming(true);
      return false;
    } catch {
      setError('Failed to reach server');
      setIsWarming(true);
      return false;
    }
  }, []);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (isReady) return;

    let timer;
    let cancelled = false;

    const attempt = async () => {
      const ok = await checkHealth();
      if (cancelled) return;

      if (!ok && retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        timer = setTimeout(() => {
          if (!cancelled) setRetryCount((c) => c + 1);
        }, delay);
      } else if (!ok && retryCount >= MAX_RETRIES) {
        setIsWarming(false);
        setError('Server is taking too long to respond');
      }
    };

    attempt();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [retryCount, isReady, checkHealth]);

  return { isReady, isWarming, error, retry };
}
