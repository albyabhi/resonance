import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../../ui/alert-dialog";

export default function ParticipantDeleteDialog({ target, selectedCount, onConfirm, onClose, deleting }) {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm delete</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.type === "bulk"
              ? `Delete ${selectedCount} selected participants? This action cannot be undone.`
              : "Delete this participant? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <AlertDialogCancel className="min-h-11" onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={deleting} className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
