import { useState } from "react";
import { useAuth } from "../components/AuthContext";
import { apiJson } from "../utils/apiClient";
import { EVENT_STATUSES } from "../utils/eventStatus";
import EventStatusBadge from "./EventStatusBadge";
import toast from "react-hot-toast";
import { X, ChevronDown } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

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

  const currentStatus = event?.status || "draft";

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
      await apiJson(`${API_BASE_URL}/api/event/${event._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-medium transition hover:bg-gray-50 dark:hover:bg-gray-800"
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
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="text-xs theme-text-secondary mb-2">
              Current: <EventStatusBadge status={currentStatus} />
            </div>

            <div>
              <label className="block text-xs font-medium theme-text-secondary mb-1">
                New Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              >
                {WRITABLE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value} disabled={s.value === currentStatus}>
                    {s.label} {s.value === currentStatus ? "(current)" : ""}
                  </option>
                ))}
                {currentStatus !== "cancelled" && (
                  <option value="cancelled" className="text-rose-600">
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
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                disabled={loading || selectedStatus === currentStatus}
                className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
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
