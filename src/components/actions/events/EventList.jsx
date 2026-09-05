import { Fragment, useState } from "react";
import { ChevronDown, CalendarDays, Users, Plus } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../ui/table";
import EventStatusBadge from "../../EventStatusBadge";
import EventRowActions from "./EventRowActions";
import {
  getEventId,
  formatParticipants,
} from "./eventConstants";

function EmptyState({ onAdd, canAdd }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CalendarDays className="h-6 w-6 text-muted-foreground" />
        </span>
        <div>
          <h3 className="text-base font-semibold">No events found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting search or filters — or create a new event.
          </p>
        </div>
        {canAdd && (
          <Button
            onClick={onAdd}
            className="min-h-[44px] bg-accent-amber text-white hover:bg-accent-amber/90"
          >
            <Plus className="h-4 w-4" /> Create event
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function DetailGrid({ event, usage, groupLabel }) {
  const registeredLabel = `${usage?.totalTeams ?? 0} team${(usage?.totalTeams ?? 0) !== 1 ? "s" : ""} · ${usage?.totalParticipants ?? 0} participant${(usage?.totalParticipants ?? 0) !== 1 ? "s" : ""}`;
  const items = [
    { label: "Rounds", value: event.rounds ?? 1 },
    { label: `Max / ${groupLabel}`, value: event.max_per_group ?? "—" },
    { label: "Participants", value: formatParticipants(event) },
    { label: "Registered", value: registeredLabel },
    {
      label: "Gender",
      value:
        !event.gender_filter || event.gender_filter === "all"
          ? "Any"
          : event.gender_filter,
    },
    { label: "Type", value: event.event_type || "—", capitalize: true },
    { label: "Mode", value: event.mode || "—", capitalize: true },
    ...(event.duration
      ? [{ label: "Duration", value: event.duration }]
      : []),
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd
            className={`truncate font-medium ${it.capitalize ? "capitalize" : ""}`}
          >
            {it.value}
          </dd>
        </div>
      ))}
      {event.description && (
        <div className="col-span-full">
          <dt className="text-xs text-muted-foreground">About</dt>
          <dd className="mt-0.5 line-clamp-3 text-sm">{event.description}</dd>
        </div>
      )}
    </dl>
  );
}

function MobileCard({
  event,
  usage,
  groupLabel,
  expanded,
  onToggle,
  onViewRegistrations,
  actionProps,
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-snug">
              {event.title || event.name}
            </span>
            {event.description && (
              <span className="mt-0.5 block line-clamp-1 text-[13px] text-muted-foreground">
                {event.description}
              </span>
            )}
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              <EventStatusBadge status={event.status || "draft"} size="sm" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewRegistrations?.(event);
                }}
                className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                aria-label={`View registrations for ${event.title || event.name || "event"}`}
              >
                <Users className="h-3.5 w-3.5" />
                {usage?.totalTeams ?? 0} registered
              </button>
            </span>
          </span>
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="mt-3 border-t border-border pt-3">
            <DetailGrid event={event} usage={usage} groupLabel={groupLabel} />
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <EventRowActions event={event} {...actionProps} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EventList({
  events,
  usageByEventId,
  loading,
  groupLabel = "House",
  onEdit,
  onShare,
  onViewRegistrations,
  onManageJudges,
  onStatusChange,
  onDelay,
  onResume,
  onDelete,
  onAdd,
  canAdd,
  canManageJudges = true,
  canDelete = true,
  canDelayResume = true,
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) return null;

  if (!events || events.length === 0) {
    return <EmptyState onAdd={onAdd} canAdd={canAdd} />;
  }

  const actionProps = {
    onEdit,
    onManageJudges,
    onShare,
    onViewRegistrations,
    onStatusChange,
    onDelay,
    onResume,
    onDelete,
    canManageJudges,
    canDelete,
    canDelayResume,
  };

  return (
    <>
      {/* Mobile: light cards */}
      <div className="space-y-3 md:hidden">
        {events.map((e) => {
          const id = getEventId(e);
          return (
            <MobileCard
              key={id}
              event={e}
              usage={usageByEventId[id]}
              groupLabel={groupLabel}
              expanded={expandedId === id}
              onToggle={() => setExpandedId((cur) => (cur === id ? null : id))}
              onViewRegistrations={onViewRegistrations}
              actionProps={actionProps}
            />
          );
        })}
      </div>

      {/* Desktop: 6 columns + expandable detail */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="w-8" aria-label="Expand" />
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Type · Mode</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => {
              const id = getEventId(e);
              const usage = usageByEventId[id] || { totalTeams: 0, totalParticipants: 0 };
              const expanded = expandedId === id;
              return (
                <Fragment key={id}>
                  <TableRow
                    className={`cursor-pointer ${expanded ? "bg-muted/40" : ""}`}
                    onClick={() =>
                      setExpandedId((cur) => (cur === id ? null : id))
                    }
                  >
                    <TableCell className="w-8 pr-0">
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="truncate font-semibold">
                        {e.title || e.name}
                      </div>
                      <div className="line-clamp-1 text-[13px] capitalize text-muted-foreground">
                        {e.category || "general"}
                        {e.subcategory ? ` · ${e.subcategory}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EventStatusBadge status={e.status || "draft"} />
                    </TableCell>
                    <TableCell className="text-[13px]">
                      {e.rounds ?? 1} round{(e.rounds ?? 1) !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="font-semibold">
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onViewRegistrations?.(e);
                        }}
                        className="underline-offset-2 hover:underline"
                        title={`View registrations — ${usage.totalTeams} team${usage.totalTeams !== 1 ? "s" : ""} · ${usage.totalParticipants ?? 0} participant${(usage.totalParticipants ?? 0) !== 1 ? "s" : ""}`}
                        aria-label={`View registrations for ${e.title || e.name || "event"}`}
                      >
                        {usage.totalTeams}
                      </button>
                    </TableCell>
                    <TableCell className="text-[13px] capitalize text-muted-foreground">
                      {e.event_type || "—"} · {e.mode || "—"}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div className="flex justify-end">
                        <EventRowActions event={e} {...actionProps} />
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow key={`${id}-detail`} className="bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={6}>
                        <DetailGrid
                          event={e}
                          usage={usage}
                          groupLabel={groupLabel}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
