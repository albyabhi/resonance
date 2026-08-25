import React, { useEffect, useState } from "react";
import { Trophy, CalendarRange, Medal, TrendingUp } from "lucide-react";

function CountUp({ target, duration = 900 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{value}</>;
}

export default function PublicStats({ stats, primaryColor = "#2563EB" }) {
  const cards = [
    {
      key: "groups",
      label: "Groups",
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-8 relative z-10">
        {cards.map((card) => (
          <div
            key={card.key}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl flex items-center gap-4"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}
            >
              <card.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-white leading-none">{card.display}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1 truncate">
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
