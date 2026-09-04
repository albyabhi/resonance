import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import BasicsStep from "./steps/BasicsStep";
import ParticipationStep from "./steps/ParticipationStep";
import SchedulePointsStep from "./steps/SchedulePointsStep";
import RulesReviewStep from "./steps/RulesReviewStep";

const STEPS = [
  { id: 0, label: "Basics", short: "Basics" },
  { id: 1, label: "Participation", short: "Rules" },
  { id: 2, label: "Schedule & points", short: "Schedule" },
  { id: 3, label: "Details & review", short: "Review" },
];

export default function EventFormWizard({
  form,
  coordinators,
  venues,
  groupLabel,
  onCancel,
  onStatusChanged,
  onRequestVenue,
}) {
  const [step, setStep] = useState(0);
  const [stepAttempted, setStepAttempted] = useState(false);

  const {
    editingEventId,
    eventForm,
    setEventForm,
    roundsForm,
    pointsForm,
    fieldErrors,
    saving,
    formError,
    newRequirement,
    setNewRequirement,
    handleEventChange,
    updateRoundField,
    updateRoundDateTime,
    addPointRow,
    updatePointRow,
    removePointRow,
    validateStep,
    saveEvent,
    judges,
    assignedJudgeIds,
    judgesLoading,
    judgesError,
    toggleJudgeSelection,
  } = form;

  const patchForm = (patch) => setEventForm((prev) => ({ ...prev, ...patch }));

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setStepAttempted(true);
      return;
    }
    setStepAttempted(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepAttempted(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSave = async () => {
    try {
      await saveEvent();
      onCancel?.();
    } catch {
      /* formError already set in hook */
    }
  };

  const progress = useMemo(
    () => ((step + 1) / STEPS.length) * 100,
    [step]
  );

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {/* Progress header */}
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold sm:text-lg">
              {editingEventId ? "Edit event" : "New event"}
            </h2>
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
          >
            <div
              className="h-full rounded-full bg-accent-amber transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Mobile: horizontal scroll steps */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 md:hidden [&::-webkit-scrollbar]:hidden">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  s.id === step
                    ? "bg-accent-amber text-white"
                    : s.id < step
                      ? "bg-accent-amber/15 text-accent-amber"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s.short}
              </button>
            ))}
          </div>
          {/* Desktop: numbered steps */}
          <ol className="mt-3 hidden items-center gap-2 md:flex">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      s.id === step
                        ? "bg-accent-amber text-white"
                        : s.id < step
                          ? "bg-accent-amber/15 text-accent-amber"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id + 1}
                  </span>
                  <span
                    className={`text-[13px] font-medium ${s.id === step ? "" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="mx-1 h-px flex-1 bg-border" />
                )}
              </li>
            ))}
          </ol>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </div>
        )}
        {stepAttempted && Object.keys(fieldErrors).length > 0 && (
          <p className="mb-3 text-xs text-destructive">
            Please fix the highlighted fields to continue.
          </p>
        )}

        {step === 0 && (
          <BasicsStep
            eventForm={eventForm}
            fieldErrors={fieldErrors}
            editingEventId={editingEventId}
            coordinators={coordinators}
            venues={venues}
            onChange={handleEventChange}
            onRequestVenue={onRequestVenue}
            onStatusChanged={onStatusChanged}
          />
        )}
        {step === 1 && (
          <ParticipationStep
            eventForm={eventForm}
            fieldErrors={fieldErrors}
            groupLabel={groupLabel}
            onChange={handleEventChange}
            onPatch={patchForm}
          />
        )}
        {step === 2 && (
          <SchedulePointsStep
            eventForm={eventForm}
            roundsForm={roundsForm}
            pointsForm={pointsForm}
            fieldErrors={fieldErrors}
            venues={venues}
            judges={judges}
            assignedJudgeIds={assignedJudgeIds}
            judgesLoading={judgesLoading}
            judgesError={judgesError}
            onChange={handleEventChange}
            onUpdateRound={updateRoundField}
            onUpdateRoundDateTime={updateRoundDateTime}
            onRequestVenue={onRequestVenue}
            onAddPointRow={addPointRow}
            onUpdatePointRow={updatePointRow}
            onRemovePointRow={removePointRow}
            onToggleJudge={toggleJudgeSelection}
          />
        )}
        {step === 3 && (
          <RulesReviewStep
            eventForm={eventForm}
            roundsForm={roundsForm}
            pointsForm={pointsForm}
            groupLabel={groupLabel}
            newRequirement={newRequirement}
            setNewRequirement={setNewRequirement}
            onChange={handleEventChange}
            onPatch={patchForm}
          />
        )}

        {/* Sticky footer: thumb-reachable on mobile (above bottom nav) */}
        <div className="sticky bottom-16 z-10 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:static sm:rounded-b-xl sm:bg-transparent sm:px-0 sm:pb-0 md:bottom-0">
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[120px]"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[120px]"
              >
                Cancel
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                className="min-h-[44px] flex-1 bg-accent-amber text-white hover:bg-accent-amber/90 sm:flex-none sm:min-w-[140px]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[44px] flex-1 bg-accent-amber text-white hover:bg-accent-amber/90 disabled:opacity-50 sm:flex-none sm:min-w-[160px]"
              >
                {saving
                  ? "Saving…"
                  : editingEventId
                    ? "Update event"
                    : "Create event"}
              </Button>
            )}
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="hidden min-h-[44px] sm:inline-flex"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
