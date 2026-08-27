import React, { useState } from "react";
import { Trophy, Medal, Award, ChevronDown, ChevronUp } from "lucide-react";
import { MEDAL_STYLES, ordinal } from "../../lib/publicUtils";

const POSITION_ICONS = [Trophy, Medal, Award];

export default function PublicWinners({ winners, primaryColor = "var(--primary)" }) {
  const [expandedEvent, setExpandedEvent] = useState(null);

  const eventEntries = Object.entries(winners).filter(([, w]) => w.length > 0);

  if (eventEntries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
        No winners announced yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {eventEntries.map(([eventId, eventWinners]) => {
        const firstWinner = eventWinners[0];
        const eventTitle = firstWinner?.event?.title || "Event";
        const eventCategory = firstWinner?.event?.category;
        const isExpanded = expandedEvent === eventId;

        return (
          <div key={eventId} className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
            <button
              type="button"
              onClick={() => setExpandedEvent(isExpanded ? null : eventId)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}
                >
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground truncate">{eventTitle}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {eventCategory && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                        {eventCategory}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {eventWinners.length} winner{eventWinners.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-border px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {eventWinners.map((winner, idx) => {
                    const medal = MEDAL_STYLES[idx] || MEDAL_STYLES[2];
                    const Icon = POSITION_ICONS[idx] || Award;
                    return (
                      <div
                        key={winner._id}
                        className={`flex items-center gap-3 p-4 rounded-xl border ${
                          idx === 0
                            ? "border-warning/40 bg-warning/5"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${medal.bg} ${medal.text}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground text-sm truncate">
                            {winner.group?.name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ordinal(winner.position)} Place
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-foreground">{winner.total_points}</div>
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">pts</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
