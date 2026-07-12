// src/components/actions/AdminScoreboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const shimmerBase = "bg-gray-100";
const shimmerHighlight = "bg-gray-200";

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-3">
      <div className={`h-4 w-24 rounded ${shimmerBase}`}></div>
    </td>
    <td className="p-3">
      <div className={`h-4 w-14 rounded ${shimmerBase}`}></div>
    </td>
    <td className="p-3">
      <div className={`h-4 w-10 rounded ${shimmerBase}`}></div>
    </td>
    <td className="p-3">
      <div className={`h-4 w-10 rounded ${shimmerBase}`}></div>
    </td>
    <td className="p-3">
      <div className={`h-4 w-40 rounded ${shimmerBase}`}></div>
    </td>
    <td className="p-3">
      <div className={`h-8 w-28 rounded ${shimmerHighlight}`}></div>
    </td>
  </tr>
);

const MobileRowCard = ({
  row,
  grp,
  isAdmin,
  teamsByEvent,
  onChangeTeam,
  onChangePosition,
  onDelete,
}) => {
  const [posValue, setPosValue] = useState("");

  return (
    <div className="p-3 border rounded-lg shadow-xs" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)', color: 'var(--card-fg)' }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium" style={{ color: 'var(--card-fg)' }}>{grp.event_name}</div>
        <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--card-fg)' }}>Round {row.round_no}</div>
      </div>

      <div className="mt-2 text-sm">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--chart-axis)' }}>Placement</span>
          <span className="font-medium" style={{ color: 'var(--card-fg)' }}>{row.position}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span style={{ color: 'var(--chart-axis)' }}>Points</span>
          <span className="font-semibold" style={{ color: 'var(--card-fg)' }}>{row.points}</span>
        </div>
        <div className="mt-1">
          <span style={{ color: 'var(--chart-axis)' }}>Team/Members: </span>
          {row.chest_no ? (
            <span style={{ color: 'var(--card-fg)' }}>Chest #{row.chest_no}</span>
          ) : (row.members || []).length ? (
            <span style={{ color: 'var(--card-fg)' }}>{row.members.map((m) => m.name).join(", ")}</span>
          ) : (
            <span style={{ color: 'var(--card-fg)' }}>No chest</span>
          )}
        </div>
      </div>

      {isAdmin ? (
        <div className="mt-3 flex flex-col gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              const newTeamId = e.target.value;
              if (!newTeamId) return;
              onChangeTeam(newTeamId);
              e.target.value = "";
            }}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          >
            <option value="" className="bg-white dark:bg-[#0B1220]">Change team</option>
            {(teamsByEvent[grp.event_id] || []).map((t) => (
              <option key={t._id} value={t._id} className="bg-white dark:bg-[#0B1220]">{t.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={posValue}
              onChange={(e) => setPosValue(e.target.value)}
              placeholder="Position"
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = parseInt(posValue, 10);
                  if (v > 0) {
                    onChangePosition(v);
                    setPosValue("");
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => onDelete()}
              className="px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-gray-400 text-sm">—</div>
      )}
    </div>
  );
};

const AdminScoreboard = () => {
  const { token } = useAuth();
  const { competition, groupLabel = "House" } = useCompetition() || {};
  const { hasAnyRole } = usePermission();
  const isAdmin = hasAnyRole('organizer', 'super_admin');
  const [houses, setHouses] = useState([]);
  const [houseId, setHouseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data
  const [details, setDetails] = useState({ total: 0, items: [] });
  const [teamsByEvent, setTeamsByEvent] = useState({});
  const [events, setEvents] = useState([]);

  // UI state
  const [expandedEvents, setExpandedEvents] = useState(() => new Set()); // event_id expanded on mobile
  const [filterEvent, setFilterEvent] = useState("");
  const [refreshHint, setRefreshHint] = useState(false);

  // Pull to refresh
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  // Load groups and events
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const competitionId = competition?._id || competition?.id || competition?.competition_id;
        const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";

        const [groupsResp, eventsResp] = await Promise.all([
          competitionId
            ? apiCall(`/api/competition/${competitionId}/groups`)
            : apiCall("/api/competition/groups"),
          apiCall(`/api/event${competitionQuery}`),
        ]);
        const gs = Array.isArray(groupsResp) ? groupsResp : groupsResp.groups || groupsResp.houses || [];
        setHouses(gs);
        setEvents(eventsResp.events || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const loadDetails = async () => {
    if (!houseId) {
      setDetails({ total: 0, items: [] });
      setTeamsByEvent({});
      return;
    }
    try {
      setLoading(true);
      setError("");
      const data = await apiCall(`/api/scoreboard/group/${houseId}/details`);
      setDetails(data || { total: 0, items: [] });

      // Build team selectors per event for editing
      const grouped = {};
      const evtIds = [...new Set((data.items || []).map((i) => i.event_id))];
      await Promise.all(
        evtIds.map(async (eid) => {
          try {
            const teamsResp = await apiCall(`/api/team?event_id=${eid}`);
            grouped[eid] = (teamsResp.data || []).map((t) => ({
              _id: t._id,
              label: `${t.chest_no ? `Chest #${t.chest_no}` : "No chest"} • ${t.group_id?.name || ""}`,
            }));
          } catch {
            grouped[eid] = [];
          }
        })
      );
      setTeamsByEvent(grouped);
    } catch (e) {
      setError(e.message);
      setDetails({ total: 0, items: [] });
      setTeamsByEvent({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseId]);

  const groupedByEvent = useMemo(() => {
    const map = new Map();
    for (const it of details.items || []) {
      if (filterEvent && String(it.event_id) !== String(filterEvent)) continue;
      const key = `${it.event_id}|${it.event_name}`;
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }
    const result = Array.from(map.entries()).map(([k, arr]) => {
      const [event_id, event_name] = k.split("|");
      const subtotal = arr.reduce((s, r) => s + (r.points || 0), 0);
      return { event_id, event_name, subtotal, rows: arr.sort((a, b) => a.position - b.position) };
    });
    // Ensure expanded state has defaults on mobile for first few events
    return result;
  }, [details.items, filterEvent]);

  const editRow = async (row, updates) => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError("");
      await apiCall(`/api/results/${row.result_id}/admin-edit`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await loadDetails();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async (row) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete ${row.event_name} • Round ${row.round_no} • position ${row.position}?`)) return;
    try {
      setLoading(true);
      setError("");
      await apiCall(`/api/results/${row.result_id}/admin-delete`, { method: "DELETE" });
      await loadDetails();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh behaviors for mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };
    const onTouchMove = (e) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 40) {
        setRefreshHint(true);
      } else {
        setRefreshHint(false);
      }
    };
    const onTouchEnd = async () => {
      if (refreshHint) {
        setRefreshHint(false);
        await loadDetails();
      }
      pulling.current = false;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [refreshHint, houseId]);

  const toggleEvent = (eid) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eid)) next.delete(eid);
      else next.add(eid);
      return next;
    });
  };

  return (
    <div className="rounded-xl shadow-sm p-3 md:p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
      <div className="mb-3">
        <h2 className="text-base md:text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>Manage Scoreboard</h2>
        <p className="text-xs md:text-sm" style={{ color: 'var(--chart-axis)' }}>View, audit, and edit scoreboard contributions per {groupLabel.toLowerCase()}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
        >
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs md:text-sm font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>{groupLabel}</label>
          <select
            value={houseId}
            onChange={(e) => setHouseId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          >
            <option value="" className="bg-white dark:bg-[#0B1220]">Select {groupLabel.toLowerCase()}</option>
            {houses.map((h) => (
              <option key={h._id} value={h._id} className="bg-white dark:bg-[#0B1220]">
                {h.name} {h.code ? `(${h.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Filter event</label>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
          >
            <option value="" className="bg-white dark:bg-[#0B1220]">All events</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id} className="bg-white dark:bg-[#0B1220]">{ev.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <div className="px-3 py-2 rounded-lg border text-sm w-full md:w-auto flex justify-between md:block" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
            <span style={{ color: 'var(--chart-axis)' }}>Overall total:</span>{" "}
            <span className="font-semibold">{details.total || 0}</span>
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={loadDetails}
            className="w-full md:w-auto px-3 py-2 rounded-lg text-sm bg-orange-600 text-white hover:bg-orange-700 active:scale-[0.98] transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Pull-to-refresh hint for mobile */}
      {refreshHint && (
        <div className="mb-2 text-center text-xs text-orange-600">Release to refresh…</div>
      )}

      {/* Responsive content container */}
      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-y-auto overscroll-y-contain"
      >
        {/* Mobile layout: cards & collapsible groups */}
        <div className="md:hidden space-y-3">
          {!houseId ? (
            <div className="p-3 text-sm border rounded-lg" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}>Select a {groupLabel.toLowerCase()} to view details</div>
          ) : loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : groupedByEvent.length === 0 ? (
            <div className="p-3 text-sm border rounded-lg" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}>No contributions</div>
          ) : (
            groupedByEvent.map((grp) => {
              const isOpen = expandedEvents.has(grp.event_id);
              return (
                <div key={grp.event_id} className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-divider)' }}>
                  <button
                    type="button"
                    onClick={() => toggleEvent(grp.event_id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                    style={{ backgroundColor: 'var(--surface)' }}
                  >
                    <div className="text-sm font-medium" style={{ color: 'var(--card-fg)' }}>{grp.event_name}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs" style={{ color: 'var(--chart-axis)' }}>Subtotal: <span className="font-semibold" style={{ color: 'var(--card-fg)' }}>{grp.subtotal}</span></div>
                      <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        style={{ color: 'var(--chart-axis)' }}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                  {isOpen ? (
                    <div className="p-3 space-y-3">
                      {grp.rows.map((row) => (
                        <MobileRowCard
                          key={row.result_id}
                          row={row}
                          grp={grp}
                          isAdmin={isAdmin}
                          teamsByEvent={teamsByEvent}
                          onChangeTeam={(newTeamId) => editRow(row, { team_id: newTeamId })}
                          onChangePosition={(v) => editRow(row, { position: v })}
                          onDelete={() => deleteRow(row)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop/tablet layout */}
        <div className="hidden md:block overflow-x-auto border rounded-lg" style={{ borderColor: 'var(--border-divider)' }}>
          <table className="min-w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)' }}>
              <tr>
                <th className="text-left p-3 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Event</th>
                <th className="text-left p-3 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Round</th>
                <th className="text-left p-3 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Placement</th>
                <th className="text-left p-3 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Points</th>
                <th className="text-left p-3 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Team/Members</th>
                <th className="text-left p-3 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : !houseId ? (
                <tr><td className="p-3 text-sm text-center" colSpan={6} style={{ color: 'var(--chart-axis)' }}>Select a {groupLabel.toLowerCase()} to view details</td></tr>
              ) : groupedByEvent.length === 0 ? (
                <tr><td className="p-3 text-sm text-center" colSpan={6} style={{ color: 'var(--chart-axis)' }}>No contributions</td></tr>
              ) : (
                groupedByEvent.map((grp) => (
                  <React.Fragment key={grp.event_id}>
                    {grp.rows.map((row, idx) => (
                      <tr key={row.result_id} className="border-t hover:bg-indigo-500/5" style={{ borderTopColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                        <td className="p-3">{idx === 0 ? grp.event_name : ""}</td>
                        <td className="p-3">Round {row.round_no}</td>
                        <td className="p-3">{row.position}</td>
                        <td className="p-3 font-medium">{row.points}</td>
                        <td className="p-3">
                          {row.chest_no ? (
                            <span>Chest #{row.chest_no}</span>
                          ) : (row.members || []).length ? (
                            <span>{(row.members || []).map((m) => m.name).join(", ")}</span>
                          ) : (
                            <span>No chest</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isAdmin ? (
                            <div className="flex items-center gap-2">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  const newTeamId = e.target.value;
                                  if (!newTeamId) return;
                                  editRow(row, { team_id: newTeamId });
                                  e.target.value = "";
                                }}
                                className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                              >
                                <option value="" className="bg-white dark:bg-[#0B1220]">Change team</option>
                                {(teamsByEvent[row.event_id] || []).map((t) => (
                                  <option key={t._id} value={t._id} className="bg-white dark:bg-[#0B1220]">{t.label}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                placeholder="Position"
                                className="w-24 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const v = parseInt(e.currentTarget.value, 10);
                                    if (v > 0) {
                                      editRow(row, { position: v });
                                      e.currentTarget.value = "";
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => deleteRow(row)}
                                className="px-3 py-1 rounded text-sm bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t" style={{ backgroundColor: 'var(--surface)', borderTopColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                      <td className="p-3 font-medium" colSpan={3}>Subtotal</td>
                      <td className="p-3 font-semibold">{grp.subtotal}</td>
                      <td className="p-3" colSpan={2}></td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminScoreboard;
