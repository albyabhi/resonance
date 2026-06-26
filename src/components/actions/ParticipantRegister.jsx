import React, { useEffect, useState, useMemo } from "react";
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
  UserPlus
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ParticipantRegister() {
  const { token, user, competition } = useAuth();
  const { groupLabel, groupLabelPlural } = useCompetition();
  const { lastUpdate } = useRealtime() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("available"); // "available" | "my-events"

  // Data stores
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  
  // Modals & search
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalTab, setModalTab] = useState("create"); // "create" | "join"
  const [teamName, setTeamName] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [submittingTeam, setSubmittingTeam] = useState(false);
  
  // Existing teams for the selected event & group (to allow joining)
  const [eventTeams, setEventTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Parse direct share eventId
  const queryParams = new URLSearchParams(window.location.search);
  const shareEventId = queryParams.get("eventId");

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No authorization token found");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  // Bootstrap data
  const fetchData = async () => {
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

      // Load group members for team assembly
      const grpId = user?.groupId || user?.group_id || user?.membership?.group_id;
      if (grpId) {
        const membersResp = await apiCall(`/api/participants?group_id=${grpId}`);
        // Filter out logged-in participant
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
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token, lastUpdate]);

  // Handle auto-focus / auto-participate if redirected with eventId
  useEffect(() => {
    if (events.length > 0 && shareEventId) {
      const target = events.find(e => (e._id || e.event_id) === shareEventId);
      if (target) {
        const alreadyReg = myRegistrations.some(r => (r.event_id?._id || r.event_id) === shareEventId);
        if (!alreadyReg) {
          toast((t) => (
            <span className="flex items-center gap-2 font-medium">
              <Info className="h-5 w-5 text-indigo-500 shrink-0" />
              You were redirected to register for: <b>{target.name}</b>
            </span>
          ), { duration: 4000 });
          
          setTimeout(() => {
            const el = document.getElementById(`event-card-${shareEventId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-4", "ring-indigo-500", "ring-offset-2");
              setTimeout(() => {
                el.classList.remove("ring-4", "ring-indigo-500", "ring-offset-2");
              }, 3000);
            }
          }, 800);

          if (target.event_type === "individual") {
            handleIndividualParticipate(target);
          } else {
            openTeamModal(target);
          }
        } else {
          toast.success(`You are already registered for ${target.name}!`, { icon: "🎉" });
          setActiveTab("my-events");
        }
      }
    }
  }, [events, shareEventId, myRegistrations]);

  // Fetch teams created in user's group for this event
  const fetchEventTeams = async (event) => {
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
  };

  // Individual registration (Instant click)
  const handleIndividualParticipate = async (event) => {
    const eventId = event._id || event.event_id;
    const loadingToast = toast.loading(`Registering you for ${event.name}...`);
    try {
      const resp = await apiCall("/api/team/participate", {
        method: "POST",
        body: { event_id: eventId }
      });
      if (resp.success) {
        toast.dismiss(loadingToast);
        toast.success(`Successfully registered for ${event.name}!`, { icon: "🏆" });
        fetchData();
      } else {
        throw new Error(resp.error || "Failed to participate");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Registration failed");
    }
  };

  // Team registration flow
  const openTeamModal = (event) => {
    setSelectedEvent(event);
    setModalTab("create");
    setTeamName("");
    setSelectedMemberIds([]);
    setTeamSearch("");
    fetchEventTeams(event);
  };

  const closeTeamModal = () => {
    setSelectedEvent(null);
    setTeamName("");
    setSelectedMemberIds([]);
    setEventTeams([]);
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
        toast.success(`Team "${teamName}" registered successfully for ${selectedEvent.name}!`, { icon: "🎉" });
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

  const handleJoinTeam = async (teamId, nameOfTeam) => {
    const loadingToast = toast.loading(`Joining team "${nameOfTeam}"...`);
    try {
      const resp = await apiCall(`/api/team/${teamId}/join`, {
        method: "POST"
      });
      if (resp.success) {
        toast.dismiss(loadingToast);
        toast.success(`Successfully joined team "${nameOfTeam}"!`, { icon: "🎉" });
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

  // Filter group members by search text
  const filteredTeammates = useMemo(() => {
    const q = teamSearch.toLowerCase().trim();
    if (!q) return groupMembers;
    return groupMembers.filter(
      m => m.name.toLowerCase().includes(q) || 
           m.unique_id.toLowerCase().includes(q) || 
           m.class?.toLowerCase().includes(q)
    );
  }, [groupMembers, teamSearch]);

  // Check if participant is already registered for an event
  const isUserRegistered = (eventId) => {
    return myRegistrations.some(
      reg => (reg.event_id?._id || reg.event_id) === eventId
    );
  };

  // Active group limit capacity validation
  const isCapacityReached = useMemo(() => {
    if (!selectedEvent) return false;
    return selectedEvent.max_per_group && eventTeams.length >= selectedEvent.max_per_group;
  }, [selectedEvent, eventTeams]);

  // Accent styling based on competition type / group label
  const customAccentColor = useMemo(() => {
    const type = competition?.type?.toLowerCase();
    if (type === "school_houses") return "from-amber-500 via-rose-500 to-indigo-600";
    if (type === "sports_meet") return "from-emerald-500 via-teal-500 to-blue-600";
    if (type === "college_departments") return "from-purple-500 via-indigo-500 to-blue-600";
    return "from-indigo-500 via-purple-500 to-pink-500";
  }, [competition]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      


      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          className={`pb-4 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "available"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
          onClick={() => setActiveTab("available")}
        >
          Available Events
        </button>
        <button
          className={`pb-4 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "my-events"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
          onClick={() => setActiveTab("my-events")}
        >
          My Participations
          {myRegistrations.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-black">
              {myRegistrations.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">Loading entries...</p>
        </div>
      ) : activeTab === "available" ? (
        events.length === 0 ? (
          <div className="text-center py-20 border rounded-3xl shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
            <Trophy className="h-14 w-14 text-neutral-300 dark:text-neutral-850 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 font-semibold text-lg">No events scheduled yet.</p>
            <p className="text-xs text-neutral-400 mt-1">Please coordinate with administrators for announcements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const id = e._id || e.event_id;
              const registered = isUserRegistered(id);
              return (
                <div 
                  key={id}
                  id={`event-card-${id}`}
                  className={`group border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    registered 
                      ? "border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5 shadow-emerald-500/5 shadow-lg" 
                      : "border-neutral-200 dark:border-neutral-850 hover:border-neutral-300 dark:hover:border-neutral-750"
                  }`}
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 border dark:border-neutral-800">
                      {e.category || "General"}
                    </span>
                    
                    {registered && (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-black bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 rounded-xl">
                        <CheckCircle className="h-4 w-4" />
                        Registered
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-xl text-neutral-900 dark:text-white mt-4 leading-snug group-hover:text-blue-500 transition-colors">
                    {e.name}
                  </h3>

                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2.5 line-clamp-3 min-h-[60px] leading-relaxed">
                    {e.description || "No description provided."}
                  </p>

                  {/* Event Metadata Badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {e.duration && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border dark:border-purple-900/20">
                        <Clock className="h-3 w-3" /> {e.duration}
                      </span>
                    )}
                    {e.gender_filter && e.gender_filter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border dark:border-cyan-900/20">
                        <User className="h-3 w-3" /> {e.gender_filter === "male" ? "Boys Only" : "Girls Only"}
                      </span>
                    )}
                    {e.subcategory && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border dark:border-amber-900/20">
                        {e.subcategory}
                      </span>
                    )}
                    {e.age_group?.min != null && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border dark:border-rose-900/20">
                        Age: {e.age_group.min}{e.age_group.max ? `-${e.age_group.max}` : "+"}
                      </span>
                    )}
                  </div>

                  {/* Rules / Eligibility / Instructions (conditionally shown) */}
                  {(e.rules || e.eligibility || e.instructions || e.requirements?.length > 0) && (
                    <details className="mt-3 group">
                      <summary className="text-xs font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300">
                        Show event details
                      </summary>
                      <div className="mt-3 space-y-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {e.rules && (
                          <div>
                            <span className="font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Rules</span>
                            <p className="mt-1 whitespace-pre-wrap">{e.rules}</p>
                          </div>
                        )}
                        {e.eligibility && (
                          <div>
                            <span className="font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Eligibility</span>
                            <p className="mt-1 whitespace-pre-wrap">{e.eligibility}</p>
                          </div>
                        )}
                        {e.instructions && (
                          <div>
                            <span className="font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Instructions</span>
                            <p className="mt-1 whitespace-pre-wrap">{e.instructions}</p>
                          </div>
                        )}
                        {e.requirements?.length > 0 && (
                          <div>
                            <span className="font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Requirements</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {e.requirements.map((req, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                                  {req}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-850 text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-2">
                      <Users className="h-4.5 w-4.5 text-neutral-400 shrink-0" />
                      <span className="font-semibold">{e.event_type === "individual" ? "Individual" : `Team: ${e.min_participants ?? e.min_team_size}-${e.max_participants ?? e.max_team_size}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-black uppercase text-[10px] tracking-wider border dark:border-blue-900/20">
                        {e.mode}
                      </span>
                    </div>
                  </div>

                  {/* Date & Location Context */}
                  {e.schedule && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
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
                      <button
                        disabled
                        className="w-full py-3 bg-emerald-100/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-extrabold rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-200/50 dark:border-emerald-900/20 cursor-default"
                      >
                        <CheckCircle className="h-4.5 w-4.5" /> Selected
                      </button>
                    ) : e.event_type === "individual" ? (
                      <button
                        onClick={() => handleIndividualParticipate(e)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/10 hover:shadow-lg active:scale-98"
                      >
                        Participate Instantly
                      </button>
                    ) : (
                      <button
                        onClick={() => openTeamModal(e)}
                        className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all border dark:border-neutral-750 flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="h-4 w-4" /> Form & Register Team
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        myRegistrations.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-3xl" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)' }}>
            <Users className="h-14 w-14 text-neutral-300 dark:text-neutral-850 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 font-semibold text-lg">You have no registrations recorded.</p>
            <p className="text-xs text-neutral-400 mt-1">Browse available events to participate.</p>
            <button 
              onClick={() => setActiveTab("available")}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/20"
            >
              Browse Available Events
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myRegistrations.map((reg) => {
              const teamId = reg._id;
              const evt = reg.event_id || {};
              return (
                <div 
                  key={teamId}
                  className="border rounded-3xl p-6 shadow-sm relative overflow-hidden group transition-all duration-300"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                        Confirmed Entry
                      </span>
                      <h3 className="font-extrabold text-xl text-neutral-900 dark:text-white mt-3">
                        {evt.name || "Unnamed Event"}
                      </h3>
                      {reg.name && (
                        <div className="text-xs font-bold text-neutral-500 mt-1">
                          Team: <span className="text-blue-500">{reg.name}</span>
                        </div>
                      )}
                    </div>
                    
                    {reg.chest_number && (
                      <div className="px-4 py-2 rounded-2xl font-mono font-black text-center shadow-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--card-fg)' }}>
                        <div className="text-[8px] uppercase tracking-widest opacity-60">Chest No</div>
                        <div className="text-base">{reg.chest_number}</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5 text-xs text-neutral-500 dark:text-neutral-400 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                    <div>
                      <span className="block opacity-65 text-[10px] font-black uppercase tracking-wider mb-0.5">Type</span>
                      <span className="font-bold capitalize text-neutral-800 dark:text-neutral-200">{evt.event_type}</span>
                    </div>
                    <div>
                      <span className="block opacity-65 text-[10px] font-black uppercase tracking-wider mb-0.5">Mode</span>
                      <span className="font-bold capitalize text-neutral-800 dark:text-neutral-200">{evt.mode}</span>
                    </div>
                  </div>

                  {evt.event_type === "team" && reg.members && reg.members.length > 0 && (
                    <div className="mt-5">
                      <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2.5">Teammates (Current Squad)</h4>
                      <div className="flex flex-wrap gap-2">
                        {reg.members.map((m) => {
                          const isSelf = m._id === user.id || m._id === user._id;
                          return (
                            <span 
                              key={m._id}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs ${
                                isSelf 
                                  ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-400 font-extrabold"
                                  : "text-neutral-600 dark:text-neutral-300"
                              }`}
                              style={!isSelf ? { backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' } : {}}
                            >
                              <User className="h-3 w-3 shrink-0" />
                              {m.name} {isSelf && "(You)"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Dual Mode Team Registration Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xl rounded-3xl overflow-hidden border shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
            
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--border-divider)' }}>
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 mb-1 border dark:border-blue-800">
                  Team Management
                </span>
                <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  {selectedEvent.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Obeying limits: squad requires <span className="font-bold text-neutral-700 dark:text-neutral-300">{selectedEvent.min_team_size} to {selectedEvent.max_team_size} members</span>.
                </p>
              </div>
              <button 
                onClick={closeTeamModal}
                className="h-10 w-10 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-750 flex items-center justify-center transition-all text-neutral-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs: Create or Join */}
            <div className="flex border-b px-6" style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--border-divider)' }}>
              <button
                type="button"
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                  modalTab === "create"
                    ? "border-blue-600 text-blue-600 dark:border-blue-400"
                    : "border-transparent text-neutral-450 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
                onClick={() => setModalTab("create")}
              >
                Create a New Team
              </button>
              <button
                type="button"
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                  modalTab === "join"
                    ? "border-blue-600 text-blue-600 dark:border-blue-400"
                    : "border-transparent text-neutral-450 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
                onClick={() => setModalTab("join")}
              >
                Join an Existing Team ({eventTeams.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {modalTab === "create" ? (
                <>
                  {isCapacityReached ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                        {groupLabel} Capacity Limit Reached
                      </div>
                      <p>
                        Your {groupLabel.toLowerCase()} has already registered the maximum allowed teams ({selectedEvent.max_per_group}) for this event. You cannot create a new team, but you can still join an existing team!
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleTeamSubmit} className="space-y-4">
                      
                      {/* Team Name Input */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">Unique Team Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Valkyries"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold transition-all"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                        />
                        <p className="text-[10px] text-neutral-500 mt-1">Must be unique across all houses/groups for this event.</p>
                      </div>

                      {/* Search and Select Teammates */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">
                          Select Teammates ({groupLabelPlural})
                        </label>
                        
                        <div className="relative mb-3">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 pointer-events-none">
                            <Search className="h-4 w-4" />
                          </span>
                          <input 
                            type="text"
                            placeholder={`Search members in your ${groupLabel}...`}
                            value={teamSearch}
                            onChange={(e) => setTeamSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                          />
                        </div>

                        {/* Teammates List */}
                        <div className="border rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto divide-y" style={{ borderColor: 'var(--border-divider)' }}>
                          {filteredTeammates.length === 0 ? (
                            <div className="p-6 text-center text-neutral-400 text-xs font-semibold">
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
                                      ? "bg-blue-500/5 dark:bg-blue-500/10" 
                                      : "hover:bg-indigo-500/5"
                                  }`}
                                  style={!isSelected ? { backgroundColor: 'var(--card)' } : {}}
                                >
                                  <div>
                                    <div className="text-xs font-black text-neutral-800 dark:text-neutral-200">{m.name}</div>
                                    <div className="text-[10px] text-neutral-550 dark:text-neutral-400 mt-0.5">
                                      ID: <span className="font-semibold">{m.unique_id}</span> • Class: <span className="font-semibold">{m.class || "N/A"}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center">
                                    <input 
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}} // Controlled by row click
                                      className="h-4.5 w-4.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Rule checklist */}
                      <div className="p-3.5 border rounded-2xl space-y-1.5 text-xs text-neutral-500" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                        <div className="font-bold text-neutral-700 dark:text-neutral-300">Registration Guidelines:</div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className={`h-4 w-4 ${selectedMemberIds.length + 1 >= selectedEvent.min_team_size ? "text-emerald-500" : "text-neutral-300"}`} />
                          <span>Meets Minimum team size: {selectedEvent.min_team_size} members (You included).</span>
                        </div>
                        {selectedMemberIds.length + 1 < selectedEvent.min_team_size && (
                          <div className="text-amber-500 font-semibold pl-5 flex items-center gap-1">
                            <Info className="h-3 w-3 shrink-0" />
                            Note: We permit initiating a team with fewer members so others can join later!
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span>Limit within maximum size: {selectedEvent.max_team_size} members.</span>
                        </div>
                      </div>

                    </form>
                  )}
                </>
              ) : (
                /* JOIN TEAM TAB */
                <div className="space-y-4">
                  {loadingTeams ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <div className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Loading house teams...</p>
                    </div>
                  ) : eventTeams.length === 0 ? (
                    <div className="text-center py-10 border border-dashed rounded-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                      <Users className="h-10 w-10 text-neutral-300 dark:text-neutral-800 mx-auto mb-2" />
                      <p className="text-neutral-500 dark:text-neutral-400 font-semibold text-sm">No ongoing teams found.</p>
                      <p className="text-[10px] text-neutral-400 mt-1">Be the first to assemble a squad from your {groupLabel.toLowerCase()}!</p>
                      <button
                        type="button"
                        onClick={() => setModalTab("create")}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                      >
                        Create a Team
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-neutral-450">Select an established squad from your {groupLabel.toLowerCase()} to join:</p>
                      <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
                        {eventTeams.map((team) => {
                          const membersCount = team.members ? team.members.length : 0;
                          const slotsLeft = selectedEvent.max_team_size - membersCount;
                          const isFull = slotsLeft <= 0;
                          
                          return (
                            <div 
                              key={team._id}
                              className="p-4 border rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}
                            >
                              <div className="space-y-1">
                                <div className="font-extrabold text-sm text-neutral-850 dark:text-neutral-100 flex items-center gap-1.5">
                                  {team.name || "Unnamed Team"}
                                  {isFull && (
                                    <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black uppercase">Full</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-500 font-bold">
                                  Members ({membersCount} / {selectedEvent.max_team_size}):
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {team.members && team.members.map(m => (
                                    <span key={m._id} className="text-[9px] px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400">
                                      {m.name}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={isFull}
                                onClick={() => handleJoinTeam(team._id, team.name)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                  isFull 
                                    ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed" 
                                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 active:scale-97"
                                }`}
                              >
                                Join Team
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4" style={{ backgroundColor: 'var(--surface)', borderTopColor: 'var(--border-divider)' }}>
              {modalTab === "create" ? (
                <>
                  <div className="text-xs text-neutral-500 font-semibold">
                    Squad Size: <span className="font-bold text-neutral-800 dark:text-neutral-200">{selectedMemberIds.length + 1}</span> of <span className="font-bold">{selectedEvent.min_team_size}-{selectedEvent.max_team_size}</span> (You included)
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={closeTeamModal}
                      className="flex-1 sm:flex-none px-5 py-2.5 border font-bold uppercase tracking-wider text-xs rounded-xl transition-all"
                      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                    >
                      Cancel
                    </button>
                    {!isCapacityReached && (
                      <button
                        type="button"
                        disabled={submittingTeam || !teamName.trim()}
                        onClick={handleTeamSubmit}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.1em] text-xs rounded-xl transition-all hover:shadow shadow-blue-500/25 disabled:opacity-50"
                      >
                        {submittingTeam ? "Creating..." : "Create Team"}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex justify-end w-full">
                  <button
                    type="button"
                    onClick={closeTeamModal}
                    className="px-5 py-2.5 border font-bold uppercase tracking-wider text-xs rounded-xl transition-all"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
