import React, { useState } from "react";
import { ChevronDown, ListChecks, Clock, MapPin, Radio } from "lucide-react";

const EVENT_STATUS_STYLES = {
  draft: "text-accent-neutral border-accent-neutral/40 bg-accent-neutral/10",
  registration_open: "text-accent-amber border-accent-amber/40 bg-accent-amber/10",
  registration_closed: "text-accent-neutral border-accent-neutral/40 bg-accent-neutral/10",
  reporting: "text-accent-teal border-accent-teal/40 bg-accent-teal/10",
  ongoing: "text-accent-green border-accent-green/40 bg-accent-green/10",
  judging: "text-warning border-warning/40 bg-warning/10",
  result_pending: "text-accent-blue border-accent-blue/40 bg-accent-blue/10",
  published: "text-accent-purple border-accent-purple/40 bg-accent-purple/10",
  completed: "text-accent-green border-accent-green/40 bg-accent-green/10",
  delayed: "text-destructive border-destructive/40 bg-destructive/10",
  cancelled: "text-destructive border-destructive/40 bg-destructive/10",
};

const LIVE_STATUSES = ["ongoing", "judging"];

const POSITION_COLORS = {
  1: "bg-gradient-to-br from-warning to-warning text-white",
  2: "bg-gradient-to-br from-muted-foreground to-muted-foreground/70 text-white",
  3: "bg-gradient-to-br from-accent-amber to-accent-amber/80 text-white",
};

const formatStatus = (status) => (status || "draft").replace(/_/g, " ").toUpperCase();

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const formatDate = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

export default function PublicResultsByEvent({ events, results, groupLabel = "Group" }) {
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
          <div key={event._id} className="bg-card border border-border rounded-2xl overflow-hidden">
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
                    const roundResults = eventResults
                      .filter((r) => r.round_no === round)
                      .sort((a, b) => a.position - b.position);
                    return (
                      <div key={round}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                          {event.rounds > 1 ? `Round ${round}` : "Final Standings"}
                        </h4>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
                              <th className="text-left py-2 pr-2 w-10">#</th>
                              <th className="text-left py-2 pr-2">{groupLabel}</th>
                              <th className="text-right py-2 pr-2">Points</th>
                              {roundResults.some((r) => r.metric) && (
                                <th className="hidden sm:table-cell text-right py-2">Result</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {roundResults.map((result) => (
                              <tr key={result._id} className="border-b border-border/50 last:border-0">
                                <td className="py-2.5 pr-2">
                                  <span
                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                                      POSITION_COLORS[result.position] || "text-muted-foreground bg-muted"
                                    }`}
                                  >
                                    {result.position}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-2">
                                  <div className="flex items-center gap-2.5">
                                    {result.group?.logoUrl && (
                                      <img src={result.group.logoUrl} alt="" className="w-5 h-5 object-contain rounded" />
                                    )}
                                    <span className="font-semibold text-foreground">{result.group?.name || "Unknown"}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-2 text-right">
                                  <span className="font-bold text-foreground">{result.total_points}</span>
                                  <span className="text-muted-foreground text-xs ml-1">pts</span>
                                </td>
                                {roundResults.some((r) => r.metric) && (
                                  <td className="hidden sm:table-cell py-2.5 text-right text-muted-foreground">
                                    {result.metric || `${ordinal(result.position)} place`}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
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