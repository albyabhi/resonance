import React, { useState } from "react";
import { ChevronDown, ListChecks, Clock, MapPin, Radio } from "lucide-react";

const EVENT_STATUS_STYLES = {
  draft: "text-neutral-400 border-neutral-600/40 bg-neutral-800",
  registration_open: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  registration_closed: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  reporting: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  ongoing: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  judging: "text-pink-300 border-pink-500/30 bg-pink-500/10",
  result_pending: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  published: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  completed: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  delayed: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  cancelled: "text-red-300 border-red-500/30 bg-red-500/10",
};

const LIVE_STATUSES = ["ongoing", "judging"];

const POSITION_COLORS = {
  1: "bg-gradient-to-br from-amber-400 to-yellow-600 text-white",
  2: "bg-gradient-to-br from-slate-300 to-slate-500 text-white",
  3: "bg-gradient-to-br from-orange-500 to-amber-800 text-white",
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
      <div className="text-center text-neutral-500 py-16 border border-dashed border-neutral-800 rounded-2xl">
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
          <div key={event._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(event._id)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-neutral-800/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white truncate">{event.name || event.title}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${style}`}>
                    {formatStatus(event.status)}
                  </span>
                  {LIVE_STATUSES.includes(event.status) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 animate-pulse">
                      <Radio className="w-3 h-3" />
                      LIVE
                    </span>
                  )}
                  {event.category && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400">
                      {event.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-neutral-500">
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
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-300">
                    <ListChecks className="w-4 h-4" />
                    Results
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Awaiting results</span>
                )}
                <ChevronDown className={`w-5 h-5 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-neutral-800 px-5 py-4 space-y-5">
                {eventResults.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-4 text-center">
                    Results will appear here once published.
                  </p>
                ) : (
                  rounds.map((round) => {
                    const roundResults = eventResults
                      .filter((r) => r.round_no === round)
                      .sort((a, b) => a.position - b.position);
                    return (
                      <div key={round}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                          {event.rounds > 1 ? `Round ${round}` : "Final Standings"}
                        </h4>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-neutral-500 uppercase tracking-wider text-xs border-b border-neutral-800">
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
                              <tr key={result._id} className="border-b border-neutral-800/50 last:border-0">
                                <td className="py-2.5 pr-2">
                                  <span
                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                                      POSITION_COLORS[result.position] || "text-neutral-400 bg-neutral-800"
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
                                    <span className="font-semibold text-white">{result.group?.name || "Unknown"}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-2 text-right">
                                  <span className="font-bold text-white">{result.total_points}</span>
                                  <span className="text-neutral-500 text-xs ml-1">pts</span>
                                </td>
                                {roundResults.some((r) => r.metric) && (
                                  <td className="hidden sm:table-cell py-2.5 text-right text-neutral-400">
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
