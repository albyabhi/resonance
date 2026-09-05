import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  Search,
  Minus,
  Plus,
  Eye,
  Ban,
  Flag,
} from "lucide-react";
import toast from "react-hot-toast";
import { useMobileMode } from "../utils/useMobileMode";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const VIEW = {
  LOADING: "loading",
  IDLE: "idle",
  WAITING: "waiting",
  JUDGING: "judging",
  PREVIEW: "preview",
  SUBMITTED: "submitted",
};

const BLOCKED_STATUSES = ["result_pending", "published", "completed", "cancelled"];

const eventIdOf = (a) => String(a?.event_id?._id || a?.event_id || "");
const eventTitleOf = (a) =>
  a?.event_id?.title || a?.event_id?.name || a?.title || "Unknown Event";

const statusBadgeVariant = (status) => {
  if (status === "judging") return "success";
  if (status === "ongoing") return "secondary";
  if (BLOCKED_STATUSES.includes(status)) return "error";
  return "outline";
};

const ErrorBanner = ({ message }) =>
  message ? (
    <div className="border border-destructive/20 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-sm">
      {message}
    </div>
  ) : null;

const JudgeDashboard = () => {
  const { isMobile } = useMobileMode();
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewState, setViewState] = useState(VIEW.LOADING);
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRound, setSelectedRound] = useState(1);
  const [session, setSession] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [scoreMax, setScoreMax] = useState(100);
  const [scoreInput, setScoreInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [rankInput, setRankInput] = useState("");

  // Scoring mode is driven by the event (mirrored onto session/judge_type).
  const scoringType = sessionMeta?.event?.scoring_type || session?.judging_type || "score";
  const isRankMode = scoringType === "rank";

  const isScoreValid = useMemo(() => {
    if (scoreInput === "") return false;
    const val = parseFloat(scoreInput);
    if (isNaN(val)) return false;
    return val >= 0 && val <= scoreMax;
  }, [scoreInput, scoreMax]);
  const [error, setError] = useState("");  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [submittedInfo, setSubmittedInfo] = useState(null);

  const [organizers, setOrganizers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [assigningTeam, setAssigningTeam] = useState(null);
  const [chestPrefix, setChestPrefix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [chestDrafts, setChestDrafts] = useState({});

  // Queue UI state (client-side organization of F1 data — no new fetch semantics)
  const [queueTab, setQueueTab] = useState("todo");
  const [queueSearch, setQueueSearch] = useState("");
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Disqualify state (session-local — never touches Team.status)
  const [pendingDQ, setPendingDQ] = useState([]); // briefing (pre-session) team_ids
  const [showDQDialog, setShowDQDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [dqLoading, setDQLoading] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);

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
      const [{ data: assignData }, sessionsRes] = await Promise.all([
        apiCall("/api/judge/assignments"),
        apiCall("/api/judge/sessions").catch(() => ({ data: [] })),
      ]);
      setAssignments(assignData || []);
      setSessions(sessionsRes?.data || []);
      setViewState((v) => (v === VIEW.LOADING ? VIEW.IDLE : v));
      // If we are on a detail view, keep it; otherwise ensure IDLE
      return assignData || [];
    } catch (err) {
      setError(err.message || "Failed to load assignments");
      setViewState(VIEW.IDLE);
      return [];
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
      setViewState(VIEW.LOADING);
      Promise.all([loadAssignments(), loadOrganizers()]).then(() => {
        setViewState((v) => (v === VIEW.LOADING ? VIEW.IDLE : v));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Deep-link: /dashboard/judge-dashboard?event=<id> (from home widgets)
  useEffect(() => {
    const deepEvent = searchParams.get("event");
    if (deepEvent && assignments.length > 0 && !selectedEventId && viewState === VIEW.IDLE) {
      const match = assignments.find((a) => eventIdOf(a) === String(deepEvent));
      if (match) {
        setSelectedEventId(String(deepEvent));
        setSelectedRound(1);
        setViewState(VIEW.LOADING);
        loadSessionInfo(String(deepEvent), 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, viewState]);

  const loadSessionInfo = useCallback(async (eventId, roundNo) => {
    try {
      setError("");
      const { data } = await apiCall(`/api/judge/session/${eventId}?round_no=${roundNo}`);
      setSessionMeta(data);
      setSession(data?.session || null);
      setSubmittedInfo(null);
      if (data?.session?.status === "in_progress") {
        setScoreMax(data.session.score_scale?.max || 100);
        setViewState(VIEW.JUDGING);
      } else if (data?.session?.status === "submitted") {
        setViewState(VIEW.SUBMITTED);
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

  // Queue derivation — same F1 assignments + existing sessions list
  const sessionByEvent = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const eid = String(s?.event_id?._id || s?.event_id || "");
      if (!eid) continue;
      if (!map.has(eid)) map.set(eid, s);
    }
    return map;
  }, [sessions]);

  const queueGroups = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    const filtered = assignments.filter((a) => {
      if (!q) return true;
      const title = eventTitleOf(a).toLowerCase();
      const cat = String(a?.event_id?.category || "").toLowerCase();
      return title.includes(q) || cat.includes(q);
    });
    const todo = [];
    const active = [];
    const done = [];
    for (const a of filtered) {
      const eid = eventIdOf(a);
      const s = sessionByEvent.get(eid);
      if (s?.status === "in_progress") active.push(a);
      else if (s?.status === "submitted") done.push(a);
      else todo.push(a);
    }
    return { todo, active, done, all: filtered };
  }, [assignments, sessionByEvent, queueSearch]);

  const resetAssignState = () => {
    setAssigning(false);
    setAssigningTeam(null);
    setChestPrefix("");
    setStartNumber(1);
    setChestDrafts({});
    setPendingDQ([]);
    setShowDQDialog(false);
    setShowFinishDialog(false);
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
        toast(`Assigned ${assignedCount} team(s). ${errorCount} skipped due to duplicate chest numbers.`);
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

  const openAssignment = (eventId) => {
    setSelectedEventId(eventId);
    setSelectedRound(1);
    setSession(null);
    setSessionMeta(null);
    setRanking([]);
    setSubmittedInfo(null);
    resetAssignState();
    setError("");
    setViewState(VIEW.LOADING);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("event", eventId);
      return next;
    }, { replace: true });
    loadSessionInfo(eventId, 1);
  };

  const backToQueue = () => {
    setSelectedEventId("");
    setSession(null);
    setSessionMeta(null);
    setRanking([]);
    setSubmittedInfo(null);
    setError("");
    resetAssignState();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("event");
      return next;
    }, { replace: true });
    setViewState(VIEW.IDLE);
    loadAssignments();
  };

  const handleRoundChange = (value) => {
    const round = parseInt(value, 10) || 1;
    setSelectedRound(round);
    setSession(null);
    setSessionMeta(null);
    setRanking([]);
    setSubmittedInfo(null);
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
    } else {
      loadAssignments();
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
          disqualified_team_ids: pendingDQ,
        }),
      });
      setSession(data);
      setScoreMax(data.score_scale?.max || 100);
      setScoreInput("");
      setRankInput("");
      setNotesInput("");
      if ((pendingDQ?.length || 0) > 0) {
        toast.success(`Judging session started (${pendingDQ.length} disqualified in briefing)`);
      } else {
        toast.success("Judging session started");
      }
      setPendingDQ([]);
      // Refresh queue statuses in background
      loadAssignments();
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
          toast("A submitted session already exists. Viewing receipt.");
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

  const disqualifiedCount = useMemo(() => {
    if (!session || !session.participants) return 0;
    return session.participants.filter((p) => p.status === "disqualified").length;
  }, [session]);

  const pendingParticipants = useMemo(() => {
    if (!session || !session.participants) return [];
    return session.participants.filter((p) => p.status === "pending");
  }, [session]);

  // Participants that still require judge attention (excludes disqualified)
  const scorableTotal = useMemo(() => Math.max(0, totalCount - disqualifiedCount), [totalCount, disqualifiedCount]);

  // Ranks already taken by OTHER scored participants (for uniqueness hints)
  const usedRanks = useMemo(() => {
    if (!session?.participants) return new Set();
    const s = new Set();
    session.participants.forEach((p, idx) => {
      if (p.status === "scored" && idx !== session.current_index) {
        const r = Number(p.rank ?? p.total_score);
        if (Number.isFinite(r)) s.add(r);
      }
    });
    return s;
  }, [session]);

  const isRankValid = useMemo(() => {
    if (rankInput === "") return false;
    const v = parseInt(rankInput, 10);
    if (!Number.isFinite(v)) return false;
    if (v < 1 || v > Math.max(1, scorableTotal)) return false;
    return !usedRanks.has(v);
  }, [rankInput, scorableTotal, usedRanks]);

  const initScoreForCurrent = useCallback(() => {
    if (currentParticipant) {
      if (currentParticipant.status === "scored") {
        const avg = currentParticipant.total_score || 0;
        setScoreInput(String(Math.round(avg)));
        setNotesInput(currentParticipant.scores?.[0]?.notes || "");
        setRankInput(String(currentParticipant.rank ?? Math.round(avg) ?? ""));
      } else {
        setScoreInput("");
        setNotesInput("");
        setRankInput("");
      }
    }
  }, [currentParticipant]);

  useEffect(() => {
    initScoreForCurrent();
  }, [initScoreForCurrent]);

  const adjustScore = (delta) => {
    setScoreInput((prev) => {
      const cur = prev === "" ? 0 : parseFloat(prev);
      const base = isNaN(cur) ? 0 : cur;
      const next = Math.min(scoreMax, Math.max(0, Math.round(base + delta)));
      return String(next);
    });
  };

  const adjustRank = (delta) => {
    setRankInput((prev) => {
      const cur = prev === "" ? 0 : parseInt(prev, 10);
      const base = Number.isFinite(cur) ? cur : 0;
      const next = Math.min(Math.max(1, scorableTotal), Math.max(1, base + delta));
      return String(next);
    });
  };

  const handleScoreAction = async (action) => {
    if (!session) return;
    if (action === "score") {
      // ── Rank mode: same button/lifecycle, rank payload ──
      if (isRankMode) {
        const rankVal = parseInt(rankInput, 10);
        if (!Number.isFinite(rankVal) || rankVal < 1 || rankVal > Math.max(1, scorableTotal)) {
          setError(`Rank must be between 1 and ${Math.max(1, scorableTotal)}`);
          return;
        }
        if (usedRanks.has(rankVal)) {
          setError(`Rank ${rankVal} is already assigned to another participant`);
          return;
        }
        try {
          setSessionActionLoading(true);
          setError("");
          const { data } = await apiCall(`/api/judge/session/${selectedEventId}/score`, {
            method: "PATCH",
            body: JSON.stringify({
              session_id: session._id,
              rank: rankVal,
              scores: [{ criterion: "rank", score: rankVal, notes: notesInput }],
            }),
          });
          setSession((prev) => {
            if (!prev) return prev;
            const participants = prev.participants.map((p, idx) =>
              idx === prev.current_index
                ? { ...p, status: "scored", total_score: rankVal, rank: rankVal }
                : p
            );
            return { ...prev, participants, current_index: data.current_index };
          });
          if (data.is_last) {
            setViewState(VIEW.PREVIEW);
            loadRanking();
          }
        } catch (err) {
          setError(err.message || "Failed to save rank");
          toast.error(err.message);
        } finally {
          setSessionActionLoading(false);
        }
        return;
      }
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
        // Immutable update (fixes in-place mutation bug)
        setSession((prev) => {
          if (!prev) return prev;
          const participants = prev.participants.map((p, idx) =>
            idx === prev.current_index
              ? { ...p, status: "scored", total_score: scoreVal }
              : p
          );
          return { ...prev, participants, current_index: data.current_index };
        });

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
      const nextIdx = Math.min(session.current_index + 1, totalCount - 1);
      if (nextIdx !== session.current_index) {
        try {
          await apiCall(`/api/judge/session/${selectedEventId}/navigate`, {
            method: "PATCH",
            body: JSON.stringify({ session_id: session._id, action: "next" }),
          });
          setSession((prev) => (prev ? { ...prev, current_index: nextIdx } : prev));
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
      setSession((prev) => (prev ? { ...prev, current_index: data.current_index } : prev));
    } catch (err) {
      setError(err.message || "Navigation failed");
    }
  };

  // ─── Disqualify (session-local) ──────────────────────────────────────────
  const toggleBriefingDQ = (teamId) => {
    const id = String(teamId);
    setPendingDQ((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const applyDisqualifyResult = (data) => {
    if (!data) return;
    setSession((prev) => {
      if (!prev) return prev;
      return { ...prev, current_index: data.current_index ?? prev.current_index };
    });
    // Refresh full session ordering/counts from server (single source of truth)
    if (selectedEventId) {
      apiCall(`/api/judge/session/${selectedEventId}?round_no=${selectedRound}`)
        .then(({ data: fresh }) => {
          if (fresh?.session) {
            setSession(fresh.session);
            setSessionMeta(fresh);
          }
        })
        .catch(() => {});
    }
  };

  const doDisqualifyTeam = async (teamId, reason) => {
    if (!session || !teamId) return;
    try {
      setDQLoading(true);
      setError("");
      const { data } = await apiCall(`/api/judge/session/${selectedEventId}/disqualify`, {
        method: "PATCH",
        body: JSON.stringify({
          session_id: session._id,
          team_id: String(teamId),
          action: "disqualify",
          reason: reason || "Disqualified by judge",
        }),
      });
      applyDisqualifyResult(data);
      toast.success("Participant disqualified — excluded from submission");
      setShowDQDialog(false);
    } catch (err) {
      setError(err.message || "Failed to disqualify participant");
      toast.error(err.message || "Failed to disqualify participant");
    } finally {
      setDQLoading(false);
    }
  };

  const doRestoreTeam = async (teamId) => {
    if (!session || !teamId) return;
    try {
      setDQLoading(true);
      setError("");
      const { data } = await apiCall(`/api/judge/session/${selectedEventId}/disqualify`, {
        method: "PATCH",
        body: JSON.stringify({
          session_id: session._id,
          team_id: String(teamId),
          action: "restore",
        }),
      });
      applyDisqualifyResult(data);
      toast.success("Participant restored to judging queue");
    } catch (err) {
      setError(err.message || "Failed to restore participant");
      toast.error(err.message || "Failed to restore participant");
    } finally {
      setDQLoading(false);
    }
  };

  // ─── Finish (skipped → disqualify confirmation) ──────────────────────────
  const handleFinishPress = async () => {
    if (!session) return;
    if (pendingParticipants.length === 0) {
      const data = await loadRanking();
      if (data && (data.pending_count === 0 || data.scored_count + (data.disqualified_count || 0) === data.total)) {
        setViewState(VIEW.PREVIEW);
      } else {
        toast.error(`Score all participants first (${data?.scored_count || 0}/${data?.total || 0})`);
      }
      return;
    }
    setShowFinishDialog(true);
  };

  const doFinishProceed = async () => {
    // Proceed: mark every skipped (pending) participant disqualified, then preview
    if (!session || pendingParticipants.length === 0) {
      setShowFinishDialog(false);
      return;
    }
    if (scoredCount === 0) {
      toast.error("Score at least one participant before finishing");
      return;
    }
    try {
      setFinishLoading(true);
      setError("");
      const { data } = await apiCall(`/api/judge/session/${selectedEventId}/disqualify`, {
        method: "PATCH",
        body: JSON.stringify({
          session_id: session._id,
          team_ids: pendingParticipants.map((p) => String(p.team_id)),
          action: "disqualify",
          reason: "Skipped — auto-disqualified on finish",
        }),
      });
      applyDisqualifyResult(data);
      setShowFinishDialog(false);
      toast.success(`${pendingParticipants.length} skipped participant(s) disqualified`);
      const rankingData = await loadRanking();
      if (rankingData) setViewState(VIEW.PREVIEW);
    } catch (err) {
      setError(err.message || "Failed to disqualify skipped participants");
      toast.error(err.message || "Failed to disqualify skipped participants");
    } finally {
      setFinishLoading(false);
    }
  };

  const loadRanking = async () => {
    if (!selectedEventId) return null;
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

  // Auto-load ranking when entering PREVIEW / SUBMITTED with empty ranking (fixes 0-count bug)
  useEffect(() => {
    if ((viewState === VIEW.PREVIEW || viewState === VIEW.SUBMITTED) && selectedEventId && ranking.length === 0) {
      loadRanking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState, selectedEventId, selectedRound]);

  const handleViewRanking = async () => {
    const data = await loadRanking();
    if (data && ((data.pending_count ?? (data.total - data.scored_count)) === 0)) {
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
      setSubmittedInfo({
        score_count: data.score_count,
        submitted_at: data.submitted_at,
        disqualified_count: data.disqualified_count || 0,
      });
      toast.success(
        `Session submitted! ${data.score_count} scores recorded${data.disqualified_count ? ` (${data.disqualified_count} disqualified)` : ""}.`
      );
      loadAssignments();
      setViewState(VIEW.SUBMITTED);
    } catch (err) {
      setError(err.message || "Failed to submit session");
      toast.error(err.message);
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleBackToEdit = () => {
    // Only valid while session is still in progress
    if (session?.status === "submitted") {
      setViewState(VIEW.PREVIEW);
      return;
    }
    setViewState(VIEW.JUDGING);
  };

  const doAbandonSession = async () => {
    if (!selectedEventId || !session) return;
    try {
      setConfirmLoading(true);
      await apiCall(`/api/judge/session/${selectedEventId}?round_no=${selectedRound}`, {
        method: "DELETE",
      });
      setSession(null);
      setShowAbandonDialog(false);
      toast.success("Session abandoned");
      loadAssignments();
      loadSessionInfo(selectedEventId, selectedRound);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const doReopenSession = async () => {
    if (!selectedEventId) return;
    try {
      setConfirmLoading(true);
      await apiCall(`/api/judge/session/${selectedEventId}?round_no=${selectedRound}`, {
        method: "DELETE",
      });
      setSession(null);
      setSessionMeta(null);
      setRanking([]);
      setSubmittedInfo(null);
      setError("");
      setShowReopenDialog(false);
      toast.success("Session reopened. You can now start a new judging session.");
      loadAssignments();
      setViewState(VIEW.IDLE);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (viewState === VIEW.LOADING) return null;

  // ─── RENDER: Queue (replaces bare dropdown) ────────────────────────────────
  if (viewState === VIEW.IDLE || !selectedEventId) {
    const renderQueueCards = (list) => {
      if (list.length === 0) {
        return (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Nothing here.
          </div>
        );
      }
      return (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
          {list.map((a) => {
            const eid = eventIdOf(a);
            const evt = a.event_id || {};
            const sess = sessionByEvent.get(eid);
            const cta = sess?.status === "in_progress"
              ? "Continue scoring"
              : sess?.status === "submitted"
                ? "View receipt"
                : "Open briefing";
            return (
              <div key={a._id || eid} className="border border-border rounded-xl p-4 bg-card flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-card-foreground truncate">{eventTitleOf(a)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[evt.category, evt.event_type].filter(Boolean).join(" · ") || "Event"}
                      {evt.rounds ? ` · ${evt.rounds} round(s)` : ""}
                      {` · ${evt.scoring_type === "rank" ? "Ranking" : "Score"}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge variant="outline">{a.judge_type === "rank" || evt.scoring_type === "rank" ? "Ranking" : "Score"}</Badge>
                    <Badge variant={statusBadgeVariant(evt.status)}>
                      {String(evt.status || "assigned").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
                {a.coordinator?.name && (
                  <p className="text-xs text-muted-foreground truncate">
                    Coordinator: {a.coordinator.name}
                  </p>
                )}
                {sess && (
                  <p className="text-xs text-muted-foreground">
                    {sess.status === "in_progress" ? "Session in progress" : "Session submitted"}
                    {sess.round_no ? ` · Round ${sess.round_no}` : ""}
                  </p>
                )}
                <Button
                  size="sm"
                  variant={sess?.status === "in_progress" ? "default" : "outline"}
                  onClick={() => openAssignment(eid)}
                  className={`mt-1 font-bold ${isMobile ? "min-h-[44px]" : ""}`}
                >
                  {sess?.status === "in_progress" && <RotateCcw className="h-3.5 w-3.5" />}
                  {sess?.status === "submitted" && <Eye className="h-3.5 w-3.5" />}
                  {!sess && <Play className="h-3.5 w-3.5" />}
                  {cta}
                </Button>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>My Judging Work</CardTitle>
              <CardDescription>
                {assignments.length} assigned event(s) · {queueGroups.active.length} in progress · {queueGroups.done.length} submitted
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className={`gap-1 ${isMobile ? "min-h-[44px]" : ""}`}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <ErrorBanner message={error} />

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Search events…"
              className={`pl-9 ${isMobile ? "min-h-[48px] text-base" : ""}`}
              aria-label="Search assigned events"
            />
          </div>

          <Tabs value={queueTab} onValueChange={setQueueTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-3 ${isMobile ? "min-h-[48px]" : ""}`}>
              <TabsTrigger value="todo">To Judge ({queueGroups.todo.length})</TabsTrigger>
              <TabsTrigger value="active">In Progress ({queueGroups.active.length})</TabsTrigger>
              <TabsTrigger value="done">Submitted ({queueGroups.done.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="todo" className="mt-3">
              {renderQueueCards(queueGroups.todo)}
            </TabsContent>
            <TabsContent value="active" className="mt-3">
              {renderQueueCards(queueGroups.active)}
            </TabsContent>
            <TabsContent value="done" className="mt-3">
              {renderQueueCards(queueGroups.done)}
            </TabsContent>
          </Tabs>

          {assignments.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                No events assigned to you yet.
              </p>
              {organizers.length > 0 && (
                <Collapsible className="mt-4 p-4 bg-muted/50 rounded-lg text-left max-w-sm mx-auto border border-border">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      Contact an organizer
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <ul className="space-y-2 text-sm">
                      {organizers.map((org) => (
                        <li key={org._id} className="flex flex-col gap-0.5">
                          <span className="font-medium">{org.name} <span className="text-muted-foreground">({org.role})</span></span>
                          {org.email && (
                            <a href={`mailto:${org.email}`} className="text-primary underline text-xs">
                              {org.email}
                            </a>
                          )}
                          {org.phone && (
                            <a href={`tel:${org.phone}`} className="text-primary underline text-xs">
                              {org.phone}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
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
    const blockedStatus = BLOCKED_STATUSES.includes(evt.status);
    // Briefing DQ: disqualified entries don't block start (no chest needed, excluded from scoring)
    const effectiveMissing = (sessionMeta?.participants || [])
      .filter((p) => !p.chest_no && !pendingDQ.includes(String(p.team_id))).length;
    const effectiveAllHaveChests = effectiveMissing === 0;
    const scorableAfterDQ = (sessionMeta?.participant_count || 0) - pendingDQ.length;
    const effectiveCanStart = !session && !blockedStatus && effectiveAllHaveChests && scorableAfterDQ > 0;

    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" size="sm" onClick={backToQueue} className="self-start -ml-2 gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> All work
          </Button>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="truncate">{evt.title || evt.name || "Event"}</CardTitle>
              <CardDescription>
                {[evt.category, evt.event_type].filter(Boolean).join(" · ") || "Event briefing"}
                {" · "}{evt.scoring_type === "rank" ? "Ranking" : "Score"}
              </CardDescription>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="outline">{evt.scoring_type === "rank" ? "Ranking" : "Score"}</Badge>
              <Badge variant={statusBadgeVariant(evt.status)}>
                {String(evt.status || "—").replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <ErrorBanner message={error} />

          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <Label className="mb-1 block">Round</Label>
              <Select value={String(selectedRound)} onValueChange={handleRoundChange}>
                <SelectTrigger className={`w-[160px] ${isMobile ? "min-h-[48px] text-base" : ""}`}>
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: evt.rounds || 1 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Round {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} className={`gap-1 ${isMobile ? "min-h-[48px]" : ""}`}>
              <RefreshCw className="h-4 w-4" /> Refresh status
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-border rounded-lg p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold text-card-foreground">{sessionMeta?.participant_count || 0}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Teams</p>
            </div>
            <div className="border border-border rounded-lg p-3 text-center">
              <Hash className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold text-card-foreground">{sessionMeta?.teams_without_chest || 0}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Missing chest</p>
            </div>
          </div>

          {!sessionMeta?.all_have_chests && (
            <div className="bg-accent-amber/10 border border-accent-amber/20 rounded-lg px-3 py-3 mb-4 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-accent-amber" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground">
                    {sessionMeta?.teams_without_chest || 0} team(s) still need chest numbers.
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Usually done by the coordinator. You can help below, or wait.
                  </p>
                </div>
              </div>

              <Collapsible className="mt-3 rounded-lg border border-border bg-card">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between font-bold">
                    <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Help assign missing ({unassignedParticipants.length})</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 space-y-2 border-t border-border">
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
                      className={`gap-1.5 font-bold ${isMobile ? "min-h-[44px]" : ""}`}
                    >
                      {assigning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {assigning ? "Assigning..." : `Auto-Assign (${unassignedParticipants.length})`}
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
                            className={`w-28 font-mono ${isMobile ? "min-h-[48px] text-base" : ""}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleJudgeAssignSingle(String(p.team_id))}
                            disabled={assigning || !(chestDrafts[String(p.team_id)] || "").trim()}
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
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {blockedStatus && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Cannot start judging: event is &ldquo;{evt.status?.replace(/_/g, " ")}&rdquo;.</span>
            </div>
          )}

          {(sessionMeta?.participants?.length || 0) > 0 && !hasExistingSession && (
            <Collapsible className="border border-border rounded-lg mb-4 bg-card">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Ban className="h-3.5 w-3.5" />
                    Disqualify participants {pendingDQ.length > 0 ? `(${pendingDQ.length} selected)` : `(${(sessionMeta?.participants || []).length})`}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3 space-y-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Remove no-show or ineligible participants here — they will be excluded from scoring and submission. Session-local only; does not affect other judges.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {(sessionMeta?.participants || []).map((p) => {
                    const id = String(p.team_id);
                    const checked = pendingDQ.includes(id);
                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${checked ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted"}`}
                      >
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-card-foreground">
                            {p.chest_no ? `#${p.chest_no} · ` : ""}{participantLabel(p)}
                          </p>
                          {checked && (
                            <p className="text-[11px] text-destructive font-semibold">Will be disqualified on start</p>
                          )}
                        </div>
                        {checked && <Badge variant="error">DQ</Badge>}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleBriefingDQ(id)}
                          className={`gap-1 font-bold ${checked ? "" : "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"} ${isMobile ? "min-h-[44px]" : ""}`}
                        >
                          {checked ? (
                            <><RotateCcw className="h-3.5 w-3.5" /> Restore</>
                          ) : (
                            <><Ban className="h-3.5 w-3.5" /> Disqualify</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {pendingDQ.length > 0 && (
                  <p className="text-xs text-destructive font-medium">
                    {pendingDQ.length} participant(s) will start as disqualified and skip scoring.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {(sessionMeta?.event?.scoring_type || "score") === "rank" ? (
            <div className="border border-border rounded-lg mb-4 bg-muted/40 px-4 py-3 text-sm">
              <p className="font-semibold text-card-foreground">Ranking event — assign ranks 1..N</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Each participant gets a unique rank (1 = best). No score scale needed. Points resolve from the event's rank table.
              </p>
            </div>
          ) : (
          <Collapsible className="border border-border rounded-lg mb-4 bg-muted/40">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Scoring setup · 0 – {scoreMax}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0">
              <Label className="mb-2 block text-card-foreground">
                Score Scale (max points)
              </Label>
              <Input
                type="number"
                min={1}
                value={scoreMax}
                onChange={(e) => setScoreMax(Math.max(1, parseInt(e.target.value, 10) || 100))}
                className={`max-w-[140px] ${isMobile ? "min-h-[48px] text-base" : ""}`}
                disabled={hasExistingSession}
              />
              <p className="text-xs mt-1 text-muted-foreground">
                Score range: 0 to {scoreMax}. Only change if the organizer instructs you.
              </p>
            </CollapsibleContent>
          </Collapsible>
          )}

          {hasExistingSession && (
            <div className="bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>You have an existing session for this event. You can resume or abandon it.</span>
            </div>
          )}

          {effectiveCanStart && !blockedStatus && (
            <div className="bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-lg px-3 py-2 mb-4 text-sm">
              Ready — all chest numbers assigned{pendingDQ.length > 0 ? ` (${pendingDQ.length} disqualified, excluded)` : ""}. Start when the event is live.
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {hasExistingSession ? (
              <>
                <Button
                  onClick={handleResumeSession}
                  className={`gap-2 font-bold ${isMobile ? "min-h-[48px]" : ""}`}
                >
                  <RotateCcw className="h-4 w-4" /> Resume Session
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAbandonDialog(true)}
                  className={`gap-2 font-bold hover:bg-destructive/10 hover:text-destructive ${isMobile ? "min-h-[48px]" : ""}`}
                >
                  <X className="h-4 w-4" /> Abandon
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStartSession}
                disabled={(!canStart && !effectiveCanStart) || blockedStatus || sessionActionLoading || scorableAfterDQ === 0}
                className={`gap-2 font-bold ${isMobile ? "min-h-[48px] text-base" : ""}`}
              >
                {sessionActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Judging{pendingDQ.length > 0 ? ` (${scorableAfterDQ} to judge)` : ""}
              </Button>
            )}
          </div>
          {!effectiveCanStart && !hasExistingSession && !blockedStatus && (
            <p className="text-xs mt-2 text-muted-foreground">
              {scorableAfterDQ === 0
                ? "Restore at least one participant — all are currently disqualified."
                : `Start unlocks once all chest numbers are assigned (${effectiveMissing} still missing among participants to judge). Disqualify no-shows above to proceed.`}
            </p>
          )}
        </CardContent>

        <AlertDialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abandon this session?</AlertDialogTitle>
              <AlertDialogDescription>
                {evt.title || evt.name || "This event"} · Round {selectedRound}.{" "}
                {session?.participants?.filter((p) => p.status === "scored").length || 0} of{" "}
                {session?.participants?.length || 0} scored so far. All scores and notes in
                this session will be permanently deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmLoading}>Keep session</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); doAbandonSession(); }}
                disabled={confirmLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {confirmLoading ? "Abandoning…" : "Abandon session"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  // ─── RENDER: Judging (one-by-one) ─────────────────────────────────────────
  if (viewState === VIEW.JUDGING && session) {
    const participant = currentParticipant;
    const isScored = participant?.status === "scored";
    const isDQ = participant?.status === "disqualified";
    const pct = scorableTotal > 0 ? Math.round((scoredCount / scorableTotal) * 100) : 0;

    const getParticipantMeta = (p) => {
      if (!p) return { chest: "—", group: "", team: "" };
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
          <Button variant="ghost" size="sm" onClick={() => setViewState(VIEW.WAITING)} className="self-start -ml-2 gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Briefing
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <CardTitle>
                {sessionMeta?.event?.title || sessionMeta?.event?.name || "Event"} · Round {selectedRound} · {isRankMode ? "Ranking" : "Score"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {scoredCount} of {scorableTotal} {isRankMode ? "ranked" : "scored"}{disqualifiedCount > 0 ? ` · ${disqualifiedCount} disqualified` : ""}
                {pendingParticipants.length > 0 ? ` · ${pendingParticipants.length} skipped/pending` : ""}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="default"
                size="sm"
                onClick={handleFinishPress}
                disabled={finishLoading || sessionActionLoading}
                className={`gap-1 font-bold ${isMobile ? "min-h-[44px]" : ""}`}
                title={pendingParticipants.length > 0 ? "Finish — review skipped participants" : "Finish — review ranking"}
              >
                {finishLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Flag className="h-3.5 w-3.5" />
                )}
                Finish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAbandonDialog(true)}
                className="text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive gap-1"
              >
                <X className="h-3 w-3" /> Abandon
              </Button>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-accent-amber transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardHeader>

        <CardContent>
          <ErrorBanner message={error} />

          <div className={`border-2 rounded-xl p-4 sm:p-6 mb-4 transition-colors bg-muted ${
            isDQ ? "border-destructive/40" : isScored ? "border-border" : "border-accent-amber"
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
              {isDQ && (
                <Badge variant="error" className="flex items-center gap-1">
                  <Ban className="h-3 w-3" /> Disqualified
                </Badge>
              )}
            </div>

            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-card-foreground tracking-tight">
                Chest #{meta.chest}
             </p>
              {sessionMeta?.event?.enable_blind_judging && (
                <p className="text-xs mt-1 text-muted-foreground">Blind judging — identities hidden</p>
              )}
            </div>

            {isDQ && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
                <Ban className="h-4 w-4 shrink-0" />
                <span>This participant is disqualified and excluded from submission. Restore to score them.</span>
              </div>
            )}

            {isRankMode ? (
            <div className="mb-4">
              <Label className="mb-2 block text-card-foreground">
                Rank (1 = best, up to {Math.max(1, scorableTotal)})
              </Label>
              <div className="flex items-stretch gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustRank(-1)}
                  disabled={isDQ}
                  className={`${isMobile ? "min-h-[56px] min-w-[56px]" : "min-h-[52px] min-w-[52px]"}`}
                  aria-label="Decrease rank by 1"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(1, scorableTotal)}
                  value={rankInput}
                  disabled={isDQ}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setRankInput(val);
                      return;
                    }
                    const num = parseInt(val, 10);
                    if (!Number.isNaN(num) && num >= 1 && num <= Math.max(1, scorableTotal)) {
                      setRankInput(val);
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleScoreAction("score"); }}
                  className={`w-full border-2 text-center font-mono font-bold focus:ring-accent-amber ${
                    isMobile ? "min-h-[56px] text-2xl" : "py-3 text-xl"
                  } ${
                    rankInput !== "" && !isRankValid ? "border-destructive focus:ring-destructive" : "border-2 focus:ring-accent-amber"
                  }`}
                  placeholder={`1 – ${Math.max(1, scorableTotal)}`}
                  aria-invalid={rankInput !== "" && !isRankValid}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustRank(1)}
                  disabled={isDQ}
                  className={`${isMobile ? "min-h-[56px] min-w-[56px]" : "min-h-[52px] min-w-[52px]"}`}
                  aria-label="Increase rank by 1"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {!isRankValid && rankInput !== "" && (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {usedRanks.has(parseInt(rankInput, 10))
                    ? `Rank ${rankInput} is already assigned — each rank 1..${Math.max(1, scorableTotal)} must be unique`
                    : `Rank must be between 1 and ${Math.max(1, scorableTotal)}`}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Each rank 1..{Math.max(1, scorableTotal)} must be unique{isScored ? " (saving will update the current rank)" : ""}. Points resolve from the event's rank table.
              </p>
              {usedRanks.size > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Used ranks: {[...usedRanks].sort((a, b) => a - b).join(", ")}
                </p>
              )}
            </div>
            ) : (
            <div className="mb-4">
              <Label className="mb-2 block text-card-foreground">
                Score (out of {scoreMax})
              </Label>
              <div className="flex items-stretch gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustScore(-1)}
                  disabled={isDQ}
                  className={`${isMobile ? "min-h-[56px] min-w-[56px]" : "min-h-[52px] min-w-[52px]"}`}
                  aria-label="Decrease score by 1"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={scoreMax}
                  value={scoreInput}
                  disabled={isDQ}
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
                  placeholder={`0 – ${scoreMax}`}
                  aria-invalid={scoreInput !== "" && !isScoreValid}
                  aria-describedby={scoreInput !== "" && !isScoreValid ? "score-error" : undefined}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustScore(1)}
                  disabled={isDQ}
                  className={`${isMobile ? "min-h-[56px] min-w-[56px]" : "min-h-[52px] min-w-[52px]"}`}
                  aria-label="Increase score by 1"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {!isScoreValid && scoreInput !== "" && (
                <p id="score-error" className="mt-1 text-sm text-destructive" role="alert">
                  Score must be between 0 and {scoreMax}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Valid range: 0 to {scoreMax}{isScored ? " (saving will update the current score)" : ""}
              </p>
            </div>
            )}

            <div className="mb-4">
              <Label className="mb-1 block text-muted-foreground">
                Notes (optional)
              </Label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                disabled={isDQ}
                className={`flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isMobile ? "min-h-[64px] text-base" : "min-h-[56px]"}`}
                placeholder="Optional notes…"
                rows={2}
              />
            </div>

            <div className={`flex gap-3 ${isMobile ? "flex-col" : "flex-row"}`}>
              <Button
                variant="outline"
                onClick={() => handleNavigate("prev")}
                disabled={session.current_index === 0}
                className={`gap-1.5 ${isMobile ? "min-h-[48px] text-base" : ""}`}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              <Button
                onClick={() => handleScoreAction("score")}
                disabled={sessionActionLoading || (isRankMode ? !isRankValid : !isScoreValid) || isDQ}
                className={`flex-1 gap-1.5 font-bold ${
                  isMobile ? "min-h-[52px] text-base" : "min-h-[48px]"
                } ${((isRankMode ? !isRankValid : !isScoreValid) || isDQ) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {sessionActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>{isRankMode ? "Save Rank" : "Save Score"} <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleScoreAction("skip")}
                disabled={sessionActionLoading || isDQ}
                className={`gap-1.5 text-muted-foreground ${isMobile ? "min-h-[48px] text-base" : ""}`}
                title="Skip for now — participant stays unscored"
              >
                <SkipForward className="h-4 w-4" /> Skip for now
              </Button>
            </div>

            <div className={`flex gap-3 mt-3 ${isMobile ? "flex-col" : "flex-row"}`}>
              {isDQ ? (
                <Button
                  variant="outline"
                  onClick={() => participant && doRestoreTeam(participant.team_id)}
                  disabled={dqLoading}
                  className={`flex-1 gap-1.5 font-bold ${isMobile ? "min-h-[48px] text-base" : ""}`}
                >
                  {dqLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Restore to queue
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowDQDialog(true)}
                  disabled={dqLoading || isScored}
                  title={isScored ? "Already scored — cannot disqualify scored work" : "Disqualify — remove from submission"}
                  className={`flex-1 gap-1.5 font-bold hover:bg-destructive/10 hover:text-destructive ${isMobile ? "min-h-[48px] text-base" : ""}`}
                >
                  <Ban className="h-4 w-4" /> Disqualify
                </Button>
              )}
              <Button
                onClick={handleFinishPress}
                disabled={finishLoading || sessionActionLoading}
                className={`flex-1 gap-1.5 font-bold ${isMobile ? "min-h-[52px] text-base" : "min-h-[48px]"}`}
              >
                {finishLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
                Finish{pendingParticipants.length > 0 ? ` (${pendingParticipants.length} skipped)` : ""}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Skipped participants stay unscored — Finish will ask you to confirm disqualifying them before submitting.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Nav · {scoredCount}/{scorableTotal}{disqualifiedCount > 0 ? ` · ${disqualifiedCount} DQ` : ""}
              </p>
              {pendingParticipants.length === 0 && scorableTotal > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleViewRanking}
                  className="text-xs gap-1"
                >
                  <Trophy className="h-3 w-3" /> View Ranking
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {session.participants.map((p, idx) => {
                const isCurrent = idx === session.current_index;
                const isScoredP = p.status === "scored";
                const isDQP = p.status === "disqualified";
                let btnClass = "min-w-[40px] min-h-[40px] rounded-lg text-sm font-bold border transition-colors px-2";
                if (isDQP) {
                  btnClass += isCurrent
                    ? " bg-destructive text-white border-destructive"
                    : " bg-destructive/10 border-destructive/30 text-destructive line-through";
                } else if (isCurrent && isScoredP) {
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
                    key={p.team_id || idx}
                    onClick={() => handleNavigate("goto", idx)}
                    className={btnClass}
                    title={`${p.chest_no || `#${idx + 1}`} — ${isDQP ? "Disqualified" : isScoredP ? "Scored" : "Pending"}`}
                    aria-label={`Go to participant ${idx + 1}${isDQP ? " (disqualified)" : isScoredP ? " (scored)" : ""}`}
                    aria-current={isCurrent ? "true" : undefined}
                  >
                    {isDQP ? "✕" : idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>

        <AlertDialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abandon this session?</AlertDialogTitle>
              <AlertDialogDescription>
                {scoredCount} of {scorableTotal} scored so far{disqualifiedCount > 0 ? ` (${disqualifiedCount} disqualified)` : ""}. All scores and notes in this
                session will be permanently deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmLoading}>Keep scoring</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); doAbandonSession(); }}
                disabled={confirmLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {confirmLoading ? "Abandoning…" : "Abandon session"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDQDialog} onOpenChange={setShowDQDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disqualify this participant?</AlertDialogTitle>
              <AlertDialogDescription>
                Chest #{meta.chest}{meta.group ? ` · ${meta.group}` : ""} will be removed from scoring and excluded from submission.
                This is session-local only and can be restored from the quick-nav grid. Scored participants cannot be disqualified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={dqLoading}>Keep participant</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); participant && doDisqualifyTeam(participant.team_id); }}
                disabled={dqLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {dqLoading ? "Disqualifying…" : "Disqualify"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finish with {pendingParticipants.length} skipped?</AlertDialogTitle>
              <AlertDialogDescription>
                {scoredCount} scored · {pendingParticipants.length} skipped · {disqualifiedCount} already disqualified.
                Proceeding will mark the skipped participant(s) as <strong>Disqualified</strong> and continue to ranking preview with {scoredCount} to submit:
                <span className="mt-2 block max-h-32 overflow-y-auto rounded border border-border bg-muted px-2 py-1 font-mono text-xs">
                  {pendingParticipants.map((p) => `#${p.chest_no || "—"}`).join(", ")}
                </span>
                Go back to score them instead, or proceed to disqualify and submit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={finishLoading}>Go back & score</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); doFinishProceed(); }}
                disabled={finishLoading || scoredCount === 0}
                className="bg-destructive hover:bg-destructive/90"
              >
                {finishLoading ? "Disqualifying…" : `Proceed — disqualify ${pendingParticipants.length} & submit`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  // ─── RENDER: Preview (ranking) ────────────────────────────────────────────
  if (viewState === VIEW.PREVIEW) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" size="sm" onClick={backToQueue} className="self-start -ml-2 gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> All work
          </Button>
          <CardTitle>
            {sessionMeta?.event?.title || sessionMeta?.event?.name || "Event"} · Round {selectedRound}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isRankMode ? "Rank" : "Ranking"} Preview · {ranking.length} participant(s) · {isRankMode ? "ranks are final positions — check order before submitting" : "check for ties and typos before submitting"}
          </p>
        </CardHeader>

        <CardContent>
          <ErrorBanner message={error} />

          {disqualifiedCount > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
              <Ban className="h-4 w-4 shrink-0" />
              <span>{disqualifiedCount} participant(s) disqualified — excluded from submission. Submitting {ranking.length} score(s).</span>
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
                  <TableHead className="text-right text-muted-foreground">{isRankMode ? "Rank" : "Score"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((r, idx) => {
                  const tied = !isRankMode && idx > 0 && Number(r.total_score) === Number(ranking[idx - 1]?.total_score);
                  return (
                    <TableRow
                      key={`${r.chest_no}-${idx}`}
                      className={`border-border ${idx === 0 ? "bg-accent-amber/5" : ""}`}
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            idx === 0 ? "bg-accent-amber/10 text-accent-amber" :
                            idx === 1 ? "bg-muted text-muted-foreground" :
                            idx === 2 ? "bg-accent-amber/10 text-accent-amber" :
                            "bg-transparent text-muted-foreground"
                          }`}>
                            {r.rank}
                          </span>
                          {tied && <Badge variant="outline" className="text-[10px]">Tie</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-card-foreground">#{r.chest_no || "—"}</TableCell>
                      {!sessionMeta?.event?.enable_blind_judging && (
                        <TableCell className="text-card-foreground">{r.group_name || r.team_name || "—"}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <span className={`font-bold text-lg ${idx < 3 ? "text-accent-amber" : "text-card-foreground"}`}>
                          {isRankMode ? `#${r.rank}` : Number(r.total_score ?? 0).toFixed(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleBackToEdit}
              disabled={session?.status === "submitted"}
              className={`gap-2 font-bold ${isMobile ? "min-h-[48px]" : ""}`}
              title={session?.status === "submitted" ? "Session already submitted — reopen to edit" : "Back to scoring"}
            >
              <ChevronLeft className="h-4 w-4" /> Back to Edit
            </Button>
            <Button
              onClick={handleCompleteSession}
              disabled={sessionActionLoading || session?.status === "submitted"}
              className={`gap-2 font-bold ${isMobile ? "min-h-[48px]" : ""}`}
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
            Submitting will create {ranking.length} ScoreSheet record(s){disqualifiedCount > 0 ? ` (${disqualifiedCount} disqualified excluded)` : ""} and send them to the organizer for review and final approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── RENDER: Submitted ────────────────────────────────────────────────────
  if (viewState === VIEW.SUBMITTED) {
    const scoredTotal = submittedInfo?.score_count ?? ranking?.length ?? session?.participants?.length ?? 0;
    return (
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-accent-green" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-card-foreground">
            Session Submitted
          </h2>
          <p className="text-sm mb-2 text-muted-foreground">
            {sessionMeta?.event?.title || sessionMeta?.event?.name || "Event"} · Round {selectedRound} · All {isRankMode ? "ranks" : "scores"} recorded
          </p>
          <p className="text-sm mb-2 text-muted-foreground">
            {scoredTotal} participant(s) {isRankMode ? "ranked" : "scored"}{(submittedInfo?.disqualified_count || disqualifiedCount) > 0 ? ` · ${submittedInfo?.disqualified_count || disqualifiedCount} disqualified (excluded)` : ""}. {isRankMode ? "Ranks" : "Scores"} are now with the organizer for review.
          </p>
          {submittedInfo?.submitted_at && (
            <p className="text-xs mb-6 text-muted-foreground">
              Submitted {new Date(submittedInfo.submitted_at).toLocaleString()}
            </p>
          )}
          {!(submittedInfo?.submitted_at) && <div className="mb-6" />}
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={() => setViewState(VIEW.PREVIEW)}
              className={`gap-1 font-bold ${isMobile ? "min-h-[48px]" : ""}`}
            >
              <Trophy className="h-4 w-4" /> View ranking
            </Button>
            <Button
              onClick={() => setShowReopenDialog(true)}
              variant="outline"
              className={`gap-1 font-bold hover:bg-destructive/10 hover:text-destructive ${isMobile ? "min-h-[48px]" : ""}`}
            >
              Reopen Session (Reset)
            </Button>
            <Button
              onClick={backToQueue}
              className={`font-bold ${isMobile ? "min-h-[48px]" : ""}`}
            >
              Back to My Work
            </Button>
          </div>
        </CardContent>

        <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reopen session?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the {scoredTotal} submitted score sheet(s) for Round {selectedRound} and
                let you re-judge from scratch. The organizer will no longer see these scores.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmLoading}>Keep submission</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); doReopenSession(); }}
                disabled={confirmLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {confirmLoading ? "Reopening…" : "Reopen and reset"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }
};
export default JudgeDashboard;
