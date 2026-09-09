import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import CountUp from "./CountUp";
import { tintedBackground } from "../../lib/publicUtils";

// Overview facts + a progress ring. Grid collapses to 2 columns on phones
// instead of the old 5-across squeeze.
export default function PublicParticipationStats({ stats, primaryColor = "var(--primary)" }) {
  if (!stats) return null;

  const progress = Math.max(0, Math.min(100, stats.progress_percent || 0));
  const ringData = [
    { name: "done", value: progress },
    { name: "remaining", value: 100 - progress },
  ];

  const facts = [
    { key: "teams", label: "Teams", value: stats.total_teams ?? 0 },
    { key: "events", label: "Events", value: stats.event_count ?? 0 },
    { key: "completed", label: "Completed", value: stats.completed_events ?? 0 },
    { key: "results", label: "Published results", value: stats.published_results ?? 0 },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex items-center gap-4 sm:w-56 shrink-0">
          <div className="relative w-24 h-24 shrink-0" role="img" aria-label={`${progress}% of events completed`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ringData}
                  dataKey="value"
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  <Cell fill="var(--primary)" />
                  <Cell fill="var(--muted)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular text-foreground">
              {progress}%
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground leading-tight">Competition progress</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.completed_events ?? 0} of {stats.event_count ?? 0} events finished
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
          {facts.map((fact) => (
            <div
              key={fact.key}
              className="rounded-lg px-3 py-2.5 min-w-0"
              style={{ backgroundColor: tintedBackground(primaryColor) }}
            >
              <dd className="text-2xl font-bold tabular text-foreground leading-none">
                <CountUp target={fact.value} />
              </dd>
              <dt className="text-xs font-medium text-muted-foreground mt-1 truncate">{fact.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
