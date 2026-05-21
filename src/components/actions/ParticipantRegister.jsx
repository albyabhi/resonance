import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
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
  Sparkles
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ParticipantRegister() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("available"); // "available" | "my-events"

  // Data stores
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  
  // Modals & search
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [submittingTeam, setSubmittingTeam] = useState(false);

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
      
      const [eventsResp, regsResp] = await Promise.all([
        apiCall("/api/event"),
        apiCall("/api/team/my-registrations")
      ]);

      setEvents(eventsResp.events || []);
      setMyRegistrations(regsResp.data || []);

      // If user has a group context, let's load all other members in their group for team matching
      if (user?.groupId || user?.group_id || user?.membership?.group_id) {
        const grpId = user.groupId || user.group_id || user.membership?.group_id;
        const membersResp = await apiCall(`/api/participants?group_id=${grpId}`);
        // Filter out the logged-in participant from the select list since they are added automatically
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
  }, [token]);

  // Handle auto-focus / auto-participate if redirected with eventId
  useEffect(() => {
    if (events.length > 0 && shareEventId) {
      const target = events.find(e => (e._id || e.event_id) === shareEventId);
      if (target) {
        // If not already registered, prompt participation!
        const alreadyReg = myRegistrations.some(r => (r.event_id?._id || r.event_id) === shareEventId);
        if (!alreadyReg) {
          toast((t) => (
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
              You were redirected to register for: <b>{target.name}</b>
            </span>
          ), { duration: 4000 });
          
          // Auto-scroll to the item
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

          // If individual, auto-start; if team, open selection modal
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
        fetchData(); // Refresh lists
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
    setSelectedMemberIds([]);
    setTeamSearch("");
  };

  const closeTeamModal = () => {
    setSelectedEvent(null);
    setSelectedMemberIds([]);
  };

  const toggleMemberSelection = (id) => {
    const maxTeammates = (selectedEvent?.max_team_size || 2) - 1; // self is already included
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

    const minTeammates = (selectedEvent.min_team_size || 1) - 1; // self is included
    if (selectedMemberIds.length < minTeammates) {
      toast.error(`Please select at least ${minTeammates} teammates to satisfy minimum size of ${selectedEvent.min_team_size}`);
      return;
    }

    setSubmittingTeam(true);
    const eventId = selectedEvent._id || selectedEvent.event_id;
    try {
      const resp = await apiCall("/api/team/participate", {
        method: "POST",
        body: {
          event_id: eventId,
          member_ids: selectedMemberIds
        }
      });

      if (resp.success) {
        toast.success(`Team registered successfully for ${selectedEvent.name}!`, { icon: "🎉" });
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

  return (
    <div className="space-y-6">
      {/* Dashboard Section Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-2">
            <Trophy className="h-6 w-6 text-indigo-500" />
            Event Participation Portal
          </h2>
          <p className="text-sm theme-text-secondary mt-1">
            Register for available individual and team events, or review your current matches.
          </p>
        </div>
        
        {/* Quick details */}
        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/20 px-4 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center font-bold">
            {user?.name?.[0]?.toUpperCase() || "P"}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">Welcome back</div>
            <div className="text-sm font-bold">{user?.name} ({user?.unique_id})</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          className={`pb-4 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "available"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("available")}
        >
          Available Events
        </button>
        <button
          className={`pb-4 px-6 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "my-events"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("my-events")}
        >
          My Participations
          {myRegistrations.length > 0 && (
            <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full font-bold">
              {myRegistrations.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm theme-text-secondary">Loading participation lists...</p>
        </div>
      ) : activeTab === "available" ? (
        events.length === 0 ? (
          <div className="text-center py-16 theme-card rounded-2xl">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No events scheduled in this competition yet.</p>
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
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 ${
                    registered 
                      ? "border-emerald-200 dark:border-emerald-950 bg-emerald-50/10 dark:bg-emerald-950/5" 
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 capitalize">
                        {e.category || "General"}
                      </span>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mt-2 leading-snug">
                        {e.name}
                      </h3>
                    </div>
                    
                    {registered && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-2 py-1 rounded-lg">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Registered
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 min-h-[40px]">
                    {e.description || "No description provided."}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{e.event_type === "individual" ? "Individual" : `Team (${e.min_team_size}-${e.max_team_size})`}</span>
                    </div>
                    <div className="flex items-center gap-1.5 uppercase font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
                        {e.mode}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    {registered ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 border border-emerald-200/50 dark:border-emerald-900/20 cursor-default"
                      >
                        <CheckCircle className="h-4 w-4" /> Selected
                      </button>
                    ) : e.event_type === "individual" ? (
                      <button
                        onClick={() => handleIndividualParticipate(e)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm hover:shadow"
                      >
                        Participate Instantly
                      </button>
                    ) : (
                      <button
                        onClick={() => openTeamModal(e)}
                        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-400 font-semibold rounded-xl text-sm transition-all border border-indigo-100 dark:border-indigo-900/40"
                      >
                        Form Team & Register
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
          <div className="text-center py-16 theme-card rounded-2xl border border-dashed">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">You haven't registered for any events yet.</p>
            <button 
              onClick={() => setActiveTab("available")}
              className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Browse Events
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
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Confirmed Entry
                      </span>
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mt-2.5">
                        {evt.name || "Unknown Event"}
                      </h3>
                    </div>
                    
                    {reg.chest_number && (
                      <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 rounded-xl font-mono font-bold text-center shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest opacity-60">Chest</div>
                        <div className="text-sm">{reg.chest_number}</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl">
                    <div>
                      <span className="block opacity-65">Type</span>
                      <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{evt.event_type}</span>
                    </div>
                    <div>
                      <span className="block opacity-65">Mode</span>
                      <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{evt.mode}</span>
                    </div>
                  </div>

                  {evt.event_type === "team" && reg.members && reg.members.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team Teammates</h4>
                      <div className="flex flex-wrap gap-2">
                        {reg.members.map((m) => {
                          const isSelf = m._id === user.id || m._id === user._id;
                          return (
                            <span 
                              key={m._id}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border ${
                                isSelf 
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-400 font-semibold"
                                  : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                              }`}
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

      {/* Team Registration Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] w-full max-w-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Form Team for {selectedEvent.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select <span className="font-bold text-slate-700 dark:text-slate-300">{selectedEvent.min_team_size - 1} to {selectedEvent.max_team_size - 1}</span> partners from your group/house.
                </p>
              </div>
              <button 
                onClick={closeTeamModal}
                className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-all text-slate-500 dark:text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Search bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Search className="h-5 w-5" />
                </span>
                <input 
                  type="text"
                  placeholder="Search group members by name, ID, class..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                />
              </div>

              {/* Members selection list */}
              <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTeammates.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No matching members found in your house/group.
                  </div>
                ) : (
                  filteredTeammates.map((m) => {
                    const isSelected = selectedMemberIds.includes(m._id);
                    return (
                      <div 
                        key={m._id}
                        onClick={() => toggleMemberSelection(m._id)}
                        className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20" 
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            ID: <span className="font-semibold">{m.unique_id}</span> • Class: <span className="font-semibold">{m.class || "N/A"}</span>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlled by row click
                            className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Team Size: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedMemberIds.length + 1}</span> of <span className="font-bold">{selectedEvent.min_team_size}-{selectedEvent.max_team_size}</span> (You included)
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={closeTeamModal}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingTeam || (selectedMemberIds.length + 1 < selectedEvent.min_team_size)}
                  onClick={handleTeamSubmit}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all hover:shadow shadow-indigo-500/25 disabled:opacity-50"
                >
                  {submittingTeam ? "Submitting..." : "Submit Registration"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
