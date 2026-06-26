// src/components/ManageResult.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageResult = () => {
  const { hasAnyRole } = usePermission();
  const { token, user, competition } = useAuth(); // expects user.house?._id for scoped submissions
  const { groupLabel = "House", groupLabelPlural = "Houses" } = useCompetition() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data
  const [events, setEvents] = useState([]);
  const [schedules, setSchedules] = useState([]); // rounds for selected event
  const [teams, setTeams] = useState([]); // [{ _id, chest_no, houseId, houseName, houseCode, members: [{_id,name,class}] }]

  // Selections
  const [eventId, setEventId] = useState("");
  const [roundNo, setRoundNo] = useState("");
  const [query, setQuery] = useState("");

  // Placements: position -> team_id
  const [placements, setPlacements] = useState({}); // {1: team_id, 2: team_id, ...}

  // Server results snapshot and lock set
  const [serverResults, setServerResults] = useState([]); // [{position, team_id, status}]
  const [lockedPositions, setLockedPositions] = useState(new Set()); // positions not editable

  // Readiness flags to avoid flicker/races
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  // Coordinator’s assigned house
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

  // Load events on mount
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

  // Load schedules and teams when event changes
  useEffect(() => {
    let cancelled = false;
    const loadEventData = async () => {
      // reset state for new event
      setSchedules([]);
      setTeams([]);
      setRoundNo("");
      setPlacements({});
      setServerResults([]);
      setLockedPositions(new Set());
      setTeamsLoaded(false);

      if (!eventId) return;

      try {
        setLoading(true);
        setError("");

        // 1) Schedules
        const { schedules } = await apiCall(`/api/schedule?event_id=${eventId}`);
        const sorted = (schedules || []).sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
        if (cancelled) return;
        setSchedules(sorted);
        const firstRound = sorted.length ? String(sorted[0].round_no) : "";
        setRoundNo(firstRound);

        // 2) Teams
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

        const withMembers = await Promise.all(
          scoped.map(async (t) => {
            try {
              const members = t.members;
              return { ...t, members: members || [] };
            } catch {
              return { ...t, members: [] };
            }
          })
        );
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

  // Load server results snapshot for event+round and lock those positions
  const loadResultsForRound = async (evtId, rnd) => {
    const response = await apiCall(`/api/results?event_id=${evtId}&round_no=${rnd}`);
    const results = response.results || response.data || [];
    setServerResults(results || []);
    const serverMap = {};
    const locks = new Set();
    (results || []).forEach((r) => {
      const teamId = r.team_id?._id || r.team_id;
      serverMap[r.position] = teamId;
      if (["submitted", "approved", "published", "locked"].includes(r.status)) {
        locks.add(r.position);
      }
    });
    // Merge server placements with current without clearing
    setPlacements((prev) => ({ ...serverMap, ...prev }));
    setLockedPositions(locks);
  };

  // When teams loaded and round selected, fetch server results and apply locks
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!eventId || !roundNo || !teamsLoaded) return;
      try {
        await loadResultsForRound(eventId, parseInt(roundNo, 10));
      } catch (e) {
        if (!cancelled) {
          setServerResults([]);
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

  const positions = [1, 2, 3, 4, 5];

  const setPlacement = (position, teamId) => {
    if (lockedPositions.has(position)) return; // locked by server
    setPlacements((prev) => {
      const next = { ...prev };
      // remove team from any other position
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
     

      // Submit only new (unlocked) placements
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

      // Refetch server results and locks
      await loadResultsForRound(eventId, parseInt(roundNo, 10));
      alert("Results submitted for approval");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedEvent = useMemo(
    () => (events || []).find((e) => (e._id || e.event_id) === eventId) || null,
    [events, eventId]
  );

  return (
    <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>Enter Results</h2>
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>
          Select event and round, assign placements, and submit for approval
        </p>
        {hasAnyRole("judge", "event_coordinator") && coordinatorHouseId && !hasAnyRole("organizer", "super_admin") && (
          <p className="text-xs mt-1" style={{ color: 'var(--chart-axis)' }}>
            {groupLabel} restricted: only teams from assigned {groupLabel.toLowerCase()} are visible
          </p>
        )}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      {/* Event selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Event</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          >
            <option value="" className="bg-white dark:bg-[#0B1220]">Select event</option>
            {(events || []).map((e) => {
              const id = e._id || e.event_id;
              return (
                <option key={id} value={id} className="bg-white dark:bg-[#0B1220]">
                  {e.name} • {e.event_type} • {e.mode}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Round</label>
          <select
            value={roundNo}
            onChange={(e) => setRoundNo(e.target.value)}
            disabled={!schedules.length}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 text-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          >
            <option value="" className="bg-white dark:bg-[#0B1220]">Select round</option>
            {schedules.map((r) => (
              <option key={r._id || r.round_no} value={r.round_no} className="bg-white dark:bg-[#0B1220]">
                Round {r.round_no} • {r.status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Search team or participant</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Chest no., ${groupLabel.toLowerCase()}, participant name/class`}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          />
        </div>
      </div>

      {/* Placements board */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2" style={{ color: 'var(--card-fg)' }}>Placements</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((pos) => {
            const teamId = placements[pos];
            const team = teams.find((t) => t._id === teamId);
            const locked = lockedPositions.has(pos);
            return (
              <div key={pos} className="border rounded-lg p-3" style={{ backgroundColor: locked ? 'var(--surface)' : 'var(--card)', borderColor: 'var(--border-card)', color: 'var(--card-fg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--chart-axis)' }}>Position</span>
                  <span className="font-semibold">
                    {pos} {locked ? <span className="ml-2 text-xs" style={{ color: 'var(--chart-axis)' }}>Locked</span> : null}
                  </span>
                </div>
                {team ? (
                  <div className="text-sm">
                    <div className="font-medium" style={{ color: 'var(--card-fg)' }}>
                      {team.chest_no ? `Chest #${team.chest_no}` : "No chest"}
                    </div>
                    <div style={{ color: 'var(--chart-axis)' }}>
                      {team.houseName} {team.houseCode ? `(${team.houseCode})` : ""}
                    </div>
                    {Array.isArray(team.members) && team.members.length > 0 && (
                      <ul className="mt-2 pl-4 list-disc text-xs" style={{ color: 'var(--chart-axis)' }}>
                        {team.members.map((m) => (
                          <li key={m._id}>
                            {m.name} • {m.class}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => clearPlacement(pos)}
                        className="mt-2 text-xs text-red-600 dark:text-red-400"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-sm" style={{ color: 'var(--chart-axis)' }}>Not assigned</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Teams list with members */}
      <div className="border rounded-lg" style={{ borderColor: 'var(--border-divider)' }}>
        <div className="px-3 py-2 border-b text-sm font-medium" style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>Eligible Teams</div>
        <ul className="max-h-80 overflow-y-auto divide-y" style={{ backgroundColor: 'var(--card)', divideColor: 'var(--border-divider)' }}>
          {loading ? (
            <li className="p-3 text-sm" style={{ color: 'var(--chart-axis)' }}>Loading…</li>
          ) : filteredTeams.length === 0 ? (
            <li className="p-3 text-sm" style={{ color: 'var(--chart-axis)' }}>No teams found</li>
          ) : (
            filteredTeams.map((t) => {
              const selectedPos = Object.entries(placements).find(([, id]) => id === t._id)?.[0] || "";
              return (
                <li key={t._id} className="p-3 text-sm border-b last:border-0" style={{ borderBottomColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium" style={{ color: 'var(--card-fg)' }}>
                        {t.chest_no ? `Chest #${t.chest_no}` : "No chest"}
                      </div>
                      <div style={{ color: 'var(--chart-axis)' }}>
                        {t.houseName} {t.houseCode ? `(${t.houseCode})` : ""}
                      </div>
                      {Array.isArray(t.members) && t.members.length > 0 && (
                        <ul className="mt-1 pl-4 list-disc text-xs" style={{ color: 'var(--chart-axis)' }}>
                          {t.members.map((m) => (
                            <li key={m._id}>
                              {m.name} • {m.class}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedPos}
                        onChange={(e) => {
                          const p = parseInt(e.target.value || "0", 10);
                          if (!p) return;
                          setPlacement(p, t._id);
                        }}
                        className="px-2 py-1 border rounded text-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                      >
                        <option value="" className="bg-white dark:bg-[#0B1220]">Set position</option>
                        {[1, 2, 3, 4, 5].map((p) => (
                          <option className="bg-white dark:bg-[#0B1220]"
                            key={p}
                            value={p}
                            disabled={lockedPositions.has(p) || (!!placements[p] && placements[p] !== t._id)}
                          >
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Submit */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={() => setPlacements({})}
          className="flex-1 px-4 py-3 border rounded-lg hover:bg-indigo-500/5 transition text-sm font-medium"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
        >
          Clear All
        </button>
        <button
          type="button"
          disabled={loading || !eventId || !roundNo}
          onClick={submitResults}
          className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
};

export default ManageResult;
