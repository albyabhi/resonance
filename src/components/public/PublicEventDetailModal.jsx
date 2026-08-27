import React from "react";
import { X, MapPin, Clock, Users, CalendarDays, Trophy } from "lucide-react";
import { EVENT_STATUS_STYLES, formatStatus, formatFullDate } from "../../lib/publicUtils";
import ResultsTable from "./ResultsTable";

export default function PublicEventDetailModal({ event, competition, onClose }) {
  if (!event) return null;

  const results = event.results || [];
  const schedule = event.schedule || [];
  const rounds = [...new Set(results.map((r) => r.round_no))].sort((a, b) => a - b);
  const statusStyle = EVENT_STATUS_STYLES[event.status] || EVENT_STATUS_STYLES.draft;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-foreground truncate">{event.title}</h2>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusStyle}`}>
                {formatStatus(event.status)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {event.category && (
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold">{event.category}</span>
                </span>
              )}
              {event.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.venue}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {event.event_type}
              </span>
              <span>{event.rounds} round{event.rounds > 1 ? "s" : ""}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
          )}

          {/* Schedule */}
          {schedule.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Schedule
              </h3>
              <div className="space-y-2">
                {schedule.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-foreground">Round {slot.round_no}</span>
                    <span className="text-muted-foreground">—</span>
                    {slot.date && <span>{formatFullDate(slot.date)}</span>}
                    {slot.time && <span className="text-muted-foreground">{slot.time}</span>}
                    {slot.venue && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {slot.venue}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Results
            </h3>
            {results.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border border-dashed border-border rounded-xl">
                Results will appear here once published.
              </div>
            ) : (
              <div className="space-y-4">
                {rounds.map((round) => {
                  const roundResults = results.filter((r) => r.round_no === round);
                  return (
                    <div key={round}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {event.rounds > 1 ? `Round ${round}` : "Final Standings"}
                      </h4>
                      <ResultsTable
                        results={roundResults}
                        groupLabel={competition?.group_label || "Group"}
                        showMetric={roundResults.some((r) => r.metric)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
