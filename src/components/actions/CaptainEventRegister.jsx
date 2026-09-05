import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { useMobileMode } from "../utils/useMobileMode";
import {
  Trophy, Users, User, CheckCircle, Plus, Search, X,
  Info, AlertCircle, UserPlus, Loader2, PartyPopper, Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";
import EventStatusBadge from "../EventStatusBadge";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function CaptainEventRegister() {
  const { competition, token } = useAuth();
  const { groupLabel } = useCompetition();
  const { isMobile } = useMobileMode();

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [groupRegistrations, setGroupRegistrations] = useState([]);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("available");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const competitionId = competition?._id || competition?.id;
      const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";

      const [eventsResp, registrationsResp, groupResp] = await Promise.all([
        apiCall(`/api/event${competitionQuery}`),
        apiCall("/api/captain/group-event-registrations"),
        apiCall("/api/captain/group-participants"),
      ]);

      setEvents(eventsResp.events || []);
      setGroupRegistrations(registrationsResp.data || []);
      if (groupResp.success) {
        setGroupParticipants(groupResp.data || []);
        setGroupInfo(groupResp.group || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [competition, apiCall]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const registrationsByEvent = useMemo(() => {
    const map = {};
    for (const reg of groupRegistrations) {
      const eventId = reg.event_id?._id || reg.event_id;
      if (!map[eventId]) map[eventId] = [];
      map[eventId].push(reg);
    }
    return map;
  }, [groupRegistrations]);

  const hasRegistrationForEvent = (eventId) => {
    return (registrationsByEvent[eventId]?.length || 0) > 0;
  };

  const registrationCountForEvent = (eventId) => {
    return registrationsByEvent[eventId]?.length || 0;
  };

  const filteredParticipants = useMemo(() => {
    const q = participantSearch.toLowerCase().trim();
    if (!q) return groupParticipants;
    return groupParticipants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.unique_id || "").toLowerCase().includes(q) ||
        p.class.toLowerCase().includes(q)
    );
  }, [groupParticipants, participantSearch]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.toLowerCase().trim();
    return events.filter((e) => {
      if (eventFilter === "individual" && e.event_type !== "individual") return false;
      if (eventFilter === "team" && e.event_type !== "team") return false;
      if (eventFilter === "registered") {
        const id = e._id || e.event_id;
        if (!hasRegistrationForEvent(id)) return false;
      }
      if (!q) return true;
      return (
        (e.title || e.name || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, eventSearch, eventFilter, registrationsByEvent]);

  // Canonical team-size limits: min/max_participants with legacy fallback.
  const getTeamLimits = (event) => {
    if (!event) return { min: 1, max: 1 };
    if (event.event_type === "individual") return { min: 1, max: 1 };
    const rawMin = event.min_participants ?? event.min_team_size ?? 1;
    const rawMax = event.max_participants ?? event.max_team_size ?? 1;
    const min = Number.isFinite(Number(rawMin)) ? Math.max(1, Math.floor(Number(rawMin))) : 1;
    const max = Number.isFinite(Number(rawMax)) ? Math.max(min, Math.floor(Number(rawMax))) : min;
    return { min, max };
  };

  const isRegistrableStatus = (event) => (event?.status || "") === "registration_open";

  const openRegistrationModal = (event) => {
    if (!isRegistrableStatus(event)) {
      toast.error(`Registration is not open (status: ${event?.status || "unknown"})`);
      return;
    }
    const existing = registrationsByEvent[event._id || event.event_id]?.length || 0;
    const maxPerGroup = event.max_per_group || 1;
    if (existing >= maxPerGroup) {
      toast.error(`Group limit reached (${maxPerGroup} per group for this event)`);
      return;
    }
    setSelectedEvent(event);
    setSelectedParticipantIds([]);
    setTeamName("");
    setParticipantSearch("");
  };

  const closeRegistrationModal = () => {
    setSelectedEvent(null);
    setSelectedParticipantIds([]);
    setTeamName("");
    setParticipantSearch("");
  };

  const remainingSlots = useMemo(() => {
    if (!selectedEvent) return 0;
    const eventId = selectedEvent._id || selectedEvent.event_id;
    const existing = (registrationsByEvent[eventId]?.length || 0);
    const max = selectedEvent.max_per_group || 1;
    return Math.max(0, max - existing);
  }, [selectedEvent, registrationsByEvent]);

  const toggleParticipantSelection = (id) => {
    if (!selectedEvent) return;

    const { max: teamMax } = getTeamLimits(selectedEvent);
    const isTeam = selectedEvent.event_type === "team";
    // Team: one team of up to teamMax members. Individual: up to remainingSlots single entries.
    const cap = isTeam ? teamMax : remainingSlots;

    if (!isTeam && remainingSlots <= 0) {
      toast.error("Group limit reached for this event");
      return;
    }

    setSelectedParticipantIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= cap) {
        if (isTeam) {
          toast.error(`Maximum ${cap} members allowed for this event`);
        } else {
          toast.error(`Maximum ${cap} registration${cap !== 1 ? "s" : ""} per group for this event`);
        }
        return prev;
      }
      return [...prev, id];
    });
  };

  const isGenderIneligible = (participant, event) => {
    if (!event?.gender_filter || event.gender_filter === "all") return false;
    return participant?.gender && participant.gender !== event.gender_filter;
  };

  const isAlreadyRegistered = (participantId, eventId) => {
    const registrations = registrationsByEvent[eventId] || [];
    for (const reg of registrations) {
      if (reg.members?.some((m) => m._id === participantId)) return true;
    }
    return false;
  };

  const handleSubmitRegistration = async () => {
    if (!selectedEvent) return;

    if (!isRegistrableStatus(selectedEvent)) {
      toast.error("Event registration is not open");
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("Group limit reached for this event");
      return;
    }

    if (!selectedParticipantIds.length) {
      toast.error("Please select at least one participant");
      return;
    }

    if (selectedEvent.event_type === "team") {
      if (!teamName.trim()) {
        toast.error("Please provide a team name");
        return;
      }
      const { min, max } = getTeamLimits(selectedEvent);
      if (selectedParticipantIds.length > max) {
        toast.error(`Team too large: maximum ${max} members`);
        return;
      }
      if (selectedParticipantIds.length < min) {
        toast.error(`Team too small: minimum ${min} members required`);
        return;
      }
    } else if (selectedParticipantIds.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} slot${remainingSlots !== 1 ? "s" : ""} left for your group`);
      return;
    }

    // Fail-fast gender guard (backend remains source of truth for age/DOB).
    const genderBlocked = selectedParticipantIds
      .map((pid) => groupParticipants.find((x) => x._id === pid))
      .filter((p) => isGenderIneligible(p, selectedEvent));
    if (genderBlocked.length > 0) {
      toast.error(`Gender restriction: this event is ${selectedEvent.gender_filter}-only`);
      return;
    }

    try {
      setSubmitting(true);

      const isBulkIndividual = selectedEvent.event_type === "individual" && selectedParticipantIds.length > 1;

      let resp;
      if (isBulkIndividual) {
        resp = await apiCall("/api/captain/bulk-register", {
          method: "POST",
          body: JSON.stringify({
            event_id: selectedEvent._id || selectedEvent.event_id,
            teams: selectedParticipantIds.map((pid) => ({ participant_ids: [pid] })),
          }),
        });
      } else {
        resp = await apiCall("/api/captain/register-for-event", {
          method: "POST",
          body: JSON.stringify({
            event_id: selectedEvent._id || selectedEvent.event_id,
            participant_ids: selectedParticipantIds,
            team_name: selectedEvent.event_type === "team" ? teamName.trim() : undefined,
          }),
        });
      }

      if (resp.success) {
        const created = resp.data?.created || resp.data?.teams?.length || selectedParticipantIds.length;
        const skipped = resp.data?.skipped || 0;

        if (isBulkIndividual) {
          if (skipped > 0 && created > 0) {
            toast.success(`${created} participant${created !== 1 ? "s" : ""} registered, ${skipped} failed`);
          } else if (created > 0) {
            toast.success(`${created} participant${created !== 1 ? "s" : ""} registered successfully!`);
          } else {
            toast.error(resp.data?.errors?.[0]?.error || "Registration failed");
          }
        } else {
          toast.success(
            selectedEvent.event_type === "team"
              ? `Team "${teamName}" registered successfully!`
              : "Participant registered successfully!",
          );
        }
        closeRegistrationModal();
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke is allowed only while the event is still open for registration.
  const isRevocable = (reg) => {
    const status = reg.event_id?.status;
    return status === "registration_open";
  };

  const handleConfirmRevoke = async () => {
    if (!confirmTarget) return;
    const { teamId, eventId, eventTitle } = confirmTarget;
    try {
      setRevokingId(teamId);
      await apiCall("/api/captain/unregister-from-event", {
        method: "DELETE",
        body: JSON.stringify({ event_id: eventId, team_id: teamId }),
      });
      setGroupRegistrations((prev) => prev.filter((r) => r._id !== teamId));
      toast.success(`Entry revoked from ${eventTitle || "event"}`);
      setConfirmTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to revoke entry");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-card-foreground">
            Event Registration
          </h2>
          {groupInfo && (
            <p className="text-sm mt-1 text-muted-foreground truncate">
              Registering participants for {groupInfo.name} &middot; {groupParticipants.length} members
            </p>
          )}
        </div>
      </div>

      {/* Sticky search + type filter — works one-handed on mobile */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 space-y-2" style={{ backgroundColor: "var(--background)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            placeholder="Search events by name or category..."
            className="pl-10 min-h-[44px] text-base sm:text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { value: "all", label: `All (${events.length})` },
            { value: "individual", label: "Individual" },
            { value: "team", label: "Team" },
            { value: "registered", label: "Registered" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setEventFilter(f.value)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors min-h-[36px] ${
                eventFilter === f.value
                  ? "bg-accent-blue text-white"
                  : "bg-muted text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-accent-red-tint border border-accent-red/20 text-accent-red rounded-2xl text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex border-b border-border">
        <button
          className={`transition-all border-b-2 flex items-center gap-2 ${
            isMobile ? "min-h-[48px] px-4 text-sm" : "pb-4 px-6"
          } font-bold ${
            activeTab === "available"
              ? "border-accent-blue text-accent-blue"
              : "border-transparent text-muted-foreground hover:text-card-foreground"
          }`}
          onClick={() => setActiveTab("available")}
        >
          Available Events
          {events.length > 0 && (
            <span className="bg-muted text-muted-foreground text-xs px-2.5 py-0.5 rounded-full font-black">
              {events.length}
            </span>
          )}
        </button>
        <button
          className={`transition-all border-b-2 flex items-center gap-2 ${
            isMobile ? "min-h-[48px] px-4 text-sm" : "pb-4 px-6"
          } font-bold ${
            activeTab === "registered"
              ? "border-accent-blue text-accent-blue"
              : "border-transparent text-muted-foreground hover:text-card-foreground"
          }`}
          onClick={() => setActiveTab("registered")}
        >
          My Registrations
          {groupRegistrations.length > 0 && (
            <span className="bg-accent-blue/10 text-accent-blue text-xs px-2.5 py-0.5 rounded-full font-black">
              {groupRegistrations.length}
            </span>
          )}
        </button>
      </div>

      {loading ? null : activeTab === "available" ? (
        events.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <Trophy className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
              <p className="font-semibold text-lg text-muted-foreground">
                No events scheduled yet
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                Coordinate with administrators for announcements.
              </p>
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-semibold text-lg text-muted-foreground">
                No events match your filters
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                Try a different search or filter.
              </p>
              <Button
                variant="outline"
                onClick={() => { setEventSearch(""); setEventFilter("all"); }}
                className="mt-5 min-h-[44px]"
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredEvents.map((e) => {
              const id = e._id || e.event_id;
              const registered = hasRegistrationForEvent(id);
              const count = registrationCountForEvent(id);
              const open = isRegistrableStatus(e);
              const full = count >= (e.max_per_group || 1);
              const registerDisabled = !open || full;

              return (
                <Card
                  key={id}
                  className={`relative overflow-hidden ${
                    registered
                      ? "border-accent-green bg-accent-green/5"
                      : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                          {e.category || "General"}
                        </Badge>
                        <EventStatusBadge status={e.status} size="sm" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {e.registration_mode && (
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-wider ${
                            e.registration_mode === "captain"
                              ? "border-accent-amber/20 bg-accent-amber-tint text-accent-amber"
                              : e.registration_mode === "participant"
                              ? "border-accent-teal/20 bg-accent-teal-tint text-accent-teal"
                              : "border-accent-purple/20 bg-accent-purple-tint text-accent-purple"
                          }`}>
                            {e.registration_mode === "captain" ? "Captain" : e.registration_mode === "participant" ? "Self" : "Open"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-lg sm:text-xl text-card-foreground mt-3 leading-snug">
                      {e.title || e.name}
                    </h3>

                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {e.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {e.duration && (
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                          {e.duration}
                        </Badge>
                      )}
                      {e.gender_filter && e.gender_filter !== "all" && (
                        <Badge variant="secondary" className="gap-1 text-[10px] font-black uppercase tracking-widest">
                          <User className="h-3 w-3" />
                          {e.gender_filter === "male" ? "Boys Only" : "Girls Only"}
                        </Badge>
                      )}
                      {e.subcategory && (
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                          {e.subcategory}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-4 w-4 shrink-0" />
                        <span className="font-semibold">
                          {e.event_type === "individual" ? "Individual" : `Team: ${e.min_participants || e.min_team_size || 1}-${e.max_participants || e.max_team_size || 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-wider">
                          {e.mode}
                        </Badge>
                      </div>
                    </div>

                    {registered && (
                      <div className="mt-3 text-xs font-semibold text-accent-green flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {count} registration{count !== 1 ? "s" : ""} from your group
                      </div>
                    )}

                    <div className="mt-4">
                      <Button
                        onClick={() => openRegistrationModal(e)}
                        disabled={registerDisabled}
                        title={!open ? `Registration ${e.status || "not open"}` : full ? "Group limit reached" : "Register participants"}
                        className="w-full min-h-[44px] gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
                      >
                        <UserPlus className="h-4 w-4" />
                        {!open
                          ? `Registration ${e.status === "draft" ? "Not Open" : "Closed"}`
                          : full
                            ? "Group Limit Reached"
                            : registered ? `Registered (${count}) — Add More` : "Register Participants"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {groupRegistrations.length === 0 ? (
            <Card className="text-center py-20 border-dashed">
              <CardContent>
                <Users className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
                <p className="font-semibold text-lg text-muted-foreground">
                  No registrations yet
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Browse available events to register your group participants.
                </p>
                <Button
                  onClick={() => setActiveTab("available")}
                  className="mt-6 text-xs uppercase tracking-widest"
                >
                  Browse Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {groupRegistrations.map((reg) => {
                const evt = reg.event_id || {};
                const revocable = isRevocable(reg);
                const revoking = revokingId === reg._id;
                return (
                  <Card key={reg._id} className="p-5 sm:p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <Badge variant="success" className="text-[10px] font-black uppercase tracking-widest">
                          Confirmed Entry
                        </Badge>
                        <h3 className="font-extrabold text-xl text-card-foreground mt-3">
                          {evt.title || evt.name || "Unnamed Event"}
                        </h3>
                        {reg.name && (
                          <div className="text-xs font-bold mt-1 text-muted-foreground">
                            Team: <span className="text-accent-blue">{reg.name}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!revocable || revoking}
                        title={revocable ? "Revoke this entry" : "Entries can only be revoked while registration is open"}
                        aria-label={`Revoke entry for ${evt.title || evt.name || "event"}`}
                        onClick={() => setConfirmTarget({
                          teamId: reg._id,
                          eventId: evt._id || reg.event_id,
                          eventTitle: evt.title || evt.name || "event",
                          teamName: reg.name,
                          members: reg.members || [],
                        })}
                        className="shrink-0 min-h-[44px] min-w-[44px] gap-1.5 text-accent-red hover:text-accent-red hover:bg-accent-red/10 disabled:opacity-40"
                      >
                        {revoking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline text-xs font-bold">Revoke</span>
                      </Button>
                    </div>

                    {reg.members && reg.members.length > 0 && (
                      <div className="mt-5">
                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-2.5 text-muted-foreground">
                          Participants ({reg.members.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {reg.members.map((m) => (
                            <span
                              key={m._id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs bg-muted text-card-foreground border-border"
                            >
                              <User className="h-3 w-3 shrink-0" />
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!revocable && (
                      <p className="mt-4 text-[11px] font-semibold text-muted-foreground">
                        Revocation is available only while registration is open.
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) closeRegistrationModal(); }}>
        <DialogContent className={`${isMobile ? "max-h-[92dvh]" : "max-w-2xl max-h-[90vh]"} flex flex-col gap-0 overflow-hidden p-0`}>
          <div className="sticky top-0 z-10 border-b border-border bg-background px-5 pt-5 pb-4 sm:px-6">
          <DialogHeader>
            <DialogTitle className="pr-8 text-left">{selectedEvent?.title || selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={selectedEvent?.event_type === "individual" ? "secondary" : "outline"} className="text-xs font-black uppercase tracking-wider">
                  {selectedEvent?.event_type === "individual" ? "Individual Event" : "Team Event"}
                </Badge>
                <span className="text-muted-foreground text-xs">for {groupInfo?.name}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="mt-3 flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted border-border">
              <div className="text-xs font-bold text-card-foreground shrink-0">
                Slots
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground truncate">
                  {selectedEvent.event_type === "team"
                    ? `${remainingSlots} team slot${remainingSlots !== 1 ? "s" : ""} left · size ${getTeamLimits(selectedEvent).min}-${getTeamLimits(selectedEvent).max}`
                    : `${selectedParticipantIds.length} selected · ${remainingSlots} left`}
                </div>
                <div className="h-2 w-20 sm:w-24 shrink-0 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-blue rounded-full transition-all"
                    style={{ width: `${selectedEvent.max_per_group ? ((selectedEvent.max_per_group - remainingSlots) / selectedEvent.max_per_group) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {selectedEvent?.event_type === "team" && (
              <div className="space-y-2">
                <Label>
                  Team Name <span className="text-accent-red">*</span>
                </Label>
                <Input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Team Alpha"
                  className={isMobile ? "min-h-[48px] text-base" : ""}
                />
                <p className="text-[10px] text-muted-foreground">
                  Must be unique across all groups for this event.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">
                Select Participants
              </Label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder={`Search participants in your ${groupLabel.toLowerCase()}...`}
                  className={`pl-10 ${isMobile ? "min-h-[48px] text-base" : ""}`}
                />
              </div>

              <div className="border rounded-lg border-border overflow-hidden max-h-[40dvh] sm:max-h-[300px] overflow-y-auto divide-y divide-border">
                {filteredParticipants.length === 0 ? (
                  <div className="p-6 text-center text-sm font-semibold text-muted-foreground">
                    {participantSearch
                      ? "No matching participants found"
                      : `No participants in your ${groupLabel.toLowerCase()}. Add participants first.`}
                  </div>
                ) : (
                  filteredParticipants.map((p) => {
                    const isSelected = selectedParticipantIds.includes(p._id);
                    const alreadyReg = isAlreadyRegistered(p._id, selectedEvent?._id || selectedEvent?.event_id);
                    const genderBlocked = isGenderIneligible(p, selectedEvent);
                    const blocked = alreadyReg || genderBlocked;

                    return (
                      <div
                        key={p._id}
                        onClick={() => {
                          if (alreadyReg) return;
                          if (genderBlocked) {
                            toast.error(`Gender restriction: this event is ${selectedEvent.gender_filter}-only`);
                            return;
                          }
                          toggleParticipantSelection(p._id);
                        }}
                        className={`flex items-center justify-between transition-colors ${
                          isMobile ? "px-4 py-4 min-h-[56px]" : "px-4 py-3"
                        } ${
                          blocked
                            ? "opacity-40 cursor-not-allowed"
                            : isSelected
                            ? "bg-accent-blue/5"
                            : "hover:bg-accent-blue/5 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${
                              isSelected && !alreadyReg
                                ? "bg-accent-blue text-white"
                                : "bg-muted"
                            }`}
                          >
                            {isSelected && !alreadyReg ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold truncate text-card-foreground">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {p.unique_id && <span>ID: {p.unique_id} &middot; </span>}
                              Class: {p.class}
                            </div>
                          </div>
                        </div>
                        {alreadyReg ? (
                          <Badge variant="success" className="text-[9px] font-black uppercase tracking-widest">
                            Registered
                          </Badge>
                        ) : genderBlocked ? (
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                            Ineligible
                          </Badge>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {selectedParticipantIds.length > 0 && (
              <div className="p-4 border rounded-lg bg-muted border-border">
                <div className="text-xs font-bold mb-2 text-card-foreground">
                  Selected ({selectedParticipantIds.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipantIds.map((id) => {
                    const p = groupParticipants.find((x) => x._id === id);
                    return p ? (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent-blue/10 text-accent-blue"
                      >
                        {p.name}
                        <button onClick={(e) => { e.stopPropagation(); toggleParticipantSelection(id); }} className="ml-0.5 hover:text-accent-red">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {selectedEvent?.event_type === "team" && (() => {
              const { min, max } = getTeamLimits(selectedEvent);
              return (
                <div className="p-3.5 border rounded-lg space-y-1.5 text-xs bg-muted border-border">
                  <div className="font-bold text-card-foreground">
                    Team Requirements:
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle className={`h-3.5 w-3.5 ${selectedParticipantIds.length >= min ? "text-accent-green" : "text-muted-foreground"}`} />
                    Min team size: {min}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle className={`h-3.5 w-3.5 ${selectedParticipantIds.length <= max ? "text-accent-green" : "text-muted-foreground"}`} />
                    Max team size: {max}
                  </div>
                  {remainingSlots <= 0 && (
                    <div className="flex items-center gap-1.5 text-accent-red font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Group limit reached for this event
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="sticky bottom-0 border-t border-border bg-background px-5 py-4 sm:px-6">
            <div className="text-xs mb-3 text-muted-foreground">
              {selectedEvent?.event_type === "team"
                ? `${selectedParticipantIds.length} participant${selectedParticipantIds.length !== 1 ? "s" : ""} selected`
                : selectedParticipantIds.length > 0
                  ? `${selectedParticipantIds.length} participant${selectedParticipantIds.length !== 1 ? "s" : ""} selected`
                  : "No participant selected"}
            </div>
            <div className={`flex ${isMobile ? "flex-col" : "flex-row justify-end"} gap-2.5`}>
              <Button
                variant="outline"
                onClick={closeRegistrationModal}
                className="min-h-[48px] sm:min-h-0 sm:h-10 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRegistration}
                disabled={(() => {
                  if (submitting || !selectedParticipantIds.length) return true;
                  if (!selectedEvent || !isRegistrableStatus(selectedEvent)) return true;
                  if (remainingSlots <= 0) return true;
                  if (selectedEvent.event_type === "team") {
                    const { min, max } = getTeamLimits(selectedEvent);
                    if (selectedParticipantIds.length < min || selectedParticipantIds.length > max) return true;
                  } else if (selectedParticipantIds.length > remainingSlots) return true;
                  return false;
                })()}
                className="min-h-[48px] sm:min-h-0 sm:h-10 gap-2 w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {selectedEvent?.event_type === "team"
                      ? "Register Team"
                      : selectedParticipantIds.length > 1
                        ? `Register ${selectedParticipantIds.length} Participants`
                        : "Register Participant"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke this entry?</DialogTitle>
            <DialogDescription>
              This removes the entry{confirmTarget?.teamName ? ` "${confirmTarget.teamName}"` : ""} from{" "}
              {confirmTarget?.eventTitle || "the event"}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirmTarget?.members?.length > 0 && (
            <div className="flex flex-wrap gap-2 py-1">
              {confirmTarget.members.map((m) => (
                <span
                  key={m._id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs bg-muted text-card-foreground border-border"
                >
                  <User className="h-3 w-3 shrink-0" />
                  {m.name}
                </span>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2.5">
            <Button
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              className="min-h-[48px] sm:min-h-0 sm:h-10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokingId === confirmTarget?.teamId}
              onClick={handleConfirmRevoke}
              className="min-h-[48px] sm:min-h-0 sm:h-10 gap-2"
            >
              {revokingId === confirmTarget?.teamId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Revoke Entry
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
