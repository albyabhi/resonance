import { Copy, Download, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "../../ui/alert-dialog";
import { Button } from "../../ui/button";

export default function ParticipantLinksDialog({ open, links, skippedActive, copying, onCopyAll, onDownloadExcel, onCopyOne, onClose }) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Setup links ({links?.length || 0})</AlertDialogTitle>
          <AlertDialogDescription>
            Fresh one-time links — old links for these participants no longer work. Links expire in 7 days.
            Share manually (copy, Excel, or via {`group`} captain). Participants without a link can also self-serve
            at Participant Login → Claim with slug + email.
            {skippedActive > 0 && ` Skipped ${skippedActive} with password already set.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 py-2">
          <Button variant="outline" className="min-h-10 flex-1" onClick={onCopyAll} disabled={copying || !links?.length}>
            {copying ? (<><Loader2 className="h-4 w-4 animate-spin mr-1" /> Copying…</>) : (<><Copy className="h-4 w-4 mr-1" /> Copy all</>)}
          </Button>
          <Button variant="outline" className="min-h-10 flex-1" onClick={onDownloadExcel} disabled={!links?.length}>
            <Download className="h-4 w-4 mr-1" /> Download Excel
          </Button>
        </div>
        <ul className="space-y-2 max-h-[40dvh] overflow-y-auto pr-1">
          {(links || []).map((link) => (
            <li key={String(link.participant_id)} className="rounded-lg border border-border p-2.5">
              <p className="text-sm font-medium text-card-foreground truncate">{link.name}</p>
              <p className="text-xs text-muted-foreground truncate">{link.email || "no-email"}</p>
              <div className="mt-1.5 flex items-center gap-2 rounded-md bg-muted px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={link.setup_link}>{link.setup_link}</span>
                <Button variant="ghost" size="sm" onClick={() => onCopyOne(link)}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel className="min-h-11" onClick={onClose}>Done</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
