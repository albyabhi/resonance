import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { useMobileMode } from "../utils/useMobileMode";
import {
  Trophy, Users, User, CheckCircle, Plus, Search, X,
  Info, AlertCircle, UserPlus, Loader2, PartyPopper,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../ui/dialog";
import { Label } from "../ui/label";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function CaptainEventRegister() {
  const { competition, token } = useAuth();
  const { groupLabel } = useCompetition();
  const { isMobile } = useMobileMode();

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

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
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const openRegistrationModal = (event) => {
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

  const toggleParticipantSelection = (id) => {
    if (!selectedEvent) return;

    if (selectedEvent.event_type === "individual") {
      setSelectedParticipantIds((prev) => (prev.includes(id) ? [] : [id]));
      return;
    }

    const maxSize = selectedEvent.max_team_size || Infinity;
    setSelectedParticipantIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSize) {
        toast.error(`Maximum ${maxSize} members allowed for this event`);
        return prev;
      }
      return [...prev, id];
    });
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

    if (!selectedParticipantIds.length) {
      toast.error("Please select at least one participant");
      return;
    }

    if (selectedEvent.event_type === "team" && !teamName.trim()) {
      toast.error("Please provide a team name");
      return;
    }

    try {
      setSubmitting(true);
      const resp = await apiCall("/api/captain/register-for-event", {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEvent._id || selectedEvent.event_id,
          participant_ids: selectedParticipantIds,
          team_name: selectedEvent.event_type === "team" ? teamName.trim() : undefined,
        }),
      });

      if (resp.success) {
        toast.success(
          selectedEvent.event_type === "team"
            ? `Team "${teamName}" registered successfully!`
            : "Participant registered successfully!",
        );
        closeRegistrationModal();
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-card-foreground">
            Event Registration
          </h2>
          {groupInfo && (
            <p className="text-sm mt-1 text-muted-foreground">
              Registering participants for {groupInfo.name}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-semibold">
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-accent-blue" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Loading events...
          </p>
        </div>
      ) : activeTab === "available" ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const id = e._id || e.event_id;
              const registered = hasRegistrationForEvent(id);
              const count = registrationCountForEvent(id);

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
                      <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                        {e.category || "General"}
                      </Badge>

                      <div className="flex items-center gap-1.5">
                        {e.registration_mode && (
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-wider ${
                            e.registration_mode === "captain"
                              ? "border-amber-200 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                              : e.registration_mode === "participant"
                              ? "border-sky-200 bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/30"
                              : "border-purple-200 bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/30"
                          }`}>
                            {e.registration_mode === "captain" ? "Captain" : e.registration_mode === "participant" ? "Self" : "Open"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-xl text-card-foreground mt-4 leading-snug">
                      {e.name}
                    </h3>

                    <p className="text-sm text-muted-foreground mt-2.5 line-clamp-3 min-h-[60px] leading-relaxed">
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
                        className="w-full gap-2 text-xs uppercase tracking-widest"
                      >
                        <UserPlus className="h-4 w-4" />
                        Register Participants
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupRegistrations.map((reg) => {
                const evt = reg.event_id || {};
                return (
                  <Card key={reg._id} className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <Badge variant="success" className="text-[10px] font-black uppercase tracking-widest">
                          Confirmed Entry
                        </Badge>
                        <h3 className="font-extrabold text-xl text-card-foreground mt-3">
                          {evt.name || "Unnamed Event"}
                        </h3>
                        {reg.name && (
                          <div className="text-xs font-bold mt-1 text-muted-foreground">
                            Team: <span className="text-accent-blue">{reg.name}</span>
                          </div>
                        )}
                      </div>
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
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) closeRegistrationModal(); }}>
        <DialogContent className={`${isMobile ? "max-h-[85vh]" : "max-w-2xl max-h-[90vh]"} overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              {groupInfo?.name} &middot;{" "}
              {selectedEvent?.event_type === "individual"
                ? "Individual event — select one participant"
                : `Team event — select ${selectedEvent?.min_team_size || 1}-${selectedEvent?.max_team_size || 1} members`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedEvent?.event_type === "team" && (
              <div className="space-y-2">
                <Label>
                  Team Name <span className="text-red-400">*</span>
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

              <div className="border rounded-lg border-border overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-border">
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

                    return (
                      <div
                        key={p._id}
                        onClick={() => !alreadyReg && toggleParticipantSelection(p._id)}
                        className={`flex items-center justify-between transition-colors ${
                          isMobile ? "px-4 py-4 min-h-[56px]" : "px-4 py-3"
                        } ${
                          alreadyReg
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
                        {alreadyReg && (
                          <Badge variant="success" className="text-[9px] font-black uppercase tracking-widest">
                            Registered
                          </Badge>
                        )}
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
                        <button onClick={(e) => { e.stopPropagation(); toggleParticipantSelection(id); }} className="ml-0.5 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {selectedEvent?.event_type === "team" && (
              <div className="p-3.5 border rounded-lg space-y-1.5 text-xs bg-muted border-border">
                <div className="font-bold text-card-foreground">
                  Team Requirements:
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle className={`h-3.5 w-3.5 ${selectedParticipantIds.length >= (selectedEvent.min_team_size || 1) ? "text-accent-green" : "text-muted-foreground"}`} />
                  Min team size: {selectedEvent.min_team_size || 1}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle className={`h-3.5 w-3.5 ${selectedParticipantIds.length <= (selectedEvent.max_team_size || Infinity) ? "text-accent-green" : "text-muted-foreground"}`} />
                  Max team size: {selectedEvent.max_team_size || 1}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-xs mb-3 text-muted-foreground">
              {selectedEvent?.event_type === "team"
                ? `${selectedParticipantIds.length} participant${selectedParticipantIds.length !== 1 ? "s" : ""} selected`
                : selectedParticipantIds.length > 0
                  ? "1 participant selected"
                  : "No participant selected"}
            </div>
            <div className={`flex ${isMobile ? "flex-col" : "flex-row justify-end"} gap-3`}>
              <Button
                variant="outline"
                onClick={closeRegistrationModal}
                className={isMobile ? "min-h-[48px] w-full" : ""}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRegistration}
                disabled={submitting || !selectedParticipantIds.length}
                className={`gap-2 ${isMobile ? "min-h-[48px] w-full" : ""}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {selectedEvent?.event_type === "team" ? "Register Team" : "Register Participant"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
