import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import { Calendar, Users, X, Trash2, UserMinus, ChevronRight, Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const STATUS_VARIANT = (status) => {
  const map = {
    draft: "secondary",
    registration_open: "success",
    registration_closed: "outline",
    ongoing: "default",
    completed: "secondary",
  };
  return map[status] || "secondary";
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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", description: "", onConfirm: null });

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

  const removeMember = async (teamId, participantId) => {
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

  const deleteTeam = async (teamId) => {
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

  const promptConfirm = (title, description, onConfirm) => {
    setConfirmDialog({ open: true, title, description, onConfirm });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent-amber" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* LEFT: Event list */}
        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          <Card>
            <div className="border-b border-border p-4">
              <CardTitle className="text-sm">Assigned Events</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{events.length} event{events.length !== 1 ? "s" : ""}</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="pl-9"
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
                      asChild
                    >
                      <div
                        onClick={() => setSelectedEventId(id)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted ${isSelected ? 'bg-accent-blue/10 border-l-[3px] border-l-accent-amber' : 'border-l-[3px] border-l-transparent'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-card-foreground">{title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs capitalize text-muted-foreground">{evt.category}</span>
                            <Badge variant={STATUS_VARIANT(evt.status)} className="text-xs px-2 py-0.5">
                              {evt.status?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT: Participants for selected event */}
        <div className="min-w-0 flex-1">
          <Card>
            {selectedEvent ? (
              <>
                <div className="border-b border-border p-4">
                  <CardTitle className="text-sm">
                    {selectedEvent.title || selectedEvent.name}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {teams.length} team{teams.length !== 1 ? "s" : ""} registered
                  </p>
                </div>

                <CardContent className="p-4">
                  {teamsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-accent-amber" />
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No teams registered for this event</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teams.map((team) => (
                        <div
                          key={team._id}
                          className="rounded-xl border border-border bg-muted p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-card-foreground">
                                  {team.name || "Individual"}
                                </p>
                                {team.chest_no && (
                                  <Badge variant="outline" className="bg-accent-amber/10 text-accent-amber border-transparent text-xs px-2 py-0.5">
                                    #{team.chest_no}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {team.group_id?.name || "No group"}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => promptConfirm("Delete Team", `Delete team "${team.name || "Individual"}" and all its members?`, () => deleteTeam(team._id, team.name || "Individual"))}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>

                          {team.members && team.members.length > 0 && (
                            <div className="space-y-1.5">
                              {team.members.map((m) => (
                                <div
                                  key={m._id}
                                  className="flex items-center justify-between rounded-lg bg-card px-3 py-2"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs font-bold bg-accent-blue/10 text-accent-blue">
                                        {(m.name || "?").charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-card-foreground">{m.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {m.unique_id || m.class || ""}
                                        {m.class ? ` · ${m.class}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => promptConfirm("Remove Participant", `Remove ${m.name} from this team?`, () => removeMember(team._id, m._id, m.name))}
                                    className="hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <UserMinus className="h-3.5 w-3.5 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {(!team.members || team.members.length === 0) && (
                            <p className="py-2 text-center text-xs text-muted-foreground">
                              No members in this team
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Select an event to view participants</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialog.onConfirm?.(); }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
