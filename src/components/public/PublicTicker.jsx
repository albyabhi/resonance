import React from "react";
import { Zap } from "lucide-react";
import { ordinal, timeAgo } from "../../lib/publicUtils";

export default function PublicTicker({ ticker }) {
  if (ticker.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
        No recent results yet.
      </div>
    );
  }

  return (
    <div className="bg-ticker-bg text-ticker-text rounded-2xl p-5 font-mono text-xs tracking-wider uppercase overflow-hidden">
      <div className="space-y-3">
        {ticker.map((item) => (
          <div key={item._id} className="rounded-2xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15">
            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white/15 border border-white/20">
              <Zap className="w-4 h-4 text-ticker-text" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider truncate text-ticker-text">
                  {item.event?.title || item.event?.name || "Event"}
                </p>
                {timeAgo(item.updated_at) && (
                  <span className="text-[10px] shrink-0 text-ticker-text/60">{timeAgo(item.updated_at)}</span>
                )}
              </div>
              <p className="text-sm font-medium truncate text-ticker-text">
                <span className="text-ticker-text/60">{ordinal(item.position)} place</span>
                {" — "}
                {item.group?.name || "Unknown"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-bold text-ticker-text">+{item.points}</div>
              <div className="text-[10px] uppercase tracking-widest text-ticker-text/60">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
