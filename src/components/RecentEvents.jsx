import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../components/AuthContext";
import { useCompetition } from "../context/CompetitionContext";
import { apiFetch } from "../utils/apiClient";
import { getStatusMeta } from "../utils/eventStatus";
import { FadeIn } from "./AnimateReveal";
import EventStatusBadge from "./EventStatusBadge";
import EventDetailModal from "./EventDetailModal";
import { Calendar, Filter, ChevronRight, Trophy, Palette, BookOpen, Music, Cpu, CalendarDays } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const LIVE_STATUSES = new Set(["ongoing", "judging", "live"]);
const DONE_STATUSES = new Set(["completed", "published", "locked"]);
const modeLabel = (m) => (m === "onstage" ? "Onstage" : m === "offstage" ? "Off-stage" : m || "—");
const typeLabel = (t) => (t === "team" ? "Team" : "Individual");

const bucketOf = (status) => {
  if (LIVE_STATUSES.has(status)) return "live";
  if (DONE_STATUSES.has(status)) return "completed";
  return "upcoming";
};

const categoryIcon = (category) => {
  switch ((category || "").toLowerCase()) {
    case "sports":
      return { Icon: Trophy, tile: "icon-tile-amber" };
    case "arts":
      return { Icon: Palette, tile: "icon-tile-purple" };
    case "academic":
      return { Icon: BookOpen, tile: "icon-tile-teal" };
    case "cultural":
      return { Icon: Music, tile: "icon-tile-red" };
    case "technical":
      return { Icon: Cpu, tile: "icon-tile-blue" };
    default:
      return { Icon: CalendarDays, tile: "icon-tile-neutral" };
  }
};

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const shortDate = (value) => {
  const d = safeDate(value);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const WINNER_STATUSES = new Set(["approved", "published", "locked"]);

function RecentEvents() {
  const { token, isAuthReady, competition } = useAuth();
  const { groupLabel } = useCompetition() || {};
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

  const fullItems = useMemo(() => {
    return (events || [])
      .map((e) => {
        const id = e._id || e.event_id;
        // Prefer the canonical event lifecycle status; fall back to schedule status.
        const rawStatus = e.status || (schedulesByEvent[id] || [])[0]?.status || "draft";
        // Touch getStatusMeta so unknown statuses still resolve to a known badge.
        getStatusMeta(rawStatus);
        const scheds = (schedulesByEvent[id] || []).slice().sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
        const upcoming = scheds.find((s) => safeDate(s.date)) || scheds[0];
        return {
          key: id,
          name: e.title || e.name,
          mode: e.mode,
          type: e.event_type,
          category: e.category,
          status: rawStatus,
          bucket: bucketOf(rawStatus),
          nextDate: upcoming ? shortDate(upcoming.date) : null,
          nextVenue: upcoming?.venue || "",
          nextTime: upcoming?.time || "",
        };
      })
      .filter((it) => (category === "all" ? true : it.bucket === category));
  }, [events, category, schedulesByEvent]);

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
      return {
        resultId: r._id,
        position: r.position,
        houseText: teamObj.houseName || r.team_id?.group_id?.name || "",
        members: teamObj.members || [],
        points: r.points ?? r.score ?? null,
        metric: r.metric || "",
      };
    });
  }, [openId, resultsByEvent, eventTeams]);

  return (
    <FadeIn delay={0.3} className="card-premium flex h-full w-full max-w-full flex-col overflow-hidden">
      <header className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Events</h3>
          </div>
          <p className="pl-7 text-sm text-muted-foreground">Fixtures, live calls, and final standings</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "upcoming", label: "Upcoming" },
            { value: "completed", label: "Completed" },
          ].map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c.value
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Filter className="h-4 w-4 shrink-0" />
          <span>Couldn&apos;t load events: {error}</span>
        </div>
      )}

      <div className="flex-1 space-y-2">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted" />)
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-14 text-center">
            <Filter className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-card-foreground">No events in this view</p>
            <p className="mt-1 text-xs text-muted-foreground">Try another filter — fixtures appear here once scheduled.</p>
          </div>
        ) : (
          list.map((evt) => {
            const { Icon, tile } = categoryIcon(evt.category);
            return (
              <button
                key={evt.key}
                onClick={() => openDetails(evt.key)}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:shadow-soft sm:p-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`${tile} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-card-foreground transition-colors group-hover:text-primary">
                      {evt.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {modeLabel(evt.mode)} · {typeLabel(evt.type)}
                      {evt.nextDate
                        ? ` · ${evt.nextDate}${evt.nextVenue ? ` — ${evt.nextVenue}` : ""}`
                        : " · Dates TBD"}
                    </span>
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <EventStatusBadge status={evt.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </span>
              </button>
            );
          })
        )}
      </div>

      {fullItems.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-5 w-full border-t border-border py-3 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          {showAll ? "Show fewer" : `Show all (${fullItems.length})`}
        </button>
      )}

      {openId && (
        <EventDetailModal
          event={eventDetail}
          schedules={eventSchedules}
          teams={eventTeams}
          winners={winnersView}
          loading={detailsLoading}
          groupLabel={groupLabel || "Group"}
          onClose={closeDetails}
        />
      )}
    </FadeIn>
  );
}

export default RecentEvents;