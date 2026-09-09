import React, { useMemo, useState } from "react";
import { Search, ChevronDown, Clock, MapPin, Radio } from "lucide-react";
import { EVENT_STATUS_STYLES, LIVE_STATUSES, formatStatus, formatDate, formatMemberLine, winnerMembersFromPublic } from "../../lib/publicUtils";
import ResultsTable from "./ResultsTable";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live now" },
  { id: "completed", label: "Completed" },
  { id: "awaiting", label: "Awaiting results" },
];

function matchesFilter(event, eventResults, filter) {
  if (filter === "live") return LIVE_STATUSES.includes(event.status);
  if (filter === "completed") return ["published", "completed"].includes(event.status);
  if (filter === "awaiting") return eventResults.length === 0;
  return true;
}

// Event cards with search + status filter. The header is a single disclosure
// control; Details is a sibling action (never a button-inside-button).
export default function PublicResultsByEvent({ events, results, groupLabel = "Group", onEventClick }) {
  const [expandedId, setExpandedId] = useState(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      const eventResults = results[event._id] || [];
      if (!matchesFilter(event, eventResults, activeFilter)) return false;
      if (!needle) return true;
      const haystack = `${event.title || event.name || ""} ${event.category || ""} ${event.venue || ""}`.toLowerCase();
      if (haystack.includes(needle)) return true;
      return eventResults.some((r) =>
        formatMemberLine(winnerMembersFromPublic(r)).toLowerCase().includes(needle)
      );
    });
  }, [events, results, query, activeFilter]);

  if (events.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="font-semibold text-foreground">No events scheduled yet</p>
        <p className="text-sm text-muted-foreground mt-1">The schedule will appear here once published.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search events</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, categories, venues…"
            className="theme-input min-h-11 pl-9 pr-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filter events">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              aria-pressed={activeFilter === filter.id}
              className={`shrink-0 min-h-11 px-3.5 rounded-lg text-sm font-semibold border transition-colors ${
                activeFilter === filter.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl">
          <p className="font-semibold text-foreground">No events match</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const eventResults = results[event._id] || [];
            const isOpen = expandedId === event._id;
            const style = EVENT_STATUS_STYLES[event.status] || EVENT_STATUS_STYLES.draft;
            const rounds = [...new Set(eventResults.map((r) => r.round_no))].sort((a, b) => a - b);
            const title = event.title || event.name || "Event";

            return (
              <article
                key={event._id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="flex items-start sm:items-center gap-3 px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : event._id)}
                    aria-expanded={isOpen}
                    className="flex-1 min-w-0 text-left rounded-lg -m-1 p-1 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground leading-snug">{title}</span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style}`}>
                        {formatStatus(event.status)}
                      </span>
                      {LIVE_STATUSES.includes(event.status) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive">
                          <Radio className="w-3 h-3" aria-hidden="true" />
                          Live
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      {event.category && <span>{event.category}</span>}
                      {event.venue && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{event.venue}</span>
                        </span>
                      )}
                      {event.schedule?.length > 0 && event.schedule[0]?.date && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatDate(event.schedule[0].date)}
                        </span>
                      )}
                      <span>
                        {event.rounds} round{event.rounds > 1 ? "s" : ""}
                      </span>
                      <span className={eventResults.length > 0 ? "text-primary font-semibold" : ""}>
                        {eventResults.length > 0
                          ? `${eventResults.length} placement${eventResults.length > 1 ? "s" : ""}`
                          : "Awaiting results"}
                      </span>
                    </span>
                  </button>

                  <span className="flex items-center gap-1 shrink-0">
                    {onEventClick && (
                      <button
                        type="button"
                        onClick={() => onEventClick(event._id)}
                        className="min-h-11 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
                      >
                        Details
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : event._id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </span>
                </div>

                {isOpen && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {eventResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        Results will appear here once published.
                      </p>
                    ) : (
                      rounds.map((round) => {
                        const roundResults = eventResults.filter((r) => r.round_no === round);
                        return (
                          <div key={round}>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                              {event.rounds > 1 ? `Round ${round}` : "Final standings"}
                            </h4>
                            <ResultsTable
                              results={roundResults}
                              groupLabel={groupLabel}
                              showMetric={roundResults.some((r) => r.metric)}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
