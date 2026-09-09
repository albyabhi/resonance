import React, { useMemo, useState } from "react";
import { Search, Trophy, ChevronDown } from "lucide-react";
import { ordinal, tintedBackground, formatMemberLine, winnerMembersFromPublic } from "../../lib/publicUtils";

function positionBadgeClass(position) {
  if (position === 1) return "bg-warning text-white";
  if (position === 2) return "bg-muted-foreground text-white";
  if (position === 3) return "bg-accent-amber text-white";
  return "bg-muted text-muted-foreground";
}

// Winners stay collapsed except the first event so a long competition
// doesn't push Events + Statistics far down the single-scroll page.
export default function PublicWinners({ winners, primaryColor = "var(--primary)" }) {
  const [query, setQuery] = useState("");
  const [openEventId, setOpenEventId] = useState(null);

  const eventEntries = useMemo(() => {
    const entries = Object.entries(winners || {}).filter(([, list]) => list.length > 0);
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? entries.filter(([eventId, list]) => {
          const title = list[0]?.event?.title || "";
          const groupHit = list.some((w) => (w.group?.name || "").toLowerCase().includes(needle));
          const memberHit = list.some((w) =>
            formatMemberLine(winnerMembersFromPublic(w)).toLowerCase().includes(needle)
          );
          return title.toLowerCase().includes(needle) || groupHit || memberHit || eventId === needle;
        })
      : entries;
    return filtered;
  }, [winners, query]);

  const effectiveOpenId = openEventId ?? eventEntries[0]?.[0] ?? null;

  if (Object.keys(winners || {}).length === 0 || eventEntries.length === 0) {
    return (
      <div>
        {Object.keys(winners || {}).length > 0 && (
          <label className="relative block mb-3">
            <span className="sr-only">Search winners</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search winners…"
              className="theme-input min-h-11 pl-9 pr-3 py-2 text-sm"
            />
          </label>
        )}
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="font-semibold text-foreground">
            {query ? "No winners match" : "No winners announced yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {query ? "Try a different search." : "Top-three finishes will appear here once published."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Search winners</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events or groups…"
          className="theme-input min-h-11 pl-9 pr-3 py-2 text-sm"
        />
      </label>

      {eventEntries.map(([eventId, eventWinners]) => {
        const firstWinner = eventWinners[0];
        const eventTitle = firstWinner?.event?.title || "Event";
        const isOpen = effectiveOpenId === eventId;

        return (
          <article key={eventId} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenEventId(isOpen ? `closed-${eventId}` : eventId)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-4 py-3.5 min-h-16 text-left hover:bg-muted/40 transition-colors"
            >
              <span
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: tintedBackground(primaryColor), color: primaryColor }}
                aria-hidden="true"
              >
                <Trophy className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground truncate leading-snug">{eventTitle}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {eventWinners[0]?.group?.name || "Winner to be announced"}
                  {eventWinners.length > 1 ? ` +${eventWinners.length - 1} more` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <ChevronDown className="w-5 h-5" />
              </span>
            </button>

            {isOpen && (
              <ol className="border-t border-border px-4 py-3 space-y-2">
                {eventWinners.map((winner) => {
                  const memberLine = formatMemberLine(winnerMembersFromPublic(winner));
                  return (
                  <li
                    key={winner._id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
                  >
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold tabular ${positionBadgeClass(winner.position)}`}
                    >
                      {winner.position}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground text-sm truncate">
                        {winner.group?.name || "Unknown"}
                      </span>
                      {memberLine && (
                        <span className="block text-[13px] text-muted-foreground mt-0.5 leading-snug">
                          {memberLine}
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {ordinal(winner.position)} place
                        {winner.metric ? ` · ${winner.metric}` : ""}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block font-bold text-foreground tabular">{winner.total_points}</span>
                      <span className="block text-[11px] text-muted-foreground">pts</span>
                    </span>
                  </li>
                  );
                })}
              </ol>
            )}
          </article>
        );
      })}
    </div>
  );
}
