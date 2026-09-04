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
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const STATUS_BADGE = (status) => {
  const map = {
    draft: "bg-muted text-muted-foreground border-border",
    registration_open: "bg-accent-green/10 text-accent-green border-accent-green/20",
    registration_closed: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
    ongoing: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    completed: "bg-muted text-muted-foreground border-border",
  };
  return map[status] || "bg-muted text-muted-foreground border-border";
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
  const [chestPrefix, setChestPrefix] = useState("");
  const [prefixSaving, setPrefixSaving] = useState(false);
  const [autoStart, setAutoStart] = useState(1);
  const [autoPrefix, setAutoPrefix] = useState("");
  const [editingChest, setEditingChest] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Compute events needing chest numbers (status = judging or result_pending without chest numbers)
  const eventsNeedingChestNumbers = useMemo(() => {
    return events.filter((evt) => {
      const status = evt.status;
      if (!["judging", "result_pending"].includes(status)) return false;
      const hasChestConfig = evt.chest_prefix?.trim().length > 0;
      return !hasChestConfig;
    });
  }, [events]);

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

  if (loading) return null;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {eventsNeedingChestNumbers.length > 0 && (
        <div className="rounded-lg border border-accent-amber/20 bg-accent-amber/10 px-4 py-3 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-accent-amber mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-accent-amber mb-1">Chest Numbers Required</p>
            <p className="text-xs text-accent-amber/80">
              {eventsNeedingChestNumbers.length} event{eventsNeedingChestNumbers.length !== 1 ? "s" : ""} in "judging" or "result_pending" status need chest numbers before judging can proceed.
            </p>
            <p className="text-xs text-accent-amber/70 mt-1">
              Click an event below to assign chest numbers in the detail panel.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          <Card>
            <div className="border-b border-border p-4">
              <CardTitle className="text-sm font-semibold">My Events</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{events.length} event{events.length !== 1 ? "s" : ""} assigned</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="w-full rounded-lg pl-9"
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No events assigned</p>
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const id = evt._id || evt.event_id;
                  const isSelected = id === selectedEventId;
                  const title = evt.title || evt.name || "Untitled";
                  return (
                    <Button
                      key={id}
                      variant="ghost"
                      onClick={() => setSelectedEventId(id)}
                      className={`w-full justify-between rounded-none px-4 py-3 h-auto hover:bg-muted ${
                        isSelected ? "bg-primary/10 border-l-[3px] border-accent-amber" : "border-l-[3px] border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium text-card-foreground">{title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs capitalize text-muted-foreground">{evt.category}</span>
                          <Badge variant="outline" className={STATUS_BADGE(evt.status)}>
                            {evt.status?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 flex-1">
          <Card>
            {selectedEvent ? (
              <>
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {selectedEvent.title || selectedEvent.name}
                      </CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {teams.length} team{teams.length !== 1 ? "s" : ""}
                        {hasChestConfig ? ` \u00B7 ${assignedCount} with chest numbers` : ""}
                        {unassignedCount > 0 ? ` \u00B7 ${unassignedCount} unassigned` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasChestConfig && (
                        <Badge variant="outline" className="inline-flex items-center gap-1 bg-accent-amber/10 text-accent-amber border-accent-amber/20">
                          <Hash className="h-3 w-3" />
                          {selectedEvent.chest_prefix}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted p-3">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Chest Number Prefix
                      </label>
                      <Input
                        type="text"
                        value={chestPrefix}
                        onChange={(e) => setChestPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder="e.g. GD, SD, MT"
                        maxLength={10}
                        className="w-full font-mono"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={savePrefix}
                      disabled={prefixSaving}
                      className="flex items-center gap-1.5"
                      size="sm"
                    >
                      {prefixSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {prefixSaving ? "Saving..." : "Save Prefix"}
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted p-3">
                    <div className="w-24">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Start #
                      </label>
                      <Input
                        type="number"
                        value={autoStart}
                        onChange={(e) => setAutoStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min={1}
                        className="w-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Prefix for auto-assign
                      </label>
                      <Input
                        type="text"
                        value={autoPrefix}
                        onChange={(e) => setAutoPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder={chestPrefix || "Optional prefix"}
                        maxLength={10}
                        className="w-full font-mono"
                      />
                    </div>
                    <Button
                      onClick={handleAutoAssign}
                      disabled={actionLoading || unassignedCount === 0}
                      className="flex items-center gap-1.5 bg-accent-amber hover:bg-accent-amber/90 text-white"
                      size="sm"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {actionLoading ? "Assigning..." : `Auto-Assign (${unassignedCount})`}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {teamsLoading ? null : teams.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No teams registered for this event</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((team) => (
                        <Card key={team._id} className="bg-muted border-border">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-card-foreground">
                                    {team.name || "Individual"}
                                  </p>
                                  {team.chest_no && (
                                    <Badge variant="outline" className="inline-flex items-center gap-1 bg-accent-amber/10 text-accent-amber border-accent-amber/20 text-xs font-bold">
                                      <Hash className="h-3 w-3" />
                                      {team.chest_no}
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {team.group_id?.name || "No group"}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {editingChest === team._id ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                                      placeholder={autoPrefix ? `${autoPrefix}-?` : "Chest #"}
                                      maxLength={20}
                                      className="w-28 text-xs font-mono"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") confirmEditChest();
                                        if (e.key === "Escape") cancelEditChest();
                                      }}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={confirmEditChest}
                                      disabled={actionLoading || !editValue.trim()}
                                      className="text-accent-green hover:bg-accent-green/10"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={cancelEditChest}
                                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditChest(team)}
                                    className="gap-1.5 text-muted-foreground hover:bg-accent-amber/10 hover:text-accent-amber"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    {team.chest_no ? "Edit" : "Assign"}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {team.members && team.members.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {team.members.map((m) => (
                                  <Badge
                                    key={m._id}
                                    variant="outline"
                                    className="bg-card text-muted-foreground text-xs"
                                  >
                                    {m.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
                <Hash className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Select an event to manage chest numbers</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
