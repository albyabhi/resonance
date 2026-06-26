import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";
import { useRealtime } from "../../context/RealtimeContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const PendingResult = () => {
  const { token, role, competition } = useAuth();
  const { groupLabel = "House", groupLabelPlural = "Houses" } = useCompetition() || {};
  const { hasAnyRole } = usePermission();
  const { lastUpdate } = useRealtime() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [rounds, setRounds] = useState([]);
  const [roundNo, setRoundNo] = useState("");
  const [pending, setPending] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembersMap, setTeamMembersMap] = useState({});

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    });
  };

  const loadEvents = async () => {
    const competitionId = competition?._id || competition?.id || competition?.competition_id;
    const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";
    const { events } = await apiCall(`/api/event${competitionQuery}`);
    setEvents(events || []);
  };

  const fetchMembersForTeams = async (teamList) => {
    const map = {};
    await Promise.all(
      teamList.map(async (t) => {
        try {
          const { members } = await apiCall(`/api/team/${t._id}/members`);
          map[t._id] = members || [];
        } catch {
          map[t._id] = [];
        }
      })
    );
    return map;
  };

  const loadContext = async (evtId) => {
    const { schedules } = await apiCall(`/api/schedule?event_id=${evtId}`);
    const sorted = (schedules || []).sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
    setRounds(sorted);
    setRoundNo(sorted.length ? String(sorted[0].round_no) : "");

    let tResp = null;
    try {
      tResp = await apiCall(`/api/team?event_id=${evtId}`);
    } catch {
      tResp = { success: false, data: [] };
    }

    const mapped = (tResp.data || []).map((t) => ({
      _id: t._id,
      chest_no: t.chest_no || "",
      houseName: t.group_id?.name || "",
      houseCode: "",
      members: t.members || [],
    }));
    setTeams(mapped);
    const memberMap = {};
    for (const t of mapped) {
      memberMap[t._id] = t.members || [];
    }
    setTeamMembersMap(memberMap);
  };

  const loadPending = async () => {
    if (!eventId || !roundNo) return;
    const response = await apiCall(`/api/results?event_id=${eventId}&round_no=${roundNo}`);
    const results = response.results || response.data || [];
    setAllResults(results || []);
    const rows = (results || [])
      .filter((r) => ["draft", "submitted"].includes(r.status))
      .map((r) => {
        const team = r.team_id || {};
        const house = team.group_id || {};
        return {
          _id: r._id,
          position: r.position,
          teamId: team._id || team,
          chest: team.chest_no || null,
          houseName: house.name || "",
          houseCode: "",
          submittedBy: r.submitted_by?.name || "",
          status: r.status,
          average_score: r.average_score,
        };
      });
    setPending(rows.sort((a, b) => a.position - b.position));
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    loadEvents().catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!eventId) {
      setRounds([]);
      setRoundNo("");
      setPending([]);
      setTeams([]);
      setTeamMembersMap({});
      return;
    }
    setLoading(true);
    setError("");
    loadContext(eventId).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !roundNo) {
      setPending([]);
      return;
    }
    setLoading(true);
    setError("");
    loadPending().catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [eventId, roundNo, lastUpdate]);

  const teamLabel = (t) => `${t.chest_no ? `Chest #${t.chest_no}` : "No chest"} - ${t.houseName}${t.houseCode ? ` (${t.houseCode})` : ""}`;

  const renderTeamOrParticipants = (row) => {
    if (row.chest) return `Chest #${row.chest}`;
    const members = teamMembersMap[row.teamId] || [];
    if (!members.length) return "No chest";
    const names = members.map((m) => m.name).slice(0, 3).join(", ");
    const more = members.length > 3 ? ` +${members.length - 3}` : "";
    return `${names}${more}`;
  };

  const updateRow = async (rowId, newTeamId) => {
    if (!rowId || !newTeamId) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/results/${rowId}`, {
        method: "PATCH",
        body: JSON.stringify({ team_id: newTeamId }),
      });
      await loadPending();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async (rowId, pos) => {
    if (!rowId) return;
    if (!window.confirm(`Delete position ${pos}?`)) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/results/${rowId}`, { method: "DELETE" });
      await loadPending();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const approveOne = async (row) => {
    if (!row?._id) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/results/${row._id}/approve`, {
        method: "PATCH",
        body: undefined,
      });
      await loadPending();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectOne = async (row) => {
    if (!row?._id) return;
    if (!window.confirm(`Reject position ${row.position}?`)) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/results/${row._id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "Rejected by faculty" }),
      });
      await loadPending();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const approveAll = async () => {
    if (!eventId || !roundNo) return;
    if (!window.confirm("Approve all pending results for this round?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall("/api/results/approve", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(roundNo, 10) }),
      });
      await loadPending();
      alert("Approved and scoreboard updated");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectAll = async () => {
    if (!eventId || !roundNo) return;
    if (!window.confirm("Reject all pending results for this round?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall("/api/results/reject", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(roundNo, 10) }),
      });
      await loadPending();
      alert("Pending results rejected");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const publishOne = async (rowId) => {
    if (!rowId) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/results/${rowId}/publish`, { method: "PATCH" });
      await loadPending();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const lockOne = async (rowId) => {
    if (!rowId) return;
    if (!window.confirm("Lock this result? This cannot be undone.")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/results/${rowId}/lock`, { method: "PATCH" });
      await loadPending();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const publishAll = async () => {
    if (!eventId || !roundNo) return;
    if (!window.confirm("Publish all approved results for this round?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall("/api/results/publish", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(roundNo, 10) }),
      });
      await loadPending();
      alert("Results published");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const lockAll = async () => {
    if (!eventId || !roundNo) return;
    if (!window.confirm("Lock all published results for this round?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall("/api/results/lock", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, round_no: parseInt(roundNo, 10) }),
      });
      await loadPending();
      alert("Results locked");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const canApprove = hasAnyRole('organizer', 'super_admin');

  return (
    <div className="theme-card p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold theme-text-primary">Approvals</h2>
        <p className="text-sm theme-text-secondary">Approve, reject, or correct pending placements.</p>
        {!canApprove && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Access requires Faculty role. Current role: {String(role || "")}</p>}
      </div>

      {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium theme-text-secondary">Event</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="theme-input px-3 py-2">
            <option value="">Select event</option>
            {(events || []).map((e) => {
              const id = e._id || e.event_id;
              return (
                <option key={id} value={id}>
                  {e.name} - {e.event_type} - {e.mode}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium theme-text-secondary">Round</label>
          <select value={roundNo} onChange={(e) => setRoundNo(e.target.value)} disabled={!rounds.length} className="theme-input px-3 py-2 disabled:bg-gray-50 dark:disabled:bg-gray-900">
            <option value="">Select round</option>
            {rounds.map((r) => (
              <option key={r._id || r.round_no} value={r.round_no}>
                Round {r.round_no} - {r.status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="button" onClick={loadPending} className="theme-panel rounded-lg px-4 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800" disabled={!eventId || !roundNo}>
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium theme-text-primary dark:border-gray-800 dark:bg-gray-900">Results (Round {roundNo})</div>
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Position</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Team/Participant</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">{groupLabel}</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Submitted By</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Status</th>
              <th className="p-3 text-left text-xs uppercase theme-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3 text-sm theme-text-secondary" colSpan={6}>Loading...</td></tr>
            ) : allResults.length === 0 ? (
              <tr><td className="p-3 text-sm theme-text-secondary" colSpan={6}>No results for this round</td></tr>
            ) : (
              allResults.map((r) => {
                const team = r.team_id || {};
                const house = team.group_id || {};
                const status = r.status;
                return (
                  <tr key={r._id} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="p-3 theme-text-primary">{r.position}</td>
                    <td className="p-3 theme-text-primary">
                      {team.chest_no ? `Chest #${team.chest_no}` : "No chest"}
                      {r.average_score != null && <span className="ml-2 text-xs text-indigo-500">avg: {Number(r.average_score).toFixed(1)}</span>}
                    </td>
                    <td className="p-3 theme-text-primary">{house.name || ""}</td>
                    <td className="p-3 theme-text-primary">{r.submitted_by?.name || "-"}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-1 text-xs ${
                        status === "draft" ? "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400" :
                        status === "submitted" ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400" :
                        status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400" :
                        status === "published" ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400" :
                        "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400"
                      }`}>{status}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {status === "submitted" && (
                          <>
                            <button type="button" onClick={() => approveOne(r._id)} className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400" disabled={!canApprove}>Approve</button>
                            <button type="button" onClick={() => rejectOne(r)} className="rounded bg-rose-50 px-3 py-1 text-sm text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400" disabled={!canApprove}>Reject</button>
                          </>
                        )}
                        {status === "approved" && (
                          <button type="button" onClick={() => publishOne(r._id)} className="rounded bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400" disabled={!canApprove}>Publish</button>
                        )}
                        {status === "published" && (
                          <button type="button" onClick={() => lockOne(r._id)} className="rounded bg-purple-50 px-3 py-1 text-sm text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400" disabled={!canApprove}>Lock</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
          <button type="button" onClick={approveAll} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700 disabled:opacity-50" disabled={!canApprove || !eventId || !roundNo}>Approve All Submitted</button>
          <button type="button" onClick={rejectAll} className="rounded-lg bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700 disabled:opacity-50" disabled={!canApprove || !eventId || !roundNo}>Reject All Submitted</button>
          <button type="button" onClick={publishAll} className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50" disabled={!canApprove || !eventId || !roundNo}>Publish All Approved</button>
          <button type="button" onClick={lockAll} className="rounded-lg bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700 disabled:opacity-50" disabled={!canApprove || !eventId || !roundNo}>Lock All Published</button>
        </div>

        <p className="px-3 pb-3 text-xs theme-text-secondary">Submit → Approve → Publish → Lock. Locked results cannot be changed.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium theme-text-primary dark:border-gray-800 dark:bg-gray-900">Edit Pending Rows</div>
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
            {loading ? (
              <tr><td className="p-3 text-sm theme-text-secondary" colSpan={4}>Loading...</td></tr>
            ) : pending.length === 0 ? (
              <tr><td className="p-3 text-sm theme-text-secondary" colSpan={4}>No pending submissions</td></tr>
            ) : (
              pending.map((row) => {
                const current = teams.find((t) => t._id === row.teamId);
                const currentLabel = current ? teamLabel(current) : "Team";
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
                          updateRow(row._id, newTeamId);
                        }}
                        className="theme-input px-2 py-1"
                      >
                        <option value="">Select team</option>
                        {teams.map((t) => (
                          <option key={t._id} value={t._id}>{teamLabel(t)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <button type="button" onClick={() => deleteRow(row._id, row.position)} className="rounded bg-rose-50 px-3 py-1 text-sm text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20">Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingResult;
