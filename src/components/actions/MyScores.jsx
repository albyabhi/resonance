import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const MyScores = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sheets, setSheets] = useState([]);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  const loadSheets = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await apiCall("/api/judge/scores");
      setSheets(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadSheets();
  }, [token]);

  const deleteSheet = async (id) => {
    if (!window.confirm("Delete this score sheet?")) return;
    try {
      await apiCall(`/api/judge/scores/${id}`, { method: "PATCH", body: JSON.stringify({ scores: [] }) });
      await loadSheets();
    } catch (err) {
      setError(err.message);
    }
  };

  const statusChip = (status) => {
    if (status === "draft") return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  };

  return (
    <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>My Scores</h2>
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Your submitted and draft score sheets.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">{error}</div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Loading...</p>
      ) : sheets.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No scores submitted yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-divider)' }}>
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Event</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Chest #</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Round</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Score</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Status</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((s) => (
                <tr key={s._id} className="border-t" style={{ borderColor: 'var(--border-divider)' }}>
                  <td className="p-3 text-sm" style={{ color: 'var(--card-fg)' }}>{s.event_id?.name || "—"}</td>
                  <td className="p-3 text-sm" style={{ color: 'var(--card-fg)' }}>
                    {s.chest_no || (s.team_id?.chest_no) || "—"}
                  </td>
                  <td className="p-3 text-sm" style={{ color: 'var(--card-fg)' }}>{s.round_no || 1}</td>
                  <td className="p-3 text-sm font-medium" style={{ color: 'var(--card-fg)' }}>{s.total_score?.toFixed(1) || "—"}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-1 text-xs ${statusChip(s.status)}`}>{s.status}</span>
                  </td>
                  <td className="p-3 text-sm" style={{ color: 'var(--chart-axis)' }}>
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyScores;
