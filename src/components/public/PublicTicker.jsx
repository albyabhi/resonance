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
      <div className="text-center text-neutral-500 py-16 border border-dashed border-neutral-800 rounded-2xl">
        No recent results yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ticker.map((item) => (
        <div key={item._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 truncate">
                {item.event?.title || item.event?.name || "Event"}
              </p>
              {timeAgo(item.updated_at) && (
                <span className="text-[10px] text-neutral-500 shrink-0">{timeAgo(item.updated_at)}</span>
              )}
            </div>
            <p className="text-sm text-white font-medium truncate">
              <span className="text-neutral-400">{ordinal(item.position)} place</span>
              {" — "}
              {item.group?.name || "Unknown"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-emerald-400 font-bold">+{item.points}</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">pts</div>
          </div>
        </div>
      ))}
    </div>
  );
}
