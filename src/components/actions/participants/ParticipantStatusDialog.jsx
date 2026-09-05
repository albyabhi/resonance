import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../../ui/alert-dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import { getParticipantStatusMeta } from "./participantUi";

export default function ParticipantStatusDialog({ target, value, reason, onValueChange, onReasonChange, onConfirm, onClose, saving }) {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
        <AlertDialogHeader>
          <AlertDialogTitle>Change participant status</AlertDialogTitle>
          <AlertDialogDescription>
            Change status for <strong>{target?.name}</strong> (current: {getParticipantStatusMeta(target?.status).label}).
            {value && (value === "withdrawn" || value === "disqualified") && " Reason is required for this change."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="disqualified">Disqualified</SelectItem>
            </SelectContent>
          </Select>
          {(value === "withdrawn" || value === "disqualified") && (
            <div>
              <Label htmlFor="participant-status-reason">Reason *</Label>
              <Input id="participant-status-reason" value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Reason for status change" className="mt-1 min-h-11" />
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <AlertDialogCancel className="min-h-11" onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving || !value || ((value === "withdrawn" || value === "disqualified") && !reason.trim())}
            onClick={onConfirm}
            className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving ? "Saving…" : "Change status"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
