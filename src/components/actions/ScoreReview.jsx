import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import usePermission from "../../hooks/usePermission";
import { useRealtime } from "../../context/RealtimeContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  submitted: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  published: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400",
  locked: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400",
  judging: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400",
  result_pending: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400",
};

const ScoreReview = () => {
  const { token } = useAuth();
  const { hasAnyRole } = usePermission();
  const { lastUpdate } = useRealtime() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [report, setReport] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [aggregating, setAggregating] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState({});
  const canApprove = hasAnyRole("organizer", "super_admin");

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  const loadEligibleEvents = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [judgingRes, pendingRes, publishedRes] = await Promise.all([
        apiCall("/api/event?status=judging"),
        apiCall("/api/event?status=result_pending"),
        apiCall("/api/event?status=published"),
      ]);
      const allEvents = [
        ...(judgingRes.events || []),
        ...(pendingRes.events || []),
        ...(publishedRes.events || []),
      ];
      setEvents(allEvents);
      if (allEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(allEvents[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedEventId]);

  const loadScoreReport = async (eventId, round) => {
    try {
      setLoading(true);
      setError("");
      const query = round ? `?round_no=${round}` : "";
      const res = await apiCall(`/api/judge/scores/event/${eventId}${query}`);
      setReport(res.data || []);
      setEventInfo(res.event || null);
    } catch (err) {
      setError(err.message);
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (eventId, round) => {
    try {
      setLoading(true);
      setError("");
      const response = await apiCall(`/api/results?event_id=${eventId}&round_no=${round}`);
      const results = response.results || response.data || [];
      setAllResults(results);
    } catch (err) {
      setError(err.message);
      setAllResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async (eventId) => {
    try {
      const tResp = await apiCall(`/api/team?event_id=${eventId}`);
      const mapped = (tResp.data || []).map((t) => ({
        _id: t._id,
        chest_no: t.chest_no || "",
        houseName: t.group_id?.name || "",
        houseCode: "",
      }));
      setTeams(mapped);
    } catch {
      setTeams([]);
    }
  };

  useEffect(() => {
    loadEligibleEvents();
  }, [loadEligibleEvents, lastUpdate]);

  useEffect(() => {
    if (!selectedEventId) return;
    const evt = events.find((e) => e._id === selectedEventId);
    if (!evt) return;
    setEventInfo(evt);
    const round = evt.rounds >= 1 ? "1" : "";
    setSelectedRound(round);
    setTeams([]);
    if (evt.status === "judging") {
      if (round) loadScoreReport(evt._id, round);
    } else if (["result_pending", "published"].includes(evt.status)) {
      if (round) {
        loadResults(evt._id, round);
        loadTeams(evt._id);
      }
    }
  }, [selectedEventId, events]);

  useEffect(() => {
    if (!selectedEventId || !selectedRound || !eventInfo) return;
    if (eventInfo.status === "judging") {
      loadScoreReport(selectedEventId, selectedRound);
    } else if (["result_pending", "published"].includes(eventInfo.status)) {
      loadResults(selectedEventId, selectedRound);
      loadTeams(selectedEventId);
    }
  }, [selectedRound, lastUpdate]);

  const handleEventChange = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    setSelectedRound("");
    setReport([]);
    setAllResults([]);
    setTeams([]);
    setExpandedTeams({});
  };

  const handleRoundChange = (e) => {
    setSelectedRound(e.target.value);
  };

  const handleRefresh = () => {
    if (selectedEventId && selectedRound) {
      const evt = events.find((e) => e._id === selectedEventId);
      if (evt?.status === "judging") {
        loadScoreReport(selectedEventId, selectedRound);
      } else {
        loadResults(selectedEventId, selectedRound);
        loadTeams(selectedEventId);
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedEventId || !selectedRound) {
      toast.error("Select an event and round first");
      return;
    }
    if (!window.confirm("Approve all submitted scores? This will create results and update the leaderboard.")) return;

    try {
      setAggregating(true);
      setError("");
      await apiCall("/api/judge/aggregate", {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEventId,
          round_no: parseInt(selectedRound, 10),
        }),
      });

      await apiCall("/api/results/approve", {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEventId,
          round_no: parseInt(selectedRound, 10),
        }),
      });

      // Update local view immediately to show results table
      setEventInfo((prev) => prev ? { ...prev, status: "result_pending" } : null);
      setReport([]);
      loadEligibleEvents();
      if (selectedEventId && selectedRound) {
        await loadResults(selectedEventId, selectedRound);
        loadTeams(selectedEventId);
      }
      toast.success("Scores approved and leaderboard updated");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setAggregating(false);
    }
  };

  const handleRevert = async (resultId, position, currentStatus) => {
    const msg = currentStatus === "published"
      ? `Revert position ${position} to draft? This will remove points from the leaderboard.`
      : `Revert position ${position} to draft? Points will be removed from the leaderboard.`;
    if (!window.confirm(msg)) return;
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/revert`, { method: "PATCH" });
      toast.success(`Position ${position} reverted to draft`);
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResult = async (resultId, position) => {
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/approve`, { method: "PATCH" });
      toast.success(`Position ${position} approved`);
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResult = async (resultId, position) => {
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/publish`, { method: "PATCH" });
      toast.success(`Position ${position} published`);
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockResult = async (resultId, position) => {
    if (!window.confirm(`Lock position ${position}? This cannot be undone.`)) return;
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/lock`, { method: "PATCH" });
      toast.success(`Position ${position} locked`);
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAll = async () => {
    if (!selectedEventId || !selectedRound) return;
    if (!window.confirm("Approve all pending results for this round?")) return;
    try {
      setLoading(true);
      await apiCall("/api/results/approve", {
        method: "POST",
        body: JSON.stringify({ event_id: selectedEventId, round_no: parseInt(selectedRound, 10) }),
      });
      toast.success("All results approved and leaderboard updated");
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertAll = async () => {
    if (!selectedEventId || !selectedRound) return;
    if (!window.confirm("Revert all approved/published results to draft for this round?")) return;
    try {
      setLoading(true);
      await apiCall("/api/results/revert", {
        method: "POST",
        body: JSON.stringify({ event_id: selectedEventId, round_no: parseInt(selectedRound, 10) }),
      });
      toast.success("All results reverted to draft");
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishAll = async () => {
    if (!selectedEventId || !selectedRound) return;
    if (!window.confirm("Publish all approved results for this round?")) return;
    try {
      setLoading(true);
      await apiCall("/api/results/publish", {
        method: "POST",
        body: JSON.stringify({ event_id: selectedEventId, round_no: parseInt(selectedRound, 10) }),
      });
      toast.success("All results published");
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockAll = async () => {
    if (!selectedEventId || !selectedRound) return;
    if (!window.confirm("Lock all published results for this round? This cannot be undone.")) return;
    try {
      setLoading(true);
      await apiCall("/api/results/lock", {
        method: "POST",
        body: JSON.stringify({ event_id: selectedEventId, round_no: parseInt(selectedRound, 10) }),
      });
      toast.success("All results locked");
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectResult = async (resultId, position) => {
    if (!window.confirm(`Reject position ${position}?`)) return;
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "Rejected by faculty" }),
      });
      toast.success(`Position ${position} rejected`);
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    if (!selectedEventId || !selectedRound) return;
    if (!window.confirm("Reject all pending results for this round?")) return;
    try {
      setLoading(true);
      await apiCall("/api/results/reject", {
        method: "POST",
        body: JSON.stringify({ event_id: selectedEventId, round_no: parseInt(selectedRound, 10) }),
      });
      toast.success("All pending results rejected");
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resultId, position) => {
    if (!window.confirm(`Delete position ${position}?`)) return;
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}`, { method: "DELETE" });
      toast.success(`Position ${position} deleted`);
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (resultId, newTeamId) => {
    if (!resultId || !newTeamId) return;
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}`, {
        method: "PATCH",
        body: JSON.stringify({ team_id: newTeamId }),
      });
      toast.success("Team updated");
      if (selectedEventId && selectedRound) {
        loadResults(selectedEventId, selectedRound);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamExpand = (teamId) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const currentEvent = events.find((e) => e._id === selectedEventId);
  const rounds = eventInfo?.rounds
    ? Array.from({ length: eventInfo.rounds }, (_, i) => i + 1)
    : [];

  const hasSubmittedScores = report.some(
    (g) => g.scores?.some((s) => s.status === "submitted")
  );

  const totalSubmittedSheets = report.reduce(
    (sum, g) => sum + g.scores.filter((s) => s.status === "submitted").length,
    0
  );

  const totalTeams = report.length;

  const hasDraftOrSubmitted = allResults.some((r) =>
    ["draft", "submitted"].includes(r.status)
  );
  const hasApproved = allResults.some((r) => r.status === "approved");
  const hasPublished = allResults.some((r) => r.status === "published");

  const canRevertAny = allResults.some((r) =>
    ["approved", "published"].includes(r.status)
  );

  return (
    <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--card-fg)" }}>Score Review &amp; Approvals</h2>
        <p className="text-sm" style={{ color: "var(--chart-axis)" }}>
          Review scores, approve results, or revert actions for events with judging activity
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg mb-3">{error}</div>
      )}

      {/* Event Selector and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--chart-axis)" }}>Event</label>
          <select
            value={selectedEventId}
            onChange={handleEventChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            {events.length === 0 && <option value="">No events with judging</option>}
            {events.map((evt) => (
              <option key={evt._id} value={evt._id} className="bg-white dark:bg-[#0B1220]">
                {evt.name || evt.title} — {evt.status}
              </option>
            ))}
          </select>
          {events.length === 0 && !loading && (
            <p className="text-xs mt-1" style={{ color: "var(--chart-axis)" }}>No events currently in judging or pending approval</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--chart-axis)" }}>Round</label>
          <select
            value={selectedRound}
            onChange={handleRoundChange}
            disabled={!selectedEventId || rounds.length === 0}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            {rounds.map((r) => (
              <option key={r} value={r} className="bg-white dark:bg-[#0B1220]">Round {r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleRefresh}
            disabled={!selectedEventId || !selectedRound || loading}
            className="px-4 py-2 border rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            Refresh
          </button>
          {currentEvent?.status === "judging" && canApprove && hasSubmittedScores && (
            <button
              onClick={handleApprove}
              disabled={aggregating}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              {aggregating && <Loader2 className="h-4 w-4 animate-spin" />}
              Approve
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats — Judging */}
      {currentEvent?.status === "judging" && report.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="border rounded-lg p-3 text-center" style={{ borderColor: "var(--border-divider)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--card-fg)" }}>{totalTeams}</p>
            <p className="text-xs" style={{ color: "var(--chart-axis)" }}>Teams Scored</p>
          </div>
          <div className="border rounded-lg p-3 text-center" style={{ borderColor: "var(--border-divider)" }}>
            <p className="text-2xl font-bold text-emerald-600">{totalSubmittedSheets}</p>
            <p className="text-xs" style={{ color: "var(--chart-axis)" }}>Submitted Sheets</p>
          </div>
          <div className="border rounded-lg p-3 text-center" style={{ borderColor: "var(--border-divider)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--card-fg)" }}>
              {report.filter((g) => g.score_count > 0).length}
            </p>
            <p className="text-xs" style={{ color: "var(--chart-axis)" }}>Ready to Approve</p>
          </div>
        </div>
      )}

      {/* Event Status Badge */}
      {currentEvent && currentEvent.status !== "judging" && (
        <div className="mb-3 flex items-center gap-2">
          <span className={`text-xs rounded px-2 py-1 ${STATUS_STYLES[currentEvent.status] || ""}`}>
            {currentEvent.status}
          </span>
          <span className="text-xs" style={{ color: "var(--chart-axis)" }}>
            {allResults.length} results
          </span>
        </div>
      )}

      {/* Content Area */}
      {loading && !aggregating ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : currentEvent?.status === "judging" ? (
        /* === JUDGING VIEW — Score Sheets === */
        report.length === 0 && selectedEventId && selectedRound ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--chart-axis)" }} />
            <p className="text-sm" style={{ color: "var(--chart-axis)" }}>No score sheets found for this event and round</p>
          </div>
        ) : report.length === 0 ? null : (
          <div className="space-y-4">
            {report.map((group) => {
              const teamId = String(group.team_id?._id || group.team_id);
              const isExpanded = expandedTeams[teamId];
              const chestNo = group.scores?.[0]?.chest_no || group.team_id?.chest_no || `T${teamId.slice(-4).toUpperCase()}`;
              const teamName = group.team_id?.name || "";
              const submittedScores = group.scores.filter((s) => s.status === "submitted");
              const draftScores = group.scores.filter((s) => s.status === "draft");

              return (
                <div
                  key={teamId}
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: "var(--border-divider)" }}
                >
                  <button
                    onClick={() => toggleTeamExpand(teamId)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    style={{ backgroundColor: "var(--card)" }}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4" style={{ color: "var(--chart-axis)" }} /> : <ChevronRight className="h-4 w-4" style={{ color: "var(--chart-axis)" }} />}
                      <div className="text-left">
                        <p className="font-medium text-sm" style={{ color: "var(--card-fg)" }}>
                          Chest #{chestNo}{teamName ? ` — ${teamName}` : ""}
                        </p>
                        <p className="text-xs" style={{ color: "var(--chart-axis)" }}>
                          {submittedScores.length} submitted, {draftScores.length} draft
                          {group.average_score !== null ? ` · Avg: ${group.average_score.toFixed(1)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.score_count > 0 && group.score_count === group.scores.length && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Ready
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-3 py-3" style={{ borderTopColor: "var(--border-divider)", backgroundColor: "var(--surface)" }}>
                      {group.scores.length === 0 ? (
                        <p className="text-sm" style={{ color: "var(--chart-axis)" }}>No scores recorded yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b" style={{ borderBottomColor: "var(--border-divider)" }}>
                                <th className="text-left pb-2 pr-3 font-medium" style={{ color: "var(--chart-axis)" }}>Judge</th>
                                <th className="text-left pb-2 pr-3 font-medium" style={{ color: "var(--chart-axis)" }}>Score</th>
                                <th className="text-left pb-2 pr-3 font-medium" style={{ color: "var(--chart-axis)" }}>Criteria</th>
                                <th className="text-left pb-2 pr-3 font-medium" style={{ color: "var(--chart-axis)" }}>Status</th>
                                <th className="text-left pb-2 font-medium" style={{ color: "var(--chart-axis)" }}>Submitted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.scores.map((sheet, idx) => (
                                <tr key={sheet.sheet_id || idx} className="border-b border-dashed" style={{ borderBottomColor: "var(--border-divider)" }}>
                                  <td className="py-2 pr-3 font-medium" style={{ color: "var(--card-fg)" }}>
                                    {sheet.judge?.name || "Unknown"}
                                  </td>
                                  <td className="py-2 pr-3 font-bold" style={{ color: "var(--card-fg)" }}>
                                    {sheet.total_score?.toFixed(1) || "—"}
                                  </td>
                                  <td className="py-2 pr-3" style={{ color: "var(--card-fg)" }}>
                                    {sheet.scores?.map((sc) => (
                                      <span key={sc.criterion} className="text-xs">
                                        {sc.criterion}: {sc.score}
                                        {sc.notes ? ` (${sc.notes})` : ""}
                                      </span>
                                    ))}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <span className={`text-xs rounded px-1.5 py-0.5 ${
                                      sheet.status === "submitted"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                        : sheet.status === "rescored"
                                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                          : "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"
                                    }`}>
                                      {sheet.status}
                                    </span>
                                  </td>
                                  <td className="py-2" style={{ color: "var(--chart-axis)" }}>
                                    {sheet.submitted_at ? new Date(sheet.submitted_at).toLocaleDateString() : "—"}
                                  </td>
                                </tr>
                              ))}
                              {group.average_score !== null && (
                                <tr className="font-bold">
                                  <td className="py-2 pr-3" style={{ color: "var(--card-fg)" }}>Average</td>
                                  <td className="py-2 pr-3 text-orange-600">{group.average_score.toFixed(1)}</td>
                                  <td colSpan={3}></td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : currentEvent && ["result_pending", "published"].includes(currentEvent.status) ? (
        /* === RESULT_PENDING / PUBLISHED VIEW — Results Table === */
        <div>
          <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="p-3 text-left text-xs uppercase" style={{ color: "var(--chart-axis)" }}>Position</th>
                  <th className="p-3 text-left text-xs uppercase" style={{ color: "var(--chart-axis)" }}>Team</th>
                  <th className="p-3 text-left text-xs uppercase" style={{ color: "var(--chart-axis)" }}>Group</th>
                  <th className="p-3 text-left text-xs uppercase" style={{ color: "var(--chart-axis)" }}>Points</th>
                  <th className="p-3 text-left text-xs uppercase" style={{ color: "var(--chart-axis)" }}>Submitted By</th>
                  <th className="p-3 text-left text-xs uppercase" style={{ color: "var(--chart-axis)" }}>Status</th>
                  <th className="p-3 text-left text-xs uppercase" style={{ color: "var(--chart-axis)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allResults.length === 0 ? (
                  <tr><td className="p-3 text-sm" style={{ color: "var(--chart-axis)" }} colSpan={7}>No results for this round</td></tr>
                ) : (
                  allResults.map((r) => {
                    const team = r.team_id || {};
                    const house = team.group_id || {};
                    const status = r.status;
                    const ptsDisplay = r.points != null
                      ? (r.multiplier != null && r.multiplier !== 1 ? `${r.points} × ${r.multiplier}` : r.points)
                      : "—";
                    return (
                      <tr key={r._id} className="border-t border-gray-200 dark:border-gray-800">
                        <td className="p-3" style={{ color: "var(--card-fg)" }}>{r.position}</td>
                        <td className="p-3" style={{ color: "var(--card-fg)" }}>
                          {team.chest_no ? `Chest #${team.chest_no}` : "No chest"}
                          {r.average_score != null && (
                            <span className="ml-2 text-xs text-indigo-500">avg: {Number(r.average_score).toFixed(1)}</span>
                          )}
                        </td>
                        <td className="p-3" style={{ color: "var(--card-fg)" }}>{house.name || ""}</td>
                        <td className="p-3 font-medium" style={{ color: "var(--card-fg)" }}>{ptsDisplay}</td>
                        <td className="p-3" style={{ color: "var(--card-fg)" }}>{r.submitted_by?.name || "-"}</td>
                        <td className="p-3">
                          <span className={`rounded px-2 py-1 text-xs ${STATUS_STYLES[status] || ""}`}>{status}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {["draft", "submitted"].includes(status) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveResult(r._id, r.position)}
                                  className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  disabled={!canApprove}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectResult(r._id, r.position)}
                                  className="rounded bg-rose-50 px-3 py-1 text-sm text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"
                                  disabled={!canApprove}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {status === "approved" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handlePublishResult(r._id, r.position)}
                                  className="rounded bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400"
                                  disabled={!canApprove}
                                >
                                  Publish
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevert(r._id, r.position, status)}
                                  className="rounded bg-amber-50 px-3 py-1 text-sm text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 flex items-center gap-1"
                                  disabled={!canApprove}
                                >
                                  <Undo2 className="h-3 w-3" /> Revert
                                </button>
                              </>
                            )}
                            {status === "published" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleLockResult(r._id, r.position)}
                                  className="rounded bg-purple-50 px-3 py-1 text-sm text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400"
                                  disabled={!canApprove}
                                >
                                  Lock
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevert(r._id, r.position, status)}
                                  className="rounded bg-amber-50 px-3 py-1 text-sm text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 flex items-center gap-1"
                                  disabled={!canApprove}
                                >
                                  <Undo2 className="h-3 w-3" /> Revert
                                </button>
                              </>
                            )}
                            {status === "locked" && (
                              <span className="text-xs rounded px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Bulk Actions */}
            {allResults.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 flex-wrap border-t border-gray-200 dark:border-gray-800">
                {hasDraftOrSubmitted && (
                  <>
                    <button
                      type="button"
                      onClick={handleApproveAll}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                      disabled={!canApprove}
                    >
                      Approve All
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectAll}
                      className="rounded-lg bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
                      disabled={!canApprove}
                    >
                      Reject All
                    </button>
                  </>
                )}
                {canRevertAny && (
                  <button
                    type="button"
                    onClick={handleRevertAll}
                    className="rounded-lg bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
                    disabled={!canApprove}
                  >
                    Revert All
                  </button>
                )}
                {hasApproved && (
                  <button
                    type="button"
                    onClick={handlePublishAll}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={!canApprove}
                  >
                    Publish All Approved
                  </button>
                )}
                {hasPublished && (
                  <button
                    type="button"
                    onClick={handleLockAll}
                    className="rounded-lg bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                    disabled={!canApprove}
                  >
                    Lock All Published
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Edit Pending Rows */}
          {allResults.filter((r) => ["draft", "submitted"].includes(r.status)).length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium theme-text-primary dark:border-gray-800 dark:bg-gray-900">
                Edit Pending Rows
              </div>
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="p-3 text-left text-xs uppercase theme-text-muted">Position</th>
                    <th className="p-3 text-left text-xs uppercase theme-text-muted">Current Team</th>
                    <th className="p-3 text-left text-xs uppercase theme-text-muted">Change To</th>
                    <th className="p-3 text-left text-xs uppercase theme-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allResults
                    .filter((r) => ["draft", "submitted"].includes(r.status))
                    .sort((a, b) => a.position - b.position)
                    .map((row) => {
                      const team = row.team_id || {};
                      const currentLabel = team.chest_no ? `Chest #${team.chest_no}` : "No chest";
                      return (
                        <tr key={row._id} className="border-t border-gray-200 dark:border-gray-800">
                          <td className="p-3 theme-text-primary">{row.position}</td>
                          <td className="p-3 theme-text-primary">{currentLabel}</td>
                          <td className="p-3">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const newTeamId = e.target.value;
                                if (!newTeamId) return;
                                handleUpdateTeam(row._id, newTeamId);
                                e.target.value = "";
                              }}
                              className="theme-input px-2 py-1"
                            >
                              <option value="">Select team</option>
                              {(teams || []).map((t) => (
                                <option key={t._id} value={t._id}>
                                  {t.chest_no ? `Chest #${t.chest_no}` : "No chest"} — {t.houseName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteResult(row._id, row.position)}
                              className="rounded bg-rose-50 px-3 py-1 text-sm text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                              disabled={!canApprove}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : selectedEventId && selectedRound && !loading ? (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: "var(--chart-axis)" }}>Select an event with judging activity to begin review</p>
        </div>
      ) : null}
    </div>
  );
};

export default ScoreReview;
