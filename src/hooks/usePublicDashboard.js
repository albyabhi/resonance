import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function toPublicError(status, fallbackMessage) {
  if (status === 404) return { status, message: "This competition does not exist or the link is out of date." };
  if (status === 403) return { status, message: "This competition is not publicly accessible. Check with the organizer." };
  if (status === 410) return { status, message: "This competition has been closed and is no longer available." };
  return { status, message: fallbackMessage || "Something went wrong while loading this page." };
}

// Single place that owns every public fetch for /view/:slug.
// Dashboard is critical; winners + top participants + detailed stats prefetch
// on idle so the single-scroll page never shows a per-section spinner after mount.
export default function usePublicDashboard(slug) {
  const [dashboard, setDashboard] = useState(null);
  const [winners, setWinners] = useState(null);
  const [topParticipants, setTopParticipants] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!slug) return;
      if (!silent) setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await apiFetch(`${API_BASE_URL}/api/public/${slug}/dashboard`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          if (res.status === 404 || res.status === 403 || res.status === 410) {
            setError(toPublicError(res.status));
          } else {
            const body = await res.json().catch(() => null);
            setError(toPublicError(res.status, body?.message));
          }
          if (!silent) setLoading(false);
          return;
        }
        const json = await res.json();
        setDashboard(json);
        setError(null);
        if (!silent) setLoading(false);
      } catch (fetchError) {
        if (fetchError?.name === "AbortError") return;
        setError(toPublicError(0, "Network error. Please check your connection and try again."));
        if (!silent) setLoading(false);
      }
    },
    [slug]
  );

  const prefetchSecondary = useCallback(async () => {
    if (!slug || !dashboard) return;
    try {
      const [winnersRes, participantsRes, statsRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/public/${slug}/winners`),
        apiFetch(`${API_BASE_URL}/api/public/${slug}/participants/top`),
        apiFetch(`${API_BASE_URL}/api/public/${slug}/stats`),
      ]);
      if (winnersRes.ok) {
        const winnersJson = await winnersRes.json();
        setWinners(winnersJson.winners || {});
      }
      if (participantsRes.ok) {
        const participantsJson = await participantsRes.json();
        setTopParticipants(participantsJson.data || null);
      }
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        setDetailedStats(statsJson);
      }
    } catch {
      // Secondary payloads are progressive enhancement — dashboard already renders.
    }
  }, [slug, dashboard]);

  const fetchEventDetail = useCallback(
    async (eventId) => {
      if (!eventId) return;
      setEventDetailLoading(true);
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/public/${slug}/events/${eventId}`);
        if (res.ok) {
          const json = await res.json();
          setSelectedEvent(json);
        }
      } catch {
        // Detail modal shows its own empty state; keep silent here.
      } finally {
        setEventDetailLoading(false);
      }
    },
    [slug]
  );

  const closeEventDetail = useCallback(() => setSelectedEvent(null), []);

  const refreshSilent = useCallback(() => {
    fetchDashboard({ silent: true });
    setWinners(null);
    setTopParticipants(null);
    setDetailedStats(null);
  }, [fetchDashboard]);

  useEffect(() => {
    setDashboard(null);
    setWinners(null);
    setTopParticipants(null);
    setDetailedStats(null);
    setSelectedEvent(null);
    setError(null);
    setLoading(true);
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!dashboard) return;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(prefetchSecondary, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = setTimeout(prefetchSecondary, 400);
    return () => clearTimeout(timer);
  }, [dashboard, prefetchSecondary]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    dashboard,
    winners,
    topParticipants,
    detailedStats,
    selectedEvent,
    eventDetailLoading,
    loading,
    error,
    fetchDashboard,
    refreshSilent,
    fetchEventDetail,
    closeEventDetail,
  };
}
