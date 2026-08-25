import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { UserCheck, UserX, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageJudges = ({ event, onClose, onUpdated }) => {
  const { token } = useAuth();
  const [judges, setJudges] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const eventId = event?._id || event?.event_id;

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [judgesRes, assignRes] = await Promise.all([
        apiCall("/api/event/judges"),
        apiCall(`/api/judge/assignments/event/${eventId}`),
      ]);
      setJudges(judgesRes.data || []);
      setAssignments(assignRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, apiCall]);

  useEffect(() => {
    if (token && eventId) loadData();
  }, [token, eventId, loadData]);

  const assignedJudgeIds = new Set(
    assignments.map((a) => String(a.judge_id?._id || a.judge_id))
  );

  const availableJudges = judges.filter(
    (j) => !assignedJudgeIds.has(String(j._id))
  );

  const handleAssign = async () => {
    if (!selectedJudgeId) {
      toast.error("Please select a judge");
      return;
    }
    try {
      setError("");
      await apiCall("/api/judge/assignments/bulk", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          judge_ids: [selectedJudgeId],
        }),
      });
      toast.success("Judge assigned");
      setSelectedJudgeId("");
      await loadData();
      onUpdated?.();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleRemove = async (assignmentId) => {
    if (!window.confirm("Remove this judge from the event?")) return;
    try {
      setError("");
      await apiCall(`/api/judge/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      toast.success("Judge removed");
      await loadData();
      onUpdated?.();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Judges</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Assign or remove judges for <b>{event?.name || event?.title}</b>
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent-amber" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground">
                Currently Assigned ({assignments.length})
              </p>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No judges assigned yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignments.map((a) => {
                    const judgeName = a.judge_id?.name || "Unknown";
                    const judgeEmail = a.judge_id?.email || "";
                    return (
                      <div
                        key={a._id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium text-card-foreground">{judgeName}</p>
                            {judgeEmail && (
                              <p className="text-xs text-muted-foreground">{judgeEmail}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(a._id)}
                          title="Remove judge"
                          className="text-destructive hover:text-destructive"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t pt-4 border-border">
              <p className="text-sm font-semibold mb-2 text-muted-foreground">
                Add a Judge
              </p>
              {availableJudges.length === 0 ? (
                <p className="text-sm text-muted-foreground">All available judges are already assigned</p>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={selectedJudgeId}
                    onValueChange={setSelectedJudgeId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a judge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableJudges.map((j) => (
                        <SelectItem key={j._id} value={j._id}>
                          {j.name}{j.email ? ` (${j.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedJudgeId}
                  >
                    Assign
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageJudges;
