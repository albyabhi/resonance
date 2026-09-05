import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCompetition } from "../../../context/CompetitionContext";
import { useRealtime } from "../../../context/RealtimeContext";
import { apiJson } from "../../../utils/apiClient";
import { getCoordinatorEventId } from "./coordinatorGuards";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const ASSIGNED_FILTERS = [
  { value: "all", label: "All" },
  { value: "team", label: "Team" },
  { value: "individual", label: "Individual" },
  { value: "needs_chest", label: "Needs chest" },
  { value: "open", label: "Registration open" },
];

/**
 * Single shared fetcher for coordinator Assigned Events.
 * Replaces the duplicated loadEvents/loadTeams in both coordinator tabs.
 * Backend already scopes GET /api/event to coordinator_id == user.id.
 */
export default function useAssignedEvents({ token }) {
  const { competition } = useCompetition();
  const { lastUpdate } = useRealtime() || {};
  const [events, setEvents] = useState([]);
  const [teamsByEvent, setTeamsByEvent] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const abortRef = useRef(null);

  const competitionId =
    competition?._id || competition?.id || competition?.competition_id || "";

  const apiCall = useCallback(
    async (endpoint, options = {}) => {
      if (!token) throw new Error("No auth token");
      return apiJson(`${API_BASE_URL}${endpoint}`, {
        method: options.method || "GET",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        body: options.body,
      });
    },
    [token]
  );

  const loadEvents = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      abortRef.current?.abort?.();
      const controller = new AbortController();
      abortRef.current = controller;
      let next = [];
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        const query = competitionId
          ? `?competition_id=${encodeURIComponent(competitionId)}`
          : "";
        const { events: evts } = await apiCall(`/api/event${query}`);
        if (controller.signal.aborted) return;
        next = evts || [];
        setSelectedEventId((prev) => {
          if (
            prev &&
            next.some((e) => String(getCoordinatorEventId(e)) === String(prev))
          ) {
            return prev;
          }
          return next.length > 0 ? getCoordinatorEventId(next[0]) : null;
        });

        // Group entries per event to power the "Needs chest" filter + counts.
        const teamList = await apiCall(
          `/api/team${competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : ""}`
        );
        if (controller.signal.aborted) return;
        const rows = teamList?.data || teamList || [];
        const grouped = {};
        for (const t of rows) {
          const eventId = String(getCoordinatorEventId(t?.event_id));
          if (!grouped[eventId]) grouped[eventId] = [];
          grouped[eventId].push(t);
        }
        next = next.map((evt) => {
          const id = String(getCoordinatorEventId(evt));
          return { ...evt, _entryCount: grouped[id]?.length ?? 0 };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.message || "Failed to load assigned events");
      }
      if (controller.signal.aborted) return;
      setEvents(next);
      setLoading(false);
      setRefreshing(false);
    },
    [token, competitionId, apiCall]
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Live status/publish ticks refresh the list without blanking it.
  useEffect(() => {
    if (!lastUpdate || loading) return;
    loadEvents({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdate]);

  // Clear selection when competition switches so stale events never linger.
  useEffect(() => {
    setSelectedEventId(null);
    setTeamsByEvent({});
  }, [competitionId]);

  const loadTeams = useCallback(
    async (eventId) => {
      if (!eventId) return [];
      setTeamsLoading(true);
      try {
        const { data } = await apiCall(`/api/team?event_id=${eventId}`);
        const rows = data || [];
        setTeamsByEvent((prev) => ({ ...prev, [String(eventId)]: rows }));

        setEvents((prev) =>
          prev.map((evt) => {
            if (String(getCoordinatorEventId(evt)) === String(eventId)) {
              return { ...evt, _entryCount: rows.length };
            }
            return evt;
          })
        );

        return rows;
      } catch {
        setTeamsByEvent((prev) => ({ ...prev, [String(eventId)]: [] }));
        return [];
      } finally {
        setTeamsLoading(false);
      }
    },
    [apiCall]
  );

  useEffect(() => {
    if (selectedEventId) loadTeams(selectedEventId);
  }, [selectedEventId, loadTeams]);

  const refreshTeams = useCallback(async () => {
    if (selectedEventId) return loadTeams(selectedEventId);
    return [];
  }, [selectedEventId, loadTeams]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (events || []).filter((e) => {
      if (typeFilter === "team" && e.event_type !== "team") return false;
      if (typeFilter === "individual" && e.event_type !== "individual") return false;
      if (typeFilter === "open" && e.status !== "registration_open") return false;
      if (typeFilter === "needs_chest" && e.chest_prefix?.trim()) return false;
      if (!q) return true;
      const title = (e.title || e.name || "").toLowerCase();
      return (
        title.includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.subcategory || "").toLowerCase().includes(q)
      );
    });
  }, [events, searchQuery, typeFilter]);

  const counts = useMemo(() => {
    const total = events.length;
    const team = events.filter((e) => e.event_type === "team").length;
    const individual = events.filter((e) => e.event_type === "individual").length;
    const open = events.filter((e) => e.status === "registration_open").length;
    const withEntries = events.filter((e) => Number(e._entryCount) > 0).length;
    return { total, team, individual, open, withEntries };
  }, [events]);

  const selectedEvent = useMemo(
    () =>
      events.find(
        (e) => String(getCoordinatorEventId(e)) === String(selectedEventId)
      ) || null,
    [events, selectedEventId]
  );

  const selectedTeams = useMemo(
    () => teamsByEvent[String(selectedEventId)] || [],
    [teamsByEvent, selectedEventId]
  );

  return {
    competitionId,
    apiCall,
    events,
    filteredEvents,
    counts,
    selectedEvent,
    selectedEventId,
    setSelectedEventId,
    selectedTeams,
    teamsLoading,
    loading,
    refreshing,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    reload: () => loadEvents(),
    refreshTeams,
  };
}
