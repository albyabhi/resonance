import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../ui/select";
import {
  EVENT_TYPES,
  GENDER_OPTIONS,
  REGISTRATION_MODES,
} from "../eventConstants";

export default function ParticipationStep({
  eventForm,
  fieldErrors,
  groupLabel = "House",
  onChange,
  onPatch,
}) {
  const isTeam = eventForm.event_type === "team";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="mb-2 block">Event type</Label>
          <Select
            value={eventForm.event_type}
            onValueChange={(v) => onChange("event_type", v)}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Gender</Label>
          <Select
            value={eventForm.gender_filter}
            onValueChange={(v) => onChange("gender_filter", v)}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Registration mode</Label>
          <Select
            value={eventForm.registration_mode}
            onValueChange={(v) => onChange("registration_mode", v)}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Registration closes</Label>
          <Input
            type="datetime-local"
            value={eventForm.registration_closes_at || ""}
            onChange={(e) =>
              onPatch?.({ registration_closes_at: e.target.value })
            }
            className="min-h-[44px]"
          />
        </div>
        {isTeam && (
          <>
            <div>
              <Label className="mb-2 block">Min members per team</Label>
              <Input
                type="number"
                min={1}
                value={eventForm.min_team_size ?? ""}
                onChange={(e) => onChange("min_team_size", e.target.value)}
                className={`min-h-[44px] ${fieldErrors.min_team_size ? "border-destructive" : ""}`}
              />
              {fieldErrors.min_team_size && (
                <p className="mt-1 text-xs text-destructive">
                  {fieldErrors.min_team_size}
                </p>
              )}
            </div>
            <div>
              <Label className="mb-2 block">Max members per team</Label>
              <Input
                type="number"
                min={1}
                value={eventForm.max_team_size ?? ""}
                onChange={(e) => onChange("max_team_size", e.target.value)}
                className={`min-h-[44px] ${fieldErrors.max_team_size ? "border-destructive" : ""}`}
              />
              {fieldErrors.max_team_size && (
                <p className="mt-1 text-xs text-destructive">
                  {fieldErrors.max_team_size}
                </p>
              )}
            </div>
          </>
        )}
        <div>
          <Label className="mb-2 block">
            {isTeam
              ? `Max teams per ${groupLabel.toLowerCase()}`
              : `Max participants per ${groupLabel.toLowerCase()}`}
          </Label>
          <Input
            type="number"
            min={1}
            value={
              eventForm.max_per_group === 0 ? 0 : (eventForm.max_per_group ?? "")
            }
            onChange={(e) => onChange("max_per_group", e.target.value)}
            className={`min-h-[44px] ${fieldErrors.max_per_group ? "border-destructive" : ""}`}
          />
          {fieldErrors.max_per_group && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.max_per_group}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2 block">Age group (min)</Label>
          <Input
            type="number"
            min={0}
            value={eventForm.age_group?.min ?? ""}
            onChange={(e) =>
              onPatch?.({
                age_group: { ...eventForm.age_group, min: e.target.value },
              })
            }
            placeholder="Min age"
            className="min-h-[44px]"
          />
        </div>
        <div>
          <Label className="mb-2 block">Age group (max)</Label>
          <Input
            type="number"
            min={0}
            value={eventForm.age_group?.max ?? ""}
            onChange={(e) =>
              onPatch?.({
                age_group: { ...eventForm.age_group, max: e.target.value },
              })
            }
            placeholder="Max age"
            className="min-h-[44px]"
          />
        </div>
      </div>
      <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        {isTeam
          ? `Each entry is one team. Every member must meet the gender and age rules, and each ${groupLabel.toLowerCase()} can register up to the maximum teams allowed.`
          : `Each entry is a single participant who must meet the gender and age rules. Each ${groupLabel.toLowerCase()} can register up to the maximum participants allowed.`}
      </p>
    </div>
  );
}
