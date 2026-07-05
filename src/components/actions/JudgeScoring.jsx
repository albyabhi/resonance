import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { RefreshCw, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const JudgeScoring = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadParticipants = async (eventId, round) => {
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
        .filter((s) => !round || s.round_no === parseInt(round, 10))
        .forEach((s) => {
          const tid = String(s.team_id?._id || s.team_id);
          const existing = sheetMap[tid];
          if (!existing || existing.created_at < s.created_at) {
            sheetMap[tid] = s;
          }
          if (s.status === "submitted" || s.status === "rescored") {
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
    setSelectedRound("");
    setParticipants([]);
    setEventData(null);
    setScores({});
    setSubmittedSheets({});
  };

  const handleRoundChange = (e) => {
    const round = e.target.value;
    setSelectedRound(round);
    if (selectedEventId && round) {
      loadParticipants(selectedEventId, round);
    }
  };

  const handleRefresh = () => {
    if (selectedEventId && selectedRound) {
      loadParticipants(selectedEventId, selectedRound);
    } else if (selectedEventId) {
      loadParticipants(selectedEventId, "1");
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
          round_no: parseInt(selectedRound, 10) || 1,
          team_id: teamId,
          scores: [{ criterion: "overall", score: scoreVal, notes: "" }],
        }),
      });
      toast.success(submit ? "Score submitted" : "Score saved as draft");
      await loadParticipants(selectedEventId, selectedRound);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleRescore = async (teamId) => {
    const sheet = submittedSheets[teamId];
    if (!sheet?._id) {
      toast.error("No existing score sheet found to rescore");
      return;
    }
    try {
      setError("");
      await apiCall(`/api/judge/scores/${sheet._id}/rescore`, {
        method: "POST",
      });
      toast.success("Rescore started — enter a new score");
      await loadParticipants(selectedEventId, selectedRound);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const availableRounds = eventData?.rounds
    ? Array.from({ length: eventData.rounds }, (_, i) => i + 1)
    : [];

  const teamsWithRescore = participants.filter((p) => {
    const tid = p._id;
    const sheet = submittedSheets[tid];
    return sheet?.status === "submitted" || sheet?.status === "rescored";
  });

  return (
    <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>My Assignments</h2>
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>
          {eventData?.enable_blind_judging
            ? "Blind judging active — only chest numbers are shown"
            : "Score assigned participants for each event and round"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
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
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Round</label>
          <select
            value={selectedRound}
            onChange={handleRoundChange}
            disabled={!selectedEventId}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          >
            <option value="">Select round</option>
            {availableRounds.map((r) => (
              <option key={r} value={r} className="bg-white dark:bg-[#0B1220]">Round {r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleRefresh}
            disabled={!selectedEventId}
            className="px-3 py-2 border rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-1"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Loading...</p>}

      {!loading && selectedEventId && selectedRound && participants.length > 0 && (
        <div className="space-y-3">
          {teamsWithRescore.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg mb-3 text-sm">
              {teamsWithRescore.length} team(s) need rescoring. Click <RotateCcw className="h-3 w-3 inline" /> to rescore.
            </div>
          )}
          {participants.map((p) => {
            const tid = p._id;
            const sheet = submittedSheets[tid];
            const isSubmitted = sheet?.status === "submitted";
            const isRescored = sheet?.status === "rescored";
            const showRescoreBtn = isSubmitted || isRescored;
            const hasDraft = sheet?.status === "draft";
            const currentScore = scores[tid] !== undefined ? scores[tid] : (sheet?.total_score || "");

            return (
              <div
                key={tid}
                className="border rounded-lg p-3 flex items-center justify-between"
                style={{ backgroundColor: 'var(--card)', borderColor: showRescoreBtn ? 'var(--border-divider)' : 'var(--border-card)' }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium" style={{ color: 'var(--card-fg)' }}>
                      Chest #{p.chest_no || `T${tid.slice(-4).toUpperCase()}`}
                    </p>
                    {showRescoreBtn && (
                      <span className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                        Rescore
                      </span>
                    )}
                  </div>
                  {!eventData?.enable_blind_judging && p.group_name && (
                    <p className="text-xs" style={{ color: 'var(--chart-axis)' }}>{p.group_name}</p>
                  )}
                  {isSubmitted && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Submitted</p>
                  )}
                  {isRescored && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Rescore needed</p>
                  )}
                  {hasDraft && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Draft</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {showRescoreBtn ? (
                    <button
                      type="button"
                      onClick={() => handleRescore(tid)}
                      className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Rescore
                    </button>
                  ) : isSubmitted ? null : (
                    <>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentScore}
                        onChange={(e) => handleScoreChange(tid, e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm text-center"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                        placeholder="Score"
                      />
                      <button
                        type="button"
                        onClick={() => saveScore(tid, false)}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => saveScore(tid, true)}
                        className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Submit
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && selectedEventId && !selectedRound && (
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Select a round to start scoring.</p>
      )}

      {!loading && selectedEventId && selectedRound && participants.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No participants found for this event and round. Teams may not be registered yet.</p>
        </div>
      )}

      {!loading && assignments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No events assigned to you yet. Contact an organizer to get assigned.</p>
        </div>
      )}
    </div>
  );
};

export default JudgeScoring;
