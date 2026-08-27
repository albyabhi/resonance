import React from "react";
import { Trophy, CalendarRange, Medal, TrendingUp } from "lucide-react";
import CountUp from "./CountUp";

export default function PublicStats({ stats, primaryColor = "var(--primary)", groupLabel = "Group" }) {
  const cards = [
    {
      key: "groups",
      label: groupLabel,
      value: stats.group_count,
      icon: Trophy,
      display: <CountUp target={stats.group_count} />,
    },
    {
      key: "events",
      label: "Events",
      value: stats.event_count,
      icon: CalendarRange,
      display: <CountUp target={stats.event_count} />,
    },
    {
      key: "results",
      label: "Published Results",
      value: stats.published_results,
      icon: Medal,
      display: <CountUp target={stats.published_results} />,
    },
    {
      key: "progress",
      label: "Event Progress",
      value: stats.progress_percent,
      icon: TrendingUp,
      display: <>{stats.progress_percent}%</>,
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-6 relative z-10">
        {cards.map((card) => (
          <div
            key={card.key}
            className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] flex items-center gap-4"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}
            >
              <card.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-foreground leading-none">{card.display}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1 truncate">
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
