import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiJson } from "../../../utils/apiClient";
import { DEFAULT_FILTER } from "./eventConstants";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export function useEvents({ token, competition, lastUpdate }) {
  const [events, setEvents] = useState([]);
  const [usageByEventId, setUsageByEventId] = useState({});
  const [coordinators, setCoordinators] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ ...DEFAULT_FILTER });

  // Deletion impact state (kept here so list + dialog share it)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletionImpact, setDeletionImpact] = useState(null);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [deletionConfirmText, setDeletionConfirmText] = useState("");

  const apiCall = useCallback(
    async (endpoint, options = {}) => {
      if (!token) throw new Error("No auth token available");
      return apiJson(`${API_BASE_URL}${endpoint}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        body: options.body || undefined,
      });
    },
    [token]
  );

  // Registered counts are derived client-side from the team list.
  // GET /api/event/usage returns only totals/breakdown (no per-event usage),
  // so counting here keeps the fix frontend-only with a single extra request.
  const buildUsageMap = useCallback((teams) => {
    const map = {};
    (teams || []).forEach((t) => {
      const eventId =
        t?.event_id?._id || t?.event_id || t?.eventId || t?.event;
      if (!eventId) return;
      const key = String(eventId);
      const groupId = t?.group_id?._id || t?.group_id || t?.groupId;
      const memberCount = Array.isArray(t?.members) ? t.members.length : 0;
      if (!map[key]) map[key] = { totalTeams: 0, totalParticipants: 0, byHouse: {} };
      map[key].totalTeams += 1;
      map[key].totalParticipants += memberCount;
      if (groupId) {
        const gKey = String(groupId);
        map[key].byHouse[gKey] = (map[key].byHouse[gKey] || 0) + 1;
      }
    });
    return map;
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const competitionId =
        competition?._id || competition?.id || competition?.competition_id;
      const competitionQuery = competitionId
        ? `?competition_id=${encodeURIComponent(competitionId)}`
        : "";
      const [{ events: fetched }] = await Promise.all([
        apiCall(`/api/event${competitionQuery}`),
      ]);
      const eventList = fetched || [];
      setEvents(eventList);
      try {
        const { data: teams } = await apiCall(
          `/api/team${competitionQuery}`
        );
        const map = buildUsageMap(teams);
        // Ensure every listed event has an entry so UI renders 0 instead of undefined.
        eventList.forEach((e) => {
          const id = String(e?._id || e?.event_id || "");
          if (id && !map[id]) {
            map[id] = { totalTeams: 0, totalParticipants: 0, byHouse: {} };
          }
        });
        setUsageByEventId(map);
      } catch {
        setUsageByEventId({});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [competition, apiCall, buildUsageMap]);

  useEffect(() => {
    if (token) fetchAll();
  }, [token, lastUpdate, fetchAll]);

  useEffect(() => {
    if (!token) return;
    const fetchCoordinators = async () => {
      try {
        const { data } = await apiCall("/api/event/coordinators");
        setCoordinators(data || []);
      } catch {
        setCoordinators([]);
      }
    };
    fetchCoordinators();
  }, [token, apiCall]);

  const refreshVenues = useCallback(async () => {
    if (!token) return [];
    try {
      const competitionId =
        competition?._id || competition?.id || competition?.competition_id;
      const query = competitionId ? `?competition_id=${competitionId}` : "";
      const { data } = await apiCall(`/api/venues${query}`);
      setVenues(data || []);
      return data || [];
    } catch {
      setVenues([]);
      return [];
    }
  }, [token, apiCall, competition]);

  useEffect(() => {
    refreshVenues();
  }, [refreshVenues]);

  const applyLocalStatus = useCallback((eventId, patch) => {
    setEvents((prev) =>
      prev.map((e) =>
        (e._id || e.event_id) === eventId ? { ...e, ...patch } : e
      )
    );
  }, []);

  const changeStatus = useCallback(
    async (eventId, newStatus) => {
      try {
        setLoading(true);
        setError("");
        await apiCall(`/api/event/${eventId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });
        applyLocalStatus(eventId, { status: newStatus });
        toast.success(`Status changed to ${newStatus.replace(/_/g, " ")}`);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiCall, applyLocalStatus]
  );

  const delayEvent = useCallback(
    async (eventId, remarks = "") => {
      try {
        setLoading(true);
        setError("");
        await apiCall(`/api/event/${eventId}/delay`, {
          method: "POST",
          body: JSON.stringify({ remarks }),
        });
        setEvents((prev) =>
          prev.map((e) =>
            (e._id || e.event_id) === eventId
              ? { ...e, status: "delayed", previous_status: e.status }
              : e
          )
        );
        toast.success("Event delayed");
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiCall]
  );

  const resumeEvent = useCallback(
    async (eventId, remarks = "") => {
      try {
        setLoading(true);
        setError("");
        await apiCall(`/api/event/${eventId}/resume`, {
          method: "POST",
          body: JSON.stringify({ remarks }),
        });
        setEvents((prev) =>
          prev.map((e) =>
            (e._id || e.event_id) === eventId
              ? {
                  ...e,
                  status: e.previous_status || "draft",
                  previous_status: null,
                }
              : e
          )
        );
        toast.success("Event resumed");
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiCall]
  );

  const fetchDeletionImpact = useCallback(
    async (eventId) => {
      try {
        setDeletionLoading(true);
        const { data } = await apiCall(`/api/event/${eventId}/deletion-impact`);
        setDeletionImpact(data);
      } catch (err) {
        toast.error(err.message || "Failed to assess deletion impact");
        setDeleteConfirmId(null);
      } finally {
        setDeletionLoading(false);
      }
    },
    [apiCall]
  );

  const handleDeleteClick = useCallback(
    (eventId) => {
      setDeleteConfirmId(eventId);
      setDeletionImpact(null);
      setDeletionConfirmText("");
      fetchDeletionImpact(eventId);
    },
    [fetchDeletionImpact]
  );

  const closeDeleteDialog = useCallback(() => {
    setDeleteConfirmId(null);
    setDeletionImpact(null);
    setDeletionConfirmText("");
  }, []);

  const executeDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      setLoading(true);
      setError("");
      await apiCall(`/api/event/${deleteConfirmId}`, { method: "DELETE" });
      setEvents((prev) =>
        prev.filter((e) => (e._id || e.event_id) !== deleteConfirmId)
      );
      toast.success("Event deleted successfully");
      closeDeleteDialog();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deleteConfirmId, apiCall, closeDeleteDialog]);

  const createVenue = useCallback(
    async ({ name, location, capacity }) => {
      const competitionId =
        competition?._id || competition?.id || competition?.competition_id;
      const payload = {
        name: name.trim(),
        location: location.trim(),
        capacity: capacity ? parseInt(capacity, 10) : null,
        competition_id: competitionId,
      };
      const { data: newVenue } = await apiCall("/api/venues", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await refreshVenues();
      toast.success("Venue created successfully!");
      return newVenue;
    },
    [apiCall, competition, refreshVenues]
  );

  const upsertEventInList = useCallback((savedEvent, editingId) => {
    if (editingId) {
      setEvents((prev) =>
        prev.map((it) =>
          (it._id || it.event_id) === (savedEvent._id || savedEvent.event_id)
            ? savedEvent
            : it
        )
      );
    } else {
      setEvents((prev) => [savedEvent, ...prev]);
    }
  }, []);

  const filteredEvents = useMemo(() => {
    const q = (filter.query || "").trim().toLowerCase();
    return (events || []).filter((e) => {
      const catOk = filter.category === "all" || e.category === filter.category;
      const modeOk = filter.mode === "all" || e.mode === filter.mode;
      const typeOk = filter.type === "all" || e.event_type === filter.type;
      const statusOk =
        !filter.status || filter.status === "all" || e.status === filter.status;
      const queryOk =
        !q ||
        (e.title || e.name || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q);
      return catOk && modeOk && typeOk && statusOk && queryOk;
    });
  }, [events, filter]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filter.category !== "all") n += 1;
    if (filter.mode !== "all") n += 1;
    if (filter.type !== "all") n += 1;
    if (filter.status && filter.status !== "all") n += 1;
    return n;
  }, [filter]);

  return {
    events,
    filteredEvents,
    usageByEventId,
    coordinators,
    venues,
    loading,
    error,
    setError,
    filter,
    setFilter,
    activeFilterCount,
    apiCall,
    fetchAll,
    refreshVenues,
    changeStatus,
    delayEvent,
    resumeEvent,
    applyLocalStatus,
    upsertEventInList,
    createVenue,
    deleteConfirmId,
    deletionImpact,
    deletionLoading,
    deletionConfirmText,
    setDeletionConfirmText,
    handleDeleteClick,
    closeDeleteDialog,
    executeDelete,
  };
}
