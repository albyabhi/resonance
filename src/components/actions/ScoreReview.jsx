import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import usePermission from "../../hooks/usePermission";
import { useRealtime } from "../../context/RealtimeContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

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

  useEffect(() => {
    if (!token) return;
    const loadEvents = async () => {
      try {
        setLoading(true);
        const { events: evts } = await apiCall("/api/event");
        setEvents(evts || []);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, lastUpdate]);

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

  const handleEventChange = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    setSelectedRound("");
    setReport([]);
    setExpandedTeams({});
    if (id) {
      const evt = events.find((ev) => (ev._id || ev.event_id) === id);
      if (evt) {
        setEventInfo(evt);
      }
    } else {
      setEventInfo(null);
    }
  };

  const handleRoundChange = (e) => {
    const round = e.target.value;
    setSelectedRound(round);
    if (selectedEventId && round) {
      loadScoreReport(selectedEventId, round);
    }
  };

  const handleRefresh = () => {
    if (selectedEventId && selectedRound) {
      loadScoreReport(selectedEventId, selectedRound);
    }
  };

  const handleAggregate = async () => {
    if (!selectedEventId || !selectedRound) {
      toast.error("Select an event and round first");
      return;
    }
    if (!window.confirm("Aggregate all submitted scores into results? This will create Result records and transition the event to result_pending.")) return;

    try {
      setAggregating(true);
      setError("");
      const res = await apiCall("/api/judge/aggregate", {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEventId,
          round_no: parseInt(selectedRound, 10),
        }),
      });
      toast.success(res.data?.message || "Scores aggregated successfully");
      await loadScoreReport(selectedEventId, selectedRound);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setAggregating(false);
    }
  };

  const toggleTeamExpand = (teamId) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

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

  return (
    <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--card-fg)" }}>Score Review</h2>
        <p className="text-sm" style={{ color: "var(--chart-axis)" }}>
          Review individual judge score sheets before aggregating into results
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg mb-3">{error}</div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--chart-axis)" }}>Event</label>
          <select
            value={selectedEventId}
            onChange={handleEventChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            <option value="">Select an event</option>
            {events.map((evt) => (
              <option key={evt._id} value={evt._id} className="bg-white dark:bg-[#0B1220]">
                {evt.name || evt.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--chart-axis)" }}>Round</label>
          <select
            value={selectedRound}
            onChange={handleRoundChange}
            disabled={!selectedEventId}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            <option value="">Select a round</option>
            {rounds.map((r) => (
              <option key={r} value={r} className="bg-white dark:bg-[#0B1220]">Round {r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleRefresh}
            disabled={!selectedEventId || !selectedRound}
            className="px-4 py-2 border rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            Refresh
          </button>
          {canApprove && hasSubmittedScores && (
            <button
              onClick={handleAggregate}
              disabled={aggregating}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              {aggregating && <Loader2 className="h-4 w-4 animate-spin" />}
              Aggregate Scores
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {report.length > 0 && (
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
            <p className="text-xs" style={{ color: "var(--chart-axis)" }}>Ready to Aggregate</p>
          </div>
        </div>
      )}

      {/* Score Report */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : report.length === 0 && selectedEventId && selectedRound ? (
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
                {/* Team Header */}
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

                {/* Expanded Score Details */}
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
      )}
    </div>
  );
};

export default ScoreReview;
