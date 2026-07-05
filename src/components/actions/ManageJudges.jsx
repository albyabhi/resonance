import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { X, UserCheck, UserX, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageJudges = ({ event, onClose, onUpdated }) => {
  const { token } = useAuth();
  const [judges, setJudges] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const eventId = event?._id || event?.event_id;

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  const loadData = async () => {
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
  };

  useEffect(() => {
    if (token && eventId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, eventId]);

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Manage Judges</h3>
            <p className="text-xs text-slate-500 mt-1">
              Assign or remove judges for <b>{event?.name || event?.title}</b>
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg mb-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Currently Assigned */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-400">
                Currently Assigned ({assignments.length})
              </label>
              {assignments.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No judges assigned yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignments.map((a) => {
                    const judgeName = a.judge_id?.name || "Unknown";
                    const judgeEmail = a.judge_id?.email || "";
                    return (
                      <div
                        key={a._id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border"
                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)" }}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--card-fg)" }}>{judgeName}</p>
                            {judgeEmail && (
                              <p className="text-xs" style={{ color: "var(--chart-axis)" }}>{judgeEmail}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(a._id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10"
                          title="Remove judge"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Judge */}
            <div className="border-t pt-4" style={{ borderTopColor: "var(--border-divider)" }}>
              <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-400">
                Add a Judge
              </label>
              {availableJudges.length === 0 ? (
                <p className="text-sm text-slate-400">All available judges are already assigned</p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedJudgeId}
                    onChange={(e) => setSelectedJudgeId(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                  >
                    <option value="">Select a judge...</option>
                    {availableJudges.map((j) => (
                      <option key={j._id} value={j._id} className="bg-white dark:bg-[#0B1220]">
                        {j.name}{j.email ? ` (${j.email})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedJudgeId}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageJudges;
