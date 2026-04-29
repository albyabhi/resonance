import React from "react";
import { Trophy, Medal, Star, Crown, TrendingUp } from "lucide-react";

const getIcon = (index) => {
  if (index === 0) return <Crown className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />;
  if (index === 1) return <Medal className="h-4 w-4 text-slate-400 dark:text-slate-500" />;
  if (index === 2) return <Medal className="h-4 w-4 text-violet-400 dark:text-violet-500" />;
  return <Star className="h-4 w-4 text-slate-300 dark:text-slate-500" />;
};

const getRankClasses = (index) => {
  if (index === 0) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300";
  }
  if (index === 1) {
    return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/15 dark:bg-slate-500/10 dark:text-slate-300";
  }
  if (index === 2) {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300";
};

export default function TopHouses({ scoreboard = [] }) {
  const topHouses = scoreboard.slice(0, 3);

  if (!topHouses.length) {
    return (
      <div className="card-secondary flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
          <Trophy className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Standings not yet calculated</p>
      </div>
    );
  }

  return (
    <div className="card-secondary max-w-full overflow-hidden">
      <div className="flex flex-col gap-1 border-b px-5 pb-4 pt-5" style={{ borderBottomColor: "var(--border-divider)" }}>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--card-fg)" }}>
            Top houses
          </h3>
        </div>
        <p className="pl-6 text-xs" style={{ color: "var(--chart-axis)" }}>
          Top performing teams
        </p>
      </div>

      <div className="space-y-1.5 p-3">
        {topHouses.map((houseObj, index) => (
          <div
            key={houseObj.house?._id || index}
            className={`flex items-center justify-between rounded-xl border p-3 transition-colors duration-200 ${getRankClasses(index)}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-white/5">
                {getIcon(index)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: "var(--card-fg)" }}>
                  {houseObj.house?.name || "Unknown House"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px]" style={{ color: "var(--chart-axis)" }}>
                    {houseObj.house?.code}
                  </p>
                  {index === 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400">
                      <TrendingUp className="h-3 w-3" /> Leading
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pl-3 text-right">
              <p className="text-base font-semibold leading-none" style={{ color: "var(--card-fg)" }}>
                {houseObj.points}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--chart-axis)" }}>
                pts
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
