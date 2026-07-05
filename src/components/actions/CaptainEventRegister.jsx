import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { useMobileMode } from "../utils/useMobileMode";
import {
  Trophy, Users, User, CheckCircle, Plus, Search, X,
  Info, AlertCircle, UserPlus, Loader2,
} from "lucide-react";

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          { icon: "🎉" }
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
          <h2 className="text-2xl font-extrabold" style={{ color: "var(--card-fg)" }}>
            Event Registration
          </h2>
          {groupInfo && (
            <p className="text-sm mt-1" style={{ color: "var(--chart-axis)" }}>
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

      <div className="flex border-b" style={{ borderColor: "var(--border-divider)" }}>
        <button
          className={`transition-all border-b-2 flex items-center gap-2 ${
            isMobile ? "min-h-[48px] px-4 text-sm" : "pb-4 px-6"
          } font-bold ${
            activeTab === "available"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
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
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
          onClick={() => setActiveTab("registered")}
        >
          My Registrations
          {groupRegistrations.length > 0 && (
            <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-black">
              {groupRegistrations.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--chart-axis)" }}>
            Loading events...
          </p>
        </div>
      ) : activeTab === "available" ? (
        events.length === 0 ? (
          <div className="text-center py-20 border rounded-3xl" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
            <Trophy className="h-14 w-14 mx-auto mb-4" style={{ color: "var(--chart-axis)" }} />
            <p className="font-semibold text-lg" style={{ color: "var(--chart-axis)" }}>
              No events scheduled yet
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--chart-axis)" }}>
              Coordinate with administrators for announcements.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const id = e._id || e.event_id;
              const registered = hasRegistrationForEvent(id);
              const count = registrationCountForEvent(id);

              return (
                <div
                  key={id}
                  className={`group border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    registered
                      ? "border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5"
                      : "border-neutral-200 dark:border-neutral-850 hover:border-neutral-300 dark:hover:border-neutral-750"
                  }`}
                  style={{ backgroundColor: "var(--card)", borderColor: registered ? undefined : "var(--border-card)" }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 border dark:border-neutral-800">
                      {e.category || "General"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {e.registration_mode && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          e.registration_mode === "captain"
                            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30"
                            : e.registration_mode === "participant"
                            ? "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/30"
                            : "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30"
                        }`}>
                          {e.registration_mode === "captain" ? "Captain" : e.registration_mode === "participant" ? "Self" : "Open"}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-xl text-neutral-900 dark:text-white mt-4 leading-snug group-hover:text-indigo-500 transition-colors">
                    {e.name}
                  </h3>

                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2.5 line-clamp-3 min-h-[60px] leading-relaxed">
                    {e.description || "No description provided."}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {e.duration && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border dark:border-purple-900/20">
                        {e.duration}
                      </span>
                    )}
                    {e.gender_filter && e.gender_filter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border dark:border-cyan-900/20">
                        <User className="h-3 w-3" />
                        {e.gender_filter === "male" ? "Boys Only" : "Girls Only"}
                      </span>
                    )}
                    {e.subcategory && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border dark:border-amber-900/20">
                        {e.subcategory}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border-divider)" }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--chart-axis)" }}>
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="font-semibold">
                        {e.event_type === "individual" ? "Individual" : `Team: ${e.min_participants || e.min_team_size || 1}-${e.max_participants || e.max_team_size || 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--chart-axis)" }}>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-black uppercase text-[10px] tracking-wider border dark:border-blue-900/20">
                        {e.mode}
                      </span>
                    </div>
                  </div>

                  {registered && (
                    <div className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {count} registration{count !== 1 ? "s" : ""} from your group
                    </div>
                  )}

                  <div className="mt-4">
                    <button
                      onClick={() => openRegistrationModal(e)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md shadow-indigo-500/10 hover:shadow-lg active:scale-98 inline-flex items-center justify-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Register Participants
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {groupRegistrations.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-3xl" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)" }}>
              <Users className="h-14 w-14 mx-auto mb-4" style={{ color: "var(--chart-axis)" }} />
              <p className="font-semibold text-lg" style={{ color: "var(--chart-axis)" }}>
                No registrations yet
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--chart-axis)" }}>
                Browse available events to register your group participants.
              </p>
              <button
                onClick={() => setActiveTab("available")}
                className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg"
              >
                Browse Events
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupRegistrations.map((reg) => {
                const evt = reg.event_id || {};
                return (
                  <div
                    key={reg._id}
                    className="border rounded-3xl p-6"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}
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
                          <div className="text-xs font-bold mt-1" style={{ color: "var(--chart-axis)" }}>
                            Team: <span className="text-indigo-500">{reg.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {reg.members && reg.members.length > 0 && (
                      <div className="mt-5">
                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: "var(--chart-axis)" }}>
                          Participants ({reg.members.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {reg.members.map((m) => (
                            <span
                              key={m._id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs"
                              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                            >
                              <User className="h-3 w-3 shrink-0" />
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div
            className={`w-full overflow-hidden border shadow-2xl flex flex-col animate-in duration-200 ${
              isMobile
                ? "max-h-[85vh] rounded-t-3xl"
                : "max-w-2xl max-h-[90vh] rounded-3xl zoom-in-95 mx-4"
            }`}
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}
          >
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: "var(--border-divider)" }}>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 mb-1 border dark:border-indigo-800">
                  Register Participants
                </span>
                <h3 className="text-xl font-extrabold" style={{ color: "var(--card-fg)" }}>
                  {selectedEvent.name}
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--chart-axis)" }}>
                  {groupInfo?.name} &middot;{" "}
                  {selectedEvent.event_type === "individual"
                    ? "Individual event — select one participant"
                    : `Team event — select ${selectedEvent.min_team_size || 1}-${selectedEvent.max_team_size || 1} members`}
                </p>
              </div>
              <button
                onClick={closeRegistrationModal}
                className="h-10 w-10 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-750 flex items-center justify-center transition-all"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {selectedEvent.event_type === "team" && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--chart-axis)" }}>
                    Team Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Team Alpha"
                    className={`w-full border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold transition-all ${
                      isMobile ? "min-h-[48px] px-4 text-base" : "px-4 py-3 text-sm"
                    }`}
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "var(--chart-axis)" }}>
                    Must be unique across all groups for this event.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--chart-axis)" }}>
                  Select Participants
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--chart-axis)" }} />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder={`Search participants in your ${groupLabel.toLowerCase()}...`}
                    className={`w-full pl-10 pr-4 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                      isMobile ? "min-h-[48px] text-base py-2" : "text-sm py-2.5"
                    }`}
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                  />
                </div>

                <div
                  className="border rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto divide-y"
                  style={{ borderColor: "var(--border-divider)" }}
                >
                  {filteredParticipants.length === 0 ? (
                    <div className="p-6 text-center text-sm font-semibold" style={{ color: "var(--chart-axis)" }}>
                      {participantSearch
                        ? "No matching participants found"
                        : `No participants in your ${groupLabel.toLowerCase()}. Add participants first.`}
                    </div>
                  ) : (
                    filteredParticipants.map((p) => {
                      const isSelected = selectedParticipantIds.includes(p._id);
                      const alreadyReg = isAlreadyRegistered(p._id, selectedEvent._id || selectedEvent.event_id);

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
                              ? "bg-indigo-500/5"
                              : "hover:bg-indigo-500/5 cursor-pointer"
                          }`}
                          style={{ backgroundColor: isSelected && !alreadyReg ? undefined : "var(--card)" }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${
                                isSelected && !alreadyReg
                                  ? "bg-indigo-600 text-white"
                                  : "bg-neutral-100 dark:bg-neutral-800"
                              }`}
                            >
                              {isSelected && !alreadyReg ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" style={{ color: "var(--chart-axis)" }} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate" style={{ color: "var(--card-fg)" }}>
                                {p.name}
                              </div>
                              <div className="text-[10px]" style={{ color: "var(--chart-axis)" }}>
                                {p.unique_id && <span>ID: {p.unique_id} &middot; </span>}
                                Class: {p.class}
                              </div>
                            </div>
                          </div>
                          {alreadyReg && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                              Registered
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedParticipantIds.length > 0 && (
                <div className="p-4 border rounded-2xl" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)" }}>
                  <div className="text-xs font-bold mb-2" style={{ color: "var(--card-fg)" }}>
                    Selected ({selectedParticipantIds.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedParticipantIds.map((id) => {
                      const p = groupParticipants.find((x) => x._id === id);
                      return p ? (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                        >
                          {p.name}
                          <button onClick={() => toggleParticipantSelection(id)} className="ml-0.5 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {selectedEvent.event_type === "team" && (
                <div className="p-3.5 border rounded-2xl space-y-1.5 text-xs" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)" }}>
                  <div className="font-bold" style={{ color: "var(--card-fg)" }}>
                    Team Requirements:
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color: "var(--chart-axis)" }}>
                    <CheckCircle className={`h-3.5 w-3.5 ${selectedParticipantIds.length >= (selectedEvent.min_team_size || 1) ? "text-emerald-500" : "text-neutral-300"}`} />
                    Min team size: {selectedEvent.min_team_size || 1}
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color: "var(--chart-axis)" }}>
                    <CheckCircle className={`h-3.5 w-3.5 ${selectedParticipantIds.length <= (selectedEvent.max_team_size || Infinity) ? "text-emerald-500" : "text-neutral-300"}`} />
                    Max team size: {selectedEvent.max_team_size || 1}
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t ${isMobile ? "p-4" : "p-6"}`} style={{ borderColor: "var(--border-divider)" }}>
              <div className="text-xs mb-3" style={{ color: "var(--chart-axis)" }}>
                {selectedEvent.event_type === "team"
                  ? `${selectedParticipantIds.length} participant${selectedParticipantIds.length !== 1 ? "s" : ""} selected`
                  : selectedParticipantIds.length > 0
                    ? "1 participant selected"
                    : "No participant selected"}
              </div>
              <div className={`flex ${isMobile ? "flex-col" : "flex-row justify-end"} gap-3`}>
                <button
                  onClick={closeRegistrationModal}
                  className={`${isMobile ? "min-h-[48px] w-full text-sm" : "px-5 py-2.5 text-xs"} border font-bold uppercase tracking-wider rounded-xl transition-all`}
                  style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRegistration}
                  disabled={submitting || !selectedParticipantIds.length}
                  className={`${
                    isMobile ? "min-h-[48px] w-full text-sm" : "px-6 py-2.5 text-xs"
                  } bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.1em] rounded-xl transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {selectedEvent.event_type === "team" ? "Register Team" : "Register Participant"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
