import React from "react";
import useDashboardData from "../../hooks/useDashboardData";
import { useAuth } from "../AuthContext";
import { Calendar, Trophy, AlertCircle, CheckCircle, Activity, TrendingUp, Medal, ClipboardCheck, Flag } from "lucide-react";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";

import StatCard from "../StatCard";
import TopHouses from "../widgets/TopHouses";
import HousePerformanceChart from "../charts/HousePerformanceChart";
import ResultStatusChart from "../charts/ResultStatusChart";
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
  const winners = results
    .filter((result) => result.status === "approved" && Number(result.position) === 1)
    .sort((a, b) => (getDateValue(b)?.getTime() || 0) - (getDateValue(a)?.getTime() || 0))
    .slice(0, 5);

  if (!winners.length) {
    return <EmptyPanel icon={Medal} message="Recent winners will show once first-place results are approved." />;
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

export default function DashboardVisuals() {
  const { data, loading, error } = useDashboardData();
  const { role, user } = useAuth();
  const { hasPermission } = usePermission();
  const { groupLabel = "House", groupLabelPlural = "Houses" } = useCompetition() || {};
  const userHouseId = user?.house?._id || user?.house;
  const userGroupId = getId(userHouseId);

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

  const { scoreboard, events, results, schedules, systemStats } = data;
  const normalizedScoreboard = normalizeScoreboard(scoreboard);
  const pendingResults = results.filter((r) => r.status === "pending");
  const liveEvents = events.filter((e) => e.status === "live");
  const completedEvents = events.filter((e) => e.status === "completed");
  const nextEvents = events.filter((e) => e.status !== "completed");
  const leader = normalizedScoreboard[0];
  const dashboardKind = hasPermission("manage_permissions") || hasPermission("manage_groups") || hasPermission("edit_approved_score")
    ? "admin"
    : hasPermission("manage_own_group_profile")
      ? "captain"
      : hasPermission("submit_score")
        ? "coordinator"
        : hasPermission("approve_score")
          ? "faculty"
          : "guest";

  const renderAdminWidgets = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Events running" value={liveEvents.length} subtitle={`${nextEvents.length} open or upcoming`} icon={Flag} variant="indigo" delay={0.1} />
        <StatCard title="Completed events" value={completedEvents.length} subtitle={`${events.length} total events`} icon={CheckCircle} variant="emerald" delay={0.2} />
        <StatCard title="Pending results" value={pendingResults.length} subtitle="Need review before points count" icon={ClipboardCheck} variant="amber" delay={0.3} />
        <StatCard title="Current leader" value={leader ? `#${leader.rank || 1}` : "-"} subtitle={leader ? `${getScoreboardName(leader)} - ${getScoreboardPoints(leader).toLocaleString()} pts` : "No points yet"} icon={Trophy} variant="violet" delay={0.4} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SectionCard title="Standings" description={`${groupLabelPlural} ranked by approved points`} className="lg:col-span-7">
          <StandingsTable scoreboard={normalizedScoreboard} userHouseId={userGroupId} />
        </SectionCard>
        <SectionCard title="Result progress" description="Approval status across submitted results" className="lg:col-span-5">
          <ResultProgress results={results} />
        </SectionCard>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Recent winners" description="Latest approved first-place results">
          <RecentWinners results={results} />
        </SectionCard>
        <SectionCard title="New events" description="Live and upcoming competition events">
          <UpcomingEvents events={events} schedules={schedules} />
        </SectionCard>
      </div>
    </div>
  );

  const renderCaptainWidgets = () => {
    const houseTeamsCount = systemStats?.byHouse?.find((h) => getId(h.house_id) === userGroupId)?.count || 0;
    const currentGroup = normalizedScoreboard.find((h) => getScoreboardId(h) === userGroupId);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Registered teams" value={houseTeamsCount} icon={Activity} variant="indigo" delay={0.1} />
          <StatCard title="Available events" value={nextEvents.length} icon={Calendar} variant="violet" delay={0.2} />
          <StatCard title="Group points" value={currentGroup ? getScoreboardPoints(currentGroup) : 0} icon={Trophy} variant="amber" delay={0.3} />
          <StatCard title="Current rank" value={currentGroup ? `#${currentGroup.rank}` : "-"} icon={TrendingUp} variant="emerald" delay={0.4} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard title="Standings" description="Where your group sits now">
            <StandingsTable scoreboard={normalizedScoreboard} userHouseId={userGroupId} />
          </SectionCard>
          <SectionCard title="New events" description="Live and upcoming competition events">
            <UpcomingEvents events={events} schedules={schedules} />
          </SectionCard>
        </div>
      </div>
    );
  };

  const renderStudentCoordinatorWidgets = () => {
    const pendingCount = results.filter((r) => r.status === "pending").length;
    const mySubmissions = results.filter((r) => r.submitted_by === user?.id).length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="My submissions" value={mySubmissions} icon={CheckCircle} variant="emerald" delay={0.1} />
          <StatCard title="Pending review" value={pendingCount} icon={AlertCircle} variant="amber" delay={0.2} />
          <StatCard title="Live events" value={liveEvents.length} icon={Activity} variant="indigo" delay={0.3} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard title="Recent winners" description="Approved first-place results">
            <RecentWinners results={results} />
          </SectionCard>
          <SectionCard title="New events" description="Live and upcoming competition events">
            <UpcomingEvents events={events} schedules={schedules} />
          </SectionCard>
        </div>
      </div>
    );
  };

  const renderFacultyWidgets = () => {
    const pendingCount = results.filter((r) => r.status === "pending").length;
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <StatCard title="Pending review" value={pendingCount} icon={AlertCircle} variant="amber" delay={0.1} />
          <StatCard title="Reviewed results" value={results.length - pendingCount} icon={CheckCircle} variant="emerald" delay={0.2} />
        </div>
        <SectionCard title="Review status" description="Result review progress" className="lg:col-span-8">
          <div className="h-[300px] w-full">
            <ResultStatusChart results={results} />
          </div>
        </SectionCard>
        <SectionCard title="Recent winners" description="Latest approved first-place results" className="lg:col-span-6">
          <RecentWinners results={results} />
        </SectionCard>
        <SectionCard title="Standings" description={`${groupLabelPlural} ranked by approved points`} className="lg:col-span-6">
          <StandingsTable scoreboard={normalizedScoreboard} userHouseId={userGroupId} />
        </SectionCard>
      </div>
    );
  };

  const renderGuestWidgets = () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <SectionCard title="Standings" description="Current competition ranking" className="lg:col-span-7">
        <StandingsTable scoreboard={normalizedScoreboard} />
      </SectionCard>
      <div className="lg:col-span-4">
        <TopHouses scoreboard={normalizedScoreboard} />
      </div>
      <SectionCard title="Recent winners" description="Latest approved first-place results" className="lg:col-span-6">
        <RecentWinners results={results} />
      </SectionCard>
      <SectionCard title="New events" description="Live and upcoming competition events" className="lg:col-span-6">
        <UpcomingEvents events={events} schedules={schedules} />
      </SectionCard>
    </div>
  );

  const isEmpty = events.length === 0 && results.length === 0;

  if (!loading && !error && isEmpty) {
    return (
      <div className="flex w-full flex-col gap-6 mt-4">
        <DashboardEmptyState role={role} />
      </div>
    );
  }

  if (!hasPermission("view_analytics")) {
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

  return (
    <div className="flex w-full flex-col gap-6">
      <FadeIn delay={0.1}>
        {dashboardKind === "admin" && renderAdminWidgets()}
        {dashboardKind === "captain" && renderCaptainWidgets()}
        {dashboardKind === "coordinator" && renderStudentCoordinatorWidgets()}
        {dashboardKind === "faculty" && renderFacultyWidgets()}
        {dashboardKind === "guest" && renderGuestWidgets()}
      </FadeIn>

      <FadeIn delay={0.3}>
      <SectionCard title={`${groupLabel} performance`} description="Standings and points">
          <div className="h-[320px] w-full sm:h-[380px]">
            <HousePerformanceChart data={normalizedScoreboard} userHouseId={userGroupId} />
          </div>
        </SectionCard>
      </FadeIn>

      {dashboardKind !== "guest" && dashboardKind !== "admin" && (
        <FadeIn delay={0.5} className="w-full max-w-sm">
          <TopHouses scoreboard={normalizedScoreboard} />
        </FadeIn>
      )}
    </div>
  );
}
