import React from "react";
import { Trophy, CalendarRange, Medal, TrendingUp } from "lucide-react";
import CountUp from "./CountUp";
import { tintedBackground } from "../../lib/publicUtils";

// Single stat strip under the hero. Left-aligned numerals with tabular
// figures read as real data; sentence-case labels avoid the AI-uppercase look.
export default function PublicStats({ stats, primaryColor = "var(--primary)", groupLabel = "Group" }) {
  const cards = [
    { key: "groups", label: `${groupLabel}s`, value: stats.group_count ?? 0, icon: Trophy },
    { key: "events", label: "Events", value: stats.event_count ?? 0, icon: CalendarRange },
    { key: "results", label: "Published results", value: stats.published_results ?? 0, icon: Medal },
    { key: "progress", label: "Events completed", value: null, icon: TrendingUp },
  ];

  return (
    <section aria-label="Competition at a glance" className="container-public">
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-5">
        {cards.map((card) => (
          <div
            key={card.key}
            className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 min-w-0"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: tintedBackground(primaryColor), color: primaryColor }}
              aria-hidden="true"
            >
              <card.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <dd className="text-2xl font-bold text-foreground leading-none tabular order-first">
                {card.key === "progress" ? (
                  <>{stats.progress_percent ?? 0}%</>
                ) : (
                  <CountUp target={card.value} />
                )}
              </dd>
              <dt className="text-xs font-medium text-muted-foreground mt-1 truncate">{card.label}</dt>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
