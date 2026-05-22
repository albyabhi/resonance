import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const SubmissionManager = () => {
  const { token, role, user } = useAuth();
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [rounds, setRounds] = useState([]);
  const [roundNo, setRoundNo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [submissions, setSubmissions] = useState([]);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });
  };

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError("");
        const { events } = await apiCall("/api/event");
        setEvents(events || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) loadEvents();
  }, [token]);

  useEffect(() => {
    const loadRounds = async () => {
      setRounds([]);
      setRoundNo("");
      setSubmissions([]);
      if (!eventId) return;
      try {
        setLoading(true);
        setError("");
        const { schedules } = await apiCall(`/api/schedule?event_id=${eventId}`);
        const sorted = (schedules || []).sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
        setRounds(sorted);
        if (sorted.length) setRoundNo(String(sorted[0].round_no));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadRounds();
  }, [eventId]);

  const loadSubmissions = async () => {
    if (!eventId || !roundNo) return;
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      params.append("event_id", eventId);
      params.append("round_no", roundNo);
      if (statusFilter) params.append("status", statusFilter);
      const response = await apiCall(`/api/results?${params.toString()}`);
      const results = response.results || response.data || [];
      const rows = (results || []).map((r) => {
        const team = r.team_id || {};
        const house = team.group_id || {};
        return {
          _id: r._id,
          position: r.position,
          status: r.status,
          teamId: team._id || team,
          chest: team.chest_no || null,
          houseName: house.name || "",
          houseCode: house.code || "",
          submittedBy: r.submitted_by?.name || "",
          submittedById: r.submitted_by?._id || r.submitted_by || "",
        };
      });
      setSubmissions(rows.sort((a, b) => a.position - b.position));
    } catch (err) {
      setError(err.message);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSubmissions([]);
    if (eventId && roundNo) loadSubmissions();
  }, [eventId, roundNo, statusFilter]);

  const isOwnPending = (row) =>
    row.status === "pending" &&
    hasPermission("submit_score") &&
    !!user?.id &&
    String(row.submittedById) === String(user.id);

  const deleteRow = async (row) => {
    if (!isOwnPending(row)) return;
    if (!window.confirm(`Delete position ${row.position}?`)) return;
    try {
      setLoading(true);
      setError("");
      await apiCall(`/api/results/${row._id}`, { method: "DELETE" });
      await loadSubmissions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusChipClass = (status) =>
    status === "pending"
      ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
      : "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";

  return (
    <div className="theme-card p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold theme-text-primary">Submissions</h2>
        <p className="text-sm theme-text-secondary">View and manage submitted results.</p>
      </div>

      {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium theme-text-secondary">Event</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="theme-input min-h-[44px] px-3 py-2">
            <option value="">Select event</option>
            {(events || []).map((e) => {
              const id = e._id || e.event_id;
              return (
                <option key={id} value={id}>
                  {e.name} - {e.event_type} - {e.mode}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium theme-text-secondary">Round</label>
          <select value={roundNo} onChange={(e) => setRoundNo(e.target.value)} disabled={!rounds.length} className="theme-input min-h-[44px] px-3 py-2 disabled:bg-gray-50 dark:disabled:bg-gray-900">
            <option value="">Select round</option>
            {rounds.map((r) => (
              <option key={r._id || r.round_no} value={r.round_no}>
                Round {r.round_no} - {r.status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium theme-text-secondary">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="theme-input min-h-[44px] px-3 py-2">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={loadSubmissions} className="theme-panel min-h-[44px] rounded-lg px-4 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50" disabled={!eventId || !roundNo}>
            Refresh
          </button>
        </div>
      </div>

      <ul className="space-y-2 md:hidden" aria-label="Submissions list">
        {loading ? (
          <li className="py-2 text-center text-sm theme-text-secondary">Loading...</li>
        ) : submissions.length === 0 ? (
          <li className="py-2 text-center text-sm theme-text-secondary">No submissions found</li>
        ) : (
          submissions.map((row) => (
            <li key={row._id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-[#111827]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs theme-text-secondary">Position</p>
                  <p className="text-base font-semibold theme-text-primary">{row.position}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="theme-text-secondary">Team</p>
                      <p className="font-medium theme-text-primary">{row.chest ? `Chest #${row.chest}` : "No chest"}</p>
                    </div>
                    <div>
                      <p className="theme-text-secondary">House</p>
                      <p className="font-medium theme-text-primary">{row.houseName} {row.houseCode ? `(${row.houseCode})` : ""}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="theme-text-secondary">Submitted by</p>
                      <p className="font-medium theme-text-primary">{row.submittedBy || "-"}</p>
                    </div>
                  </div>
                </div>
                <span className={`rounded px-2 py-1 text-xs ${statusChipClass(row.status)}`}>{row.status}</span>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  disabled={!isOwnPending(row)}
                  onClick={() => deleteRow(row)}
                  className={`w-full rounded px-3 py-2 text-sm ${
                    isOwnPending(row)
                      ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                      : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500"
                  }`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 md:block">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Position</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Team</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">House</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Submitted By</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Status</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-sm theme-text-secondary" colSpan={6}>Loading...</td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td className="p-3 text-sm theme-text-secondary" colSpan={6}>No submissions found</td>
              </tr>
            ) : (
              submissions.map((row) => (
                <tr key={row._id} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="p-3 theme-text-primary">{row.position}</td>
                  <td className="p-3 theme-text-primary">{row.chest ? `Chest #${row.chest}` : "No chest"}</td>
                  <td className="p-3 theme-text-primary">{row.houseName} {row.houseCode ? `(${row.houseCode})` : ""}</td>
                  <td className="p-3 theme-text-primary">{row.submittedBy || "-"}</td>
                  <td className="p-3"><span className={`rounded px-2 py-1 text-xs ${statusChipClass(row.status)}`}>{row.status}</span></td>
                  <td className="p-3">
                    <button
                      type="button"
                      disabled={!isOwnPending(row)}
                      onClick={() => deleteRow(row)}
                      className={`rounded px-3 py-1 text-sm ${
                        isOwnPending(row)
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                          : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500"
                      }`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubmissionManager;
