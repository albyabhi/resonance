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
} from "lucide-react";
import toast from "react-hot-toast";
import { useMobileMode } from "../utils/useMobileMode";

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
  const [error, setError] = useState("");
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [ranking, setRanking] = useState([]);

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

  useEffect(() => {
    if (token) loadAssignments();
  }, [token, loadAssignments]);

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

  const handleEventChange = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    setSelectedRound(1);
    setSession(null);
    setSessionMeta(null);

    setRanking([]);
    setViewState(VIEW.LOADING);
    if (id) {
      loadSessionInfo(id, 1);
    } else {
      setViewState(VIEW.IDLE);
    }
  };

  const handleRoundChange = (e) => {
    const round = parseInt(e.target.value, 10) || 1;
    setSelectedRound(round);
    setSession(null);
    setSessionMeta(null);
    setRanking([]);
    setError("");
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
      setError(err.message || "Failed to start session");
      toast.error(err.message);
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
    if (!window.confirm("Abandon current session? All progress will be lost.")) return;
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

  // ─── RENDER: Loading ──────────────────────────────────────────────────────
  if (viewState === VIEW.LOADING) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--chart-axis)" }}>
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  // ─── RENDER: Idle (no event selected) ─────────────────────────────────────
  if (viewState === VIEW.IDLE || !selectedEventId) {
    return (
      <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--card-fg)" }}>Judge Dashboard</h2>
          <p className="text-sm" style={{ color: "var(--chart-axis)" }}>
            Select an event and round to start judging.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 mb-3 text-sm">
            {error}
          </div>
        )}

        <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-3 mb-4`}>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--chart-axis)" }}>Assigned Events</label>
            <select
              value={selectedEventId}
              onChange={handleEventChange}
              className={`w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${isMobile ? "min-h-[48px] text-base px-4" : "px-3 py-2 text-sm"}`}
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
            >
              <option value="">Select an event</option>
              {(assignments || []).map((a) => (
                <option key={a._id} value={a.event_id?._id || a.event_id}>
                  {a.event_id?.name || "Unknown Event"}
                </option>
              ))}
            </select>
          </div>
          <div className={`flex ${isMobile ? "" : "items-end"}`}>
            <button
              onClick={handleRefresh}
              className={`w-full border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center gap-1 ${isMobile ? "min-h-[48px] text-base" : "px-3 py-2 text-sm"}`}
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {assignments.length === 0 && (
          <div className="text-center py-8">
            <ClipboardList className="h-10 w-10 mx-auto mb-2" style={{ color: "var(--chart-axis)" }} />
            <p className="text-sm" style={{ color: "var(--chart-axis)" }}>
              No events assigned to you yet. Contact an organizer to get assigned.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: Waiting / Start ──────────────────────────────────────────────
  if (viewState === VIEW.WAITING) {
    const evt = sessionMeta?.event || {};
    const canStart = sessionMeta?.can_start && !session;
    const hasExistingSession = !!session;

    return (
      <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--card-fg)" }}>{evt.name || "Event"}</h2>
          <p className="text-sm" style={{ color: "var(--chart-axis)" }}>
            {evt.category} &middot; {evt.event_type} &middot; Round {selectedRound}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 mb-3 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--chart-axis)" }}>Round</label>
          <select
            value={selectedRound}
            onChange={handleRoundChange}
            className={`w-full max-w-[200px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${isMobile ? "min-h-[48px] text-base px-4" : "px-3 py-2 text-sm"}`}
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            {Array.from({ length: evt.rounds || 1 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Round {i + 1}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="border rounded-lg p-3 text-center" style={{ borderColor: "var(--border-divider)" }}>
            <Users className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--chart-axis)" }} />
            <p className="text-lg font-bold" style={{ color: "var(--card-fg)" }}>{sessionMeta?.participant_count || 0}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>Teams</p>
          </div>
          <div className="border rounded-lg p-3 text-center" style={{ borderColor: "var(--border-divider)" }}>
            <Hash className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--chart-axis)" }} />
            <p className="text-lg font-bold" style={{ color: "var(--card-fg)" }}>{sessionMeta?.teams_without_chest || 0}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>No Chest</p>
          </div>
          <div className="border rounded-lg p-3 text-center" style={{ borderColor: "var(--border-divider)" }}>
            <span className="text-2xl mb-1 block">{evt.status === "judging" ? "✓" : "—"}</span>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>
              {evt.status?.replace(/_/g, " ") || "Status"}
            </p>
          </div>
          <div className="border rounded-lg p-3 text-center" style={{ borderColor: "var(--border-divider)" }}>
            <Trophy className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--chart-axis)" }} />
            <p className="text-lg font-bold" style={{ color: "var(--card-fg)" }}>{evt.rounds || 1}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>Rounds</p>
          </div>
        </div>

        {!sessionMeta?.all_have_chests && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Waiting for chest numbers. An event coordinator must assign chest numbers before judging can begin.</span>
          </div>
        )}

        {["result_pending", "published", "completed", "cancelled"].includes(evt.status) && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Cannot start judging: event is &ldquo;{evt.status?.replace(/_/g, " ")}&rdquo;.</span>
          </div>
        )}

        <div className="border rounded-lg p-4 mb-4" style={{ borderColor: "var(--border-divider)", backgroundColor: "var(--surface)" }}>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--card-fg)" }}>
            Score Scale (max points)
          </label>
          <input
            type="number"
            min={1}
            value={scoreMax}
            onChange={(e) => setScoreMax(Math.max(1, parseInt(e.target.value, 10) || 100))}
            className={`border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${isMobile ? "min-h-[48px] text-base px-4" : "px-3 py-2 text-sm"} max-w-[120px]`}
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
            disabled={hasExistingSession}
          />
          <p className="text-xs mt-1" style={{ color: "var(--chart-axis)" }}>Score range: 0 to {scoreMax}</p>
        </div>

        {hasExistingSession && (
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 rounded-lg px-3 py-2 mb-4 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>You have an existing session for this event. You can resume or abandon it.</span>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {hasExistingSession ? (
            <>
              <button
                onClick={handleResumeSession}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Resume Session
              </button>
              <button
                onClick={handleAbandonSession}
                className="px-6 py-2 border rounded-lg font-bold hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              >
                <X className="h-4 w-4" /> Abandon
              </button>
            </>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={!canStart || sessionActionLoading}
              className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 ${
                canStart
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-gray-200 text-gray-400 dark:bg-gray-800 cursor-not-allowed"
              }`}
            >
              {sessionActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Judging
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Judging (one-by-one) ─────────────────────────────────────────
  if (viewState === VIEW.JUDGING && session) {
    const participant = currentParticipant;
    const isScored = participant?.status === "scored";
    const pct = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0;

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
      <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
        <div className="mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--card-fg)" }}>
                {sessionMeta?.event?.name || "Event"} &middot; Round {selectedRound}
              </h2>
              <p className="text-sm" style={{ color: "var(--chart-axis)" }}>
                {scoredCount} of {totalCount} scored
              </p>
            </div>
            <button
              onClick={handleAbandonSession}
              className="text-xs px-3 py-1.5 border rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center gap-1"
              style={{ borderColor: "var(--border-divider)", color: "var(--chart-axis)" }}
            >
              <X className="h-3 w-3" /> Abandon
            </button>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 mb-3 text-sm">
            {error}
          </div>
        )}

        <div className="border-2 rounded-xl p-4 sm:p-6 mb-4 transition-all" style={{
          borderColor: isScored ? "var(--border-divider)" : "#ea580c",
          backgroundColor: "var(--surface)",
        }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--chart-axis)" }}>
              Participant {session.current_index + 1} of {totalCount}
            </p>
            {isScored && (
              <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Scored
              </span>
            )}
          </div>

          <div className="text-center mb-4">
            <p className="text-3xl font-bold" style={{ color: "var(--card-fg)" }}>
              Chest #{meta.chest}
            </p>
            {meta.group && (
              <p className="text-sm mt-1" style={{ color: "var(--chart-axis)" }}>
                {meta.group}{meta.team ? ` — ${meta.team}` : ""}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--card-fg)" }}>
              Score (out of {scoreMax})
            </label>
            <input
              type="number"
              min={0}
              max={scoreMax}
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleScoreAction("score"); }}
              className={`w-full border-2 rounded-lg text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 ${isMobile ? "min-h-[56px] text-2xl px-4" : "py-3 text-xl"}`}
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              placeholder={`0 – ${scoreMax}`}
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--chart-axis)" }}>
              Notes (optional)
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className={`w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${isMobile ? "min-h-[44px] text-base px-4" : "px-3 py-2 text-sm"}`}
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              placeholder="Optional notes..."
            />
          </div>

          <div className={`flex gap-3 ${isMobile ? "flex-col" : "flex-row"}`}>
            <button
              onClick={() => handleNavigate("prev")}
              disabled={session.current_index === 0}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 border rounded-lg font-medium disabled:opacity-30 ${
                isMobile ? "min-h-[44px] text-base" : "text-sm"
              }`}
              style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            <button
              onClick={() => handleScoreAction("score")}
              disabled={sessionActionLoading}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold text-white ${
                isMobile ? "min-h-[48px] text-base" : "text-sm"
              } ${isScored ? "bg-orange-500 hover:bg-orange-600" : "bg-orange-600 hover:bg-orange-700"}`}
            >
              {sessionActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>{isScored ? "Update Score" : "Save & Next"} <ChevronRight className="h-4 w-4" /></>
              )}
            </button>

            <button
              onClick={() => handleScoreAction("skip")}
              disabled={sessionActionLoading}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 border rounded-lg font-medium ${
                isMobile ? "min-h-[44px] text-base" : "text-sm"
              }`}
              style={{ borderColor: "var(--border-divider)", color: "var(--chart-axis)" }}
            >
              <SkipForward className="h-4 w-4" /> Skip
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>
              Quick Nav &middot; {scoredCount}/{totalCount}
            </p>
            {scoredCount === totalCount && (
              <button
                onClick={handleViewRanking}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Trophy className="h-3 w-3" /> View Ranking
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {session.participants.map((p, idx) => {
              const isCurrent = idx === session.current_index;
              const isScoredP = p.status === "scored";
              let btnClass = "min-w-[32px] h-8 rounded text-xs font-bold border transition-all";
              if (isCurrent && isScoredP) {
                btnClass += " bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-500/20 dark:border-orange-400 dark:text-orange-400";
              } else if (isCurrent) {
                btnClass += " bg-orange-500 text-white border-orange-500";
              } else if (isScoredP) {
                btnClass += " bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400";
              } else {
                btnClass += " border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500";
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleNavigate("goto", idx)}
                  className={btnClass}
                  title={`${p.chest_no || `#${idx + 1}`} — ${isScoredP ? "Scored" : "Pending"}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Preview (ranking) ────────────────────────────────────────────
  if (viewState === VIEW.PREVIEW) {
    return (
      <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--card-fg)" }}>
            {sessionMeta?.event?.name || "Event"} &middot; Round {selectedRound}
          </h2>
          <p className="text-sm" style={{ color: "var(--chart-axis)" }}>
            Ranking Preview &middot; {ranking.length} participant(s)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 mb-3 text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border mb-4" style={{ borderColor: "var(--border-divider)" }}>
          <table className="min-w-full">
            <thead>
              <tr className="border-b" style={{ borderBottomColor: "var(--border-divider)" }}>
                <th className="p-3 text-left text-xs uppercase font-semibold" style={{ color: "var(--chart-axis)" }}>Rank</th>
                <th className="p-3 text-left text-xs uppercase font-semibold" style={{ color: "var(--chart-axis)" }}>Chest #</th>
                {!sessionMeta?.event?.enable_blind_judging && (
                  <th className="p-3 text-left text-xs uppercase font-semibold" style={{ color: "var(--chart-axis)" }}>Group</th>
                )}
                <th className="p-3 text-right text-xs uppercase font-semibold" style={{ color: "var(--chart-axis)" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, idx) => (
                <tr
                  key={idx}
                  className="border-t"
                  style={{ borderTopColor: "var(--border-divider)", backgroundColor: idx === 0 ? "rgba(234,88,12,0.05)" : "transparent" }}
                >
                  <td className="p-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      idx === 0 ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" :
                      idx === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400" :
                      idx === 2 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                      "bg-transparent text-gray-500"
                    }`}>
                      {r.rank}
                    </span>
                  </td>
                  <td className="p-3 font-semibold" style={{ color: "var(--card-fg)" }}>#{r.chest_no || "—"}</td>
                  {!sessionMeta?.event?.enable_blind_judging && (
                    <td className="p-3" style={{ color: "var(--card-fg)" }}>{r.group_name || r.team_name || "—"}</td>
                  )}
                  <td className="p-3 text-right">
                    <span className="font-bold text-lg" style={{ color: idx < 3 ? "#ea580c" : "var(--card-fg)" }}>
                      {r.total_score?.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleBackToEdit}
            className="px-6 py-2 border rounded-lg font-bold flex items-center gap-2"
            style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
          >
            <ChevronLeft className="h-4 w-4" /> Back to Edit
          </button>
          <button
            onClick={handleCompleteSession}
            disabled={sessionActionLoading}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 flex items-center gap-2"
          >
            {sessionActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {sessionActionLoading ? "Submitting..." : "Confirm & Submit"}
          </button>
        </div>

        <p className="text-xs mt-3" style={{ color: "var(--chart-axis)" }}>
          Submitting will create ScoreSheet records and send them to the organizer for review and final approval.
        </p>
      </div>
    );
  }

  // ─── RENDER: Submitted ────────────────────────────────────────────────────
  if (viewState === VIEW.SUBMITTED) {
    return (
      <div className="rounded-xl shadow-sm p-4 border text-center" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
        <div className="py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--card-fg)" }}>
            Session Submitted
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--chart-axis)" }}>
            {sessionMeta?.event?.name || "Event"} &middot; Round {selectedRound} &middot; All scores recorded
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--chart-axis)" }}>
            {ranking.length} participant(s) scored. Scores are now with the organizer for review.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSelectedEventId("");
                setSession(null);
                setSessionMeta(null);
                setRanking([]);
                setError("");
                setViewState(VIEW.IDLE);
              }}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700"
            >
              Back to Dashboard
            </button>
            <button
              onClick={loadAssignments}
              className="px-6 py-2 border rounded-lg font-bold"
              style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
            >
              <RefreshCw className="h-4 w-4 inline mr-1" /> Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default JudgeDashboard;
