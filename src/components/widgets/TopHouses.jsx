import React from "react";
import { Trophy, Medal, Star, Crown, TrendingUp } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";

const getIcon = (index) => {
  if (index === 0) return <Crown className="h-4 w-4 text-warning" />;
  if (index === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
  if (index === 2) return <Medal className="h-4 w-4 text-accent-amber" />;
  return <Star className="h-4 w-4 text-muted-foreground" />;
};

const getRankClasses = (index) => {
  if (index === 0) {
    return "border-warning/30 bg-warning/10 text-warning";
  }
  if (index === 1) {
    return "border-muted-foreground/30 bg-muted/10 text-muted-foreground";
  }
  if (index === 2) {
    return "border-accent-amber/30 bg-accent-amber/10 text-accent-amber";
  }
  return "border-border bg-muted/10 text-muted-foreground";
};

export default function TopHouses({ scoreboard = [] }) {
  const { groupLabel = "House", groupLabelPlural = "Houses" } = useCompetition() || {};
  const topHouses = scoreboard.slice(0, 3);

  if (!topHouses.length) {
    return (
      <div className="card-secondary flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <Trophy className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Standings not yet calculated</p>
      </div>
    );
  }

  return (
    <div className="card-secondary max-w-full overflow-hidden">
      <div className="flex flex-col gap-1 border-b px-5 pb-4 pt-5" style={{ borderBottomColor: "var(--border-divider)" }}>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--card-fg)" }}>
            Top {groupLabelPlural.toLowerCase()}
          </h3>
        </div>
        <p className="pl-6 text-xs" style={{ color: "var(--chart-axis)" }}>
          Top performing {groupLabelPlural.toLowerCase()}
        </p>
      </div>

      <div className="space-y-1.5 p-3">
        {topHouses.map((houseObj, index) => (
          <div
            key={houseObj.house?._id || index}
            className={`flex items-center justify-between rounded-xl border p-3 transition-colors duration-200 ${getRankClasses(index)}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70">
                {getIcon(index)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: "var(--card-fg)" }}>
                  {houseObj.house?.name || `Unknown ${groupLabel}`}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px]" style={{ color: "var(--chart-axis)" }}>
                    {houseObj.house?.code}
                  </p>
                  {index === 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-primary">
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