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
import { ROUND_STATUS_OPTIONS, SCORING_TYPE_OPTIONS } from "../eventConstants";

export default function SchedulePointsStep({
  eventForm,
  roundsForm,
  pointsForm,
  fieldErrors,
  venues,
  judges = [],
  assignedJudgeIds = [],
  judgesLoading = false,
  judgesError = "",
  onChange,
  onUpdateRound,
  onUpdateRoundDateTime,
  onRequestVenue,
  onAddPointRow,
  onUpdatePointRow,
  onRemovePointRow,
  onToggleJudge,
}) {
  const scoringType = eventForm.scoring_type || "score";
  const isRank = scoringType === "rank";
  return (
    <div className="space-y-5">
      {/* Scoring type + judge assignment (judge type mirrors scoring type) */}
      <div className="rounded-xl border border-border p-3 sm:p-4">
        <h3 className="text-[15px] font-semibold">Scoring & judges</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Score: judges enter marks (multiple judges allowed). Ranking: judge assigns ranks 1..N — only one judge allowed. Points below apply per {isRank ? "rank" : "position"}.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="mb-2 block text-muted-foreground">Scoring type</Label>
            <Select value={scoringType} onValueChange={(v) => onChange("scoring_type", v)}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select scoring type" />
              </SelectTrigger>
              <SelectContent>
                {SCORING_TYPE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-muted-foreground">
              Judge type <span className="font-semibold text-card-foreground">· {isRank ? "Ranking" : "Score"}</span>
            </Label>
            <Input value={isRank ? "Ranking judge (1 only)" : "Score judge(s)"} disabled className="min-h-[44px] bg-muted" />
          </div>
        </div>
        <div className="mt-3">
          <Label className="mb-2 block text-muted-foreground">
            Assign judge{isRank ? "" : "s"} {isRank ? "(single-select)" : "(multi-select)"}
          </Label>
          {judgesError && <p className="mb-2 text-xs text-destructive">{judgesError}</p>}
          {judgesLoading ? (
            <p className="text-xs text-muted-foreground">Loading judges…</p>
          ) : judges.length === 0 ? (
            <p className="text-xs text-muted-foreground">No judges found in this organization.</p>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
              {judges.map((j) => {
                const id = String(j._id);
                const checked = assignedJudgeIds.map(String).includes(id);
                const disabled = isRank && !checked && assignedJudgeIds.length >= 1;
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${checked ? "border-accent-amber/50 bg-accent-amber/10" : "border-border bg-card"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      type={isRank ? "radio" : "checkbox"}
                      name="event-judge-assign"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggleJudge?.(id)}
                      className="h-4 w-4 accent-amber-500"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {j.name}
                      {j.email ? <span className="ml-1 truncate text-xs text-muted-foreground">{j.email}</span> : null}
                    </span>
                    {checked && (
                      <span className="shrink-0 rounded-full bg-accent-amber/15 px-2 py-0.5 text-[11px] font-semibold text-accent-amber">
                        {isRank ? "Ranking" : "Score"}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isRank
              ? assignedJudgeIds.length === 1
                ? "One ranking judge assigned."
                : "Select exactly one judge for ranking events."
              : `${assignedJudgeIds.length} judge(s) selected.`}
          </p>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Total rounds</Label>
        <Input
          type="number"
          min={1}
          value={eventForm.rounds ?? ""}
          onChange={(e) => onChange("rounds", e.target.value)}
          className={`min-h-[44px] max-w-[160px] ${fieldErrors.rounds ? "border-destructive" : ""}`}
        />
        {fieldErrors.rounds && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.rounds}</p>
        )}
      </div>
      <div className="space-y-3">
        {roundsForm.map((r, idx) => (
          <div key={idx} className="rounded-xl border border-border p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold">Round {r.round_no}</h3>
              <Select
                value={r.status}
                onValueChange={(v) => onUpdateRound(idx, "status", v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {ROUND_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-muted-foreground">
                  Date & time
                </Label>
                <Input
                  type="datetime-local"
                  value={r.date && r.time ? `${r.date}T${r.time}` : ""}
                  onChange={(e) => onUpdateRoundDateTime(idx, e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label className="mb-2 block text-muted-foreground">Venue</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={r.venue || "none"}
                      onValueChange={(v) =>
                        onUpdateRound(idx, "venue", v === "none" ? "" : v)
                      }
                    >
                      <SelectTrigger className="min-h-[44px]">
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {venues.map((v) => (
                          <SelectItem key={v._id} value={v.name}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      onRequestVenue?.({ source: "round", roundIndex: idx })
                    }
                    title="Add new venue"
                    aria-label={`Add new venue for round ${r.round_no}`}
                    className="h-11 w-11 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-3 sm:p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold">Points per {isRank ? "rank" : "position"}</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddPointRow}
            className="min-h-[36px] text-accent-amber"
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </Button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          {isRank
            ? "Rank 1 gets the top points, rank 2 the next, and so on."
            : "Leave as-is to use global settings."}
        </p>
        <div className="space-y-2">
          {pointsForm.map((row, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  {isRank ? "Rank" : "Position"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={row.position}
                  onChange={(e) =>
                    onUpdatePointRow(idx, "position", e.target.value)
                  }
                  className="min-h-[44px]"
                />
              </div>
              <div className="flex-1">
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Points
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={row.points}
                  onChange={(e) =>
                    onUpdatePointRow(idx, "points", e.target.value)
                  }
                  className="min-h-[44px]"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemovePointRow(idx)}
                className="mb-0.5 min-h-[44px] text-destructive hover:text-destructive"
                aria-label={`Remove position ${row.position}`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
      {!isRank && (
        <div className="rounded-xl border border-border p-3 sm:p-4">
          <h3 className="text-[15px] font-semibold">Negative marks</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Staff-only deduction applied on results (judges still enter 0..100). Net points go live at publish.
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(eventForm.enable_negative_marks)}
              onChange={(e) => onChange("enable_negative_marks", e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            <span className="font-medium">Enable negative marks for this event</span>
          </label>
          {Boolean(eventForm.enable_negative_marks) && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Max deduction per result</Label>
                <Input
                  type="number"
                  min={0}
                  value={eventForm.negative_max_deduction ?? ""}
                  onChange={(e) => onChange("negative_max_deduction", e.target.value)}
                  className="min-h-[44px] max-w-[160px]"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={eventForm.negative_require_reason ?? true}
                  onChange={(e) => onChange("negative_require_reason", e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                <span>Require reason for deduction</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
