import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { apiFetch, API_ROUTES } from "../../utils/apiClient";
import { useCompetition } from "../../context/CompetitionContext";
import toast from "react-hot-toast";
import {
  AlertDialog, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../ui/select";
import { Download, Loader2, AlertTriangle } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

function ExportParticipantsDialog({ open, onOpenChange, groups, groupLabel }) {
  const { token } = useAuth();
  const { competitionId } = useCompetition();

  const [mode, setMode] = useState("all");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (mode === "group" && !selectedGroupId) {
      toast.error(`Please select a ${groupLabel.toLowerCase()}`);
      return;
    }

    setLoading(true);
    try {
      const params = { mode };
      if (mode === "group") {
        params.group_id = selectedGroupId;
      }

      const url = `${API_BASE_URL}${API_ROUTES.PARTICIPANTS.EXPORT(params)}`;
      const response = await apiFetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Competition-ID": competitionId || "",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = "Export failed";
        try {
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch {
          // not JSON
        }
        throw new Error(msg);
      }

      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : "participants.xlsx";

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Export downloaded successfully");
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setMode("all");
      setSelectedGroupId("");
    }
    onOpenChange(isOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
        <AlertDialogHeader>
          <AlertDialogTitle>Export Participants</AlertDialogTitle>
          <AlertDialogDescription>
            Download an Excel file with participant data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:flex gap-2">
            <Button
              type="button"
              variant={mode === "all" ? "default" : "outline"}
              onClick={() => { setMode("all"); setSelectedGroupId(""); }}
              className={`min-h-11 ${mode === "all" ? "bg-accent-amber text-white hover:bg-accent-amber/90" : ""}`}
            >
              Export All Participants
            </Button>
            <Button
              type="button"
              variant={mode === "group" ? "default" : "outline"}
              onClick={() => setMode("group")}
              className={`min-h-11 ${mode === "group" ? "bg-accent-amber text-white hover:bg-accent-amber/90" : ""}`}
            >
              Export by {groupLabel}
            </Button>
          </div>

          {mode === "group" && (
            <div className="sm:pl-6">
              <Label htmlFor="export-group-select" className="sr-only">Select {groupLabel}</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger id="export-group-select" className="min-h-11">
                  <SelectValue placeholder={`Select ${groupLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <AlertDialogCancel disabled={loading} className="min-h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExport}
            disabled={loading || (mode === "group" && !selectedGroupId)}
            className="min-h-11 bg-accent-amber text-white hover:bg-accent-amber/90"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Download Excel</>
            )}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ExportParticipantsDialog;
