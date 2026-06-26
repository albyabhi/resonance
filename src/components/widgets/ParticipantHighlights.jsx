import React from "react";
import { Star, Award, Zap, Sparkles } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";

const getIcon = (index) => {
  if (index === 0) return <Award className="h-4 w-4 text-amber-500 dark:text-amber-400" />; // Gold
  if (index === 1) return <Award className="h-4 w-4 text-slate-400 dark:text-slate-500" />;  // Silver
  if (index === 2) return <Award className="h-4 w-4 text-amber-600 dark:text-amber-700" />;  // Bronze
  return <Star className="h-4 w-4 text-slate-300 dark:text-slate-500" />;
};

const getRankClasses = (index) => {
  if (index === 0) {
    return "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300";
  }
  if (index === 1) {
    return "border-slate-200 bg-slate-50/50 text-slate-700 dark:border-slate-500/15 dark:bg-slate-500/5 dark:text-slate-300";
  }
  if (index === 2) {
    return "border-amber-700/20 bg-amber-700/5 text-amber-900 dark:border-amber-700/20 dark:bg-amber-700/5 dark:text-amber-400";
  }
  return "border-slate-200 bg-slate-50/30 text-slate-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300";
};

export default function ParticipantHighlights({ participantStats = { overall: { topPerformers: [], mostParticipations: [] }, byGroup: {} }, userGroupId = null }) {
  const { groupLabel = "Group" } = useCompetition() || {};

  // Resolve which stats lists we are looking at (overall or group-specific)
  let topPerformers = [];
  let mostParticipations = [];

  if (userGroupId && participantStats?.byGroup?.[userGroupId]) {
    topPerformers = participantStats.byGroup[userGroupId].topPerformers || [];
    mostParticipations = participantStats.byGroup[userGroupId].mostParticipations || [];
  } else {
    topPerformers = participantStats?.overall?.topPerformers || [];
    mostParticipations = participantStats?.overall?.mostParticipations || [];
  }

  const top3Performers = topPerformers.slice(0, 3);
  const top3Active = mostParticipations.slice(0, 3);

  if (!topPerformers.length && !mostParticipations.length) {
    return (
      <div className="card-secondary flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
          <Sparkles className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--card-fg)" }}>Participant Highlights</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Contributions will appear once results are approved.</p>
      </div>
    );
  }

  return (
    <div className="card-secondary max-w-full overflow-hidden">
      <div className="flex flex-col gap-1 border-b px-5 pb-3 pt-5" style={{ borderBottomColor: "var(--border-divider)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--card-fg)" }}>
              {userGroupId ? "Your Group's Stars" : "Top Participants"}
            </h3>
          </div>
          <span className="rounded bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
            Genuine Positions
          </span>
        </div>
        <p className="pl-6 text-xs" style={{ color: "var(--chart-axis)" }}>
          {userGroupId ? "Top contributors in your team" : "Top contributors overall"}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Section 1: Points Contributed */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Top Contributors (Top 3)</span>
          </div>
          <div className="space-y-1.5">
            {top3Performers.map((item, index) => (
              <div
                key={item.participant_id || index}
                className={`flex items-center justify-between rounded-xl border p-3 transition-colors duration-200 ${getRankClasses(index)}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-white/5">
                    {getIcon(index)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--card-fg)" }}>
                      {item.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--chart-axis)" }}>
                      {item.group_name}
                    </p>
                  </div>
                </div>

                <div className="pl-3 text-right">
                  <p className="text-base font-semibold leading-none" style={{ color: "var(--card-fg)" }}>
                    {item.points.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[10px]" style={{ color: "var(--chart-axis)" }}>
                    pts
                  </p>
                </div>
              </div>
            ))}
            {!top3Performers.length && (
              <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No contributions recorded in this category yet.
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Events Entered */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Star className="h-3.5 w-3.5 text-violet-500" />
            <span>Most Active (Top 3)</span>
          </div>
          <div className="space-y-1.5">
            {top3Active.map((item, index) => (
              <div
                key={item.participant_id || index}
                className={`flex items-center justify-between rounded-xl border p-3 transition-colors duration-200 ${getRankClasses(index)}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-white/5">
                    {getIcon(index)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--card-fg)" }}>
                      {item.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--chart-axis)" }}>
                      {item.group_name}
                    </p>
                  </div>
                </div>

                <div className="pl-3 text-right">
                  <p className="text-base font-semibold leading-none" style={{ color: "var(--card-fg)" }}>
                    {item.participations}
                  </p>
                  <p className="mt-0.5 text-[10px]" style={{ color: "var(--chart-axis)" }}>
                    events
                  </p>
                </div>
              </div>
            ))}
            {!top3Active.length && (
              <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No active participation recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
