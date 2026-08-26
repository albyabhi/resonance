import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../components/AuthContext";
import { apiFetch } from "../utils/apiClient";
import { FadeIn } from "./AnimateReveal";
import { Calendar, Filter, ChevronRight, Layout, Users, Trophy, Clock, MapPin, X, Phone, Mail } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const statusOrder = { live: 3, upcoming: 2, completed: 1 };
const modeLabel = (m) => (m === "onstage" ? "Stage" : "Off-stage");
const typeLabel = (t) => (t === "team" ? "Team" : "Individual");

const statusConfig = (status) => {
  switch (status) {
    case "live":
      return { label: "Live", classes: "bg-success/10 text-success border-success/20" };
    case "completed":
      return { label: "Completed", classes: "bg-muted text-muted-foreground border-border" };
    default:
      return { label: "Upcoming", classes: "bg-primary/10 text-primary border-primary/20" };
  }
};

const WINNER_STATUSES = new Set(["approved", "published", "locked"]);

function RecentEvents() {
  const { token, isAuthReady, competition } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [schedulesByEvent, setSchedulesByEvent] = useState({});
  const [resultsByEvent, setResultsByEvent] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [category, setCategory] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [eventSchedules, setEventSchedules] = useState([]);
  const [eventTeams, setEventTeams] = useState([]);
  const [activeTab, setActiveTab] = useState("winners");

  const competitionId = useMemo(() => competition?._id || competition?.id || competition?.competition_id, [competition]);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const res = await apiFetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) throw new Error("API call failed");
    return res.json();
  }, []);

  const eventStatus = useCallback((id) => {
    const sched = (schedulesByEvent[id] || []).slice().sort((a, b) => (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0));
    return sched[0]?.status || "upcoming";
  }, [schedulesByEvent]);

  const fullItems = useMemo(() => {
    return (events || [])
      .map((e) => {
        const id = e._id || e.event_id;
        const status = eventStatus(id);
        return { key: id, name: e.title || e.name, mode: e.mode, type: e.event_type, status };
      })
      .filter((it) => (category === "all" ? true : it.status === category));
  }, [events, category, eventStatus]);

  const list = useMemo(() => (showAll ? fullItems : fullItems.slice(0, 6)), [fullItems, showAll]);

  useEffect(() => {
    const load = async () => {
      if (!token || !isAuthReady) return;
      try {
        setLoading(true);
        setError("");

        const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";

        const { events: evts } = await apiCall(`/api/event${competitionQuery}`);
        const schedulesMap = {};
        const resultsMap = {};
        const eventIds = (evts || []).map((e) => e._id || e.event_id).join(",");

        if (eventIds) {
          try {
            const { schedules } = await apiCall(`/api/schedule/batch?event_ids=${eventIds}`);
            (schedules || []).forEach((s) => {
              if (!schedulesMap[s.event_id]) schedulesMap[s.event_id] = [];
              schedulesMap[s.event_id].push(s);
            });
            const { data: results } = await apiCall(`/api/results?event_ids=${eventIds}&status=${["approved", "published", "locked"].join(",")}`);
            (results || []).forEach((r) => {
              const eventKey = r.event_id?._id || r.event_id;
              if (!resultsMap[eventKey]) resultsMap[eventKey] = [];
              resultsMap[eventKey].push(r);
            });
          } catch (e) {
            console.error("Batch fetch failed", e);
          }
        }

        setEvents(evts || []);
        setSchedulesByEvent(schedulesMap);
        setResultsByEvent(resultsMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, isAuthReady, competitionId, apiCall]);

  const openDetails = async (eventId) => {
    try {
      setOpenId(eventId);
      setDetailsLoading(true);
      setActiveTab("winners");
      const { data: eventData } = await apiCall(`/api/event/${eventId}`);
      setEventDetail(eventData || null);
      const { schedules } = await apiCall(`/api/schedule?event_id=${eventId}`);
      setEventSchedules((schedules || []).sort((a, b) => (a.round_no || 0) - (b.round_no || 0)));

      const teamsResp = await apiCall(`/api/team?event_id=${eventId}`).catch(() => ({ success: false, data: [] }));
      const baseTeams = (teamsResp.data || []).map((t) => ({
        _id: t._id,
        houseName: t.group_id?.name || "",
        houseCode: "",
        chest_no: t.chest_no,
        members: t.members || [],
      }));

      setEventTeams(baseTeams);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setOpenId(null);
    setEventDetail(null);
    setEventSchedules([]);
    setEventTeams([]);
  };

  const winnersView = useMemo(() => {
    if (!openId) return [];
    const results = (resultsByEvent[openId] || []).filter((r) => WINNER_STATUSES.has(r.status)).sort((a, b) => (a.position || 0) - (b.position || 0));
    const teamMap = new Map(eventTeams.map((t) => [String(t._id), t]));
    return results.slice(0, 6).map((r) => {
      const teamObj = teamMap.get(String(r.team_id?._id || r.team_id)) || {};
      return { resultId: r._id, position: r.position, houseText: teamObj.houseName || r.team_id?.group_id?.name || "", members: teamObj.members || [] };
    });
  }, [openId, resultsByEvent, eventTeams]);

  return (
    <FadeIn delay={0.3} className="card-premium flex h-full w-full max-w-full flex-col overflow-hidden">
      <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Events</h3>
          </div>
          <p className="pl-7 text-sm text-muted-foreground">Upcoming, live, and completed events</p>
        </div>

        <div className="flex items-center gap-1 rounded-full border p-1" style={{ borderColor: 'var(--border-divider)', backgroundColor: 'var(--surface)' }}>
          {["all", "live", "upcoming", "completed"].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs transition-all ${
                category === c ? "border shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
              style={category === c ? { backgroundColor: 'var(--card)', color: 'var(--accent)', borderColor: 'var(--border-divider)' } : {}}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-2 text-sm text-destructive">
          <Filter className="h-4 w-4" />
          <span>Stream error: {error}</span>
        </div>
      )}

      <div className="flex-1 space-y-3">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
        ) : list.length === 0 ? (
          <div className="py-20 text-center">
            <Filter className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No events matched the current filter</p>
          </div>
        ) : (
          list.map((evt) => {
            const config = statusConfig(evt.status);
            return (
              <button
                key={evt.key}
                onClick={() => openDetails(evt.key)}
                className="group flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:shadow-md"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)' }}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:text-primary" style={{ backgroundColor: 'var(--surface)', color: 'var(--chart-axis)' }}>
                    <Layout className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">{evt.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{modeLabel(evt.mode)} · {typeLabel(evt.type)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-[11px] ${config.classes}`}>{config.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {fullItems.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-6 w-full border-t border-border py-3 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          {showAll ? "Show fewer" : `Show all (${fullItems.length})`}
        </button>
      )}

      {openId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 p-4 backdrop-blur-xl transition-all duration-300 sm:p-6">
          <FadeIn className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border shadow-2xl" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
            <header className="flex items-center justify-between border-b p-6" style={{ borderBottom: '1px solid var(--border-divider)', backgroundColor: 'var(--surface)' }}>
              <div className="space-y-1">
                <h4 className="text-2xl font-semibold text-foreground">{eventDetail?.title || eventDetail?.name || "Event details"}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {eventDetail?.mode}</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {eventDetail?.event_type}</span>
                </div>
              </div>
              <button onClick={closeDetails} className="rounded-xl border p-2 transition hover:text-destructive" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}>
                <X className="h-6 w-6" />
              </button>
            </header>

            <div className="flex-1 space-y-10 overflow-y-auto p-6 overscroll-contain sm:p-8">
              {detailsLoading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading event details</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      { label: "Rounds", value: eventDetail?.rounds, icon: Clock },
                      { label: "Min team", value: eventDetail?.min_team_size || 1, icon: Users },
                      { label: "Max team", value: eventDetail?.max_team_size || 1, icon: Users },
                       { label: "House cap", value: eventDetail?.max_per_group, icon: Layout },
                    ].map((m, i) => (
                      <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                        <m.icon className="mb-2 h-4 w-4 text-primary" />
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="text-lg font-semibold text-foreground">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {eventDetail?.coordinator_id && (
                    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Event Coordinator</p>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
                          style={{ backgroundColor: 'var(--warning)' }}
                        >
                          {(eventDetail.coordinator_id.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {eventDetail.coordinator_id.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {eventDetail.coordinator_id.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {eventDetail.coordinator_id.email}
                              </span>
                            )}
                            {eventDetail.coordinator_id.phone && eventDetail.coordinator_id.phone_visible && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {eventDetail.coordinator_id.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <section>
                    <h5 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock className="h-4 w-4 text-primary" /> Timeline
                    </h5>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {eventSchedules.map((r) => (
                        <div key={r._id} className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
                          <div className="mb-3 flex items-start justify-between">
                            <p className="text-xs text-muted-foreground">Round {r.round_no}</p>
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                              {r.status}
                            </span>
                          </div>
                          <p className="mb-2 text-sm font-semibold text-foreground">{r.venue || "Global Arena"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()} · {r.time || "TBD"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                      <div className="flex gap-6">
                        {["winners", "participants"].map((t) => (
                          <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`relative text-sm transition-all ${activeTab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            {t}
                            {activeTab === t && <span className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activeTab === "winners" ? (
                      <div className="space-y-4">
                        {winnersView.length ? (
                          winnersView.map((w) => (
                            <div key={w.resultId} className="flex items-center gap-6 rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold ${w.position === 1 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                                {w.position === 1 ? <Trophy className="h-6 w-6" /> : w.position}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{w.houseText}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {w.members.map((m) => (
                                    <span key={m._id} className="rounded-lg border px-2 py-1 text-xs" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}>
                                      {m.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="py-10 text-center text-sm text-muted-foreground">Awaiting official validation.</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {eventTeams.map((t) => (
                          <div key={t._id} className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
                            <p className="mb-1 text-xs text-primary">{t.houseName}</p>
                            <p className="mb-4 text-xs text-muted-foreground">{t.chest_no ? `Chest Node #${t.chest_no}` : "Chest Node unassigned"}</p>
                            <div className="space-y-2">
                              {t.members.map((m) => (
                                <div key={m._id} className="flex items-center justify-between border-b border-border py-2 text-xs text-muted-foreground last:border-0">
                                  <span>{m.name}</span>
                                  <span className="text-xs text-muted-foreground">{m.class}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </FadeIn>
        </div>
      )}
    </FadeIn>
  );
}

export default RecentEvents;