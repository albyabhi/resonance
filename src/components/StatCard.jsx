import React from "react";
import { FadeIn } from "./AnimateReveal";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const shortenTitle = (t) => {
  const map = {
    "Events running": "Running",
    "Completed events": "Completed",
    "Pending results": "Pending",
    "Current leader": "Leader",
    "Registered teams": "Teams",
    "Available events": "Events",
    "Group points": "Points",
    "Current rank": "Rank",
    "My submissions": "Submissions",
    "Pending review": "Pending",
    "Live events": "Live",
    "Reviewed results": "Reviewed",
  };
  return map[t] || t;
};

function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = "indigo",
  delay = 0,
}) {
  const variants = {
    indigo: {
      accent: "bg-indigo-500",
      iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
      trendText: "text-emerald-500",
      trendDownText: "text-rose-500",
    },
    violet: {
      accent: "bg-violet-500",
      iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
      trendText: "text-emerald-500",
      trendDownText: "text-rose-500",
    },
    emerald: {
      accent: "bg-emerald-500",
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      trendText: "text-emerald-500",
      trendDownText: "text-rose-500",
    },
    amber: {
      accent: "bg-amber-500",
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      trendText: "text-emerald-500",
      trendDownText: "text-rose-500",
    },
  };

  const v = variants[variant] || variants.indigo;

  return (
    <FadeIn delay={delay} className="h-full w-full">
      {/* Mobile Flat Layout - Extremely simple and compact, no containers, no scroll */}
      <div className="flex sm:hidden flex-col items-center justify-center p-2 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01] text-center w-full h-full min-w-0">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate w-full">
          {shortenTitle(title)}
        </span>
        <span className={`font-extrabold text-slate-900 dark:text-white mt-0.5 truncate w-full ${typeof value === "string" ? "text-[11px]" : "text-sm"}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      </div>

      {/* Desktop/Tablet Premium Card Layout */}
      <div className="hidden sm:flex card-premium relative flex-col overflow-hidden p-6 h-full w-full">
        <div className={`absolute left-0 right-0 top-0 h-1 ${v.accent} opacity-80`} />

        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-4">
          <div className={`rounded-xl p-2.5 shadow-sm ${v.iconBg}`}>
            {Icon && <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trend.isUp ? v.trendText : v.trendDownText}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                {trend.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              </span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 sm:gap-4">
          <div className="space-y-0.5">
            <h4 className="text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--chart-axis)' }}>{title}</h4>
            <p className={`font-semibold tracking-tight truncate w-full ${typeof value === "string" ? "text-lg sm:text-2xl" : "text-2xl sm:text-4xl"}`} style={{ color: 'var(--card-fg)' }}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          </div>

          {subtitle && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--border-divider)' }}>
              <p className="flex items-center gap-2 text-xs sm:text-sm truncate" style={{ color: 'var(--chart-axis)' }}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">{subtitle}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </FadeIn>
  );
}

export default StatCard;
