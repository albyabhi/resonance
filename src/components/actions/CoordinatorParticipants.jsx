import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import { Calendar, Users, X, Trash2, UserMinus, ChevronRight, Search } from "lucide-react";
import toast from "react-hot-toast";

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

export default function CoordinatorParticipants() {
  const { token } = useAuth();
  const { competition } = useCompetition();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  useEffect(() => {
    if (!token) return;
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError("");
        const competitionId = competition?._id || competition?.id || competition?.competition_id;
        const query = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";
        const { events: evts } = await apiCall(`/api/event${query}`);
        setEvents(evts || []);
        if ((evts || []).length > 0) {
          setSelectedEventId(evts[0]._id || evts[0].event_id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [token]);

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
  }, [selectedEventId, token]);

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

  const selectedEvent = useMemo(() => {
    return events.find((e) => (e._id || e.event_id) === selectedEventId);
  }, [events, selectedEventId]);

  const removeMember = async (teamId, participantId, name) => {
    if (!window.confirm(`Remove ${name} from this team?`)) return;
    try {
      setActionLoading(true);
      await apiCall(`/api/team/${teamId}/members/${participantId}`, { method: "DELETE" });
      toast.success("Participant removed");
      const { data } = await apiCall(`/api/team?event_id=${selectedEventId}`);
      setTeams(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to remove participant");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Delete team "${teamName}" and all its members?`)) return;
    try {
      setActionLoading(true);
      await apiCall(`/api/team/${teamId}`, { method: "DELETE" });
      toast.success("Team deleted");
      const { data } = await apiCall(`/api/team?event_id=${selectedEventId}`);
      setTeams(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to delete team");
    } finally {
      setActionLoading(false);
    }
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
              <h3 className="text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>Assigned Events</h3>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>{events.length} event{events.length !== 1 ? "s" : ""}</p>
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

        {/* RIGHT: Participants for selected event */}
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
            {selectedEvent ? (
              <>
                <div className="border-b p-4" style={{ borderBottomColor: 'var(--border-divider)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>
                    {selectedEvent.title || selectedEvent.name}
                  </h3>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>
                    {teams.length} team{teams.length !== 1 ? "s" : ""} registered
                  </p>
                </div>

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
                    <div className="space-y-4">
                      {teams.map((team) => (
                        <div
                          key={team._id}
                          className="rounded-xl border p-4"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>
                                  {team.name || "Individual"}
                                </p>
                                {team.chest_no && (
                                  <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                    #{team.chest_no}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>
                                {team.group_id?.name || "No group"}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteTeam(team._id, team.name || "Individual")}
                              disabled={actionLoading}
                              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              style={{ borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}
                              title="Delete team"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>

                          {team.members && team.members.length > 0 && (
                            <div className="space-y-1.5">
                              {team.members.map((m) => (
                                <div
                                  key={m._id}
                                  className="flex items-center justify-between rounded-lg px-3 py-2"
                                  style={{ backgroundColor: 'var(--card)' }}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                      style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)' }}
                                    >
                                      {(m.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium" style={{ color: 'var(--card-fg)' }}>{m.name}</p>
                                      <p className="text-xs" style={{ color: 'var(--chart-axis)' }}>
                                        {m.unique_id || m.class || ""}
                                        {m.class ? ` · ${m.class}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeMember(team._id, m._id, m.name)}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                    style={{ borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}
                                    title="Remove from team"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {(!team.members || team.members.length === 0) && (
                            <p className="py-2 text-center text-xs" style={{ color: 'var(--chart-axis)' }}>
                              No members in this team
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Users className="h-10 w-10" style={{ color: 'var(--chart-axis)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--chart-axis)' }}>Select an event to view participants</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
