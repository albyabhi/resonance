import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ordinal, timeAgo } from "../../lib/publicUtils";

const PAGE_SIZE = 6;

// Recent-results timeline. Replaces the old mono uppercase ticker block with
// a readable list: event → placement → group → points → recency.
export default function PublicTicker({ ticker }) {
  const [showAll, setShowAll] = useState(false);

  if (!ticker || ticker.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="font-semibold text-foreground">No updates yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Published placements will show up here in real time.
        </p>
      </div>
    );
  }

  const visibleItems = showAll ? ticker : ticker.slice(0, PAGE_SIZE);

  return (
    <div>
      <ol className="relative ml-1.5 border-l border-border space-y-5 pl-5">
        {visibleItems.map((item) => (
          <li key={item._id} className="relative">
            <span
              className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-foreground leading-snug">
              {item.event?.title || "Event"}
              <span className="font-normal text-muted-foreground">
                {" · "}
                {ordinal(item.position)} place
              </span>
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {item.group?.name || "Unknown"}
              <span className="tabular font-semibold text-foreground"> · +{item.points} pts</span>
            </p>
            {timeAgo(item.updated_at) && (
              <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.updated_at)}</p>
            )}
          </li>
        ))}
      </ol>
      {ticker.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
          aria-expanded={showAll}
        >
          {showAll ? "Show fewer updates" : `Show all ${ticker.length} updates`}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${showAll ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
