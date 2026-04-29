import React from "react";
import useDashboardData from "../../hooks/useDashboardData";
import { useAuth } from "../AuthContext";
import { Users, Calendar, Trophy, AlertCircle, CheckCircle, Activity, TrendingUp } from "lucide-react";

import StatCard from "../StatCard";
import TopHouses from "../widgets/TopHouses";
import HousePerformanceChart from "../charts/HousePerformanceChart";
import EventDistributionChart from "../charts/EventDistributionChart";
import ResultStatusChart from "../charts/ResultStatusChart";
import EventTimelineChart from "../charts/EventTimelineChart";
import { FadeIn } from "../AnimateReveal";
import DashboardEmptyState from "./DashboardEmptyState";

function SectionCard({ title, description, className = "", children, noPad = false }) {
  return (
    <div className={`card-premium ${className}`}>
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border-divider)' }}>
        <h3 className="text-base font-semibold" style={{ color: 'var(--card-fg)' }}>{title}</h3>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--chart-axis)' }}>{description}</p>
      </div>
      <div className="p-4">
        <div className="chart-surface">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardVisuals() {
  const { data, loading, error } = useDashboardData();
  const { role, user } = useAuth();
  const userHouseId = user?.house?._id || user?.house;

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

  const renderAdminWidgets = () => (
    <div className="space-y-6">
      {systemStats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Users" value={systemStats.totalUsers || 0} icon={Users} variant="indigo" trend={{ value: 4.2, isUp: true }} delay={0.1} />
          <StatCard title="Events" value={events.length} icon={Calendar} variant="violet" trend={{ value: 12, isUp: true }} delay={0.2} />
          <StatCard title="Teams" value={systemStats.totalTeams || 0} icon={Activity} variant="amber" trend={{ value: 2.1, isUp: false }} delay={0.3} />
          <StatCard title="Uptime" value="99.9%" icon={CheckCircle} variant="emerald" trend={{ value: 0.1, isUp: true }} delay={0.4} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SectionCard title="Timeline" description="Scheduled events" className="lg:col-span-8">
          <div className="h-[300px] w-full">
            <EventTimelineChart schedules={schedules} />
          </div>
        </SectionCard>
        <SectionCard title="Event breakdown" description="By event type" className="lg:col-span-4">
          <div className="h-[300px] w-full">
            <EventDistributionChart events={events} />
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderCaptainWidgets = () => {
    const houseTeamsCount = systemStats?.byHouse?.find((h) => h.house_id === userHouseId)?.count || 0;
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Teams" value={houseTeamsCount} icon={Users} variant="indigo" trend={{ value: 8, isUp: true }} delay={0.1} />
        <StatCard title="Events" value={events.length} icon={Calendar} variant="violet" trend={{ value: 5, isUp: true }} delay={0.2} />
        <StatCard title="Standing" value={scoreboard.find((h) => h.house_id === userHouseId)?.score || 0} icon={Trophy} variant="amber" trend={{ value: 12, isUp: true }} delay={0.3} />
        <StatCard title="Rank" value={`#${scoreboard.findIndex((h) => h.house_id === userHouseId) + 1}`} icon={TrendingUp} variant="emerald" trend={{ value: 1, isUp: true }} delay={0.4} />
      </div>
    );
  };

  const renderStudentCoordinatorWidgets = () => {
    const pendingCount = results.filter((r) => r.status === "pending").length;
    const mySubmissions = results.filter((r) => r.submitted_by === user?.id).length;

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Submitted" value={mySubmissions} icon={CheckCircle} variant="emerald" trend={{ value: 15, isUp: true }} delay={0.1} />
        <StatCard title="Pending" value={pendingCount} icon={AlertCircle} variant="amber" trend={{ value: 2, isUp: false }} delay={0.2} />
        <StatCard title="Open events" value={events.filter((e) => e.status === "live").length} icon={Activity} variant="indigo" delay={0.3} />
      </div>
    );
  };

  const renderFacultyWidgets = () => {
    const pendingCount = results.filter((r) => r.status === "pending").length;
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <StatCard title="Pending" value={pendingCount} icon={AlertCircle} variant="amber" trend={{ value: 15, isUp: true }} delay={0.1} />
          <StatCard title="Reviewed" value={results.length - pendingCount} icon={CheckCircle} variant="emerald" trend={{ value: 8, isUp: true }} delay={0.2} />
        </div>
        <SectionCard title="Review status" description="Result review progress" className="lg:col-span-8">
          <div className="h-[300px] w-full">
            <ResultStatusChart results={results} />
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderGuestWidgets = () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <SectionCard title="Event breakdown" description="Competitive spread across categories" className="lg:col-span-8">
        <div className="h-[360px] w-full">
          <EventDistributionChart events={events} />
        </div>
      </SectionCard>
      <div className="lg:col-span-4">
        <TopHouses scoreboard={scoreboard} />
      </div>
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

  return (
    <div className="flex w-full flex-col gap-6">
      <FadeIn delay={0.1}>
        {role === "admin" && renderAdminWidgets()}
        {role === "captain" && renderCaptainWidgets()}
        {role === "student_coordinator" && renderStudentCoordinatorWidgets()}
        {(role === "faculty" || role === "faculty_coordinator") && renderFacultyWidgets()}
        {(!role || role === "guest") && renderGuestWidgets()}
      </FadeIn>

      <FadeIn delay={0.3}>
      <SectionCard title="House performance" description="Standings and points">
          <div className="h-[320px] w-full sm:h-[380px]">
            <HousePerformanceChart data={scoreboard} userHouseId={userHouseId} />
          </div>
        </SectionCard>
      </FadeIn>

      {role !== "guest" && role !== "admin" && (
        <FadeIn delay={0.5} className="w-full max-w-sm">
          <TopHouses scoreboard={scoreboard} />
        </FadeIn>
      )}
    </div>
  );
}
