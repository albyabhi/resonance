import { Calendar, CheckCircle, Search } from "lucide-react";
import { Card, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import EventStatusBadge from "../../EventStatusBadge";
import { ASSIGNED_FILTERS } from "./useAssignedEvents";
import { getCoordinatorEventId } from "./coordinatorGuards";

export function AssignedEventListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Coordinator event selector.
 * Desktop: compact list rail with meta rows.
 * Mobile: horizontal filter chips then a single-column selectable list.
 */
export default function AssignedEventList({
  title = "Assigned Events",
  events,
  filteredEvents,
  counts,
  selectedEventId,
  onSelect,
  searchQuery,
  onSearchChange,
  typeFilter,
  onFilterChange,
  loading,
  onClearFilters,
}) {
  const hasActiveFilter = searchQuery.trim() !== "" || typeFilter !== "all";

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-[11px]">
            {counts.total} event{counts.total !== 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {counts.team} team · {counts.individual} individual · {counts.open} open
        </p>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events..."
            aria-label="Search assigned events"
            className="min-h-[44px] w-full rounded-lg pl-9"
          />
        </div>
        <div
          className="mt-2 flex gap-1.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter assigned events"
        >
          {ASSIGNED_FILTERS.map((f) => {
            const active = typeFilter === f.value;
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={active}
                onClick={() => onFilterChange(f.value)}
                className={`min-h-[44px] shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  active
                    ? "border-accent-amber bg-accent-amber/10 text-accent-amber"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto sm:max-h-[420px] lg:max-h-[560px]">
        {loading ? (
          <AssignedEventListSkeleton />
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {events.length === 0 ? "No events assigned" : "No events match your filters"}
            </p>
            {hasActiveFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="min-h-[44px]"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEvents.map((evt) => {
              const id = getCoordinatorEventId(evt);
              const isSelected = String(id) === String(selectedEventId);
              const title = evt.title || evt.name || "Untitled";
              const entryCount = Number(evt._entryCount ?? evt.entryCount ?? 0);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={isSelected ? "true" : undefined}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/60 ${
                    isSelected
                      ? "bg-primary/10 border-l-2 border-l-accent-amber"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {title}
                      </p>
                      {isSelected && (
                        <CheckCircle className="shrink-0 h-4 w-4 text-accent-amber" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="capitalize">{evt.category || "general"}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {evt.event_type === "individual" ? "Individual" : "Team"}
                      </Badge>
                      <EventStatusBadge status={evt.status || "draft"} />
                      {entryCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {entryCount} entry{entryCount !== 1 ? "ies" : "y"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
