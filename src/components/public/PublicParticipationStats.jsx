import React from "react";
import { Users, CalendarRange, Medal, TrendingUp, Target } from "lucide-react";
import CountUp from "./CountUp";

export default function PublicParticipationStats({ stats, primaryColor = "var(--primary)" }) {
  if (!stats) return null;

  const cards = [
    {
      key: "teams",
      label: "Teams",
      value: stats.total_teams || 0,
      icon: Users,
      display: <CountUp target={stats.total_teams || 0} />,
    },
    {
      key: "events",
      label: "Total Events",
      value: stats.event_count || 0,
      icon: CalendarRange,
      display: <CountUp target={stats.event_count || 0} />,
    },
    {
      key: "completed",
      label: "Completed",
      value: stats.completed_events || 0,
      icon: Target,
      display: <CountUp target={stats.completed_events || 0} />,
    },
    {
      key: "results",
      label: "Published Results",
      value: stats.published_results || 0,
      icon: Medal,
      display: <CountUp target={stats.published_results || 0} />,
    },
    {
      key: "progress",
      label: "Progress",
      value: stats.progress_percent || 0,
      icon: TrendingUp,
      display: <>{stats.progress_percent || 0}%</>,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-5 h-5" style={{ color: primaryColor }} />
        <h3 className="font-bold text-foreground">Competition Overview</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.key} className="text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}
            >
              <card.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-foreground leading-none">
              {card.display}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
