import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson, buildUrl } from "../../utils/apiClient";
import { Loader2, AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Undo2, Info, Rocket } from "lucide-react";
import toast from "react-hot-toast";
import usePermission from "../../hooks/usePermission";
import { useRealtime } from "../../context/RealtimeContext";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Label } from "../ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip";

const statusBadgeProps = (status) => {
  const map = {
    draft: { variant: "secondary", className: "" },
    submitted: { variant: "outline", className: "text-accent-amber border-accent-amber bg-accent-amber/10" },
    confirmed: { variant: "outline", className: "text-accent-green border-accent-green bg-accent-green/10" },
    approved: { variant: "success", className: "" },
    published: { variant: "outline", className: "text-accent-blue border-accent-blue/20 bg-accent-blue-tint" },
    locked: { variant: "outline", className: "text-accent-purple border-accent-purple/20 bg-accent-purple-tint" },
    judging: { variant: "outline", className: "text-accent-amber border-accent-amber bg-accent-amber/10" },
    result_pending: { variant: "outline", className: "text-accent-blue border-accent-blue bg-accent-blue/10" },
  };
  return map[status] || { variant: "secondary", className: "" };
};

const flowSteps = [
  { id: "draft", label: "Draft", desc: "Initial state", color: "text-muted-foreground" },
  { id: "submitted", label: "Submitted", desc: "Judge submitted scores", color: "text-accent-amber" },
  { id: "confirmed", label: "Confirmed", desc: "Staff confirmed scores", color: "text-accent-green" },
  { id: "published", label: "Published", desc: "Public — points live on overall standings", color: "text-accent-blue" },
  { id: "locked", label: "Locked", desc: "Final, cannot change", color: "text-accent-purple" },
];

const ScoreReview = () => {
  const { token } = useAuth();
  const { hasAnyRole } = usePermission();
  const { lastUpdate } = useRealtime() || {};
  const canApprove = hasAnyRole("organizer", "super_admin");

  const [activeTab, setActiveTab] = useState("pending");

  // ── Event lists per tab ──
  const [pendingEvents, setPendingEvents] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // ── Per-event expanded state & data ──
  const [expandedEvents, setExpandedEvents] = useState({});
  const [eventData, setEventData] = useState({});

  // ── Global state ──
  const [, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState({ open: false, title: "", description: "", onConfirm: null });

  const showConfirm = (title, description, onConfirm) => {
    setConfirm({ open: true, title, description, onConfirm });
  };

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(buildUrl(endpoint), {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  // ── Fetch event lists ──
  const loadPendingEvents = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingEvents(true);
      setError("");
      const res = await apiCall("/api/event?status=pending_review");
      setPendingEvents(res.events || res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEvents(false);
    }
  }, [token, apiCall]);

  const loadApprovedEvents = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingEvents(true);
      setError("");
      const res = await apiCall("/api/event?status=scored_reviewed");
      setApprovedEvents(res.events || res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEvents(false);
    }
  }, [token, apiCall]);

  // ── Fetch per-event data (lazy on expand) ──
  const loadEventScoreReport = useCallback(async (eventId, round) => {
    try {
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], loading: true } }));
      setError("");
      const query = round ? `?round_no=${round}` : "";
      const res = await apiCall(`/api/judge/scores/event/${eventId}${query}`);
      setEventData((prev) => ({
        ...prev,
        [eventId]: {
          ...prev[eventId],
          report: res.data || [],
          eventInfo: res.event || null,
          judges: res.judges || null,
          loading: false,
        },
      }));
    } catch (err) {
      setError(err.message);
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], report: [], judges: null, loading: false } }));
    }
  }, [apiCall]);

  const loadEventResults = useCallback(async (eventId, round) => {
    try {
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], loading: true } }));
      setError("");
      const response = await apiCall(`/api/results?event_id=${eventId}&round_no=${round}`);
      const results = response.results || response.data || [];
      setEventData((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], allResults: results, loading: false },
      }));
    } catch (err) {
      setError(err.message);
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], allResults: [], loading: false } }));
    }
  }, [apiCall]);

  const loadEventTeams = useCallback(async (eventId) => {
    try {
      const tResp = await apiCall(`/api/team?event_id=${eventId}`);
      const mapped = (tResp.data || []).map((t) => ({
        _id: t._id,
        chest_no: t.chest_no || "",
        houseName: t.group_id?.name || "",
        houseCode: "",
      }));
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], teams: mapped } }));
    } catch {
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], teams: [] } }));
    }
  }, [apiCall]);

  // ── Load events on mount and on tab switch ──
  useEffect(() => {
    loadPendingEvents();
  }, [loadPendingEvents, lastUpdate]);

  useEffect(() => {
    loadApprovedEvents();
  }, [loadApprovedEvents, lastUpdate]);

  // ── Expand/collapse event ──
  const toggleEventExpand = useCallback((eventId, eventObj) => {
    setExpandedEvents((prev) => {
      const isExpanding = !prev[eventId];
      if (isExpanding) {
        // Initialize event data on first expand
        setEventData((ed) => {
          if (ed[eventId]) return ed;
          const round = eventObj?.rounds >= 1 ? 1 : "";
          return {
            ...ed,
            [eventId]: {
              selectedRound: String(round),
              report: [],
              allResults: [],
              teams: [],
              judges: null,
              eventInfo: eventObj,
              loading: false,
              expandedTeams: {},
            },
          };
        });
      }
      return { ...prev, [eventId]: isExpanding };
    });
  }, []);

  // ── Load data when event is expanded and round changes ──
  useEffect(() => {
    for (const eventId of Object.keys(expandedEvents).filter((id) => expandedEvents[id])) {
      const data = eventData[eventId];
      if (!data || !data.selectedRound) continue;
      const evt = pendingEvents.find((e) => e._id === eventId) || approvedEvents.find((e) => e._id === eventId);
      if (!evt) continue;

      // Pending tab events always have submitted ScoreSheets — load score report.
      // Approved tab events use the results-based rendering.
      const isPendingEvent = pendingEvents.some((e) => e._id === eventId);
      if (isPendingEvent && !data.report?.length && !data.loading) {
        loadEventScoreReport(eventId, data.selectedRound);
      } else if (!isPendingEvent && ["result_pending", "published"].includes(evt.status)) {
        if (!data.allResults?.length && !data.loading) {
          loadEventResults(eventId, data.selectedRound);
          loadEventTeams(eventId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedEvents]);

  // ── Per-event action handlers ──
  const handleEventRoundChange = (eventId, round) => {
    setEventData((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], selectedRound: round, report: [], allResults: [], teams: [] },
    }));
  };

  const handleRefreshEvent = (eventId) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    const isPendingEvent = pendingEvents.some((e) => e._id === eventId);
    setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], report: [], allResults: [], teams: [] } }));
    if (isPendingEvent) {
      loadEventScoreReport(eventId, data.selectedRound);
    } else {
      loadEventResults(eventId, data.selectedRound);
      loadEventTeams(eventId);
    }
  };

  const refreshEventList = () => {
    loadPendingEvents();
    loadApprovedEvents();
  };

  const handleConfirmScores = async (eventId) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    try {
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], aggregating: true } }));
      setError("");
      const res = await apiCall("/api/judge/aggregate", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(data.selectedRound, 10) }),
      });
      toast.success(res?.data?.message || "Draft results created from judge scores");
      setEventData((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], report: [], aggregating: false },
      }));
      refreshEventList();
      if (data.selectedRound) {
        await loadEventResults(eventId, data.selectedRound);
        loadEventTeams(eventId);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], aggregating: false } }));
    }
  };

  const handleFinalize = async (eventId, force = false) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    try {
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], finalizing: true } }));
      setError("");
      const res = await apiCall("/api/results/finalize", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(data.selectedRound, 10), force }),
      });
      if (res?.data?.transitionError) {
        toast.warning(res.data.message || "Results finalized but event status transition failed");
      } else {
        toast.success(res?.data?.message || "Results finalized — points published to overall standings");
      }
      refreshEventList();
      if (data.selectedRound) {
        await loadEventResults(eventId, data.selectedRound);
        loadEventTeams(eventId);
      }
    } catch (err) {
      const missing = err?.payload?.missing_judges;
      if (err?.status === 409 && Array.isArray(missing) && missing.length > 0) {
        const names = missing.map((j) => j.name).join(", ");
        showConfirm(
          "Missing Judge Submissions",
          `${missing.length} assigned judge(s) have not submitted scores: ${names}. Finalize anyway with the current submissions?`,
          () => handleFinalize(eventId, true)
        );
      } else {
        setError(err.message);
        toast.error(err.message);
      }
    } finally {
      setEventData((prev) => ({ ...prev, [eventId]: { ...prev[eventId], finalizing: false } }));
    }
  };

  const handleRevert = async (resultId, eventId) => {
    const data = eventData[eventId];
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/revert`, { method: "PATCH" });
      toast.success("Result reverted to draft");
      if (data?.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResult = async (resultId, position, eventId) => {
    const data = eventData[eventId];
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/approve`, { method: "PATCH" });
      toast.success(`Position ${position} approved`);
      if (data?.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResult = async (resultId, position, eventId) => {
    const data = eventData[eventId];
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/publish`, { method: "PATCH" });
      toast.success(`Position ${position} published`);
      if (data?.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockResult = async (resultId, position, eventId) => {
    const data = eventData[eventId];
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/lock`, { method: "PATCH" });
      toast.success(`Position ${position} locked`);
      if (data?.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAll = async (eventId) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    try {
      setLoading(true);
      await apiCall("/api/results/approve", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(data.selectedRound, 10) }),
      });
      toast.success("All results approved. Points go live once published.");
      if (data.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertAll = async (eventId) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    try {
      setLoading(true);
      await apiCall("/api/results/revert", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(data.selectedRound, 10) }),
      });
      toast.success("All results reverted to draft");
      if (data.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishAll = async (eventId) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    try {
      setLoading(true);
      await apiCall("/api/results/publish", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(data.selectedRound, 10) }),
      });
      toast.success("All results published");
      if (data.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockAll = async (eventId) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    try {
      setLoading(true);
      await apiCall("/api/results/lock", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(data.selectedRound, 10) }),
      });
      toast.success("All results locked");
      if (data.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectResult = async (resultId, position, eventId) => {
    const data = eventData[eventId];
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "Rejected by faculty" }),
      });
      toast.success(`Position ${position} rejected`);
      if (data?.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async (eventId) => {
    const data = eventData[eventId];
    if (!data?.selectedRound) return;
    try {
      setLoading(true);
      await apiCall("/api/results/reject", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(data.selectedRound, 10) }),
      });
      toast.success("All pending results rejected");
      if (data.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resultId, position, eventId) => {
    const data = eventData[eventId];
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}`, { method: "DELETE" });
      toast.success(`Position ${position} deleted`);
      if (data?.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (resultId, newTeamId, eventId) => {
    if (!resultId || !newTeamId) return;
    const data = eventData[eventId];
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}`, {
        method: "PATCH",
        body: JSON.stringify({ team_id: newTeamId }),
      });
      toast.success("Team updated");
      if (data?.selectedRound) loadEventResults(eventId, data.selectedRound);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamExpand = (eventId, teamId) => {
    setEventData((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        expandedTeams: {
          ...(prev[eventId]?.expandedTeams || {}),
          [teamId]: !(prev[eventId]?.expandedTeams || {})[teamId],
        },
      },
    }));
  };

  // ── Render: Pending event card (judging status) ──
  const renderPendingEvent = (evt) => {
    const isExpanded = expandedEvents[evt._id] || false;
    const data = eventData[evt._id] || {};
    const { selectedRound = "", report = [], judges = null, loading: evtLoading = false, aggregating = false, finalizing = false, expandedTeams = {} } = data;
    const rounds = evt.rounds ? Array.from({ length: evt.rounds }, (_, i) => i + 1) : [];

    const totalSubmittedSheets = report.reduce((sum, g) => sum + g.scores.filter((s) => ["submitted", "confirmed", "published"].includes(s.status)).length, 0);
    const totalTeams = report.length;
    const hasSubmittedScores = report.some((g) => g.scores?.some((s) => ["submitted", "confirmed", "published"].includes(s.status)));

    return (
      <div key={evt._id} className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleEventExpand(evt._id, evt)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted bg-card text-left"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="font-medium text-sm text-card-foreground">{evt.name || evt.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-accent-amber border-accent-amber bg-accent-amber/10">
                  {evt.status || "pending review"}
                </Badge>
                {judges && (
                  <span className={`text-xs ${judges.all_submitted ? "text-accent-green" : "text-accent-amber"}`}>
                    {judges.submitted_count}/{judges.assigned_count} judges submitted
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && rounds.length > 0 && (
              <Select value={selectedRound} onValueChange={(val) => handleEventRoundChange(evt._id, val)}>
                <SelectTrigger className="w-32" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Round" />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((r) => (
                    <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border p-4 bg-muted/30">
            {evtLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-accent-amber" />
              </div>
            ) : !selectedRound ? (
              <p className="text-sm text-muted-foreground text-center py-4">Select a round to view submissions</p>
            ) : report.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No score sheets found for this round</p>
              </div>
            ) : (
              <>
                {/* Judge completeness banner */}
                {judges && (
                  <div className={`mb-3 px-3 py-2 rounded-lg border flex items-start gap-2 ${
                    judges.all_submitted
                      ? "border-accent-green/20 bg-accent-green-tint"
                      : "border-accent-amber/20 bg-accent-amber-tint"
                  }`}>
                    {judges.all_submitted ? (
                      <CheckCircle className="h-4 w-4 mt-0.5 text-accent-green shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-accent-amber shrink-0" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium text-card-foreground">
                        Judges submitted: {judges.submitted_count}/{judges.assigned_count}
                      </p>
                      {!judges.all_submitted && judges.missing?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Waiting on: {judges.missing.map((j) => j.name).join(", ")}. You can still confirm with the current submissions.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="border border-border rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-card-foreground">{totalTeams}</p>
                    <p className="text-xs text-muted-foreground">Teams Scored</p>
                  </div>
                  <div className="border border-border rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-accent-green">{totalSubmittedSheets}</p>
                    <p className="text-xs text-muted-foreground">Submitted Sheets</p>
                  </div>
                  <div className="border border-border rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-card-foreground">
                      {report.filter((g) => g.score_count > 0).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Ready to Approve</p>
                  </div>
                </div>

                {/* Team accordions */}
                <div className="space-y-3 mb-3">
                  {report.map((group) => {
                    const teamId = String(group.team_id?._id || group.team_id);
                    const isTeamExpanded = expandedTeams[teamId];
                    const chestNo = group.scores?.[0]?.chest_no || group.team_id?.chest_no || `T${teamId.slice(-4).toUpperCase()}`;
                    const teamName = group.team_id?.name || "";
                    const submittedScores = group.scores.filter((s) => ["submitted", "confirmed", "published"].includes(s.status));
                    const draftScores = group.scores.filter((s) => s.status === "draft");

                    return (
                      <div key={teamId} className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleTeamExpand(evt._id, teamId)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted bg-card"
                        >
                          <div className="flex items-center gap-3">
                            {isTeamExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <div className="text-left">
                              <p className="font-medium text-sm text-card-foreground">
                                Chest #{chestNo}{teamName ? ` — ${teamName}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {submittedScores.length} submitted, {draftScores.length} draft
                                {group.average_score !== null ? ` · Avg: ${group.average_score.toFixed(1)}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {group.score_count > 0 && group.score_count === group.scores.length && (
                              <Badge variant="success" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Ready
                              </Badge>
                            )}
                          </div>
                        </button>

                        {isTeamExpanded && (
                          <div className="border-t border-border px-3 py-3 bg-muted">
                            {group.scores.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No scores recorded yet</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-border">
                                      <TableHead className="text-muted-foreground">Judge</TableHead>
                                      <TableHead className="text-muted-foreground">Score</TableHead>
                                      <TableHead className="text-muted-foreground">Criteria</TableHead>
                                      <TableHead className="text-muted-foreground">Status</TableHead>
                                      <TableHead className="text-muted-foreground">Submitted</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.scores.map((sheet, idx) => (
                                      <TableRow key={sheet.sheet_id || idx} className="border-b border-dashed border-border">
                                        <TableCell className="font-medium text-card-foreground">
                                          {sheet.judge?.name || "Unknown"}
                                        </TableCell>
                                        <TableCell className="font-bold text-card-foreground">
                                          {sheet.total_score?.toFixed(1) || "—"}
                                        </TableCell>
                                        <TableCell className="text-card-foreground">
                                          {sheet.scores?.map((sc) => (
                                            <span key={sc.criterion} className="text-xs">
                                              {sc.criterion}: {sc.score}
                                              {sc.notes ? ` (${sc.notes})` : ""}
                                            </span>
                                          ))}
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={sheet.status === "submitted" ? "success" : sheet.status === "confirmed" ? "success" : sheet.status === "published" ? "outline" : sheet.status === "rescored" ? "outline" : "secondary"}
                                            className={sheet.status === "rescored" ? "text-accent-amber border-accent-amber bg-accent-amber/10" : sheet.status === "published" ? "text-accent-blue border-accent-blue/20 bg-accent-blue-tint" : sheet.status === "confirmed" ? "text-accent-green border-accent-green/20 bg-accent-green/10" : ""}
                                          >
                                            {sheet.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                          {sheet.submitted_at ? new Date(sheet.submitted_at).toLocaleDateString() : "—"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {group.average_score !== null && (
                                      <TableRow className="font-bold">
                                        <TableCell className="text-card-foreground">Average</TableCell>
                                        <TableCell className="text-accent-amber">{group.average_score.toFixed(1)}</TableCell>
                                        <TableCell colSpan={3}></TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                {canApprove && (
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshEvent(evt._id)}
                      disabled={evtLoading}
                    >
                      Refresh
                    </Button>
                    {hasSubmittedScores && (
                      <>
                        <Button
                          onClick={() => showConfirm("Confirm Scores", "Create draft results from all submitted judge scores?", () => handleConfirmScores(evt._id))}
                          disabled={aggregating || finalizing}
                          className="bg-accent-amber text-white hover:bg-accent-amber/90 disabled:opacity-50"
                        >
                          {aggregating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Confirm Scores
                        </Button>
                        <Button
                          onClick={() => showConfirm("Confirm & Publish Everything", "Aggregate → approve → publish. Points go live immediately.", () => handleFinalize(evt._id, false))}
                          disabled={aggregating || finalizing}
                          className="bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50"
                        >
                          {finalizing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          <Rocket className="h-4 w-4 mr-1" /> Confirm &amp; Publish
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Render: Approved event card (result_pending / published) ──
  const renderApprovedEvent = (evt) => {
    const isExpanded = expandedEvents[evt._id] || false;
    const data = eventData[evt._id] || {};
    const { selectedRound = "", allResults = [], teams = [], loading: evtLoading = false, finalizing = false } = data;
    const rounds = evt.rounds ? Array.from({ length: evt.rounds }, (_, i) => i + 1) : [];

    const hasDraftOrSubmitted = allResults.some((r) => ["draft", "submitted"].includes(r.status));
    const hasApproved = allResults.some((r) => r.status === "approved");
    const hasPublished = allResults.some((r) => r.status === "published");
    const canRevertAny = allResults.some((r) => ["approved", "published"].includes(r.status));
    const hasSubmittedScores = hasDraftOrSubmitted || hasApproved;

    return (
      <div key={evt._id} className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleEventExpand(evt._id, evt)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted bg-card text-left"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="font-medium text-sm text-card-foreground">{evt.name || evt.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusBadgeProps(evt.status).variant} className={statusBadgeProps(evt.status).className}>
                  {evt.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && rounds.length > 0 && (
              <Select value={selectedRound} onValueChange={(val) => handleEventRoundChange(evt._id, val)}>
                <SelectTrigger className="w-32" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Round" />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((r) => (
                    <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border p-4 bg-muted/30">
            {evtLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-accent-amber" />
              </div>
            ) : !selectedRound ? (
              <p className="text-sm text-muted-foreground text-center py-4">Select a round to view results</p>
            ) : (
              <>
                {/* Results count */}
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant={statusBadgeProps(evt.status).variant} className={statusBadgeProps(evt.status).className}>
                    {evt.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{allResults.length} results</span>
                </div>

                {/* Results table */}
                <div className="mb-4 overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-muted-foreground uppercase text-xs">Position</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-xs">Team</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-xs">Group</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-xs">Points</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-xs">Submitted By</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-xs">Status</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allResults.length === 0 ? (
                        <TableRow>
                          <TableCell className="text-muted-foreground" colSpan={7}>No results for this round</TableCell>
                        </TableRow>
                      ) : (
                        allResults.map((r) => {
                          const team = r.team_id || {};
                          const house = team.group_id || {};
                          const status = r.status;
                          const ptsDisplay = r.points != null
                            ? (r.multiplier != null && r.multiplier !== 1 ? `${r.points} × ${r.multiplier}` : r.points)
                            : "—";
                          const sp = statusBadgeProps(status);
                          return (
                            <TableRow key={r._id} className="border-t border-border">
                              <TableCell className="text-card-foreground">{r.position}</TableCell>
                              <TableCell className="text-card-foreground">
                                {team.chest_no ? `Chest #${team.chest_no}` : "No chest"}
                                {r.average_score != null && (
                                  <span className="ml-2 text-xs text-accent-blue">avg: {Number(r.average_score).toFixed(1)}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-card-foreground">{house.name || ""}</TableCell>
                              <TableCell className="font-medium text-card-foreground">{ptsDisplay}</TableCell>
                              <TableCell className="text-card-foreground">{r.submitted_by?.name || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={sp.variant} className={sp.className}>{status}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {["draft", "submitted"].includes(status) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveResult(r._id, r.position, evt._id)}
                                        disabled={!canApprove}
                                        className="text-accent-green border-accent-green/20 hover:bg-accent-green-tint"
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => showConfirm("Reject Result", `Reject position ${r.position}?`, () => handleRejectResult(r._id, r.position, evt._id))}
                                        disabled={!canApprove}
                                        className="text-accent-red border-accent-red/20 hover:bg-accent-red-tint"
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {status === "approved" && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePublishResult(r._id, r.position, evt._id)}
                                        disabled={!canApprove}
                                        className="text-accent-blue border-accent-blue/20 hover:bg-accent-blue-tint"
                                      >
                                        Publish
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => showConfirm("Revert Result", `Revert position ${r.position} to draft?`, () => handleRevert(r._id, evt._id))}
                                        disabled={!canApprove}
                                        className="text-accent-amber border-accent-amber/20 hover:bg-accent-amber-tint flex items-center gap-1"
                                      >
                                        <Undo2 className="h-3 w-3" /> Revert
                                      </Button>
                                    </>
                                  )}
                                  {status === "published" && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => showConfirm("Lock Result", `Lock position ${r.position}? This cannot be undone.`, () => handleLockResult(r._id, r.position, evt._id))}
                                        disabled={!canApprove}
                                        className="text-accent-purple border-accent-purple/20 hover:bg-accent-purple-tint"
                                      >
                                        Lock
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => showConfirm("Revert Result", `Revert position ${r.position} to draft? Published points will be removed.`, () => handleRevert(r._id, evt._id))}
                                        disabled={!canApprove}
                                        className="text-accent-amber border-accent-amber/20 hover:bg-accent-amber-tint flex items-center gap-1"
                                      >
                                        <Undo2 className="h-3 w-3" /> Revert
                                      </Button>
                                    </>
                                  )}
                                  {status === "locked" && (
                                    <Badge variant="outline" className="text-accent-purple border-accent-purple/20 bg-accent-purple-tint">
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Bulk actions */}
                {allResults.length > 0 && canApprove && (
                  <div className="flex items-center gap-2 px-3 py-2 flex-wrap border-t border-border mb-3">
                    {hasSubmittedScores && (
                      <Button
                        onClick={() => showConfirm("Confirm & Publish Everything", "Aggregate, approve, publish all. Points go live.", () => handleFinalize(evt._id, false))}
                        disabled={finalizing}
                        className="bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50"
                      >
                        {finalizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-1" />}
                        Confirm &amp; Publish Everything
                      </Button>
                    )}
                    {hasDraftOrSubmitted && (
                      <>
                        <Button
                          onClick={() => showConfirm("Approve All", "Approve all pending results for this round?", () => handleApproveAll(evt._id))}
                          className="bg-accent-green text-white hover:bg-accent-green/90 disabled:opacity-50"
                          disabled={!canApprove}
                        >
                          Approve All
                        </Button>
                        <Button
                          onClick={() => showConfirm("Reject All", "Reject all pending results for this round?", () => handleRejectAll(evt._id))}
                          variant="destructive"
                          disabled={!canApprove}
                        >
                          Reject All
                        </Button>
                      </>
                    )}
                    {canRevertAny && (
                      <Button
                        onClick={() => showConfirm("Revert All", "Revert all approved/published results to draft?", () => handleRevertAll(evt._id))}
                        className="bg-accent-amber text-white hover:bg-accent-amber/90 disabled:opacity-50"
                        disabled={!canApprove}
                      >
                        Revert All
                      </Button>
                    )}
                    {hasApproved && (
                      <Button
                        onClick={() => showConfirm("Publish All", "Publish all approved results for this round?", () => handlePublishAll(evt._id))}
                        className="bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50"
                        disabled={!canApprove}
                      >
                        Publish All Approved
                      </Button>
                    )}
                    {hasPublished && (
                      <Button
                        onClick={() => showConfirm("Lock All", "Lock all published results for this round? This cannot be undone.", () => handleLockAll(evt._id))}
                        className="bg-accent-purple text-white hover:bg-accent-purple/90 disabled:opacity-50"
                        disabled={!canApprove}
                      >
                        Lock All Published
                      </Button>
                    )}
                  </div>
                )}

                {/* Edit pending rows */}
                {allResults.filter((r) => ["draft", "submitted"].includes(r.status)).length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <div className="border-b border-border bg-muted px-3 py-2 text-sm font-medium text-card-foreground">
                      Edit Pending Rows
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-muted-foreground uppercase text-xs">Position</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs">Current Team</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs">Change To</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allResults
                          .filter((r) => ["draft", "submitted"].includes(r.status))
                          .sort((a, b) => a.position - b.position)
                          .map((row) => {
                            const team = row.team_id || {};
                            const currentLabel = team.chest_no ? `Chest #${team.chest_no}` : "No chest";
                            return (
                              <TableRow key={row._id} className="border-t border-border">
                                <TableCell className="text-card-foreground">{row.position}</TableCell>
                                <TableCell className="text-card-foreground">{currentLabel}</TableCell>
                                <TableCell>
                                  <Select onValueChange={(newTeamId) => {
                                    if (newTeamId) handleUpdateTeam(row._id, newTeamId, evt._id);
                                  }}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(teams || []).map((t) => (
                                        <SelectItem key={t._id} value={t._id}>
                                          {t.chest_no ? `Chest #${t.chest_no}` : "No chest"} — {t.houseName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => showConfirm("Delete Result", `Delete position ${row.position}?`, () => handleDeleteResult(row._id, row.position, evt._id))}
                                    disabled={!canApprove}
                                    className="text-accent-red border-accent-red/20 hover:bg-accent-red-tint"
                                  >
                                    Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Card className="rounded-lg">
        <CardContent className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-card-foreground">Judge Submissions</h2>
            <p className="text-sm text-muted-foreground">
              Judge score sheets submitted for your events. Confirm placements, then approve &amp; publish points to the overall standings.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive-foreground px-3 py-2 rounded-lg mb-3">{error}</div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-border mb-4">
              <TabsList className="flex w-full justify-start h-auto bg-transparent p-0 rounded-none">
                <TabsTrigger
                  value="pending"
                  className="relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-accent-amber data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent-amber hover:text-foreground/80"
                >
                  Pending
                  {pendingEvents.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">{pendingEvents.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-accent-amber data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent-amber hover:text-foreground/80"
                >
                  Approved
                  {approvedEvents.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">{approvedEvents.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="mt-0">
              {/* Flow indicator — pending only */}
              <div className="mb-4 p-3 rounded-lg bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Approval Flow</p>
                <div className="flex items-center justify-between">
                  {flowSteps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors`}
                          style={{
                            borderColor: index < flowSteps.length - 1 ? "var(--border-divider)" : "transparent",
                            color: step.color,
                            backgroundColor: "var(--card)",
                          }}
                        >
                          {index + 1}
                        </div>
                        <span className={`text-[10px] font-medium mt-1 truncate w-24 text-center ${step.color}`}>
                          {step.label}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 mt-1 cursor-help opacity-60" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center">
                            <p className="text-sm">{step.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {index < flowSteps.length - 1 && (
                        <div className="flex-1 h-0.5 bg-border mx-1" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {loadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent-amber" />
                </div>
              ) : pendingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No events pending review</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingEvents.map((evt) => renderPendingEvent(evt))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-0">
              {loadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent-amber" />
                </div>
              ) : approvedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No approved or published events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvedEvents.map((evt) => renderApprovedEvent(evt))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <AlertDialog open={confirm.open} onOpenChange={(open) => { if (!open) setConfirm({ ...confirm, open: false }); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogCancel onClick={() => setConfirm({ ...confirm, open: false })}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                confirm.onConfirm?.();
                setConfirm({ ...confirm, open: false });
              }}>Continue</AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ScoreReview;
