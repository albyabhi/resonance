import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Download, MapPin } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../ui/alert-dialog";
import { getEventId } from "./eventConstants";

const slugify = (s = "") => s.replace(/[^a-zA-Z0-9]+/g, "_");

export function ShareEventDialog({ event, onClose }) {
  if (!event) return null;
  const id = getEventId(event);
  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/participate/${id}`
      : `/participate/${id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareLink)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Registration link copied to clipboard!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const downloadQR = async () => {
    const loadToast = toast.loading("Generating QR Code...");
    try {
      // eslint-disable-next-line no-restricted-syntax
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `QR_${slugify(event.title || event.name || "event")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.dismiss(loadToast);
      toast.success("QR Code downloaded successfully!");
    } catch {
      toast.dismiss(loadToast);
      window.open(qrUrl, "_blank");
    }
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share participation invite</DialogTitle>
          <DialogDescription>
            Direct registration access for{" "}
            <strong>{event.title || event.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted p-4">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <img
                src={qrUrl}
                alt="Event QR Code"
                className="h-44 w-44 object-contain"
                onError={() => toast.error("Failed to load QR code image")}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQR}
              className="mt-4 min-h-[44px]"
            >
              <Download className="h-3.5 w-3.5 text-accent-amber" />
              Download PNG QR Code
            </Button>
          </div>
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Direct link
            </Label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-2.5">
              <span className="flex-1 truncate pl-1 font-mono text-xs text-muted-foreground">
                {shareLink}
              </span>
              <Button
                onClick={copyToClipboard}
                size="icon"
                aria-label="Copy registration link"
                className="h-11 w-11 shrink-0 bg-accent-amber text-white hover:bg-accent-amber/90"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteEventDialog({
  openEventId,
  deletionImpact,
  deletionLoading,
  deletionConfirmText,
  setDeletionConfirmText,
  onCancel,
  onConfirm,
}) {
  return (
    <AlertDialog
      open={!!openEventId}
      onOpenChange={(open) => !open && onCancel?.()}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deletionImpact && !deletionImpact.deletable ? (
              <span className="text-destructive">Deletion blocked</span>
            ) : deletionImpact?.groupScoreChanges?.length > 0 ? (
              <span className="text-destructive">
                Delete event — impact on standings
              </span>
            ) : (
              <span>Delete event</span>
            )}
          </AlertDialogTitle>
          {deletionLoading ? (
            <AlertDialogDescription>
              <span className="flex items-center gap-2 py-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Assessing deletion impact…
              </span>
            </AlertDialogDescription>
          ) : deletionImpact ? (
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deletionImpact.blockReason ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {deletionImpact.blockReason}
                  </div>
                ) : (
                  <>
                    {deletionImpact.groupScoreChanges?.length > 0 && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm">
                        <p className="mb-2 font-semibold text-destructive">
                          This will affect group standings:
                        </p>
                        {deletionImpact.groupScoreChanges.map((g) => (
                          <p key={g.group_id} className="text-xs">
                            <span className="font-medium">{g.group_name}</span>:{" "}
                            {g.current_score} → {g.new_score} ({g.delta} pts)
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">
                        This will permanently delete:
                      </p>
                      <ul className="space-y-0.5 text-xs">
                        {deletionImpact.impact.teams > 0 && (
                          <li>
                            • {deletionImpact.impact.teams} team registration
                            {deletionImpact.impact.teams !== 1 ? "s" : ""} (
                            {deletionImpact.impact.participants} participant
                            {deletionImpact.impact.participants !== 1
                              ? "s"
                              : ""}
                            )
                          </li>
                        )}
                        {deletionImpact.impact.scoreSheets > 0 && (
                          <li>
                            • {deletionImpact.impact.scoreSheets} score sheet
                            {deletionImpact.impact.scoreSheets !== 1 ? "s" : ""}
                          </li>
                        )}
                        {deletionImpact.impact.results.total > 0 && (
                          <li>
                            • {deletionImpact.impact.results.total} result
                            {deletionImpact.impact.results.total !== 1
                              ? "s"
                              : ""}{" "}
                            ({deletionImpact.impact.results.published} published,{" "}
                            {deletionImpact.impact.results.draft} draft)
                          </li>
                        )}
                        {deletionImpact.impact.appeals > 0 && (
                          <li>
                            • {deletionImpact.impact.appeals} filed appeal
                            {deletionImpact.impact.appeals !== 1 ? "s" : ""}
                          </li>
                        )}
                        {deletionImpact.impact.schedules > 0 && (
                          <li>
                            • {deletionImpact.impact.schedules} schedule
                            {deletionImpact.impact.schedules !== 1 ? "s" : ""}
                          </li>
                        )}
                        {deletionImpact.impact.judgeSessions > 0 && (
                          <li>
                            • {deletionImpact.impact.judgeSessions} judge session
                            {deletionImpact.impact.judgeSessions !== 1
                              ? "s"
                              : ""}
                          </li>
                        )}
                        {deletionImpact.impact.judgeAssignments > 0 && (
                          <li>
                            • {deletionImpact.impact.judgeAssignments} judge
                            assignment
                            {deletionImpact.impact.judgeAssignments !== 1
                              ? "s"
                              : ""}
                          </li>
                        )}
                        {deletionImpact.impact.teams === 0 &&
                          deletionImpact.impact.scoreSheets === 0 &&
                          deletionImpact.impact.results.total === 0 && (
                            <li>• No registrations or results — safe to delete</li>
                          )}
                      </ul>
                    </div>
                    {deletionImpact.groupScoreChanges?.length > 0 && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Type event name to confirm:
                        </Label>
                        <Input
                          type="text"
                          value={deletionConfirmText}
                          onChange={(e) =>
                            setDeletionConfirmText(e.target.value)
                          }
                          placeholder={deletionImpact.event?.title || ""}
                          className="h-11 text-sm"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription>
              Delete this event and all associated data? This action cannot be
              undone.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel onClick={onCancel} className="min-h-[44px]">
            Cancel
          </AlertDialogCancel>
          {deletionImpact && !deletionImpact.blockReason && !deletionLoading && (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={
                deletionLoading ||
                (deletionImpact.groupScoreChanges?.length > 0 &&
                  deletionConfirmText !== deletionImpact.event?.title)
              }
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletionImpact.groupScoreChanges?.length > 0
                ? "Force delete event"
                : "Delete event"}
            </AlertDialogAction>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function VenueDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", location: "", capacity: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!form.name.trim() || !form.location.trim()) {
      setErr("Venue name and location are required");
      return;
    }
    try {
      setSaving(true);
      await onCreate?.(form);
      setForm({ name: "", location: "", capacity: "" });
      onClose?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent-amber" />
            Add new venue
          </DialogTitle>
          <DialogDescription>Create a venue to use in this event.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {err && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-sm text-destructive">
              {err}
            </p>
          )}
          <div>
            <Label className="mb-2 block text-muted-foreground">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Auditorium"
              className="min-h-[44px]"
            />
          </div>
          <div>
            <Label className="mb-2 block text-muted-foreground">Location *</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Main Building, 2nd Floor"
              className="min-h-[44px]"
            />
          </div>
          <div>
            <Label className="mb-2 block text-muted-foreground">Capacity</Label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="100"
              className="min-h-[44px]"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="min-h-[44px] flex-1 bg-accent-amber text-white hover:bg-accent-amber/90"
            >
              {saving ? "Creating…" : "Create & select"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Mobile-friendly replacement for window.prompt() used by delay/resume.
 */
export function DelayResumeDialog({ mode, onClose, onConfirm }) {
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (mode) {
      setRemarks("");
      setErr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode?.eventId, mode?.action]);

  if (!mode) return null;
  const isDelay = mode.action === "delay";

  const submit = async () => {
    setErr("");
    try {
      setSaving(true);
      await onConfirm?.(remarks);
      setRemarks("");
      onClose?.();
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isDelay ? "Delay event" : "Resume event"}
          </DialogTitle>
          <DialogDescription>
            {isDelay
              ? "The event will be marked as delayed. You can resume it later."
              : "The event will return to its previous status."}{" "}
            A reason helps coordinators and judges.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {err && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-sm text-destructive">
              {err}
            </p>
          )}
          <div>
            <Label className="mb-2 block text-muted-foreground">
              Reason (optional)
            </Label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                isDelay ? "e.g. Rain — moving to tomorrow" : "e.g. Venue ready"
              }
              className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-amber"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="min-h-[44px] flex-1 bg-accent-amber text-white hover:bg-accent-amber/90"
            >
              {saving
                ? isDelay
                  ? "Delaying…"
                  : "Resuming…"
                : isDelay
                  ? "Delay event"
                  : "Resume event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
