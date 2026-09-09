import React from "react";
import { MapPin, CalendarDays, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { EVENT_STATUS_STYLES, formatStatus, formatFullDate } from "../../lib/publicUtils";
import ResultsTable from "./ResultsTable";

// Event detail as a Radix dialog: bottom-sheet on phones, centered card on
// larger screens. Focus-trapped + ESC-dismissed by the primitive.
export default function PublicEventDetailModal({ event, competition, onClose }) {
  const isOpen = Boolean(event);
  const results = event?.results || [];
  const schedule = event?.schedule || [];
  const rounds = [...new Set(results.map((r) => r.round_no))].sort((a, b) => a - b);
  const statusStyle = EVENT_STATUS_STYLES[event?.status] || EVENT_STATUS_STYLES.draft;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[88dvh] overflow-hidden flex flex-col p-0 gap-0 [&>button]:hidden data-[state=open]:slide-in-from-bottom-8 sm:data-[state=open]:slide-in-from-bottom-0 max-sm:mt-auto max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:w-full">
        {event && (
          <>
            <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-border text-left shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold leading-snug">
                    {event.title}
                  </DialogTitle>
                  <DialogDescription asChild>
                    <span className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyle}`}>
                        {formatStatus(event.status)}
                      </span>
                      {event.category && <span className="text-xs font-medium">{event.category}</span>}
                      {event.venue && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {event.venue}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Users className="w-3 h-3" aria-hidden="true" />
                        {event.event_type}
                      </span>
                    </span>
                  </DialogDescription>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close event details"
                  className="shrink-0 w-11 h-11 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6 min-h-0">
              {event.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
              )}

              {schedule.length > 0 && (
                <section aria-label="Schedule">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" aria-hidden="true" />
                    Schedule
                  </h3>
                  <ul className="space-y-2">
                    {schedule.map((slot, idx) => (
                      <li
                        key={`${slot.round_no}-${idx}`}
                        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm bg-muted/50 rounded-lg px-3 py-2.5"
                      >
                        <span className="font-semibold text-foreground">Round {slot.round_no}</span>
                        {slot.date && <span>{formatFullDate(slot.date)}</span>}
                        {slot.time && <span className="text-muted-foreground">{slot.time}</span>}
                        {slot.venue && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {slot.venue}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-label="Results">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Results
                </h3>
                {results.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8 border border-dashed border-border rounded-xl">
                    Results will appear here once published.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {rounds.map((round) => {
                      const roundResults = results.filter((r) => r.round_no === round);
                      return (
                        <div key={round}>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            {event.rounds > 1 ? `Round ${round}` : "Final standings"}
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
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
