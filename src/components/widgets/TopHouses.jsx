import React from "react";
import { Trophy, Medal, Star, Crown, TrendingUp } from "lucide-react";

const getIcon = (index) => {
  if (index === 0) return <Crown className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />;
  if (index === 1) return <Medal className="h-4 w-4 text-slate-400 dark:text-slate-500" />;
  if (index === 2) return <Medal className="h-4 w-4 text-violet-400 dark:text-violet-500" />;
  return <Star className="h-4 w-4 text-slate-300" />;
};

/* Rank backgrounds:
   Light mode → solid colors (no transparency)
   Dark mode  → rgba tints (transparency works on dark bg) */
const getRankStyle = (index, isDark) => {
  if (index === 0) {
    return {
      background: isDark ? 'rgba(99, 102, 241, 0.08)' : '#eef2ff',
      border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.15)' : '#c7d2fe'}`,
    };
  }
  if (index === 1) {
    return {
      background: isDark ? 'rgba(148, 163, 184, 0.06)' : '#f8fafc',
      border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : '#e2e8f0'}`,
    };
  }
  if (index === 2) {
    return {
      background: isDark ? 'rgba(139, 92, 246, 0.06)' : '#f5f3ff',
      border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.1)' : '#ddd6fe'}`,
    };
  }
  return {
    background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.04)' : '#e2e8f0'}`,
  };
};

export default function TopHouses({ scoreboard = [] }) {
  const topHouses = scoreboard.slice(0, 3);

  /* Detect dark from the CSS variable value */
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  if (!topHouses.length) {
    return (
      <div className="card-secondary flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--chart-surface)' }}>
          <Trophy className="h-6 w-6" style={{ color: 'var(--chart-axis)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Standings not yet calculated</p>
      </div>
    );
  }

  return (
    <div className="card-secondary max-w-full overflow-hidden">
      <div className="flex flex-col gap-1 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-divider)' }}>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--card-fg)' }}>Top houses</h3>
        </div>
        <p className="pl-6 text-xs" style={{ color: 'var(--chart-axis)' }}>Top performing teams</p>
      </div>
      <div className="space-y-1.5 p-3">
        {topHouses.map((houseObj, index) => (
          <div
            key={houseObj.house?._id || index}
            className="flex items-center justify-between rounded-xl p-3 transition-colors duration-200"
            style={getRankStyle(index, isDark)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--chart-surface)' }}>
                {getIcon(index)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--card-fg)' }}>{houseObj.house?.name || "Unknown House"}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px]" style={{ color: 'var(--chart-axis)' }}>{houseObj.house?.code}</p>
                  {index === 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400">
                      <TrendingUp className="h-3 w-3" /> Leading
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="pl-3 text-right">
              <p className="text-base font-semibold leading-none" style={{ color: 'var(--card-fg)' }}>{houseObj.points}</p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--chart-axis)' }}>pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
