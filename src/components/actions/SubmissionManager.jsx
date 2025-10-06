// src/components/SubmissionManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const SubmissionManager = () => {
  const { token, role, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [rounds, setRounds] = useState([]);
  const [roundNo, setRoundNo] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "", "pending", "approved"

  // Data
  const [submissions, setSubmissions] = useState([]); // [{ _id, position, team_id: { _id, chest_no?, house_id:{name,code}}, submitted_by, status }]

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: options.body,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }
    if (!res.ok) throw new Error(data.message || "API call failed");
    return data;
  };

  // Load events
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

  // Load rounds when event changes
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

  // Load submissions when filters change
  const loadSubmissions = async () => {
    if (!eventId || !roundNo) return;
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      params.append("event_id", eventId);
      params.append("round_no", roundNo);
      if (statusFilter) params.append("status", statusFilter);
      const { results } = await apiCall(`/api/results?${params.toString()}`);
      const rows = (results || []).map((r) => {
        const team = r.team_id || {};
        const house = team.house_id || {};
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, roundNo, statusFilter]);

  const isOwnPending = (row) =>
    row.status === "pending" &&
    role === "student_coordinator" &&
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
        <p className="text-sm text-gray-600">
          View and manage submitted results (pending and approved)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="">Select event</option>
            {(events || []).map((e) => {
              const id = e._id || e.event_id;
              return (
                <option key={id} value={id}>
                  {e.name} • {e.event_type} • {e.mode}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
          <select
            value={roundNo}
            onChange={(e) => setRoundNo(e.target.value)}
            disabled={!rounds.length}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white disabled:bg-gray-50"
          >
            <option value="">Select round</option>
            {rounds.map((r) => (
              <option key={r._id || r.round_no} value={r.round_no}>
                Round {r.round_no} • {r.status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={loadSubmissions}
            className="px-4 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200"
            disabled={!eventId || !roundNo}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-xs uppercase text-gray-500">Position</th>
              <th className="text-left p-3 text-xs uppercase text-gray-500">Team</th>
              <th className="text-left p-3 text-xs uppercase text-gray-500">House</th>
              <th className="text-left p-3 text-xs uppercase text-gray-500">Submitted By</th>
              <th className="text-left p-3 text-xs uppercase text-gray-500">Status</th>
              <th className="text-left p-3 text-xs uppercase text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-sm text-gray-600" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td className="p-3 text-sm text-gray-600" colSpan={6}>
                  No submissions found
                </td>
              </tr>
            ) : (
              submissions.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-3">{row.position}</td>
                  <td className="p-3">{row.chest ? `Chest #${row.chest}` : "No chest"}</td>
                  <td className="p-3">
                    {row.houseName} {row.houseCode ? `(${row.houseCode})` : ""}
                  </td>
                  <td className="p-3">{row.submittedBy || "-"}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        row.status === "pending"
                          ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      disabled={!isOwnPending(row)}
                      onClick={() => deleteRow(row)}
                      className={`px-3 py-1 rounded text-sm ${
                        isOwnPending(row)
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
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
