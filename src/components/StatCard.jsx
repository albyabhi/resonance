import React from "react";
import { FadeIn } from "./AnimateReveal";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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
    <FadeIn delay={delay} className="h-full">
      <div className="card-premium relative flex h-full w-full max-w-full flex-col overflow-hidden">
        <div className={`absolute left-0 right-0 top-0 h-1 ${v.accent} opacity-80`} />

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className={`rounded-2xl p-3 shadow-sm ${v.iconBg}`}>
            {Icon && <Icon className="h-5 w-5" />}
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

        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--chart-axis)' }}>{title}</h4>
            <p className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--card-fg)' }}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          </div>

          {subtitle && (
            <div className="pt-4" style={{ borderTop: '1px solid var(--border-divider)' }}>
              <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--chart-axis)' }}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                {subtitle}
              </p>
            </div>
          )}
        </div>
      </div>
    </FadeIn>
  );
}

export default StatCard;
