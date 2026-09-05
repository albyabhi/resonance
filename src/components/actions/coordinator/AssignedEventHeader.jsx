import { Hash, MapPin, Users } from "lucide-react";
import { Badge } from "../../ui/badge";
import { CardTitle } from "../../ui/card";
import EventStatusBadge from "../../EventStatusBadge";
import { getCoordinatorEventId } from "./coordinatorGuards";
import { getTeamLimits } from "./coordinatorGuards";

const HEADLINE_ITEMS = [
  { label: "entries", getValue: (teams) => (teams || []).length },
  {
    label: "participants",
    getValue: (teams) => {
      const members = (teams || []).flatMap((t) => t.members || []);
      return members.length;
    },
  },
  {
    label: "chested",
    getValue: (teams, event) => {
      if (event?.chest_prefix?.trim()) {
        return (teams || []).filter((t) => t.chest_no).length;
      }
      return 0;
    },
  },
];

export default function AssignedEventHeader({ event, teams }) {
  if (!event) return null;
  const title = event.title || event.name || "Untitled";
  const eid = getCoordinatorEventId(event);
  const { min, max } = getTeamLimits(event);

  const stats = HEADLINE_ITEMS.map((item) => ({
    ...item,
    value: item.getValue(teams, event),
  }));

  const hasChestConfig = event.chest_prefix?.trim().length > 0;

  return (
    <div className="border-b border-border p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {eid}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-bold uppercase tracking-wider"
              >
                {event.event_type === "individual" ? "Individual Event" : "Team Event"}
              </Badge>
              <EventStatusBadge status={event.status || "draft"} />
              {event.status !== "registration_open" && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Edit &amp; revoke available only while registration is open
                </span>
              )}
            </div>
            <CardTitle className="mt-2 text-base font-bold leading-snug sm:text-lg">
              {title}
            </CardTitle>
            {event.description && (
              <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                {event.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {stats.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{item.value}</span>
                  {item.label}
                </span>
              ))}
              {event.venue_id?.name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue_id.name}
                </span>
              )}
              <span>
                Team size {min}-{max}
              </span>
              {event.category && (
                <span className="capitalize">{event.category}</span>
              )}
            </div>
          </div>
          {hasChestConfig && (
            <Badge
              variant="outline"
              className="inline-flex shrink-0 items-center gap-1 border-accent-amber/20 bg-accent-amber/10 text-accent-amber"
            >
              <Hash className="h-3 w-3" />
              {event.chest_prefix}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
