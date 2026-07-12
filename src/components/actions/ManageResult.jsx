import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../ui/select";
import {
  AlertDialog, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction,
} from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageResult = () => {
  const { hasAnyRole } = usePermission();
  const { token, user, competition } = useAuth();
  const { groupLabel = "House" } = useCompetition() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [events, setEvents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [teams, setTeams] = useState([]);

  const [eventId, setEventId] = useState("");
  const [roundNo, setRoundNo] = useState("");
  const [query, setQuery] = useState("");

  const [placements, setPlacements] = useState({});
  const [lockedPositions, setLockedPositions] = useState(new Set());
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const coordinatorHouseId =
    user?.house?._id || user?.house?.id || user?.house || null;

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });
  };

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError("");
        const competitionId = competition?._id || competition?.id || competition?.competition_id;
        const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";
        const { events } = await apiCall(`/api/event${competitionQuery}`);
        setEvents(events || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) loadEvents();
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const loadEventData = async () => {
      setSchedules([]);
      setTeams([]);
      setRoundNo("");
      setPlacements({});
      setLockedPositions(new Set());
      setTeamsLoaded(false);

      if (!eventId) return;

      try {
        setLoading(true);
        setError("");

        const { schedules } = await apiCall(`/api/schedule?event_id=${eventId}`);
        const sorted = (schedules || []).sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
        if (cancelled) return;
        setSchedules(sorted);
        const firstRound = sorted.length ? String(sorted[0].round_no) : "";
        setRoundNo(firstRound);

        let tResp = null;
        try {
          tResp = await apiCall(`/api/team?event_id=${eventId}`);
        } catch {
          tResp = { success: false, data: [] };
        }
        if (cancelled) return;
        const baseTeams = (tResp.data || []).map((t) => ({
          _id: t._id,
          chest_no: t.chest_no || "",
          houseId: t.group_id?._id || t.group_id || "",
          houseName: t.group_id?.name || "",
          houseCode: "",
          members: t.members || [],
        }));
        const scoped =
          hasAnyRole("judge", "event_coordinator") && !hasAnyRole("organizer", "super_admin") && coordinatorHouseId
            ? baseTeams.filter((t) => String(t.houseId) === String(coordinatorHouseId))
            : baseTeams;

        if (cancelled) return;
        setTeams(scoped);
        setTeamsLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadEventData();
    return () => {
      cancelled = true;
    };
  }, [eventId, coordinatorHouseId, hasAnyRole]);

  const loadResultsForRound = async (evtId, rnd) => {
    const response = await apiCall(`/api/results?event_id=${evtId}&round_no=${rnd}`);
    const results = response.results || response.data || [];
    const serverMap = {};
    const locks = new Set();
    (results || []).forEach((r) => {
      const teamId = r.team_id?._id || r.team_id;
      serverMap[r.position] = teamId;
      if (["submitted", "approved", "published", "locked"].includes(r.status)) {
        locks.add(r.position);
      }
    });
    setPlacements((prev) => ({ ...serverMap, ...prev }));
    setLockedPositions(locks);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!eventId || !roundNo || !teamsLoaded) return;
      try {
        await loadResultsForRound(eventId, parseInt(roundNo, 10));
      } catch {
        if (!cancelled) {
          setLockedPositions(new Set());
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [eventId, roundNo, teamsLoaded]);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => {
      const membersStr = (t.members || [])
        .map((m) => `${m.name} ${m.class}`)
        .join(" ")
        .toLowerCase();
      return (
        String(t.chest_no || "").toLowerCase().includes(q) ||
        (t.houseName || "").toLowerCase().includes(q) ||
        (t.houseCode || "").toLowerCase().includes(q) ||
        membersStr.includes(q)
      );
    });
  }, [teams, query]);

  const setPlacement = (position, teamId) => {
    if (lockedPositions.has(position)) return;
    setPlacements((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((pos) => {
        if (next[pos] === teamId) next[pos] = undefined;
      });
      next[position] = teamId || undefined;
      return next;
    });
  };

  const clearPlacement = (position) => {
    if (lockedPositions.has(position)) return;
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[position];
      return next;
    });
  };

  const submitResults = async () => {
    try {
      if (!eventId || !roundNo) {
        setError("Select event and round");
        return;
      }

      const selected = Object.entries(placements)
        .filter(([pos, team_id]) => !!team_id && !lockedPositions.has(parseInt(pos, 10)))
        .map(([position, team_id]) => ({
          position: parseInt(position, 10),
          team_id,
        }));
      if (selected.length === 0) {
        setError("All positions are already submitted or no new placements selected");
        return;
      }

      setLoading(true);
      setError("");

      const payload = {
        event_id: eventId,
        round_no: parseInt(roundNo, 10),
        placements: selected,
      };
      await apiCall("/api/results", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await loadResultsForRound(eventId, parseInt(roundNo, 10));
      setSuccessMessage("Results submitted for approval");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Results</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select event and round, assign placements, and submit for approval
        </p>
        {hasAnyRole("judge", "event_coordinator") && coordinatorHouseId && !hasAnyRole("organizer", "super_admin") && (
          <p className="text-xs mt-1 text-muted-foreground">
            {groupLabel} restricted: only teams from assigned {groupLabel.toLowerCase()} are visible
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Event</label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {(events || []).map((e) => {
                  const id = e._id || e.event_id;
                  return (
                    <SelectItem key={id} value={id}>
                      {e.name} • {e.event_type} • {e.mode}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Round</label>
            <Select value={roundNo} onValueChange={setRoundNo} disabled={!schedules.length}>
              <SelectTrigger>
                <SelectValue placeholder="Select round" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((r) => (
                  <SelectItem key={r._id || r.round_no} value={String(r.round_no)}>
                    Round {r.round_no} • {r.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Search team or participant</label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Chest no., ${groupLabel.toLowerCase()}, participant name/class`}
            />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-card-foreground">Placements</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((pos) => {
              const teamId = placements[pos];
              const team = teams.find((t) => t._id === teamId);
              const locked = lockedPositions.has(pos);
              return (
                <div key={pos} className={`border rounded-lg p-3 ${locked ? 'bg-muted' : 'bg-card'} border-border text-card-foreground`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Position</span>
                    <span className="font-semibold">
                      {pos} {locked && <Badge variant="secondary" className="ml-2">Locked</Badge>}
                    </span>
                  </div>
                  {team ? (
                    <div className="text-sm">
                      <div className="font-medium text-card-foreground">
                        {team.chest_no ? `Chest #${team.chest_no}` : "No chest"}
                      </div>
                      <div className="text-muted-foreground">
                        {team.houseName} {team.houseCode ? `(${team.houseCode})` : ""}
                      </div>
                      {Array.isArray(team.members) && team.members.length > 0 && (
                        <ul className="mt-2 pl-4 list-disc text-xs text-muted-foreground">
                          {team.members.map((m) => (
                            <li key={m._id}>
                              {m.name} • {m.class}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!locked && (
                        <Button variant="ghost" size="sm" onClick={() => clearPlacement(pos)} className="mt-2 text-destructive">
                          Clear
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Not assigned</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader className="px-3 py-2 border-b border-border">
            <CardTitle className="text-sm font-medium">Eligible Teams</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto p-0">
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : filteredTeams.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No teams found</div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredTeams.map((t) => {
                  const selectedPos = Object.entries(placements).find(([, id]) => id === t._id)?.[0] || "";
                  return (
                    <li key={t._id} className="p-3 text-sm border-b border-border last:border-0 text-card-foreground">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-card-foreground">
                            {t.chest_no ? `Chest #${t.chest_no}` : "No chest"}
                          </div>
                          <div className="text-muted-foreground">
                            {t.houseName} {t.houseCode ? `(${t.houseCode})` : ""}
                          </div>
                          {Array.isArray(t.members) && t.members.length > 0 && (
                            <ul className="mt-1 pl-4 list-disc text-xs text-muted-foreground">
                              {t.members.map((m) => (
                                <li key={m._id}>
                                  {m.name} • {m.class}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedPos}
                            onValueChange={(val) => {
                              const p = parseInt(val, 10);
                              if (!p) return;
                              setPlacement(p, t._id);
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {[1, 2, 3, 4, 5].map((p) => (
                                <SelectItem
                                  key={p}
                                  value={String(p)}
                                  disabled={lockedPositions.has(p) || (!!placements[p] && placements[p] !== t._id)}
                                >
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => setPlacements({})} className="flex-1">
            Clear All
          </Button>
          <Button
            disabled={loading || !eventId || !roundNo}
            onClick={submitResults}
            className="flex-1 bg-accent-amber text-white hover:bg-accent-amber/90 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={!!successMessage} onOpenChange={(open) => { if (!open) setSuccessMessage(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Success</AlertDialogTitle>
            <AlertDialogDescription>{successMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setSuccessMessage("")}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ManageResult;
