// src/components/actions/AdminScoreboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthContext";

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
    <div className="p-3 border rounded-lg bg-white shadow-xs">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">{grp.event_name}</div>
        <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Round {row.round_no}</div>
      </div>

      <div className="mt-2 text-sm text-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Placement</span>
          <span className="font-medium">{row.position}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-gray-500">Points</span>
          <span className="font-semibold">{row.points}</span>
        </div>
        <div className="mt-1">
          <span className="text-gray-500">Team/Members: </span>
          {row.chest_no ? (
            <span className="text-gray-900">Chest #{row.chest_no}</span>
          ) : (row.members || []).length ? (
            <span className="text-gray-900">{row.members.map((m) => m.name).join(", ")}</span>
          ) : (
            <span className="text-gray-900">No chest</span>
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
            className="px-3 py-2 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Change team</option>
            {(teamsByEvent[grp.event_id] || []).map((t) => (
              <option key={t._id} value={t._id}>{t.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={posValue}
              onChange={(e) => setPosValue(e.target.value)}
              placeholder="Position"
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition"
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
  const { token, role } = useAuth();
  const isAdmin = String(role || "").toLowerCase() === "admin";
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
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }
    if (!res.ok) throw new Error(data.message || "API call failed");
    return data;
  };

  // Load houses and events
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [housesResp, eventsResp] = await Promise.all([
          apiCall("/api/house"),
          apiCall("/api/event"),
        ]);
        const hs = Array.isArray(housesResp) ? housesResp : housesResp.houses || [];
        setHouses(hs);
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
      const data = await apiCall(`/api/scoreboard/house/${houseId}/details`);
      setDetails(data || { total: 0, items: [] });

      // Build team selectors per event for editing
      const grouped = {};
      const evtIds = [...new Set((data.items || []).map((i) => i.event_id))];
      await Promise.all(
        evtIds.map(async (eid) => {
          try {
            const { teams } = await apiCall(`/api/team?event_id=${eid}`);
            grouped[eid] = (teams || []).map((t) => ({
              _id: t._id,
              label: `${t.chest_no ? `Chest #${t.chest_no}` : "No chest"} • ${t.house_id?.name || ""}${t.house_id?.code ? ` (${t.house_id.code})` : ""}`,
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
      await apiCall(`/api/scoreboard/result/${row.result_id}`, {
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
      await apiCall(`/api/scoreboard/result/${row.result_id}`, { method: "DELETE" });
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
    <div className="bg-white rounded-xl shadow-sm p-3 md:p-4">
      <div className="mb-3">
        <h2 className="text-base md:text-lg font-semibold text-gray-900">Manage Scoreboard</h2>
        <p className="text-xs md:text-sm text-gray-600">View, audit, and edit scoreboard contributions per house</p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3"
        >
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">House</label>
          <select
            value={houseId}
            onChange={(e) => setHouseId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select house</option>
            {houses.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name} {h.code ? `(${h.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Filter event</label>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <div className="px-3 py-2 bg-gray-50 rounded-lg border text-sm w-full md:w-auto flex justify-between md:block">
            <span className="text-gray-600">Overall total:</span>{" "}
            <span className="font-semibold">{details.total || 0}</span>
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={loadDetails}
            className="w-full md:w-auto px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Pull-to-refresh hint for mobile */}
      {refreshHint && (
        <div className="mb-2 text-center text-xs text-blue-600">Release to refresh…</div>
      )}

      {/* Responsive content container */}
      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-y-auto overscroll-y-contain"
      >
        {/* Mobile layout: cards & collapsible groups */}
        <div className="md:hidden space-y-3">
          {!houseId ? (
            <div className="p-3 text-sm text-gray-600 border rounded-lg">Select a house to view details</div>
          ) : loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : groupedByEvent.length === 0 ? (
            <div className="p-3 text-sm text-gray-600 border rounded-lg">No contributions</div>
          ) : (
            groupedByEvent.map((grp) => {
              const isOpen = expandedEvents.has(grp.event_id);
              return (
                <div key={grp.event_id} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleEvent(grp.event_id)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-left"
                  >
                    <div className="text-sm font-medium text-gray-900">{grp.event_name}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-600">Subtotal: <span className="font-semibold">{grp.subtotal}</span></div>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        <div className="hidden md:block overflow-x-auto border rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 text-xs uppercase text-gray-500">Event</th>
                <th className="text-left p-3 text-xs uppercase text-gray-500">Round</th>
                <th className="text-left p-3 text-xs uppercase text-gray-500">Placement</th>
                <th className="text-left p-3 text-xs uppercase text-gray-500">Points</th>
                <th className="text-left p-3 text-xs uppercase text-gray-500">Team/Members</th>
                <th className="text-left p-3 text-xs uppercase text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : !houseId ? (
                <tr><td className="p-3 text-sm text-gray-600" colSpan={6}>Select a house to view details</td></tr>
              ) : groupedByEvent.length === 0 ? (
                <tr><td className="p-3 text-sm text-gray-600" colSpan={6}>No contributions</td></tr>
              ) : (
                groupedByEvent.map((grp) => (
                  <React.Fragment key={grp.event_id}>
                    {grp.rows.map((row, idx) => (
                      <tr key={row.result_id} className="border-t hover:bg-gray-50">
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
                                className="px-2 py-1 border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Change team</option>
                                {(teamsByEvent[row.event_id] || []).map((t) => (
                                  <option key={t._id} value={t._id}>{t.label}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                placeholder="Position"
                                className="w-24 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="px-3 py-1 rounded text-sm bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition"
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
                    <tr className="bg-gray-50 border-t">
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
