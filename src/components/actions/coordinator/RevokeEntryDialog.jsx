import { AlertTriangle, Loader2, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";

export default function RevokeEntryDialog({ target, revoking, onClose, onConfirm }) {
  const open = !!target;
  const members = target?.team?.members || target?.members || [];
  const teamName = target?.team?.name || target?.teamName || "Individual";
  const eventTitle = target?.eventTitle || "event";

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Revoke entry?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                This will withdraw <span className="font-semibold">“{teamName}”</span> from{" "}
                <span className="font-semibold">{eventTitle}</span>. This cannot be undone.
              </p>
              {members.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest">
                    Participants ({members.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <span
                        key={m._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-card-foreground"
                      >
                        <User className="h-3 w-3 shrink-0" />
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] font-semibold">
                Revocation is available only while registration is open and is blocked once
                chest numbers, scores, results, or an active appeal exist.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <AlertDialogCancel onClick={onClose} className="min-h-[44px]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onConfirm?.(); }}
            disabled={revoking}
            className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {revoking ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />Revoking...
              </span>
            ) : (
              "Revoke Entry"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
