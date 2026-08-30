import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import {
  ClipboardList,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  RefreshCw,
  Loader2,
  Trophy,
  Hash,
  Users,
  AlertCircle,
  X,
  RotateCcw,
  Play,
  Hourglass,
} from "lucide-react";
import toast from "react-hot-toast";
import { useMobileMode } from "../utils/useMobileMode";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const VIEW = {
  LOADING: "loading",
  IDLE: "idle",
  WAITING: "waiting",
  JUDGING: "judging",
  PREVIEW: "preview",
  SUBMITTED: "submitted",
};

const JudgeDashboard = () => {
  const { isMobile } = useMobileMode();
  const { token } = useAuth();
  const [viewState, setViewState] = useState(VIEW.LOADING);
  const [assignments, setAssignments] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRound, setSelectedRound] = useState(1);
  const [session, setSession] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [scoreMax, setScoreMax] = useState(100);
  const [scoreInput, setScoreInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  // Real-time score validation
  const isScoreValid = useMemo(() => {
    const val = parseFloat(scoreInput);
    if (scoreInput === "" || isNaN(parseFloat(scoreInput))) return false;
    return val >= 0 && val <= scoreMax;
  }, [scoreInput, scoreMax]);
  const [error, setError] = useState("");
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [ranking, setRanking] = useState([]);

  const [organizers, setOrganizers] = useState([]);
  const [assignMode, setAssignMode] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigningTeam, setAssigningTeam] = useState(null);
  const [chestPrefix, setChestPrefix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [chestDrafts, setChestDrafts] = useState({});

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  const loadAssignments = useCallback(async () => {
    try {
      setError("");
      const { data } = await apiCall("/api/judge/assignments");
      setAssignments(data || []);
      setViewState(VIEW.IDLE);
    } catch (err) {
      setError(err.message || "Failed to load assignments");
      setViewState(VIEW.IDLE);
    }
  }, [apiCall]);

  const loadOrganizers = useCallback(async () => {
    try {
      const { data } = await apiCall("/api/judge/organizers");
      setOrganizers(data || []);
    } catch (err) {
      console.error("Failed to load organizers:", err);
    }
  }, [apiCall]);

  useEffect(() => {
    if (token) {
      loadAssignments();
      loadOrganizers();
    }
  }, [token, loadAssignments, loadOrganizers]);

  const loadSessionInfo = useCallback(async (eventId, roundNo) => {
    try {
      setError("");
      const { data } = await apiCall(`/api/judge/session/${eventId}?round_no=${roundNo}`);
      setSessionMeta(data);
      setSession(data?.session || null);
      if (data?.session?.status === "in_progress") {
        setScoreMax(data.session.score_scale?.max || 100);
        setViewState(VIEW.JUDGING);
      } else if (data?.session?.status === "submitted") {
        setViewState(VIEW.SUBMITTED);
      } else if (data?.can_start) {
        setViewState(VIEW.WAITING);
      } else {
        setViewState(VIEW.WAITING);
      }
    } catch (err) {
      setError(err.message || "Failed to load session info");
      setViewState(VIEW.IDLE);
    }
  }, [apiCall]);

  const unassignedParticipants = useMemo(
    () => (sessionMeta?.participants || []).filter((p) => !p.chest_no),
    [sessionMeta]
  );

  const participantLabel = (p) => {
    if (p.team_name) return p.team_name;
    return `T${String(p.team_id).slice(-4).toUpperCase()}`;
  };

  const resetAssignState = () => {
    setAssignMode(false);
    setAssigning(false);
    setAssigningTeam(null);
    setChestPrefix("");
    setStartNumber(1);
    setChestDrafts({});
  };

  const handleJudgeBulkAssign = async () => {
    const eventId = selectedEventId || sessionMeta?.event?._id;
    if (!eventId || unassignedParticipants.length === 0) return;
    try {
      setAssigning(true);
      setError("");
      const resp = await apiCall("/api/team/bulk-chest", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          prefix: chestPrefix.trim(),
          start_number: startNumber,
        }),
      });
      const assignedCount = resp.data?.total ?? 0;
      const errorCount = resp.data?.errors?.length ?? 0;
      if (errorCount > 0) {
        toast.warning(`Assigned ${assignedCount} team(s). ${errorCount} skipped due to duplicate chest numbers.`);
      } else {
        toast.success(`Assigned chest numbers to ${assignedCount} team(s)`);
      }
      await loadSessionInfo(eventId, selectedRound);
    } catch (err) {
      setError(err.message || "Failed to auto-assign chest numbers");
      toast.error(err.message || "Failed to auto-assign chest numbers");
    } finally {
      setAssigning(false);
    }
  };

  const handleJudgeAssignSingle = async (teamId) => {
    const chest_no = (chestDrafts[teamId] || "").trim();
    const eventId = selectedEventId || sessionMeta?.event?._id;
    if (!chest_no || !eventId) return;
    try {
      setAssigningTeam(teamId);
      setError("");
      await apiCall(`/api/team/${teamId}/chest`, {
        method: "PATCH",
        body: JSON.stringify({ chest_no }),
      });
      toast.success("Chest number assigned");
      setChestDrafts((prev) => ({ ...prev, [teamId]: "" }));
      await loadSessionInfo(eventId, selectedRound);
    } catch (err) {
      setError(err.message || "Failed to assign chest number");
      toast.error(err.message || "Failed to assign chest number");
    } finally {
      setAssigningTeam(null);
    }
  };

  const handleEventChange = (value) => {
    const id = value;
    setSelectedEventId(id);
    setSelectedRound(1);
    setSession(null);
    setSessionMeta(null);
    setRanking([]);
    resetAssignState();
    setViewState(VIEW.LOADING);
    if (id) {
      loadSessionInfo(id, 1);
    } else {
      setViewState(VIEW.IDLE);
    }
  };

  const handleRoundChange = (value) => {
    const round = parseInt(value, 10) || 1;
    setSelectedRound(round);
    setSession(null);
    setSessionMeta(null);
    setRanking([]);
    setError("");
    resetAssignState();
    setViewState(VIEW.LOADING);
    if (selectedEventId) {
      loadSessionInfo(selectedEventId, round);
    }
  };

  const handleRefresh = () => {
    if (selectedEventId) {
      setError("");
      loadSessionInfo(selectedEventId, selectedRound);
    }
  };

  const handleStartSession = async () => {
    if (!selectedEventId) return;
    try {
      setSessionActionLoading(true);
      setError("");
      const { data } = await apiCall(`/api/judge/session/${selectedEventId}/start`, {
        method: "POST",
        body: JSON.stringify({
          round_no: selectedRound,
          score_scale: { max: scoreMax },
        }),
      });
      setSession(data);
      setScoreMax(data.score_scale?.max || 100);
      setScoreInput("");
      setNotesInput("");
      toast.success("Judging session started");
      setViewState(VIEW.JUDGING);
    } catch (err) {
      if (err?.status === 409 && err?.payload?.data) {
        const existingSession = err.payload.data;
        setSession(existingSession);
        setScoreMax(existingSession.score_scale?.max || 100);
        if (existingSession.status === "in_progress") {
          toast("Existing in-progress session loaded. Resuming...");
          setViewState(VIEW.JUDGING);
        } else if (existingSession.status === "submitted") {
          toast("A submitted session already exists. You can reopen it to start fresh.");
          setViewState(VIEW.SUBMITTED);
        } else {
          setError(err.payload?.error || "A session already exists for this event");
          toast.error(err.payload?.error || "A session already exists");
        }
      } else {
        setError(err.message || "Failed to start session");
        toast.error(err.message);
      }
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleResumeSession = () => {
    if (session) {
      setScoreMax(session.score_scale?.max || 100);
      setViewState(VIEW.JUDGING);
    }
  };

  const currentParticipant = useMemo(() => {
    if (!session || !session.participants || session.participants.length === 0) return null;
    return session.participants[session.current_index] || null;
  }, [session]);

  const scoredCount = useMemo(() => {
    if (!session || !session.participants) return 0;
    return session.participants.filter((p) => p.status === "scored").length;
  }, [session]);

  const totalCount = useMemo(() => {
    if (!session || !session.participants) return 0;
    return session.participants.length;
  }, [session]);

  const initScoreForCurrent = useCallback(() => {
    if (currentParticipant) {
      if (currentParticipant.status === "scored") {
        const avg = currentParticipant.total_score || 0;
        setScoreInput(String(Math.round(avg)));
        setNotesInput(currentParticipant.scores?.[0]?.notes || "");
      } else {
        setScoreInput("");
        setNotesInput("");
      }
    }
  }, [currentParticipant]);

  useEffect(() => {
    initScoreForCurrent();
  }, [initScoreForCurrent]);

  const handleScoreAction = async (action) => {
    if (!session) return;
    if (action === "score") {
      const scoreVal = parseFloat(scoreInput);
      if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > scoreMax) {
        setError(`Score must be between 0 and ${scoreMax}`);
        return;
      }
      try {
        setSessionActionLoading(true);
        setError("");
        const { data } = await apiCall(`/api/judge/session/${selectedEventId}/score`, {
          method: "PATCH",
          body: JSON.stringify({
            session_id: session._id,
            scores: [{ criterion: "overall", score: scoreVal, notes: notesInput }],
          }),
        });
        const updatedSession = { ...session, current_index: data.current_index };
        updatedSession.participants[session.current_index].status = "scored";
        updatedSession.participants[session.current_index].total_score = scoreVal;
        setSession(updatedSession);

        if (data.is_last) {
          setViewState(VIEW.PREVIEW);
          loadRanking();
        }
      } catch (err) {
        setError(err.message || "Failed to save score");
        toast.error(err.message);
      } finally {
        setSessionActionLoading(false);
      }
    } else if (action === "skip") {
      setError("");
      const updatedSession = { ...session };
      const nextIdx = Math.min(session.current_index + 1, totalCount - 1);
      if (nextIdx !== session.current_index) {
        try {
          await apiCall(`/api/judge/session/${selectedEventId}/navigate`, {
            method: "PATCH",
            body: JSON.stringify({ session_id: session._id, action: "next" }),
          });
          updatedSession.current_index = nextIdx;
          setSession(updatedSession);
        } catch (err) {
          setError(err.message);
        }
      }
    }
  };

  const handleNavigate = async (action, index) => {
    if (!session) return;
    try {
      setError("");
      const body = { session_id: session._id, action };
      if (action === "goto") body.index = index;
      const { data } = await apiCall(`/api/judge/session/${selectedEventId}/navigate`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const updatedSession = { ...session, current_index: data.current_index };
      setSession(updatedSession);
    } catch (err) {
      setError(err.message || "Navigation failed");
    }
  };

  const loadRanking = async () => {
    if (!selectedEventId) return;
    try {
      setError("");
      const { data } = await apiCall(`/api/judge/session/${selectedEventId}/ranking?round_no=${selectedRound}`);
      setRanking(data?.ranking || []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to load ranking");
      return null;
    }
  };

  const handleViewRanking = async () => {
    const data = await loadRanking();
    if (data && data.scored_count === data.total) {
      setViewState(VIEW.PREVIEW);
    } else {
      toast.error(`Score all participants first (${data?.scored_count || 0}/${data?.total || 0})`);
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;
    try {
      setSessionActionLoading(true);
      setError("");
      const { data } = await apiCall(`/api/judge/session/${selectedEventId}/complete`, {
        method: "POST",
        body: JSON.stringify({ session_id: session._id }),
      });
      toast.success(`Session submitted! ${data.score_count} scores recorded.`);
      setViewState(VIEW.SUBMITTED);
    } catch (err) {
      setError(err.message || "Failed to submit session");
      toast.error(err.message);
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleBackToEdit = () => {
    setViewState(VIEW.JUDGING);
  };

  const handleAbandonSession = async () => {
    if (!selectedEventId || !session) return;
    const scoredSoFar = session.participants?.filter((p) => p.status === "scored").length || 0;
    const total = session.participants?.length || 0;
    const confirmMsg = `Abandon current session for "${sessionMeta?.event?.title || sessionMeta?.event?.name || "this event"}" (Round ${selectedRound})?

Progress: ${scoredSoFar} of ${total} participants scored.
⚠️ ALL SCORES AND NOTES WILL BE PERMANENTLY DELETED.
This action cannot be undone.

Type "ABANDON" to confirm:`;
    const userInput = window.prompt(confirmMsg);
    if (userInput !== "ABANDON") return;
    try {
      await apiCall(`/api/judge/session/${selectedEventId}?round_no=${selectedRound}`, {
        method: "DELETE",
      });
      setSession(null);
      toast.success("Session abandoned");
      loadSessionInfo(selectedEventId, selectedRound);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  if (viewState === VIEW.LOADING) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (viewState === VIEW.IDLE || !selectedEventId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Judge Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select an event and round to start judging.
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="border border-destructive/20 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-sm">
              {error}
            </div>
          )}

          <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-3 mb-4`}>
            <div>
              <Label className="mb-1 block">Assigned Events</Label>
              <Select value={selectedEventId} onValueChange={handleEventChange}>
                <SelectTrigger className={`w-full ${isMobile ? "min-h-[48px] text-base" : ""}`}>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select an event</SelectItem>
                  {(assignments || []).map((a) => (
                    <SelectItem key={a._id} value={a.event_id?._id || a.event_id}>
                      {a.event_id?.title || a.event_id?.name || "Unknown Event"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={`flex ${isMobile ? "" : "items-end"}`}>
              <Button
                variant="outline"
                onClick={handleRefresh}
                className={`w-full gap-1 ${isMobile ? "min-h-[48px] text-base" : ""}`}
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          {assignments.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                No events assigned to you yet.
              </p>
              {organizers.length > 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left max-w-xs mx-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Contact an organizer:</p>
                  <ul className="space-y-1 text-sm">
                    {organizers.map((org) => (
                      <li key={org._id} className="flex items-center gap-2">
                        <span className="font-medium">{org.name}</span>
                        <span className="text-muted-foreground">({org.role})</span>
                        {org.email && (
                          <a href={`mailto:${org.email}`} className="text-primary underline text-xs">
                            {org.email}
                          </a>
                        )}
                        {org.phone && (
                          <span className="text-muted-foreground text-xs">{org.phone}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (viewState === VIEW.WAITING) {
    const evt = sessionMeta?.event || {};
    const canStart = sessionMeta?.can_start && !session;
    const hasExistingSession = !!session;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{evt.title || evt.name || "Event"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {evt.category} &middot; {evt.event_type} &middot; Round {selectedRound}
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="border border-destructive/20 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-card-foreground mb-1">
              {evt.title || evt.name || "Event"} &middot; {evt.category} &middot; {evt.event_type}
            </p>
            <Label className="mb-1 block">Round</Label>
            <Select value={String(selectedRound)} onValueChange={handleRoundChange}>
              <SelectTrigger className={`max-w-[200px] ${isMobile ? "min-h-[48px] text-base" : ""}`}>
                <SelectValue placeholder="Select round" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: evt.rounds || 1 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Round {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="border border-border rounded-lg p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold text-card-foreground">{sessionMeta?.participant_count || 0}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Teams</p>
            </div>
            <div className="border border-border rounded-lg p-3 text-center">
              <Hash className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold text-card-foreground">{sessionMeta?.teams_without_chest || 0}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">No Chest</p>
            </div>
            <div className="border border-border rounded-lg p-3 text-center">
              <span className="text-2xl mb-1 block">{evt.status === "judging" ? "\u2713" : "\u2014"}</span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {evt.status?.replace(/_/g, " ") || "Status"}
              </p>
            </div>
            <div className="border border-border rounded-lg p-3 text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold text-card-foreground">{evt.rounds || 1}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Rounds</p>
            </div>
          </div>

          {!sessionMeta?.all_have_chests && (
            <div className="bg-accent-amber/10 border border-accent-amber/20 text-accent-amber rounded-lg px-3 py-3 mb-4 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {assignMode
                      ? "Assign chest numbers to continue"
                      : "Waiting for chest numbers. An event coordinator must assign chest numbers before judging can begin."}
                  </p>
                  <p className="mt-0.5 text-xs text-accent-amber/80">
                    {sessionMeta?.teams_without_chest || 0} team(s) still need chest numbers.
                  </p>
                </div>
              </div>

              {!assignMode ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssignMode(true)}
                    className="gap-1.5 font-bold border-accent-amber/40 text-accent-amber hover:bg-accent-amber/20"
                  >
                    <Hash className="h-3.5 w-3.5" /> Assign Myself
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground hover:text-card-foreground"
                    onClick={() => toast("Waiting for the coordinator. You can assign them yourself anytime.")}
                  >
                    <Hourglass className="h-3.5 w-3.5" /> Wait for Coordinator
                  </Button>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-20">
                      <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Start #</Label>
                      <Input
                        type="number"
                        min={1}
                        value={startNumber}
                        onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        disabled={assigning}
                        className={isMobile ? "min-h-[48px]" : ""}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Prefix</Label>
                      <Input
                        type="text"
                        value={chestPrefix}
                        onChange={(e) => setChestPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder={evt.chest_prefix || "e.g. GD"}
                        maxLength={8}
                        disabled={assigning}
                        className={`font-mono ${isMobile ? "min-h-[48px] text-base" : ""}`}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleJudgeBulkAssign}
                      disabled={assigning || unassignedParticipants.length === 0}
                      className="gap-1.5 bg-accent-amber hover:bg-accent-amber/90 text-white font-bold"
                    >
                      {assigning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {assigning ? "Assigning..." : `Auto-Assign (${unassignedParticipants.length})`}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAssignMode(false)}
                      disabled={assigning}
                      className="gap-1.5 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Wait for Coordinator
                    </Button>
                  </div>

                  {unassignedParticipants.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {unassignedParticipants.map((p) => (
                        <div
                          key={String(p.team_id)}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted px-2 py-2"
                        >
                          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-card-foreground">
                              {participantLabel(p)}
                            </p>
                            {p.group_name && !evt.enable_blind_judging && (
                              <p className="truncate text-xs text-muted-foreground">{p.group_name}</p>
                            )}
                          </div>
                          <Input
                            type="text"
                            value={chestDrafts[String(p.team_id)] || ""}
                            onChange={(e) =>
                              setChestDrafts((prev) => ({
                                ...prev,
                                [String(p.team_id)]: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleJudgeAssignSingle(String(p.team_id));
                            }}
                            placeholder={chestPrefix ? `${chestPrefix}-?` : "Chest #"}
                            maxLength={20}
                            disabled={assigning}
                            autoFocus={!isMobile && unassignedParticipants.length <= 1}
                            className={`w-28 font-mono ${isMobile ? "min-h-[48px] text-base" : ""}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleJudgeAssignSingle(String(p.team_id))}
                            disabled={assigning || !(chestDrafts[String(p.team_id)] || "").trim()}
                            className="text-accent-green hover:bg-accent-green/10"
                          >
                            {assigningTeam === String(p.team_id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    You can only fill missing chest numbers — existing ones are managed by the coordinator.
                  </p>
                </div>
              )}
            </div>
          )}

          {["result_pending", "published", "completed", "cancelled"].includes(evt.status) && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Cannot start judging: event is &ldquo;{evt.status?.replace(/_/g, " ")}&rdquo;.</span>
            </div>
          )}

          <div className="border border-border rounded-lg p-4 mb-4 bg-muted">
            <Label className="mb-2 block text-card-foreground">
              Score Scale (max points)
            </Label>
            <Input
              type="number"
              min={1}
              value={scoreMax}
              onChange={(e) => setScoreMax(Math.max(1, parseInt(e.target.value, 10) || 100))}
              className={`max-w-[120px] ${isMobile ? "min-h-[48px] text-base" : ""}`}
              disabled={hasExistingSession}
            />
            <p className="text-xs mt-1 text-muted-foreground">Score range: 0 to {scoreMax}</p>
          </div>

          {hasExistingSession && (
            <div className="bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>You have an existing session for this event. You can resume or abandon it.</span>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {hasExistingSession ? (
              <>
                <Button
                  onClick={handleResumeSession}
                  className="gap-2 bg-accent-amber hover:bg-accent-amber/90 text-white font-bold"
                >
                  <RotateCcw className="h-4 w-4" /> Resume Session
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAbandonSession}
                  className="gap-2 font-bold hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Abandon
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStartSession}
                disabled={!canStart || sessionActionLoading}
                className={`gap-2 font-bold ${
                  canStart
                    ? "bg-accent-amber hover:bg-accent-amber/90 text-white"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {sessionActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Judging
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── RENDER: Judging (one-by-one) ─────────────────────────────────────────
  if (viewState === VIEW.JUDGING && session) {
    const participant = currentParticipant;
    const isScored = participant?.status === "scored";
    const pct = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0;

    const getParticipantMeta = (p) => {
      if (!p) return { chest: "\u2014", group: "", team: "" };
      const tid = String(p.team_id);
      if (sessionMeta?.event?.enable_blind_judging) {
        return { chest: p.chest_no || `T${tid.slice(-4).toUpperCase()}`, group: "", team: "" };
      }
      const allP = sessionMeta?.participants || [];
      const meta = allP.find((ap) => String(ap.team_id) === tid);
      return {
        chest: p.chest_no || `T${tid.slice(-4).toUpperCase()}`,
        group: meta?.group_name || "",
        team: meta?.team_name || "",
      };
    };

    const meta = getParticipantMeta(participant);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <CardTitle>
                {sessionMeta?.event?.title || sessionMeta?.event?.name || "Event"} &middot; Round {selectedRound}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {scoredCount} of {totalCount} scored
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAbandonSession}
              className="text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive gap-1"
            >
              <X className="h-3 w-3" /> Abandon
            </Button>
          </div>
          <div className="w-full h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent-amber transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="border border-destructive/20 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-sm">
              {error}
            </div>
          )}

          <div className={`border-2 rounded-xl p-4 sm:p-6 mb-4 transition-colors bg-muted ${
            isScored ? "border-border" : "border-accent-amber"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Participant {session.current_index + 1} of {totalCount}
              </p>
              {isScored && (
                <Badge variant="outline" className="bg-accent-green/10 text-accent-green border-accent-green/20 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Scored
                </Badge>
              )}
            </div>

            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-card-foreground">
                Chest #{meta.chest}
              </p>
              {meta.group && (
                <p className="text-sm mt-1 text-muted-foreground">
                  {meta.group}{meta.team ? ` \u2014 ${meta.team}` : ""}
                </p>
              )}
            </div>

            <div className="mb-4">
              <Label className="mb-2 block text-card-foreground">
                Score (out of {scoreMax})
              </Label>
              <Input
                type="number"
                min={0}
                max={scoreMax}
                value={scoreInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === "-") {
                    setScoreInput(val);
                    return;
                  }
                  const num = parseFloat(val);
                  if (!isNaN(num) && num >= 0 && num <= scoreMax) {
                    setScoreInput(val);
                  }
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleScoreAction("score"); }}
                className={`w-full border-2 text-center font-mono font-bold focus:ring-accent-amber ${
                  isMobile ? "min-h-[56px] text-2xl" : "py-3 text-xl"
                } ${
                  scoreInput !== "" && !isScoreValid ? "border-destructive focus:ring-destructive" : "border-2 focus:ring-accent-amber"
                }`}
                placeholder={`0 \u2013 ${scoreMax}`}
                autoFocus
                aria-invalid={scoreInput !== "" && !isScoreValid}
                aria-describedby={scoreInput !== "" && !isScoreValid ? "score-error" : undefined}
              />
              {!isScoreValid && scoreInput !== "" && (
                <p id="score-error" className="mt-1 text-sm text-destructive" role="alert">
                  Score must be between 0 and {scoreMax}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Valid range: 0 to {scoreMax}{isScored ? " (current score will be updated)" : ""}
              </p>
            </div>

            <div className="mb-4">
              <Label className="mb-1 block text-muted-foreground">
                Notes (optional)
              </Label>
              <Input
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className={isMobile ? "min-h-[44px] text-base" : ""}
                placeholder="Optional notes..."
              />
            </div>

            <div className={`flex gap-3 ${isMobile ? "flex-col" : "flex-row"}`}>
              <Button
                variant="outline"
                onClick={() => handleNavigate("prev")}
                disabled={session.current_index === 0}
                className={`gap-1.5 ${isMobile ? "min-h-[44px] text-base" : ""}`}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              <Button
                onClick={() => handleScoreAction("score")}
                disabled={sessionActionLoading || !isScoreValid}
                className={`flex-1 gap-1.5 font-bold text-white ${
                  isMobile ? "min-h-[48px] text-base" : ""
                } ${isScored ? "bg-accent-amber hover:bg-accent-amber/90" : "bg-accent-amber hover:bg-accent-amber/90"} ${!isScoreValid ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {sessionActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Save Score <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleScoreAction("skip")}
                disabled={sessionActionLoading}
                className={`gap-1.5 text-muted-foreground ${isMobile ? "min-h-[44px] text-base" : ""}`}
              >
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Nav &middot; {scoredCount}/{totalCount}
              </p>
              {scoredCount === totalCount && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleViewRanking}
                  className="text-xs text-accent-amber hover:text-accent-amber/80 gap-1"
                >
                  <Trophy className="h-3 w-3" /> View Ranking
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {session.participants.map((p, idx) => {
                const isCurrent = idx === session.current_index;
                const isScoredP = p.status === "scored";
                let btnClass = "min-w-[32px] h-8 rounded text-xs font-bold border transition-colors";
                if (isCurrent && isScoredP) {
                  btnClass += " bg-accent-amber/10 border-accent-amber/30 text-accent-amber";
                } else if (isCurrent) {
                  btnClass += " bg-accent-amber text-white border-accent-amber";
                } else if (isScoredP) {
                  btnClass += " bg-accent-green/10 border-accent-green/30 text-accent-green";
                } else {
                  btnClass += " border-border text-muted-foreground";
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleNavigate("goto", idx)}
                    className={btnClass}
                    title={`${p.chest_no || `#${idx + 1}`} \u2014 ${isScoredP ? "Scored" : "Pending"}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── RENDER: Preview (ranking) ────────────────────────────────────────────
  if (viewState === VIEW.PREVIEW) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {sessionMeta?.event?.title || sessionMeta?.event?.name || "Event"} &middot; Round {selectedRound}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ranking Preview &middot; {ranking.length} participant(s)
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="border border-destructive/20 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border mb-4 bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Rank</TableHead>
                  <TableHead className="text-muted-foreground">Chest #</TableHead>
                  {!sessionMeta?.event?.enable_blind_judging && (
                    <TableHead className="text-muted-foreground">Group</TableHead>
                  )}
                  <TableHead className="text-right text-muted-foreground">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((r, idx) => (
                  <TableRow
                    key={idx}
                    className={`border-border ${idx === 0 ? "bg-accent-amber/5" : ""}`}
                  >
                    <TableCell>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        idx === 0 ? "bg-accent-amber/10 text-accent-amber" :
                        idx === 1 ? "bg-muted text-muted-foreground" :
                        idx === 2 ? "bg-accent-amber/10 text-accent-amber" :
                        "bg-transparent text-muted-foreground"
                      }`}>
                        {r.rank}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-card-foreground">#{r.chest_no || "\u2014"}</TableCell>
                    {!sessionMeta?.event?.enable_blind_judging && (
                      <TableCell className="text-card-foreground">{r.group_name || r.team_name || "\u2014"}</TableCell>
                    )}
                    <TableCell className="text-right">
                      <span className={`font-bold text-lg ${idx < 3 ? "text-accent-amber" : "text-card-foreground"}`}>
                        {r.total_score?.toFixed(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleBackToEdit}
              className="gap-2 font-bold"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Edit
            </Button>
            <Button
              onClick={handleCompleteSession}
              disabled={sessionActionLoading}
              className="gap-2 bg-accent-amber hover:bg-accent-amber/90 text-white font-bold"
            >
              {sessionActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {sessionActionLoading ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </div>

          <p className="text-xs mt-3 text-muted-foreground">
            Submitting will create ScoreSheet records and send them to the organizer for review and final approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── RENDER: Submitted ────────────────────────────────────────────────────
  if (viewState === VIEW.SUBMITTED) {
    return (
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-accent-green" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-card-foreground">
            Session Submitted
          </h2>
          <p className="text-sm mb-6 text-muted-foreground">
            {sessionMeta?.event?.title || sessionMeta?.event?.name || "Event"} &middot; Round {selectedRound} &middot; All scores recorded
          </p>
          <p className="text-sm mb-6 text-muted-foreground">
            {ranking.length} participant(s) scored. Scores are now with the organizer for review.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={() => setViewState(VIEW.JUDGING)}
              className="bg-accent-amber hover:bg-accent-amber/90 text-white font-bold"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Edit
            </Button>
            <Button
              onClick={async () => {
                if (!selectedEventId || !session) return;
                if (!window.confirm("Reopen session? This will abandon the current submission and allow you to re-judge from scratch.")) return;
                try {
                  await apiCall(`/api/judge/session/${selectedEventId}?round_no=${selectedRound}`, {
                    method: "DELETE",
                  });
                  setSession(null);
                  setSessionMeta(null);
                  setRanking([]);
                  setError("");
                  setViewState(VIEW.IDLE);
                  toast.success("Session reopened. You can now start a new judging session.");
                  loadAssignments();
                } catch (err) {
                  setError(err.message);
                  toast.error(err.message);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold"
            >
              Reopen Session (Reset)
            </Button>
            <Button
              onClick={() => {
                setSelectedEventId("");
                setSession(null);
                setSessionMeta(null);
                setRanking([]);
                setError("");
                setViewState(VIEW.IDLE);
              }}
              className="bg-muted hover:bg-muted/80 text-white font-bold"
            >
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={loadAssignments}
              className="gap-1 font-bold"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
};
export default JudgeDashboard;
