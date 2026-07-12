import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import usePermission from "../../hooks/usePermission";
import { useRealtime } from "../../context/RealtimeContext";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Label } from "../ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const statusBadgeProps = (status) => {
  const map = {
    draft: { variant: "secondary", className: "" },
    submitted: { variant: "outline", className: "text-accent-amber border-accent-amber bg-accent-amber/10" },
    approved: { variant: "success", className: "" },
    published: { variant: "outline", className: "text-blue-600 border-blue-200 bg-blue-50" },
    locked: { variant: "outline", className: "text-purple-600 border-purple-200 bg-purple-50" },
    judging: { variant: "outline", className: "text-accent-amber border-accent-amber bg-accent-amber/10" },
    result_pending: { variant: "outline", className: "text-accent-blue border-accent-blue bg-accent-blue/10" },
  };
  return map[status] || { variant: "secondary", className: "" };
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
  const [confirm, setConfirm] = useState({ open: false, title: "", description: "", onConfirm: null });

  const showConfirm = (title, description, onConfirm) => {
    setConfirm({ open: true, title, description, onConfirm });
  };

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

  const handleEventChange = (id) => {
    setSelectedEventId(id);
    setSelectedRound("");
    setReport([]);
    setAllResults([]);
    setTeams([]);
    setExpandedTeams({});
  };

  const handleRoundChange = (value) => {
    setSelectedRound(value);
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

  const handleRevert = async (resultId) => {
    try {
      setLoading(true);
      await apiCall(`/api/results/${resultId}/revert`, { method: "PATCH" });
      toast.success("Result reverted to draft");
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
    <Card className="rounded-lg">
      <CardContent className="p-5">
        <div className="mb-4">
          <CardTitle className="text-lg">Score Review &amp; Approvals</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review scores, approve results, or revert actions for events with judging activity
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive-foreground px-3 py-2 rounded-lg mb-3">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <Label className="text-muted-foreground mb-1 block">Event</Label>
            <Select value={selectedEventId} onValueChange={handleEventChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {events.length === 0 && <SelectItem value="" disabled>No events with judging</SelectItem>}
                {events.map((evt) => (
                  <SelectItem key={evt._id} value={evt._id}>
                    {evt.name || evt.title} — {evt.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {events.length === 0 && !loading && (
              <p className="text-xs mt-1 text-muted-foreground">No events currently in judging or pending approval</p>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground mb-1 block">Round</Label>
            <Select value={selectedRound} onValueChange={handleRoundChange} disabled={!selectedEventId || rounds.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select round" />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((r) => (
                  <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={!selectedEventId || !selectedRound || loading}>
              Refresh
            </Button>
            {currentEvent?.status === "judging" && canApprove && hasSubmittedScores && (
              <Button
                onClick={() => showConfirm("Approve Scores", "Approve all submitted scores? This will create results and update the leaderboard.", handleApprove)}
                disabled={aggregating}
                className="bg-accent-amber text-white hover:bg-accent-amber/90 disabled:opacity-50"
              >
                {aggregating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Approve
              </Button>
            )}
          </div>
        </div>

        {currentEvent?.status === "judging" && report.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-card-foreground">{totalTeams}</p>
              <p className="text-xs text-muted-foreground">Teams Scored</p>
            </div>
            <div className="border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalSubmittedSheets}</p>
              <p className="text-xs text-muted-foreground">Submitted Sheets</p>
            </div>
            <div className="border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-card-foreground">
                {report.filter((g) => g.score_count > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">Ready to Approve</p>
            </div>
          </div>
        )}

        {currentEvent && currentEvent.status !== "judging" && (
          <div className="mb-3 flex items-center gap-2">
            <Badge variant={statusBadgeProps(currentEvent.status).variant} className={statusBadgeProps(currentEvent.status).className}>
              {currentEvent.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {allResults.length} results
            </span>
          </div>
        )}

        {loading && !aggregating ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-amber" />
          </div>
        ) : currentEvent?.status === "judging" ? (
          report.length === 0 && selectedEventId && selectedRound ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No score sheets found for this event and round</p>
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
                  <div key={teamId} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleTeamExpand(teamId)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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

                    {isExpanded && (
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
                                        variant={sheet.status === "submitted" ? "success" : sheet.status === "rescored" ? "outline" : "secondary"}
                                        className={sheet.status === "rescored" ? "text-accent-amber border-accent-amber bg-accent-amber/10" : ""}
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
          )
        ) : currentEvent && ["result_pending", "published"].includes(currentEvent.status) ? (
          <div>
            <div className="mb-6 overflow-x-auto rounded-lg border border-border">
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
                                    onClick={() => handleApproveResult(r._id, r.position)}
                                    disabled={!canApprove}
                                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => showConfirm("Reject Result", `Reject position ${r.position}?`, () => handleRejectResult(r._id, r.position))}
                                    disabled={!canApprove}
                                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
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
                                    onClick={() => handlePublishResult(r._id, r.position)}
                                    disabled={!canApprove}
                                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                                  >
                                    Publish
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => showConfirm("Revert Result", `Revert position ${r.position} to draft? Points will be removed from the leaderboard.`, () => handleRevert(r._id, r.position, status))}
                                    disabled={!canApprove}
                                    className="text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1"
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
                                    onClick={() => showConfirm("Lock Result", `Lock position ${r.position}? This cannot be undone.`, () => handleLockResult(r._id, r.position))}
                                    disabled={!canApprove}
                                    className="text-purple-700 border-purple-200 hover:bg-purple-50"
                                  >
                                    Lock
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => showConfirm("Revert Result", `Revert position ${r.position} to draft? This will remove points from the leaderboard.`, () => handleRevert(r._id, r.position, status))}
                                    disabled={!canApprove}
                                    className="text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1"
                                  >
                                    <Undo2 className="h-3 w-3" /> Revert
                                  </Button>
                                </>
                              )}
                              {status === "locked" && (
                                <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
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

              {allResults.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 flex-wrap border-t border-border">
                  {hasDraftOrSubmitted && (
                    <>
                      <Button
                        onClick={() => showConfirm("Approve All", "Approve all pending results for this round?", handleApproveAll)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        disabled={!canApprove}
                      >
                        Approve All
                      </Button>
                      <Button
                        onClick={() => showConfirm("Reject All", "Reject all pending results for this round?", handleRejectAll)}
                        variant="destructive"
                        disabled={!canApprove}
                      >
                        Reject All
                      </Button>
                    </>
                  )}
                  {canRevertAny && (
                    <Button
                      onClick={() => showConfirm("Revert All", "Revert all approved/published results to draft for this round?", handleRevertAll)}
                      className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                      disabled={!canApprove}
                    >
                      Revert All
                    </Button>
                  )}
                  {hasApproved && (
                    <Button
                      onClick={() => showConfirm("Publish All", "Publish all approved results for this round?", handlePublishAll)}
                      className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      disabled={!canApprove}
                    >
                      Publish All Approved
                    </Button>
                  )}
                  {hasPublished && (
                    <Button
                      onClick={() => showConfirm("Lock All", "Lock all published results for this round? This cannot be undone.", handleLockAll)}
                      className="bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                      disabled={!canApprove}
                    >
                      Lock All Published
                    </Button>
                  )}
                </div>
              )}
            </div>

            {allResults.filter((r) => ["draft", "submitted"].includes(r.status)).length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
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
                                if (newTeamId) handleUpdateTeam(row._id, newTeamId);
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
                                onClick={() => showConfirm("Delete Result", `Delete position ${row.position}?`, () => handleDeleteResult(row._id, row.position))}
                                disabled={!canApprove}
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
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
          </div>
        ) : selectedEventId && selectedRound && !loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Select an event with judging activity to begin review</p>
          </div>
        ) : null}

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
  );
};

export default ScoreReview;
