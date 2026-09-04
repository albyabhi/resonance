import { Plus } from "lucide-react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../ui/select";
import EventStatusBadge from "../../../EventStatusBadge";
import EventStatusSelector from "../../../EventStatusSelector";
import {
  CATEGORIES,
  MODES,
  CREATION_STATUS_OPTIONS,
} from "../eventConstants";

export default function BasicsStep({
  eventForm,
  fieldErrors,
  editingEventId,
  coordinators,
  venues,
  onChange,
  onRequestVenue,
  onStatusChanged,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label className="mb-2 block">Title *</Label>
        <Input
          value={eventForm.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Enter event title"
          className={`min-h-[44px] ${fieldErrors.title ? "border-destructive" : ""}`}
        />
        {fieldErrors.title && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.title}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Status</Label>
        {editingEventId ? (
          <div className="flex min-h-[44px] items-center gap-2">
            <EventStatusBadge status={eventForm.status || "draft"} size="lg" />
            <EventStatusSelector
              event={{ _id: editingEventId, status: eventForm.status }}
              onStatusChanged={onStatusChanged}
            />
          </div>
        ) : (
          <>
            <Select
              value={eventForm.status || "draft"}
              onValueChange={(v) => onChange("status", v)}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select starting status" />
              </SelectTrigger>
              <SelectContent>
                {CREATION_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft by default — you may pick a different starting status.
            </p>
          </>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Mode</Label>
        <Select value={eventForm.mode} onValueChange={(v) => onChange("mode", v)}>
          <SelectTrigger className="min-h-[44px]">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Category *</Label>
        <Select
          value={eventForm.category}
          onValueChange={(v) => onChange("category", v)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Subcategory</Label>
        <Input
          value={eventForm.subcategory}
          onChange={(e) => onChange("subcategory", e.target.value)}
          placeholder="e.g. Mono Act, Solo Dance"
          className="min-h-[44px]"
        />
      </div>
      <div className="md:col-span-2">
        <Label className="mb-2 block">Description</Label>
        <textarea
          rows={3}
          value={eventForm.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Brief description of the event"
          className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-amber"
        />
      </div>
      <div>
        <Label className="mb-2 block">Event coordinator</Label>
        <Select
          value={eventForm.coordinator_id || "none"}
          onValueChange={(v) => onChange("coordinator_id", v === "none" ? "" : v)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {coordinators.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
                {c.email ? ` (${c.email})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Venue</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              value={eventForm.venue_id || "none"}
              onValueChange={(v) => onChange("venue_id", v === "none" ? "" : v)}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {venues.map((v) => (
                  <SelectItem key={v._id} value={v._id}>
                    {v.name}
                    {v.location ? ` (${v.location})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onRequestVenue?.({ source: "event_form" })}
            title="Add new venue"
            aria-label="Add new venue"
            className="h-11 w-11 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
