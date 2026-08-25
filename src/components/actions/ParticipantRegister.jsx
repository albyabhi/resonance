import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { useRealtime } from "../../context/RealtimeContext";
import {
  Trophy,
  Users,
  User,
  CheckCircle,
  Plus,
  Search,
  X,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Shield,
  Info,
  Lock,
  AlertCircle,
  ArrowUpRight,
  UserPlus,
  Loader2,
  PartyPopper
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Label } from "../ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible";
import EventStatusBadge from "../EventStatusBadge";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ParticipantRegister() {
  const { token, user, competition } = useAuth();
  const { groupLabel, groupLabelPlural } = useCompetition();
  const { lastUpdate } = useRealtime() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("available");

  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalTab, setModalTab] = useState("create");
  const [teamName, setTeamName] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [submittingTeam, setSubmittingTeam] = useState(false);

  const [eventTeams, setEventTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Invite teammates state
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviting, setInviting] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const shareEventId = queryParams.get("eventId");

  // Withdraw state
  const [withdrawingId, setWithdrawingId] = useState(null);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No authorization token found");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }, [token]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const competitionId = competition?._id || competition?.id || competition?.competition_id;
      const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";

      const [eventsResp, regsResp] = await Promise.all([
        apiCall(`/api/event${competitionQuery}`),
        apiCall("/api/team/my-registrations")
      ]);

      setEvents(eventsResp.events || []);
      setMyRegistrations(regsResp.data || []);

      const grpId = user?.groupId || user?.group_id || user?.membership?.group_id;
      if (grpId) {
        const membersResp = await apiCall(`/api/participants?group_id=${grpId}`);
        const otherMembers = (membersResp.participants || []).filter(
          m => m._id !== user.id && m._id !== user._id
        );
        setGroupMembers(otherMembers);
      }
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [competition, user, apiCall]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, lastUpdate, fetchData]);

  useEffect(() => {
    if (events.length > 0 && shareEventId) {
      const target = events.find(e => (e._id || e.event_id) === shareEventId);
      if (target) {
        const alreadyReg = myRegistrations.some(r => (r.event_id?._id || r.event_id) === shareEventId);
        if (!alreadyReg) {
          toast(
            <span className="flex items-center gap-2 font-medium">
              <Info className="h-5 w-5 text-accent-blue shrink-0" />
              You were redirected to register for: <b>{target.title || target.name}</b>
            </span>
          , { duration: 4000 });

          setTimeout(() => {
            const el = document.getElementById(`event-card-${shareEventId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-4", "ring-accent-blue", "ring-offset-2");
              setTimeout(() => {
                el.classList.remove("ring-4", "ring-accent-blue", "ring-offset-2");
              }, 3000);
            }
          }, 800);

          if (target.event_type === "individual") {
            handleIndividualParticipate(target);
          } else {
            openTeamModal(target);
          }
        } else {
          toast.success(`You are already registered for ${target.title || target.name}!`, { icon: <CheckCircle className="h-5 w-5 text-accent-green" /> });
          setActiveTab("my-events");
        }
      }
    }
  }, [events, shareEventId, myRegistrations, handleIndividualParticipate, openTeamModal]);

  const fetchEventTeams = useCallback(async (event) => {
    const eventId = event._id || event.event_id;
    try {
      setLoadingTeams(true);
      const grpId = user?.groupId || user?.group_id || user?.membership?.group_id;
      const queryParams = grpId ? `&group_id=${grpId}` : "";
      const resp = await apiCall(`/api/team?event_id=${eventId}${queryParams}`);
      if (resp.success) {
        setEventTeams(resp.data || []);
      }
    } catch (err) {
      console.error("Failed to load existing teams", err);
    } finally {
      setLoadingTeams(false);
    }
  }, [user, apiCall]);

  const handleIndividualParticipate = useCallback(async (event) => {
    const eventId = event._id || event.event_id;
    const loadingToast = toast.loading(`Registering you for ${event.title || event.name}...`);
    try {
      const resp = await apiCall("/api/team/participate", {
        method: "POST",
        body: { event_id: eventId }
      });
      if (resp.success) {
        toast.dismiss(loadingToast);
        toast.success(`Successfully registered for ${event.title || event.name}!`, { icon: <Trophy className="h-5 w-5 text-accent-amber" /> });
        fetchData();
      } else {
        throw new Error(resp.error || "Failed to participate");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Registration failed");
    }
  }, [apiCall, fetchData]);

  const openTeamModal = useCallback((event) => {
    setSelectedEvent(event);
    setModalTab("create");
    setTeamName("");
    setSelectedMemberIds([]);
    setTeamSearch("");
    setInviteEmails("");
    fetchEventTeams(event);
  }, [fetchEventTeams]);

  const closeTeamModal = () => {
    setSelectedEvent(null);
    setTeamName("");
    setSelectedMemberIds([]);
    setEventTeams([]);
    setInviteEmails("");
  };

  const toggleMemberSelection = (id) => {
    const maxTeammates = (selectedEvent?.max_team_size || 2) - 1;
    setSelectedMemberIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(m => m !== id);
      }
      if (prev.length >= maxTeammates) {
        toast.error(`Maximum team size for this event is ${selectedEvent.max_team_size}`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (!teamName.trim()) {
      toast.error("Please provide a team name");
      return;
    }

    setSubmittingTeam(true);
    const eventId = selectedEvent._id || selectedEvent.event_id;
    try {
      const resp = await apiCall("/api/team/participate", {
        method: "POST",
        body: {
          event_id: eventId,
          name: teamName.trim(),
          member_ids: selectedMemberIds
        }
      });

      if (resp.success) {
        toast.success(`Team "${teamName}" registered successfully for ${selectedEvent.title || selectedEvent.name}!`, { icon: <PartyPopper className="h-5 w-5 text-accent-green" /> });
        closeTeamModal();
        fetchData();
      } else {
        throw new Error(resp.error || "Registration failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit team registration");
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleInviteTeammates = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    const emails = inviteEmails.split(",").map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email format: ${invalidEmails.join(", ")}`);
      return;
    }

    setInviting(true);
    try {
      const eventId = selectedEvent._id || selectedEvent.event_id;
      const resp = await apiCall("/api/team/invite", {
        method: "POST",
        body: { event_id: eventId, emails }
      });

      if (resp.success) {
        toast.success(`Invitations sent to ${emails.length} teammate(s)!`);
        setInviteEmails("");
        fetchEventTeams(selectedEvent);
      } else {
        throw new Error(resp.error || "Failed to send invitations");
      }
    } catch (err) {
      toast.error(err.message || "Failed to send invitations");
    } finally {
      setInviting(false);
    }
  };

  const handleWithdraw = async (teamId, eventName) => {
    if (!window.confirm(`Are you sure you want to withdraw from "${eventName}"? This action cannot be undone.`)) return;
    setWithdrawingId(teamId);
    try {
      const resp = await apiCall(`/api/team/${teamId}/withdraw`, {
        method: "POST"
      });
      if (resp.success) {
        toast.success(`Successfully withdrew from ${eventName}`);
        fetchData();
      } else {
        throw new Error(resp.error || "Failed to withdraw");
      }
    } catch (err) {
      toast.error(err.message || "Failed to withdraw");
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleJoinTeam = async (teamId, nameOfTeam) => {
    const loadingToast = toast.loading(`Joining team "${nameOfTeam}"...`);
    try {
      const resp = await apiCall(`/api/team/${teamId}/join`, {
        method: "POST"
      });
      if (resp.success) {
        toast.dismiss(loadingToast);
        toast.success(`Successfully joined team "${nameOfTeam}"!`, { icon: <PartyPopper className="h-5 w-5 text-accent-green" /> });
        closeTeamModal();
        fetchData();
      } else {
        throw new Error(resp.error || "Failed to join team");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to join team");
    }
  };

  const filteredTeammates = useMemo(() => {
    const q = teamSearch.toLowerCase().trim();
    if (!q) return groupMembers;
    return groupMembers.filter(
      m => m.name.toLowerCase().includes(q) ||
           m.unique_id.toLowerCase().includes(q) ||
           m.class?.toLowerCase().includes(q)
    );
  }, [groupMembers, teamSearch]);

  const isUserRegistered = (eventId) => {
    return myRegistrations.some(
      reg => (reg.event_id?._id || reg.event_id) === eventId
    );
  };

  const isCapacityReached = useMemo(() => {
    if (!selectedEvent) return false;
    return selectedEvent.max_per_group && eventTeams.length >= selectedEvent.max_per_group;
  }, [selectedEvent, eventTeams]);

  // Check if event has reached max per group capacity (for individual events too)
  const getGroupRegistrationCount = (event) => {
    if (!event.max_per_group) return 0;
    const eventId = event._id || event.event_id;
    const team = myRegistrations.find(r => (r.event_id?._id || r.event_id) === eventId);
    // For individual events, each registration counts as 1
    if (event.event_type === "individual") {
      return team ? 1 : 0;
    }
    // For team events, count teams from this group
    return eventTeams.length;
  };

  const isEventFullForGroup = (event) => {
    if (!event.max_per_group) return false;
    const count = getGroupRegistrationCount(event);
    return count >= event.max_per_group;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available">Available Events</TabsTrigger>
          <TabsTrigger value="my-events">
            My Participations
            {myRegistrations.length > 0 && (
              <Badge variant="secondary" className="ml-2">{myRegistrations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Loading entries...</p>
            </div>
          ) : events.length === 0 ? (
            <Card className="text-center py-20">
              <CardContent>
                <Trophy className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-muted-foreground">No events scheduled yet.</CardTitle>
                <CardDescription className="mt-1">Please coordinate with administrators for announcements.</CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((e) => {
                const id = e._id || e.event_id;
                const registered = isUserRegistered(id);
                return (
                  <Card
                    key={id}
                    id={`event-card-${id}`}
                    className={`relative overflow-hidden transition-all duration-300 ${
                      registered
                        ? "border-accent-green bg-accent-green/5"
                        : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-black uppercase tracking-widest">
                            {e.category || "General"}
                          </Badge>
                          <EventStatusBadge status={e.status} size="sm" />
                        </div>

                        <div className="flex items-center gap-2">
                          {e.registration_mode && (
                            <Badge variant="outline" className={
                              e.registration_mode === "captain"
                                ? "bg-accent-amber/10 text-accent-amber border-accent-amber/30"
                                : e.registration_mode === "participant"
                                ? "bg-accent-blue/10 text-accent-blue border-accent-blue/30"
                                : "bg-accent-purple/10 text-accent-purple border-accent-purple/30"
                            }>
                              {e.registration_mode === "captain" ? "Captain" : e.registration_mode === "participant" ? "Self" : "Open"}
                            </Badge>
                          )}
                          {registered && (
                            <Badge variant="outline" className="bg-accent-green/10 text-accent-green border-accent-green/30">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Registered
                            </Badge>
                          )}
                          {e.max_per_group && !registered && isEventFullForGroup(e) && (
                            <Badge variant="destructive" className="text-xs font-black uppercase tracking-wider">
                              <Lock className="h-3 w-3 mr-1" /> Full
                            </Badge>
                          )}
                          {e.max_per_group && !registered && !isEventFullForGroup(e) && (
                            <Badge variant="outline" className="bg-accent-blue/10 text-accent-blue border-accent-blue/30 text-xs font-black">
                              <Users className="h-3 w-3 mr-1" /> {getGroupRegistrationCount(e)}/{e.max_per_group}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-xl mt-4 leading-snug">
                        {e.title || e.name}
                      </CardTitle>

                      <CardDescription className="line-clamp-3 min-h-[60px] leading-relaxed">
                        {e.description || "No description provided."}
                      </CardDescription>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {e.duration && (
                          <Badge variant="outline" className="bg-accent-purple/10 text-accent-purple border-accent-purple/30">
                            <Clock className="h-3 w-3 mr-1" /> {e.duration}
                          </Badge>
                        )}
                        {e.gender_filter && e.gender_filter !== "all" && (
                          <Badge variant="outline" className="bg-accent-teal/10 text-accent-teal border-accent-teal/30">
                            <User className="h-3 w-3 mr-1" /> {e.gender_filter === "male" ? "Boys Only" : "Girls Only"}
                          </Badge>
                        )}
                        {e.subcategory && (
                          <Badge variant="outline" className="bg-accent-amber/10 text-accent-amber border-accent-amber/30">
                            {e.subcategory}
                          </Badge>
                        )}
                        {e.age_group?.min != null && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            Age: {e.age_group.min}{e.age_group.max ? `-${e.age_group.max}` : "+"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      {(e.rules || e.eligibility || e.instructions || e.requirements?.length > 0) && (
                        <Collapsible className="mb-3">
                          <CollapsibleTrigger className="text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground">
                            Show event details
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3 space-y-3 text-xs text-muted-foreground">
                            {e.rules && (
                              <div>
                                <span className="font-black text-foreground uppercase tracking-wider">Rules</span>
                                <p className="mt-1 whitespace-pre-wrap">{e.rules}</p>
                              </div>
                            )}
                            {e.eligibility && (
                              <div>
                                <span className="font-black text-foreground uppercase tracking-wider">Eligibility</span>
                                <p className="mt-1 whitespace-pre-wrap">{e.eligibility}</p>
                              </div>
                            )}
                            {e.instructions && (
                              <div>
                                <span className="font-black text-foreground uppercase tracking-wider">Instructions</span>
                                <p className="mt-1 whitespace-pre-wrap">{e.instructions}</p>
                              </div>
                            )}
                            {e.requirements?.length > 0 && (
                              <div>
                                <span className="font-black text-foreground uppercase tracking-wider">Requirements</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {e.requirements.map((req, idx) => (
                                    <Badge key={idx} variant="secondary">{req}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold">{e.event_type === "individual" ? "Individual" : `Team: ${e.min_participants ?? e.min_team_size}-${e.max_participants ?? e.max_team_size}`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-accent-blue/10 text-accent-blue border-accent-blue/30">
                            {e.mode}
                          </Badge>
                        </div>
                      </div>

                      {e.schedule && (
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {e.schedule.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>{new Date(e.schedule.date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {e.schedule.venue && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{e.schedule.venue}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-6">
                        {registered ? (
                          <Button
                            disabled
                            variant="outline"
                            className="w-full bg-accent-green/10 text-accent-green border-accent-green/30 cursor-default"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" /> Selected
                          </Button>
                        ) : isEventFullForGroup(e) ? (
                          <Button
                            disabled
                            variant="outline"
                            className="w-full bg-destructive/10 text-destructive border-destructive/30 cursor-not-allowed"
                          >
                            <Lock className="h-4 w-4 mr-2" /> Group Limit Reached
                          </Button>
                        ) : e.event_type === "individual" ? (
                          <Button onClick={() => handleIndividualParticipate(e)} className="w-full">
                            Participate Instantly
                          </Button>
                        ) : (
                          <Button
                            onClick={() => openTeamModal(e)}
                            variant="outline"
                            className="w-full"
                          >
                            <UserPlus className="h-4 w-4 mr-1" /> Form & Register Team
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-events">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Loading entries...</p>
            </div>
          ) : myRegistrations.length === 0 ? (
            <Card className="text-center py-20 border border-dashed">
              <CardContent>
                <Users className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-muted-foreground">You have no registrations recorded.</CardTitle>
                <CardDescription className="mt-1">Browse available events to participate.</CardDescription>
                <Button onClick={() => setActiveTab("available")} className="mt-6">
                  Browse Available Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myRegistrations.map((reg) => {
                const teamId = reg._id;
                const evt = reg.event_id || {};
                return (
                  <Card key={teamId} className="relative overflow-hidden transition-all duration-300">
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <Badge variant="outline" className="bg-accent-green/10 text-accent-green border-accent-green/30 uppercase tracking-widest">
                            Confirmed Entry
                          </Badge>
                          <CardTitle className="text-xl mt-3">
                            {evt.title || evt.name || "Unnamed Event"}
                          </CardTitle>
                          {reg.name && (
                            <CardDescription className="mt-1">
                              Team: <span className="text-accent-blue">{reg.name}</span>
                            </CardDescription>
                          )}
                        </div>

                        {(reg.chest_no || reg.chest_number) && (
                          <div className="px-4 py-2 rounded-lg font-mono font-black text-center bg-muted text-card-foreground">
                            <div className="text-[8px] uppercase tracking-widest text-muted-foreground">Chest No</div>
                            <div className="text-base">{reg.chest_no || reg.chest_number}</div>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground p-4 rounded-lg border bg-muted">
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-wider mb-0.5 text-muted-foreground">Type</span>
                          <span className="font-bold capitalize text-card-foreground">{evt.event_type}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-wider mb-0.5 text-muted-foreground">Mode</span>
                          <span className="font-bold capitalize text-card-foreground">{evt.mode}</span>
                        </div>
                      </div>

                      {evt.event_type === "team" && reg.members && reg.members.length > 0 && (
                        <div className="mt-5">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2.5">Teammates (Current Squad)</h4>
                          <div className="flex flex-wrap gap-2">
                            {reg.members.map((m) => {
                              const isSelf = m._id === user.id || m._id === user._id;
                              return (
                                <Badge
                                  key={m._id}
                                  variant={isSelf ? "outline" : "secondary"}
                                  className={isSelf ? "bg-accent-blue/10 text-accent-blue border-accent-blue/30 font-extrabold" : ""}
                                >
                                  <User className="h-3 w-3 mr-1 shrink-0" />
                                  {m.name} {isSelf && "(You)"}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-border">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleWithdraw(teamId, evt.title || evt.name || "this event")}
                          disabled={withdrawingId === teamId}
                          className="w-full gap-2"
                        >
                          {withdrawingId === teamId ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Withdrawing...
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4" />
                              Withdraw from Event
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) closeTeamModal(); }}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <Badge variant="outline" className="bg-accent-blue/10 text-accent-blue border-accent-blue/30 mb-1 w-fit">
              Team Management
            </Badge>
            <DialogTitle className="text-xl">
              {selectedEvent?.title || selectedEvent?.name}
            </DialogTitle>
            <DialogDescription className="mt-1">
              Obeying limits: squad requires <span className="font-bold text-foreground">{selectedEvent?.min_team_size} to {selectedEvent?.max_team_size} members</span>.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="create">Create a New Team</TabsTrigger>
              <TabsTrigger value="join">Join Existing Team ({eventTeams.length})</TabsTrigger>
              <TabsTrigger value="invite">Invite Teammates</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto min-h-0">
              <TabsContent value="create" className="space-y-4 mt-4">
                {isCapacityReached ? (
                  <div className="p-4 bg-accent-amber/10 border border-accent-amber/20 text-accent-amber rounded-lg space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertCircle className="h-5 w-5 shrink-0 text-accent-amber" />
                      {groupLabel} Capacity Limit Reached
                    </div>
                    <p>
                      Your {groupLabel.toLowerCase()} has already registered the maximum allowed teams ({selectedEvent?.max_per_group}) for this event. You cannot create a new team, but you can still join an existing team!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleTeamSubmit} className="space-y-4">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unique Team Name</Label>
                      <Input
                        type="text"
                        required
                        placeholder="e.g. Valkyries"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="mt-1.5"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Must be unique across all houses/groups for this event.</p>
                    </div>

                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Select Teammates ({groupLabelPlural})
                      </Label>

                      <div className="relative mb-3 mt-1.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder={`Search members in your ${groupLabel}...`}
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      <div className="border rounded-lg overflow-hidden max-h-[220px] overflow-y-auto divide-y">
                        {filteredTeammates.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground text-xs font-semibold">
                            No matching members found in your {groupLabel}.
                          </div>
                        ) : (
                          filteredTeammates.map((m) => {
                            const isSelected = selectedMemberIds.includes(m._id);
                            return (
                              <div
                                key={m._id}
                                onClick={() => toggleMemberSelection(m._id)}
                                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-accent-blue/10"
                                    : "hover:bg-accent-blue/5"
                                }`}
                              >
                                <div>
                                  <div className="text-xs font-black text-card-foreground">{m.name}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    ID: <span className="font-semibold">{m.unique_id}</span> • Class: <span className="font-semibold">{m.class || "N/A"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleMemberSelection(m._id)}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 border rounded-lg space-y-2 text-xs text-muted-foreground bg-muted">
                      <div className="font-bold text-foreground">Registration Guidelines:</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-4 w-4 ${selectedMemberIds.length + 1 >= selectedEvent?.min_team_size ? "text-accent-green" : "text-muted-foreground"}`} />
                        <span>Meets Minimum team size: {selectedEvent?.min_team_size} members (You included).</span>
                      </div>
                      {selectedMemberIds.length + 1 < selectedEvent?.min_team_size && (
                        <div className="text-accent-amber font-semibold pl-6 flex items-center gap-1">
                          <Info className="h-3 w-3 shrink-0" />
                          Note: We permit initiating a team with fewer members so others can join later!
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-accent-green" />
                        <span>Limit within maximum size: {selectedEvent?.max_team_size} members.</span>
                      </div>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="join" className="space-y-4 mt-4">
                {loadingTeams ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Loading house teams...</p>
                  </div>
                ) : eventTeams.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-lg bg-muted">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground font-semibold text-sm">No ongoing teams found.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Be the first to assemble a squad from your {groupLabel.toLowerCase()}!</p>
                    <Button onClick={() => setModalTab("create")} className="mt-4">
                      Create a Team
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Select an established squad from your {groupLabel.toLowerCase()} to join:</p>
                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
                      {eventTeams.map((team) => {
                        const membersCount = team.members ? team.members.length : 0;
                        const slotsLeft = selectedEvent?.max_team_size - membersCount;
                        const isFull = slotsLeft <= 0;

                        return (
                          <div
                            key={team._id}
                            className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-muted"
                          >
                            <div className="space-y-1">
                              <div className="font-extrabold text-sm text-card-foreground flex items-center gap-1.5">
                                {team.name || "Unnamed Team"}
                                {isFull && (
                                  <Badge variant="destructive" className="text-[10px]">Full</Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-bold">
                                Members ({membersCount} / {selectedEvent?.max_team_size}):
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {team.members && team.members.map(m => (
                                  <Badge key={m._id} variant="secondary" className="text-[10px]">{m.name}</Badge>
                                ))}
                              </div>
                            </div>

                            <Button
                              variant={isFull ? "outline" : "default"}
                              disabled={isFull}
                              onClick={() => handleJoinTeam(team._id, team.name)}
                              className={isFull ? "cursor-not-allowed" : ""}
                            >
                              Join Team
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="invite" className="space-y-4 mt-4">
                <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-accent-blue shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold text-card-foreground mb-1">Invite Teammates by Email</p>
                      <p>Enter email addresses of participants you'd like to invite to join your team. They'll receive an invitation link to register and join your team for this event.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleInviteTeammates} className="space-y-4">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Teammate Email Addresses <span className="text-red-400">*</span>
                    </Label>
                    <textarea
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="teammate1@example.com, teammate2@example.com, teammate3@example.com"
                      className="mt-1.5 w-full min-h-[100px] p-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-accent-blue"
                      rows={4}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Separate multiple emails with commas. Invited users must have accounts in this competition.</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={inviting || !inviteEmails.trim()}
                    className="w-full"
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending Invitations...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invitations
                      </>
                    )}
                  </Button>
                </form>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">Note:</span> Invitations are sent via email. Recipients must already have participant accounts in this competition. If they don't have accounts, ask them to sign up first or have your {groupLabel.toLowerCase()} captain add them.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="border-t pt-4 mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 -mx-6 -mb-6 px-6 pb-6 bg-muted rounded-b-lg">
            {modalTab === "create" ? (
              <>
                <div className="text-xs text-muted-foreground font-semibold">
                  Squad Size: <span className="font-bold text-card-foreground">{selectedMemberIds.length + 1}</span> of <span className="font-bold">{selectedEvent?.min_team_size}-{selectedEvent?.max_team_size}</span> (You included)
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button variant="outline" onClick={closeTeamModal}>
                    Cancel
                  </Button>
                  {!isCapacityReached && (
                    <Button
                      disabled={submittingTeam || !teamName.trim()}
                      onClick={handleTeamSubmit}
                    >
                      {submittingTeam ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        "Create Team"
                      )}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex justify-end w-full">
                <Button variant="outline" onClick={closeTeamModal}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
