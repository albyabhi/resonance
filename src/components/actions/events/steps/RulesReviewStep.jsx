import { Plus, X } from "lucide-react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import EventStatusBadge from "../../../EventStatusBadge";
import { formatParticipants } from "../eventConstants";

export default function RulesReviewStep({
  eventForm,
  roundsForm,
  pointsForm,
  groupLabel = "House",
  newRequirement,
  setNewRequirement,
  onChange,
  onPatch,
}) {
  const addRequirement = () => {
    const v = (newRequirement || "").trim();
    if (!v) return;
    onPatch?.({ requirements: [...(eventForm.requirements || []), v] });
    setNewRequirement("");
  };

  const removeRequirement = (idx) => {
    onPatch?.({
      requirements: (eventForm.requirements || []).filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label className="mb-2 block">Duration</Label>
          <Input
            value={eventForm.duration}
            onChange={(e) => onChange("duration", e.target.value)}
            placeholder="e.g. 5 minutes"
            className="min-h-[44px]"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block">Rules</Label>
          <textarea
            rows={3}
            value={eventForm.rules}
            onChange={(e) => onChange("rules", e.target.value)}
            placeholder="No vulgar content, no props, etc."
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-amber"
          />
        </div>
        <div>
          <Label className="mb-2 block">Eligibility</Label>
          <textarea
            rows={2}
            value={eventForm.eligibility}
            onChange={(e) => onChange("eligibility", e.target.value)}
            placeholder="Who can participate (e.g. Open to all classes 9-12)"
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-amber"
          />
        </div>
        <div>
          <Label className="mb-2 block">Instructions</Label>
          <textarea
            rows={2}
            value={eventForm.instructions}
            onChange={(e) => onChange("instructions", e.target.value)}
            placeholder="Pre-event and during-event instructions"
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-amber"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block">Requirements / equipment</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            {(eventForm.requirements || []).map((req, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1.5 text-[13px]"
              >
                {req}
                <button
                  type="button"
                  onClick={() => removeRequirement(idx)}
                  className="rounded-full p-0.5 text-destructive hover:bg-destructive/10"
                  aria-label={`Remove ${req}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {(eventForm.requirements || []).length === 0 && (
              <span className="text-xs text-muted-foreground">
                None added yet.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              placeholder="Add requirement"
              className="min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRequirement();
                }
              }}
            />
            <Button
              type="button"
              onClick={addRequirement}
              aria-label="Add requirement"
              className="h-11 w-11 shrink-0 bg-accent-amber text-white hover:bg-accent-amber/90"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-muted p-4">
        <h3 className="mb-3 text-sm font-semibold">Review summary</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Title</dt>
            <dd className="truncate font-medium">
              {eventForm.title || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <EventStatusBadge status={eventForm.status || "draft"} size="sm" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Category</dt>
            <dd className="font-medium capitalize">{eventForm.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Type</dt>
            <dd className="font-medium capitalize">{eventForm.event_type}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Participants</dt>
            <dd className="font-medium">{formatParticipants(eventForm)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rounds</dt>
            <dd className="font-medium">
              {roundsForm.length} round{roundsForm.length !== 1 ? "s" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Max / {groupLabel.toLowerCase()}
            </dt>
            <dd className="font-medium">{eventForm.max_per_group ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Points</dt>
            <dd className="font-medium">
              {pointsForm.map((p) => `P${p.position}:${p.points}`).join(" · ") ||
                "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Scoring</dt>
            <dd className="font-medium capitalize">{eventForm.scoring_type === "rank" ? "Ranking (1 judge)" : "Score"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
