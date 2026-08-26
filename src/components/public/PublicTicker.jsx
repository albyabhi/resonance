import React from "react";
import { Zap } from "lucide-react";

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const timeAgo = (date) => {
  if (!date) return "";
  try {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return "";
  }
};

export default function PublicTicker({ ticker }) {
  if (ticker.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
        No recent results yet.
      </div>
    );
  }

  return (
    <div className="ticker-band rounded-2xl p-5">
      <div className="space-y-3">
        {ticker.map((item) => (
          <div key={item._id} className="rounded-2xl px-5 py-4 flex items-center gap-4 bg-[color:var(--ticker-text)]/10 border border-[color:var(--ticker-text)]/15">
            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-[color:var(--ticker-text)]/15 border border-[color:var(--ticker-text)]/20">
              <Zap className="w-4 h-4" style={{ color: "var(--ticker-text)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider truncate" style={{ fontFamily: "var(--font-mono)", color: "var(--ticker-text)" }}>
                  {item.event?.title || item.event?.name || "Event"}
                </p>
                {timeAgo(item.updated_at) && (
                  <span className="text-[10px] shrink-0 text-[color:var(--ticker-text)]/60">{timeAgo(item.updated_at)}</span>
                )}
              </div>
              <p className="text-sm font-medium truncate" style={{ color: "var(--ticker-text)" }}>
                <span className="text-[color:var(--ticker-text)]/60">{ordinal(item.position)} place</span>
                {" — "}
                {item.group?.name || "Unknown"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-bold" style={{ color: "var(--ticker-text)" }}>+{item.points}</div>
              <div className="text-[10px] uppercase tracking-widest text-[color:var(--ticker-text)]/60">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}