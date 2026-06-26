import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const JudgeScoring = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState({});
  const [submittedSheets, setSubmittedSheets] = useState({});

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiCall("/api/judge/assignments");
        setAssignments(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const loadParticipants = async (eventId) => {
    try {
      setLoading(true);
      setError("");
      setScores({});
      setSubmittedSheets({});
      const res = await apiCall(`/api/judge/assignments/${eventId}/participants`);
      setParticipants(res.data || []);
      setEventData(res.event || null);

      const { data: mySheets } = await apiCall(`/api/judge/scores`);
      const sheetMap = {};
      (mySheets || [])
        .filter((s) => String(s.event_id?._id || s.event_id) === eventId)
        .forEach((s) => {
          const tid = String(s.team_id?._id || s.team_id);
          sheetMap[tid] = s;
          if (s.status === "submitted") {
            setScores((prev) => ({
              ...prev,
              [tid]: s.total_score,
            }));
          }
        });
      setSubmittedSheets(sheetMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    if (id) loadParticipants(id);
    else {
      setParticipants([]);
      setEventData(null);
      setScores({});
      setSubmittedSheets({});
    }
  };

  const handleScoreChange = (teamId, value) => {
    setScores((prev) => ({ ...prev, [teamId]: value }));
  };

  const saveScore = async (teamId, submit = false) => {
    try {
      setError("");
      const scoreVal = parseFloat(scores[teamId]);
      if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
        setError("Score must be between 0 and 100");
        return;
      }
      const query = submit ? "?submit=true" : "";
      await apiCall(`/api/judge/scores${query}`, {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEventId,
          round_no: 1,
          team_id: teamId,
          scores: [{ criterion: "overall", score: scoreVal, notes: "" }],
        }),
      });
      await loadParticipants(selectedEventId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>My Assignments</h2>
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>
          {eventData?.enable_blind_judging
            ? "Blind judging active — only chest numbers are shown"
            : "Score assigned participants"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">{error}</div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Assigned Events</label>
        <select
          value={selectedEventId}
          onChange={handleEventChange}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
        >
          <option value="">Select an event</option>
          {(assignments || []).map((a) => (
            <option key={a._id} value={a.event_id?._id || a.event_id}>
              {a.event_id?.name || "Unknown Event"}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Loading...</p>}

      {!loading && participants.length > 0 && (
        <div className="space-y-3">
          {participants.map((p) => {
            const tid = p._id;
            const sheet = submittedSheets[tid];
            const isSubmitted = sheet?.status === "submitted";
            const currentScore = scores[tid] !== undefined ? scores[tid] : (sheet?.total_score || "");

            return (
              <div
                key={tid}
                className="border rounded-lg p-3 flex items-center justify-between"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--card-fg)' }}>
                    Chest #{p.chest_no || `T${tid.slice(-4).toUpperCase()}`}
                  </p>
                  {!eventData?.enable_blind_judging && p.group_name && (
                    <p className="text-xs" style={{ color: 'var(--chart-axis)' }}>{p.group_name}</p>
                  )}
                  {isSubmitted && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Submitted</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentScore}
                    onChange={(e) => handleScoreChange(tid, e.target.value)}
                    disabled={isSubmitted}
                    className="w-20 px-2 py-1 border rounded text-sm text-center"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                    placeholder="Score"
                  />
                  <button
                    type="button"
                    onClick={() => saveScore(tid, false)}
                    disabled={isSubmitted}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => saveScore(tid, true)}
                    disabled={isSubmitted}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    Submit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && selectedEventId && participants.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No participants found for this event.</p>
      )}

      {!loading && assignments.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No events assigned to you yet.</p>
      )}
    </div>
  );
};

export default JudgeScoring;
