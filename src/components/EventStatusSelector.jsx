import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthContext";
import { apiJson, buildUrl, API_ROUTES } from "../utils/apiClient";
import { EVENT_STATUSES, getStatusMeta } from "../utils/eventStatus";
import EventStatusBadge from "./EventStatusBadge";
import toast from "react-hot-toast";
import { X, ChevronDown, AlertCircle } from "lucide-react";

const WRITABLE_STATUSES = EVENT_STATUSES.filter(
  (s) => s.value !== "cancelled" && s.value !== "delayed"
);
const DESTRUCTIVE_STATUSES = ["cancelled"];

export default function EventStatusSelector({ event, onStatusChanged }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(event?.status || "draft");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [validTransitions, setValidTransitions] = useState([]);
  const [fetchingTransitions, setFetchingTransitions] = useState(false);

  const currentStatus = event?.status || "draft";

  // Fetch valid transitions when event status changes
  useEffect(() => {
    if (!event?._id || !token) return;
    setFetchingTransitions(true);
    apiJson(buildUrl(API_ROUTES.EVENTS.VALID_TRANSITIONS), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      searchParams: { status: currentStatus },
    })
      .then((data) => {
        setValidTransitions(data?.validNext || []);
      })
      .catch(() => setValidTransitions([]))
      .finally(() => setFetchingTransitions(false));
  }, [currentStatus, event?._id, token]);

  const handleChange = async () => {
    if (!selectedStatus || selectedStatus === currentStatus) {
      toast.error("Please select a different status");
      return;
    }
    if (DESTRUCTIVE_STATUSES.includes(selectedStatus)) {
      if (!window.confirm(`Are you sure you want to mark this event as "${selectedStatus}"? This cannot be undone.`)) {
        return;
      }
    }
    setLoading(true);
    try {
      await apiJson(buildUrl(API_ROUTES.EVENTS.STATUS(event._id)), {
        method: "PATCH",
        body: JSON.stringify({ status: selectedStatus, remarks: remarks || undefined }),
      });
      toast.success(`Status changed to ${getStatusMeta(selectedStatus).label}`);
      setOpen(false);
      setRemarks("");
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter writable statuses to only show valid transitions
  const availableStatuses = WRITABLE_STATUSES.filter((s) =>
    s.value === currentStatus || validTransitions.includes(s.value)
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-medium transition hover:bg-muted"
        style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
      >
        <EventStatusBadge status={currentStatus} />
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border shadow-lg"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderBottomColor: "var(--border-divider)" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--card-fg)" }}>
              Change Event Status
            </h3>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="text-xs theme-text-secondary mb-2">
              Current: <EventStatusBadge status={currentStatus} />
            </div>

            {validTransitions.length === 0 && currentStatus !== "cancelled" && currentStatus !== "completed" && (
              <div className="bg-warning/10 border border-warning/30 text-warning px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>No valid transitions from current status. Event may be complete or cancelled.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium theme-text-secondary mb-1">
                New Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={fetchingTransitions}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              >
                {availableStatuses.map((s) => (
                  <option key={s.value} value={s.value} disabled={s.value === currentStatus}>
                    {s.label} {s.value === currentStatus ? "(current)" : ""}
                  </option>
                ))}
                {currentStatus !== "cancelled" && (
                  <option value="cancelled" className="text-destructive">
                    Cancelled (irreversible)
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium theme-text-secondary mb-1">
                Remarks (optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Why is this status changing?"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm font-medium"
                style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChange}
                disabled={loading || selectedStatus === currentStatus || fetchingTransitions}
                className="flex-1 px-3 py-2 bg-warning text-warning-foreground rounded-lg text-sm font-medium hover:bg-warning/90 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}