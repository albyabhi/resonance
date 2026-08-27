import React, { useState } from "react";
import { ChevronDown, ListChecks, Clock, MapPin, Radio } from "lucide-react";
import { EVENT_STATUS_STYLES, LIVE_STATUSES, formatStatus, formatDate } from "../../lib/publicUtils";
import ResultsTable from "./ResultsTable";

export default function PublicResultsByEvent({ events, results, groupLabel = "Group", onEventClick }) {
  const [expanded, setExpanded] = useState(null);

  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
        No events have been scheduled yet.
      </div>
    );
  }

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const eventResults = results[event._id] || [];
        const isOpen = expanded === event._id;
        const style = EVENT_STATUS_STYLES[event.status] || EVENT_STATUS_STYLES.draft;
        const rounds = [...new Set(eventResults.map((r) => r.round_no))].sort((a, b) => a - b);

        return (
          <div key={event._id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
            <button
              type="button"
              onClick={() => toggle(event._id)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-foreground truncate">{event.name || event.title}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${style}`}>
                    {formatStatus(event.status)}
                  </span>
                  {LIVE_STATUSES.includes(event.status) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive animate-pulse">
                      <Radio className="w-3 h-3" />
                      LIVE
                    </span>
                  )}
                  {event.category && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      {event.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  {event.venue && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.venue}
                    </span>
                  )}
                  {event.schedule?.length > 0 && event.schedule[0]?.date && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(event.schedule[0].date)}
                      {event.schedule[0].time ? ` • ${event.schedule[0].time}` : ""}
                    </span>
                  )}
                  <span>{event.rounds} round{event.rounds > 1 ? "s" : ""}</span>
                  <span>{event.event_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {event.results_visible ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                    <ListChecks className="w-4 h-4" />
                    Results
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Awaiting results</span>
                )}
                {onEventClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event._id);
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                  >
                    Details
                  </button>
                )}
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border px-5 py-4 space-y-5">
                {eventResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Results will appear here once published.
                  </p>
                ) : (
                  rounds.map((round) => {
                    const roundResults = eventResults.filter((r) => r.round_no === round);
                    return (
                      <div key={round}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                          {event.rounds > 1 ? `Round ${round}` : "Final Standings"}
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
          </div>
        );
      })}
    </div>
  );
}
