import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Trash2, RotateCcw, Search, RefreshCw, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
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

const STATUS_FILTERS = ["all", "draft", "submitted", "confirmed", "published", "rescored"];

const MyScores = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sheets, setSheets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingClear, setPendingClear] = useState(null);
  const [pendingRescore, setPendingRescore] = useState(null);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  const loadSheets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await apiCall("/api/judge/scores");
      setSheets(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (token) loadSheets();
  }, [token, loadSheets]);

  const doClearDraft = async () => {
    if (!pendingClear) return;
    try {
      setActionLoading(true);
      await apiCall(`/api/judge/scores/${pendingClear._id}`, {
        method: "PATCH",
        body: JSON.stringify({ scores: [], status: "draft" }),
      });
      toast.success("Draft score cleared");
      setPendingClear(null);
      await loadSheets();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const doRescore = async () => {
    if (!pendingRescore) return;
    try {
      setActionLoading(true);
      await apiCall(`/api/judge/scores/${pendingRescore._id}/rescore`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success("Moved back to draft for re-scoring");
      setPendingRescore(null);
      await loadSheets();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      draft: "secondary",
      submitted: "success",
      confirmed: "success",
      published: "outline",
      rescored: "outline",
    };
    const labelMap = {
      submitted: "Submitted",
      confirmed: "Confirmed",
      published: "Published",
      rescored: "Re-scored",
    };
    const className = status === "published" ? "text-accent-blue border-accent-blue/20 bg-accent-blue-tint" : status === "confirmed" ? "text-accent-green border-accent-green/20 bg-accent-green/10" : "";
    return <Badge variant={map[status] || "outline"} className={className}>{labelMap[status] || status}</Badge>;
  };

  const eventOptions = useMemo(() => {
    const map = new Map();
    for (const s of sheets) {
      const id = String(s.event_id?._id || s.event_id || "");
      const title = s.event_id?.title || s.event_id?.name || "Event";
      if (id && !map.has(id)) map.set(id, title);
    }
    return [...map.entries()];
  }, [sheets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sheets.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (eventFilter !== "all" && String(s.event_id?._id || s.event_id) !== eventFilter) return false;
      if (!q) return true;
      const chest = String(s.chest_no || s.team_id?.chest_no || "").toLowerCase();
      const title = String(s.event_id?.title || s.event_id?.name || "").toLowerCase();
      return chest.includes(q) || title.includes(q);
    });
  }, [sheets, search, statusFilter, eventFilter]);

  const counts = useMemo(() => {
    const c = { all: sheets.length };
    for (const f of STATUS_FILTERS.slice(1)) c[f] = sheets.filter((s) => s.status === f).length;
    return c;
  }, [sheets]);

  const canRescore = (s) => ["submitted", "confirmed", "published", "rescored"].includes(s.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>My Scores</CardTitle>
            <CardDescription>
              Your submitted, draft, confirmed, published, and rescored score sheets. Scores move to the organizer for review after you submit a session.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadSheets} disabled={loading} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event or chest #…"
              className="pl-9"
              aria-label="Search score sheets"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {eventOptions.map(([id, title]) => (
                <SelectItem key={id} value={id}>{title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className="capitalize"
            >
              {f === "all" ? "All" : f} ({counts[f] ?? 0})
            </Button>
          ))}
        </div>

        {loading ? null : sheets.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              No scores yet. Open Judge Dashboard to start scoring your assigned events.
            </p>
            <Button size="sm" onClick={() => navigate("/dashboard/judge-dashboard")}>
              Go to Judge Dashboard
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No sheets match these filters.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Chest #</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Score / Rank</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>{s.event_id?.title || s.event_id?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{(s.judging_type || s.event_id?.scoring_type || "score") === "rank" ? "Rank" : "Score"}</Badge></TableCell>
                      <TableCell>
                        {s.chest_no || s.team_id?.chest_no || "—"}
                      </TableCell>
                      <TableCell>{s.round_no || 1}</TableCell>
                      <TableCell className="font-medium">
                        {(s.judging_type || s.event_id?.scoring_type || "score") === "rank"
                          ? (s.rank != null ? `#${s.rank}` : "—")
                          : (s.total_score?.toFixed(1) || "—")}
                      </TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.submitted_at
                          ? new Date(s.submitted_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {s.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingClear(s)}
                              title="Clear draft"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {canRescore(s) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingRescore(s)}
                              title="Request re-score (moves back to draft)"
                              className="gap-1 text-xs"
                            >
                              <RotateCcw className="h-3 w-3" /> Rescore
                            </Button>
                          )}
                          {s.status === "rescored" && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <RotateCcw className="h-3 w-3" /> Rescored
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {filtered.map((s) => (
                <div key={s._id} className="border border-border rounded-xl p-3 bg-card">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm truncate">{s.event_id?.title || s.event_id?.name || "Event"}</p>
                    {statusBadge(s.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Chest #{s.chest_no || s.team_id?.chest_no || "—"} · Round {s.round_no || 1} · {(s.judging_type || s.event_id?.scoring_type || "score") === "rank" ? "Rank" : "Score"} ·{" "}
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "Not submitted"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{(s.judging_type || s.event_id?.scoring_type || "score") === "rank" ? (s.rank != null ? `#${s.rank}` : "—") : (s.total_score?.toFixed(1) || "—")}</span>
                    <div className="flex items-center gap-1">
                      {s.status === "draft" && (
                        <Button variant="outline" size="sm" onClick={() => setPendingClear(s)} className="gap-1">
                          <Trash2 className="h-3.5 w-3.5" /> Clear
                        </Button>
                      )}
                      {canRescore(s) && (
                        <Button variant="outline" size="sm" onClick={() => setPendingRescore(s)} className="gap-1">
                          <RotateCcw className="h-3.5 w-3.5" /> Rescore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={!!pendingClear} onOpenChange={(o) => !o && setPendingClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Chest #{pendingClear?.chest_no || pendingClear?.team_id?.chest_no || "—"} · Round {pendingClear?.round_no || 1}.
              The draft score will be emptied. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doClearDraft(); }}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? "Clearing…" : "Clear draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingRescore} onOpenChange={(o) => !o && setPendingRescore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move back to draft for re-scoring?</AlertDialogTitle>
            <AlertDialogDescription>
              Chest #{pendingRescore?.chest_no || pendingRescore?.team_id?.chest_no || "—"} · Round {pendingRescore?.round_no || 1}.
              The current {pendingRescore?.status} sheet will be marked re-scored and a fresh draft will be created. Use Judge Dashboard to enter the new score.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doRescore(); }} disabled={actionLoading}>
              {actionLoading ? "Moving…" : "Move to draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default MyScores;
