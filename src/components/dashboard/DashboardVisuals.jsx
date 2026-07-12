import React, { useState, useEffect } from "react";
import useDashboardData from "../../hooks/useDashboardData";
import { useAuth } from "../AuthContext";
import { Calendar, Trophy, AlertCircle, CheckCircle, Activity, TrendingUp, Medal, ClipboardCheck, Flag, ClipboardList } from "lucide-react";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

import StatCard from "../StatCard";
import TopHouses from "../widgets/TopHouses";
import ParticipantHighlights from "../widgets/ParticipantHighlights";
import HousePerformanceChart from "../charts/HousePerformanceChart";
import { FadeIn } from "../AnimateReveal";
import DashboardEmptyState from "./DashboardEmptyState";

function SectionCard({ title, description, className = "", children, noPad = false }) {
  return (
    <div className={`card-premium ${className}`}>
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border-divider)' }}>
        <h3 className="text-base font-semibold" style={{ color: 'var(--card-fg)' }}>{title}</h3>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>{description}</p>
      </div>
      <div className={noPad ? "" : "p-4"}>
        <div className="chart-surface">{children}</div>
      </div>
    </div>
  );
}

const getId = (value) => String(value?._id || value?.id || value || "");

const getScoreboardName = (item) => item?.name || item?.group?.name || item?.house?.name || "Group";

const getScoreboardId = (item) => getId(item?.group_id || item?.group?._id || item?.house?._id);

const getScoreboardPoints = (item) => Number(item?.total_score ?? item?.points ?? item?.score ?? 0);

const normalizeScoreboard = (scoreboard = []) =>
  scoreboard
    .map((item, index) => ({
      ...item,
      rank: item.rank || index + 1,
      group_id: getScoreboardId(item),
      name: getScoreboardName(item),
      points: getScoreboardPoints(item),
      house: item.house || item.group || { _id: getScoreboardId(item), name: getScoreboardName(item) },
    }))
    .sort((a, b) => getScoreboardPoints(b) - getScoreboardPoints(a));

const eventName = (event) => event?.name || event?.event_id?.name || "Event";

const groupNameFromResult = (result) =>
  result?.team_id?.group_id?.name ||
  result?.group_id?.name ||
  result?.group?.name ||
  result?.house?.name ||
  "Group";

const eventFromResult = (result) => result?.event_id || result?.event || {};

const getDateValue = (item) => {
  const value = item?.start_time || item?.scheduled_at || item?.date || item?.created_at || item?.updated_at;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const shortDate = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function EmptyPanel({ icon = Trophy, message }) {
  const PanelIcon = icon;

  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center" style={{ borderColor: "var(--border-divider)", color: "var(--chart-axis)" }}>
      <PanelIcon className="h-6 w-6" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StandingsTable({ scoreboard = [], userHouseId }) {
  const { groupLabel = "Group" } = useCompetition() || {};
  const leaders = normalizeScoreboard(scoreboard).slice(0, 6);

  if (!leaders.length) {
    return <EmptyPanel message="Standings will appear after approved results are added." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-divider)" }}>
      <div className="grid grid-cols-[56px_1fr_92px] border-b px-4 py-3 text-xs font-semibold uppercase" style={{ borderColor: "var(--border-divider)", color: "var(--chart-axis)" }}>
        <span>Rank</span>
        <span>{groupLabel}</span>
        <span className="text-right">Points</span>
      </div>
      {leaders.map((item, index) => {
        const isCurrent = userHouseId && getScoreboardId(item) === getId(userHouseId);
        return (
          <div
            key={getScoreboardId(item) || index}
            className="grid grid-cols-[56px_1fr_92px] items-center border-b px-4 py-3 last:border-b-0"
            style={{ borderColor: "var(--border-divider)", backgroundColor: isCurrent ? "rgba(79, 70, 229, 0.08)" : "transparent" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--card-fg)" }}>#{item.rank || index + 1}</span>
            <span className="min-w-0 truncate text-sm font-medium" style={{ color: "var(--card-fg)" }}>{getScoreboardName(item)}</span>
            <span className="text-right text-sm font-semibold" style={{ color: "var(--card-fg)" }}>{getScoreboardPoints(item).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function RecentWinners({ results = [] }) {
  const RELEASED_STATUSES = new Set(["approved", "published", "locked"]);

  const firstPlace = results
    .filter((result) => RELEASED_STATUSES.has(result.status) && Number(result.position) === 1)
    .sort((a, b) => (getDateValue(b)?.getTime() || 0) - (getDateValue(a)?.getTime() || 0));

  const seen = new Set();
  const groupedByEvent = [];
  for (const result of firstPlace) {
    const eventId = getId(result.event_id);
    if (!seen.has(eventId)) {
      seen.add(eventId);
      groupedByEvent.push(result);
    }
  }

  const winners = groupedByEvent.slice(0, 3);

  if (!winners.length) {
    return <EmptyPanel icon={Medal} message="Recent winners will show once event results are released." />;
  }

  return (
    <div className="divide-y rounded-lg border" style={{ borderColor: "var(--border-divider)" }}>
      {winners.map((result, index) => {
        const event = eventFromResult(result);
        return (
          <div key={result._id || index} className="flex items-center justify-between gap-4 px-4 py-3" style={{ borderColor: "var(--border-divider)" }}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: "var(--card-fg)" }}>{eventName(event)}</p>
              <p className="mt-0.5 truncate text-xs" style={{ color: "var(--chart-axis)" }}>{groupNameFromResult(result)} won Round {result.round_no || 1}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold" style={{ color: "var(--card-fg)" }}>{Number(result.points || 0).toLocaleString()}</p>
              <p className="text-xs" style={{ color: "var(--chart-axis)" }}>pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingEvents({ events = [], schedules = [] }) {
  const scheduleByEvent = new Map(schedules.map((schedule) => [getId(schedule.event_id || schedule.event), schedule]));
  const upcoming = events
    .filter((event) => event.status !== "completed")
    .map((event) => ({ ...event, schedule: scheduleByEvent.get(getId(event._id)) }))
    .sort((a, b) => (getDateValue(a.schedule || a)?.getTime() || Number.MAX_SAFE_INTEGER) - (getDateValue(b.schedule || b)?.getTime() || Number.MAX_SAFE_INTEGER))
    .slice(0, 5);

  if (!upcoming.length) {
    return <EmptyPanel icon={Calendar} message="New and upcoming events will appear here after scheduling." />;
  }

  return (
    <div className="divide-y rounded-lg border" style={{ borderColor: "var(--border-divider)" }}>
      {upcoming.map((event) => (
        <div key={event._id || event.id} className="flex items-center justify-between gap-4 px-4 py-3" style={{ borderColor: "var(--border-divider)" }}>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--card-fg)" }}>{eventName(event)}</p>
            <p className="mt-0.5 truncate text-xs capitalize" style={{ color: "var(--chart-axis)" }}>{event.category || "general"} - {event.event_type || "event"}</p>
          </div>
          <div className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium" style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}>
            {event.status === "live" ? "Live" : shortDate(getDateValue(event.schedule || event))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultProgress({ results = [] }) {
  const counts = results.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0 }
  );
  const total = results.length || 1;

  const items = [
    { label: "Approved", value: counts.approved || 0, color: "bg-emerald-500" },
    { label: "Pending", value: counts.pending || 0, color: "bg-amber-500" },
    { label: "Rejected", value: counts.rejected || 0, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span style={{ color: "var(--card-fg)" }}>{item.label}</span>
            <span className="font-semibold" style={{ color: "var(--card-fg)" }}>{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.round((item.value / total) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCardsRow({ cards, count }) {
  const gridCols = count === 3 ? "grid-cols-3 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-4 sm:grid-cols-2 xl:grid-cols-4";
  return (
    <div className={`grid ${gridCols} gap-2 sm:gap-6 w-full`}>
      {cards.map((card, i) => <StatCard key={i} {...card} />)}
    </div>
  );
}

export default function DashboardVisuals() {
  const { data, loading, error } = useDashboardData();
  const { role, user, token } = useAuth();
  const { hasAnyRole, hasRole } = usePermission();
  const { groupLabel = "House", groupLabelPlural = "Houses" } = useCompetition() || {};
  const userHouseId = user?.house?._id || user?.house;
  const userGroupId = getId(userHouseId);

  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [judgeSheets, setJudgeSheets] = useState([]);

  useEffect(() => {
    if (!token || role !== "judge") return;
    const fetchJudgeData = async () => {
      try {
        const [assignRes, sheetsRes] = await Promise.all([
          apiJson(`${API_BASE_URL}/api/judge/assignments`),
          apiJson(`${API_BASE_URL}/api/judge/scores`),
        ]);
        setJudgeAssignments(assignRes.data || []);
        setJudgeSheets(sheetsRes.data || []);
      } catch {
        // Judge data fetch failed — silently ignore, dashboard still renders
      }
    };
    fetchJudgeData();
  }, [token, role]);

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl border border-neutral-200 dark:border-neutral-700"></div>
          ))}
        </div>
        <div className="h-[400px] bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl border border-neutral-200 dark:border-neutral-700 w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
        <AlertCircle className="h-5 w-5" />
        Unable to load dashboard data: {error}
      </div>
    );
  }

  const { scoreboard, events, results, schedules, participantStats, systemStats } = data;
  const normalizedScoreboard = normalizeScoreboard(scoreboard);
  const liveEvents = events.filter((e) => e.status === "live");
  const completedEvents = events.filter((e) => e.status === "completed");
  const nextEvents = events.filter((e) => e.status !== "completed");
  const leader = normalizedScoreboard[0];
  const dashboardKind = hasAnyRole("super_admin", "organizer")
    ? "admin"
    : hasRole("house_captain")
      ? "captain"
      : hasRole("judge")
        ? "judge"
        : hasAnyRole("event_coordinator")
          ? "coordinator"
          : "guest";

  const isEmpty = events.length === 0 && results.length === 0;

  if (!loading && !error && isEmpty) {
    return (
      <div className="flex w-full flex-col gap-6 mt-4">
        <DashboardEmptyState role={role} />
      </div>
    );
  }

  if (!hasAnyRole("super_admin", "organizer", "event_coordinator", "judge")) {
    return (
      <div className="flex w-full flex-col gap-6">
        <FadeIn delay={0.1}>
          <div className="w-full max-w-sm">
            <TopHouses scoreboard={normalizedScoreboard} />
          </div>
        </FadeIn>
      </div>
    );
  }

  const houseTeamsCount = systemStats?.byHouse?.find((h) => getId(h.house_id) === userGroupId)?.count || 0;
  const currentGroup = normalizedScoreboard.find((h) => getScoreboardId(h) === userGroupId);
  const pendingCount = results.filter((r) => r.status === "pending").length;
  const coordinatorEvents = events.filter((e) => {
    const cid = e.coordinator_id?._id || e.coordinator_id;
    return cid && String(cid) === String(user?.id);
  });

  const renderJudgeWidgets = () => {
    const assignedEvents = [];
    const assignedEventIds = new Set();
    for (const a of judgeAssignments) {
      const eid = String(a.event_id?._id || a.event_id);
      assignedEventIds.add(eid);
      const evt = events.find((e) => String(e._id || e.event_id) === eid);
      if (evt) assignedEvents.push(evt);
    }

    const draftSheets = judgeSheets.filter((s) => s.status === "draft").length;
    const submittedSheets = judgeSheets.filter((s) => s.status === "submitted").length;
    const activeAssignedEvents = assignedEvents.filter(
      (e) => e.status === "judging" || e.status === "ongoing" || e.status === "registration_open"
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full">
          <StatCard title="Assigned Events" value={assignedEvents.length} subtitle={`${activeAssignedEvents.length} active`} icon={ClipboardList} variant="indigo" delay={0.1} />
          <StatCard title="Draft Scores" value={draftSheets} subtitle="Pending submission" icon={AlertCircle} variant="amber" delay={0.2} />
          <StatCard title="Submitted Scores" value={submittedSheets} subtitle="Awaiting aggregation" icon={CheckCircle} variant="emerald" delay={0.3} />
        </div>
        {assignedEvents.length > 0 ? (
          <SectionCard title="My Assigned Events" description="Events you need to score" className="w-full">
            <div className="space-y-2">
              {assignedEvents.map((evt) => {
                const eid = String(evt._id || evt.event_id);
                const eventSheets = judgeSheets.filter(
                  (s) => String(s.event_id?._id || s.event_id) === eid
                );
                const submitted = eventSheets.filter((s) => s.status === "submitted").length;
                const draft = eventSheets.filter((s) => s.status === "draft").length;
                return (
                  <div
                    key={eid}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)" }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--card-fg)" }}>
                        {evt.name || evt.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--chart-axis)" }}>
                        {evt.rounds} round(s) · {submitted} submitted · {draft} draft
                      </p>
                    </div>
                    <span className={`text-xs rounded px-2 py-1 font-medium ${
                      evt.status === "judging"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        : evt.status === "ongoing"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"
                    }`}>
                      {evt.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="My Assigned Events" description="Events you need to score" className="w-full">
            <EmptyPanel icon={ClipboardList} message="No events assigned yet. Contact an organizer." />
          </SectionCard>
        )}
      </div>
    );
  };

  const STANDINGS = "standings";
  const PARTICIPANT_HIGHLIGHTS = "participantHighlights";
  const RESULT_PROGRESS = "resultProgress";
  const RECENT_WINNERS = "recentWinners";
  const UPCOMING_EVENTS = "upcomingEvents";
  const TOP_HOUSES = "topHouses";

  const sectionWidget = (type, colSpan, extraProps = {}) => {
    // Note: colSpan is intentionally not used for Tailwind dynamic classes.
    // Parent container handles responsive column spans deterministically.
    switch (type) {
      case STANDINGS:
        return (
          <SectionCard title="Standings" description={extraProps.description} className="w-full min-w-0">
            <StandingsTable
              scoreboard={normalizedScoreboard}
              userHouseId={extraProps.userHouseId !== false ? userGroupId : undefined}
            />
          </SectionCard>
        );
      case PARTICIPANT_HIGHLIGHTS:
        return (
          <div className="w-full min-w-0">
            <ParticipantHighlights
              participantStats={participantStats}
              userGroupId={extraProps.userGroupId ? userGroupId : undefined}
            />
          </div>
        );
      case RESULT_PROGRESS:
        return (
          <SectionCard title="Result progress" description="Approval status across submitted results" className="w-full min-w-0">
            <ResultProgress results={results} />
          </SectionCard>
        );
      case RECENT_WINNERS:
        return (
          <SectionCard title="Recent winners" description={extraProps.description || "Latest approved first-place results"} className="w-full min-w-0">
            <RecentWinners results={results} />
          </SectionCard>
        );
      case UPCOMING_EVENTS:
        return (
          <SectionCard title="New events" description={extraProps.description || "Live and upcoming competition events"} className="w-full min-w-0">
            <UpcomingEvents events={events} schedules={schedules} />
          </SectionCard>
        );
      case TOP_HOUSES:
        return (
          <div className="w-full min-w-0">
            <TopHouses scoreboard={normalizedScoreboard} />
          </div>
        );
      default:
        return null;
    }
  };

  const colSpanClass = (span) => {
    const map = {
      1: "lg:col-span-1",
      2: "lg:col-span-2",
      3: "lg:col-span-3",
      4: "lg:col-span-4",
      5: "lg:col-span-5",
      6: "lg:col-span-6",
      7: "lg:col-span-7",
      8: "lg:col-span-8",
      9: "lg:col-span-9",
      10: "lg:col-span-10",
      11: "lg:col-span-11",
      12: "lg:col-span-12",
    };
    return map[span] || "lg:col-span-12";
  };

  const sectionPanel = (leftSlot, rightSlots, leftCols) => {
    const rightCols = 12 - leftCols;
    const rightArray = Array.isArray(rightSlots) ? rightSlots : [rightSlots];

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className={`${colSpanClass(leftCols)} w-full min-w-0`}>{leftSlot}</div>

        <div className={`${colSpanClass(rightCols)} flex flex-col gap-6 w-full min-w-0`}>
          {rightArray.map((item, i) => (
            <React.Fragment key={i}>{item}</React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const ROLE_LAYOUTS = {
    admin: {
      stats: [
        { title: "Events running", value: liveEvents.length, subtitle: `${nextEvents.length} open or upcoming`, icon: Flag, variant: "indigo", delay: 0.1 },
        { title: "Completed events", value: completedEvents.length, subtitle: `${events.length} total events`, icon: CheckCircle, variant: "emerald", delay: 0.2 },
        { title: "Pending results", value: pendingCount, subtitle: "Need review before points count", icon: ClipboardCheck, variant: "amber", delay: 0.3 },
        { title: "Current leader", value: leader ? getScoreboardName(leader) : "-", subtitle: leader ? `${getScoreboardPoints(leader).toLocaleString()} pts` : "No points yet", icon: Trophy, variant: "violet", delay: 0.4 },
      ],
      sections: [
        {
          left: sectionWidget(STANDINGS, 7, { description: `${groupLabelPlural} ranked by approved points` }),
          right: [sectionWidget(PARTICIPANT_HIGHLIGHTS, 5), sectionWidget(RESULT_PROGRESS, 5)],
          leftCols: 7,
        },
        {
          left: sectionWidget(RECENT_WINNERS, 6, { description: "Latest released event results" }),
          right: sectionWidget(UPCOMING_EVENTS, 6, {}),
          leftCols: 6,
        },
      ],
    },
    captain: {
      stats: [
        { title: "Registered teams", value: houseTeamsCount, icon: Activity, variant: "indigo", delay: 0.1 },
        { title: "Available events", value: nextEvents.length, icon: Calendar, variant: "violet", delay: 0.2 },
        { title: "Group points", value: currentGroup ? getScoreboardPoints(currentGroup) : 0, icon: Trophy, variant: "amber", delay: 0.3 },
        { title: "Current rank", value: currentGroup ? `#${currentGroup.rank}` : "-", icon: TrendingUp, variant: "emerald", delay: 0.4 },
      ],
      sections: [
        {
          left: sectionWidget(STANDINGS, 7, { description: "Where your group sits now" }),
          right: [sectionWidget(PARTICIPANT_HIGHLIGHTS, 5, { userGroupId: true }), sectionWidget(UPCOMING_EVENTS, 5, {})],
          leftCols: 7,
        },
      ],
    },
    coordinator: {
      stats: [
        { title: "Assigned events", value: coordinatorEvents.length, subtitle: `${events.length} total events`, icon: Calendar, variant: "indigo", delay: 0.1 },
        { title: "Pending review", value: pendingCount, icon: AlertCircle, variant: "amber", delay: 0.2 },
        { title: "Live events", value: liveEvents.length, icon: Activity, variant: "emerald", delay: 0.3 },
      ],
      sections: [
        {
          left: sectionWidget(RECENT_WINNERS, 7, { description: "Released event results" }),
          right: [sectionWidget(PARTICIPANT_HIGHLIGHTS, 5), sectionWidget(UPCOMING_EVENTS, 5, {})],
          leftCols: 7,
        },
      ],
    },
    guest: {
      stats: [],
      sections: [
        {
          left: sectionWidget(STANDINGS, 7, { description: "Current competition ranking", userHouseId: false }),
          right: [sectionWidget(PARTICIPANT_HIGHLIGHTS, 5), sectionWidget(TOP_HOUSES, 5)],
          leftCols: 7,
        },
        {
          left: sectionWidget(RECENT_WINNERS, 6, { description: "Latest released event results" }),
          right: sectionWidget(UPCOMING_EVENTS, 6, {}),
          leftCols: 6,
        },
      ],
    },
  };

  const renderDashboardByRole = (kind) => {
    if (kind === "judge") return renderJudgeWidgets();
    if (kind === "guest") {
      // Guest uses the standard layout, no stat cards
      const layout = ROLE_LAYOUTS[kind];
      return (
        <div className="space-y-6">{layout.sections.map((s, i) => <React.Fragment key={i}>{sectionPanel(s.left, s.right, s.leftCols)}</React.Fragment>)}</div>
      );
    }
    const layout = ROLE_LAYOUTS[kind];
    if (!layout) return null;
    return (
      <div className="space-y-6">
        <StatCardsRow cards={layout.stats} count={layout.stats.length} />
        {layout.sections.map((s, i) => <React.Fragment key={i}>{sectionPanel(s.left, s.right, s.leftCols)}</React.Fragment>)}
      </div>
    );
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <FadeIn delay={0.1}>
        {renderDashboardByRole(dashboardKind)}
      </FadeIn>

      <FadeIn delay={0.3}>
        {dashboardKind !== "judge" && (
          <SectionCard title={`${groupLabel} performance`} description="Standings and points">
            <div className="h-80 w-full">
              <HousePerformanceChart data={normalizedScoreboard} userHouseId={userGroupId} />
            </div>
          </SectionCard>
        )}
      </FadeIn>

      {dashboardKind !== "guest" && dashboardKind !== "admin" && dashboardKind !== "judge" && (
        <FadeIn delay={0.5} className="w-full max-w-sm">
          <TopHouses scoreboard={normalizedScoreboard} />
        </FadeIn>
      )}
    </div>
  );
}
