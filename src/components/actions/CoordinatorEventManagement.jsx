import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import {
  Calendar,
  Hash,
  Users,
  CheckCircle,
  X,
  ChevronRight,
  Search,
  RefreshCw,
  Save,
  Edit3,
  Loader2,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const STATUS_BADGE = (status) => {
  const map = {
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    registration_open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    registration_closed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ongoing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return map[status] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
};

export default function CoordinatorEventManagement() {
  const { token } = useAuth();
  const { competition } = useCompetition();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Chest prefix state
  const [chestPrefix, setChestPrefix] = useState("");
  const [prefixSaving, setPrefixSaving] = useState(false);

  // Auto-assign state
  const [autoStart, setAutoStart] = useState(1);
  const [autoPrefix, setAutoPrefix] = useState("");

  // Inline chest edit
  const [editingChest, setEditingChest] = useState(null);
  const [editValue, setEditValue] = useState("");

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError("");
    const compId = competition?._id || competition?.id || competition?.competition_id;
    const query = compId ? `?competition_id=${encodeURIComponent(compId)}` : "";
        const { events: evts } = await apiCall(`/api/event${query}`);
        setEvents(evts || []);
        if ((evts || []).length > 0) {
          const firstId = evts[0]._id || evts[0].event_id;
          setSelectedEventId(firstId);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [token, apiCall, competition?._id, competition?.id, competition?.competition_id]);

  useEffect(() => {
    if (!selectedEventId) return;
    const loadTeams = async () => {
      try {
        setTeamsLoading(true);
        const { data } = await apiCall(`/api/team?event_id=${selectedEventId}`);
        setTeams(data || []);
      } catch {
        setTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadTeams();
  }, [selectedEventId, token, apiCall]);

  const selectedEvent = useMemo(() => {
    return events.find((e) => (e._id || e.event_id) === selectedEventId);
  }, [events, selectedEventId]);

  useEffect(() => {
    if (selectedEvent) {
      setChestPrefix(selectedEvent.chest_prefix || "");
      setAutoPrefix(selectedEvent.chest_prefix || "");
    }
  }, [selectedEvent]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter((e) => {
      const title = (e.title || e.name || "").toLowerCase();
      const cat = (e.category || "").toLowerCase();
      const sub = (e.subcategory || "").toLowerCase();
      return title.includes(q) || cat.includes(q) || sub.includes(q);
    });
  }, [events, searchQuery]);

  const hasChestConfig = selectedEvent?.chest_prefix?.trim().length > 0;

  const assignedCount = useMemo(() => teams.filter((t) => t.chest_no).length, [teams]);
  const unassignedCount = teams.length - assignedCount;

  const savePrefix = async () => {
    if (!selectedEvent) return;
    const eventId = selectedEvent._id || selectedEvent.event_id;
    try {
      setPrefixSaving(true);
      await apiCall(`/api/event/${eventId}`, {
        method: "PUT",
        body: JSON.stringify({ chest_prefix: chestPrefix.trim() }),
      });
      toast.success("Chest prefix saved");
      setEvents((prev) =>
        prev.map((e) =>
          (e._id || e.event_id) === eventId ? { ...e, chest_prefix: chestPrefix.trim() } : e
        )
      );
    } catch (err) {
      toast.error(err.message || "Failed to save chest prefix");
    } finally {
      setPrefixSaving(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!selectedEvent) return;
    const eventId = selectedEvent._id || selectedEvent.event_id;
    if (!autoPrefix.trim() && !autoStart) {
      toast.error("Enter a prefix or start number");
      return;
    }
    const confirmed = window.confirm(
      `Assign chest numbers ${autoPrefix.trim() ? `"${autoPrefix.trim()}-${autoStart}..." ` : `${autoStart}... `}to ${unassignedCount} unassigned team(s)?`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const resp = await apiCall("/api/team/bulk-chest", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          prefix: autoPrefix.trim(),
          start_number: autoStart,
        }),
      });
      if (resp.success) {
        toast.success(`Assigned chest numbers to ${resp.data.total} team(s)`);
        const { data } = await apiCall(`/api/team?event_id=${eventId}`);
        setTeams(data || []);
      }
    } catch (err) {
      toast.error(err.message || "Auto-assign failed");
    } finally {
      setActionLoading(false);
    }
  };

  const assignSingleChest = async (teamId, chest_no) => {
    try {
      setActionLoading(true);
      const resp = await apiCall(`/api/team/${teamId}/chest`, {
        method: "PATCH",
        body: JSON.stringify({ chest_no }),
      });
      if (resp.success) {
        toast.success("Chest number saved");
        setTeams((prev) =>
          prev.map((t) => (t._id === teamId ? { ...t, chest_no } : t))
        );
      }
    } catch (err) {
      toast.error(err.message || "Failed to assign chest number");
    } finally {
      setActionLoading(false);
      setEditingChest(null);
      setEditValue("");
    }
  };

  const startEditChest = (team) => {
    setEditingChest(team._id);
    setEditValue(team.chest_no || "");
  };

  const cancelEditChest = () => {
    setEditingChest(null);
    setEditValue("");
  };

  const confirmEditChest = () => {
    if (!editingChest || !editValue.trim()) return;
    assignSingleChest(editingChest, editValue.trim());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* LEFT: Event list */}
        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          <div className="rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
            <div className="border-b p-4" style={{ borderBottomColor: 'var(--border-divider)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>My Events</h3>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>{events.length} event{events.length !== 1 ? "s" : ""} assigned</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--chart-axis)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Calendar className="h-8 w-8" style={{ color: 'var(--chart-axis)' }} />
                  <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No events assigned</p>
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const id = evt._id || evt.event_id;
                  const isSelected = id === selectedEventId;
                  const title = evt.title || evt.name || "Untitled";
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedEventId(id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-bg)' : 'transparent',
                        borderLeft: isSelected ? '3px solid #ea580c' : '3px solid transparent',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--card-fg)' }}>{title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs capitalize" style={{ color: 'var(--chart-axis)' }}>{evt.category}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE(evt.status)}`}>
                            {evt.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--chart-axis)' }} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Event detail + chest management */}
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
            {selectedEvent ? (
              <>
                {/* Header */}
                <div className="border-b p-4" style={{ borderBottomColor: 'var(--border-divider)' }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>
                        {selectedEvent.title || selectedEvent.name}
                      </h3>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>
                        {teams.length} team{teams.length !== 1 ? "s" : ""}
                        {hasChestConfig ? ` · ${assignedCount} with chest numbers` : ""}
                        {unassignedCount > 0 ? ` · ${unassignedCount} unassigned` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasChestConfig && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <Hash className="h-3 w-3" />
                          {selectedEvent.chest_prefix}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chest prefix editor */}
                  <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border p-3" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--chart-axis)' }}>
                        Chest Number Prefix
                      </label>
                      <input
                        type="text"
                        value={chestPrefix}
                        onChange={(e) => setChestPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder="e.g. GD, SD, MT"
                        maxLength={10}
                        className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
                        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                      />
                    </div>
                    <button
                      onClick={savePrefix}
                      disabled={prefixSaving}
                      className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium transition hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                      style={{ borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                    >
                      {prefixSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {prefixSaving ? "Saving..." : "Save Prefix"}
                    </button>
                  </div>

                  {/* Auto-assign controls */}
                  <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border p-3" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                    <div className="w-24">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--chart-axis)' }}>
                        Start #
                      </label>
                      <input
                        type="number"
                        value={autoStart}
                        onChange={(e) => setAutoStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min={1}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--chart-axis)' }}>
                        Prefix for auto-assign
                      </label>
                      <input
                        type="text"
                        value={autoPrefix}
                        onChange={(e) => setAutoPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder={chestPrefix || "Optional prefix"}
                        maxLength={10}
                        className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
                        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                      />
                    </div>
                    <button
                      onClick={handleAutoAssign}
                      disabled={actionLoading || unassignedCount === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {actionLoading ? "Assigning..." : `Auto-Assign (${unassignedCount})`}
                    </button>
                  </div>
                </div>

                {/* Teams list */}
                <div className="p-4">
                  {teamsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <Users className="h-8 w-8" style={{ color: 'var(--chart-axis)' }} />
                      <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No teams registered for this event</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((team) => (
                        <div
                          key={team._id}
                          className="rounded-xl border p-4"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>
                                  {team.name || "Individual"}
                                </p>
                                {team.chest_no && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                    <Hash className="h-3 w-3" />
                                    {team.chest_no}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>
                                {team.group_id?.name || "No group"}
                              </p>
                            </div>

                            {/* Inline chest number editor */}
                            <div className="flex items-center gap-2 shrink-0">
                              {editingChest === team._id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                                    placeholder={autoPrefix ? `${autoPrefix}-?` : "Chest #"}
                                    maxLength={20}
                                    className="w-28 rounded-lg border px-2.5 py-1.5 text-xs font-mono"
                                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") confirmEditChest();
                                      if (e.key === "Escape") cancelEditChest();
                                    }}
                                  />
                                  <button
                                    onClick={confirmEditChest}
                                    disabled={actionLoading || !editValue.trim()}
                                    className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50 disabled:opacity-50"
                                    style={{ borderColor: 'var(--border-divider)' }}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={cancelEditChest}
                                    className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition hover:bg-red-50 hover:text-red-600"
                                    style={{ borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditChest(team)}
                                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-orange-50 hover:text-orange-600"
                                  style={{ borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  {team.chest_no ? "Edit" : "Assign"}
                                </button>
                              )}
                            </div>
                          </div>

                          {team.members && team.members.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {team.members.map((m) => (
                                <span
                                  key={m._id}
                                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
                                  style={{ backgroundColor: 'var(--card)', color: 'var(--chart-axis)' }}
                                >
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Hash className="h-10 w-10" style={{ color: 'var(--chart-axis)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--chart-axis)' }}>Select an event to manage chest numbers</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
