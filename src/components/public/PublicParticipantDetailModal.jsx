import React from "react";
import { Trophy, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { ordinal } from "../../lib/publicUtils";
import { Skeleton } from "../ui/skeleton";

function positionBadgeClass(position) {
  if (position === 1) return "bg-warning text-white";
  if (position === 2) return "bg-muted-foreground text-white";
  if (position === 3) return "bg-accent-amber text-white";
  return "bg-muted text-muted-foreground";
}

// Participant detail as a Radix dialog: bottom-sheet on phones, centered card
// on larger screens — same chrome as PublicEventDetailModal. Shows the
// selected participant's published events, positions and points.
export default function PublicParticipantDetailModal({ detail, loading, error, onClose, onRetry }) {
  const isOpen = Boolean(detail || loading);
  const items = detail?.items || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[88dvh] overflow-hidden flex flex-col p-0 gap-0 [&>button]:hidden data-[state=open]:slide-in-from-bottom-8 sm:data-[state=open]:slide-in-from-bottom-0 max-sm:mt-auto max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:w-full">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-border text-left shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold leading-snug truncate">
                {detail?.name || "Participant"}
              </DialogTitle>
              <DialogDescription asChild>
                <span className="flex flex-wrap items-center gap-2 mt-2">
                  {detail?.group_name && (
                    <span className="text-xs font-medium">{detail.group_name}</span>
                  )}
                  {typeof detail?.total_points === "number" && (
                    <span className="text-xs font-bold tabular">
                      {detail.total_points.toLocaleString()} pts
                    </span>
                  )}
                  {typeof detail?.participations === "number" && (
                    <span className="text-xs text-muted-foreground">
                      {detail.participations} event{detail.participations === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close participant details"
              className="shrink-0 w-11 h-11 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 min-h-0">
          {loading && (
            <div className="space-y-2.5" aria-label="Loading participant details">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <p className="font-semibold text-foreground">Couldn&apos;t load details</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 inline-flex items-center min-h-11 px-4 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <p className="font-semibold text-foreground">No published results yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Placements will appear here once published.
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <ol className="space-y-2">
              {items.map((item) => (
                <li
                  key={`${item.event_id}-${item.round_no}-${item.position}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold tabular ${positionBadgeClass(item.position)}`}
                  >
                    {item.position}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground text-sm truncate">
                      <Trophy className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{item.event_title}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {ordinal(item.position)} place
                      {item.round_no > 1 ? ` · Round ${item.round_no}` : ""}
                      {item.category ? ` · ${item.category}` : ""}
                      {item.metric ? ` · ${item.metric}` : ""}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-bold text-foreground tabular">
                      {(item.total_points ?? 0).toLocaleString()}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">pts</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
