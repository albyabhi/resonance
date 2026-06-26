import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../components/AuthContext";
import { apiJson } from "../utils/apiClient";
import EventStatusBadge from "./EventStatusBadge";
import { Clock, User } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function EventTimeline({ eventId }) {
  const { token } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTimeline = useCallback(async () => {
    if (!eventId || !token) return;
    setLoading(true);
    setError("");
    try {
      const resp = await apiJson(`${API_BASE_URL}/api/event/${eventId}/timeline`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeline(resp.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, token]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return <div className="text-sm theme-text-secondary py-2">Loading timeline...</div>;
  }

  if (error) {
    return <div className="text-sm text-rose-600 py-2">{error}</div>;
  }

  if (!timeline.length) {
    return <div className="text-sm theme-text-secondary py-2">No status changes recorded.</div>;
  }

  return (
    <div className="space-y-0">
      {timeline.map((entry, idx) => {
        const isLast = idx === timeline.length - 1;
        return (
          <div key={entry._id} className="relative flex gap-4 pb-4">
            {!isLast && (
              <div className="absolute left-[7px] top-4 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            )}
            <div className="flex flex-col items-center">
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <EventStatusBadge status={entry.status} />
                {entry.previous_status && (
                  <span className="text-xs theme-text-secondary">
                    from <EventStatusBadge status={entry.previous_status} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs theme-text-secondary">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(entry.timestamp)}
                </span>
                {entry.changed_by && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.changed_by.name || entry.changed_by.email || "Unknown"}
                  </span>
                )}
              </div>
              {entry.remarks && (
                <p className="mt-1 text-xs theme-text-secondary italic">
                  "{entry.remarks}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
