// src/components/RecentEvents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../components/AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const statusOrder = { live: 3, upcoming: 2, completed: 1 };
const modeLabel = (m) => (m === "onstage" ? "onstage" : "offstage");
const typeLabel = (t) => (t === "team" ? "team" : "individual");
const statusBadge = (status) => {
  switch (status) {
    case "live":
      return "bg-blue-900 text-white";
    case "completed":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

function RecentEvents() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [schedulesByEvent, setSchedulesByEvent] = useState({});
  const [resultsByEvent, setResultsByEvent] = useState({});
  const [showAll, setShowAll] = useState(false);

  // filters and UI state
  const [category, setCategory] = useState("all"); // all | upcoming | completed
  const [openId, setOpenId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [eventSchedules, setEventSchedules] = useState([]);
  const [eventTeams, setEventTeams] = useState([]);
  const [activeTab, setActiveTab] = useState("winners"); // winners | participants

  const apiCall = async (endpoint, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
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

  // bootstrap events + schedules + results summary
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const { events: evts } = await apiCall("/api/event");
        const schedulesMap = {};
        const resultsMap = {};

        await Promise.all(
          (evts || []).map(async (e) => {
            const id = e._id || e.event_id;
            try {
              const { schedules } = await apiCall(`/api/schedule?event_id=${id}`);
              schedulesMap[id] = schedules || [];
            } catch {
              schedulesMap[id] = [];
            }

            try {
              const { results } = await apiCall(`/api/results?event_id=${id}&status=approved`);
              resultsMap[id] = results || [];
            } catch {
              resultsMap[id] = [];
            }
          })
        );

        if (!mounted) return;
        setEvents(evts || []);
        setSchedulesByEvent(schedulesMap);
        setResultsByEvent(resultsMap);
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [token, API_BASE_URL]);

  const eventStatus = (id) => {
    const sched = (schedulesByEvent[id] || [])
      .slice()
      .sort((a, b) => {
        const oa = statusOrder[a.status] || 0;
        const ob = statusOrder[b.status] || 0;
        if (oa !== ob) return ob - oa;
        const ad = new Date(a.date || 0).getTime();
        const bd = new Date(b.date || 0).getTime();
        if (ad !== bd) return ad - bd;
        return String(a.time || "").localeCompare(String(b.time || ""));
      });
    const chosen = sched[0] || {};
    return chosen.status || "upcoming";
  };

  // build filtered list (no logic change; just used for UI)
  const fullItems = useMemo(() => {
    return (events || [])
      .map((e) => {
        const id = e._id || e.event_id;
        const status = eventStatus(id);
        return {
          key: id,
          name: e.name,
          typeText: `${modeLabel(e.mode)} • ${typeLabel(e.event_type)}`,
          status,
          color: statusBadge(status),
        };
      })
      .filter((it) => (category === "all" ? true : it.status === category));
  }, [events, schedulesByEvent, category]);

  const list = useMemo(() => {
    return showAll ? fullItems : fullItems.slice(0, 8);
  }, [fullItems, showAll]);

  const openDetails = async (eventId) => {
    try {
      setOpenId(eventId);
      setDetailsLoading(true);
      setError("");
      setActiveTab("winners");

      const { event } = await apiCall(`/api/event/${eventId}`);
      setEventDetail(event || null);

      const { schedules } = await apiCall(`/api/schedule?event_id=${eventId}`);
      const sortedSchedules = (schedules || []).sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
      setEventSchedules(sortedSchedules);

      let teamsResp = null;
      try {
        teamsResp = await apiCall(`/api/team?event_id=${eventId}`);
      } catch {
        teamsResp = { teams: [] };
      }
      const baseTeams = (teamsResp.teams || []).map((t) => ({
        _id: t._id,
        houseName: t.house_id?.name || "",
        houseCode: t.house_id?.code || "",
        chest_no: t.chest_no || null,
        members: [],
      }));
      const withMembers = await Promise.all(
        baseTeams.map(async (t) => {
          try {
            const { members } = await apiCall(`/api/team/${t._id}/members`);
            return { ...t, members: members || [] };
          } catch {
            return { ...t, members: [] };
          }
        })
      );
      setEventTeams(withMembers);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setOpenId(null);
    setEventDetail(null);
    setEventSchedules([]);
    setEventTeams([]);
  };

  const winnersView = useMemo(() => {
    if (!openId) return [];
    const results = (resultsByEvent[openId] || [])
      .filter((r) => r.status === "approved")
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const teamMap = new Map(eventTeams.map((t) => [String(t._id), t]));
    return results.slice(0, 6).map((r) => {
      const teamObj = teamMap.get(String(r.team_id?._id || r.team_id)) || {};
      const houseName = teamObj.houseName || r.team_id?.house_id?.name || "";
      const houseCode = teamObj.houseCode || r.team_id?.house_id?.code || "";
      const members = teamObj.members || [];
      return {
        resultId: r._id,
        position: r.position,
        houseText: houseName ? `${houseName}${houseCode ? ` (${houseCode})` : ""}` : "",
        members,
      };
    });
  }, [openId, resultsByEvent, eventTeams]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-semibold">🏅 Events</h3>
        {/* Category filter */}
        <div className="inline-flex rounded-lg border overflow-hidden shadow-sm">
          {["all", "upcoming", "completed"].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                category === c ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">Latest and upcoming competition events</p>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      {loading ? (
        <div className="text-gray-600 text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-gray-600 text-sm">No events found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 animate-[fadeIn_300ms_ease-out]">
            {list.map((evt) => (
              <button
                key={evt.key}
                onClick={() => openDetails(evt.key)}
                className="w-full text-left flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition shadow-sm hover:shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{evt.name}</p>
                  <p className="text-xs text-gray-500">{evt.typeText}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${evt.color}`}>
                  {evt.status === "live" ? "Ongoing" : evt.status === "completed" ? "Completed" : "Upcoming"}
                </span>
              </button>
            ))}
          </div>

          {/* See all / See less */}
          {fullItems.length > 8 && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-expanded={showAll}
                aria-controls="events-list"
              >
                {showAll ? "See less" : `See all (${fullItems.length})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Drawer / Modal */}
      {openId && (
        <div
          className="fixed inset-0 bg-black/30 z-40 flex items-end md:items-center md:justify-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetails();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full md:max-w-3xl bg-white rounded-t-2xl md:rounded-2xl p-0 shadow-lg max-h-[90vh] overflow-hidden transition-transform md:animate-[popIn_160ms_ease-out]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="p-4 border-b bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold truncate">
                  {eventDetail?.name || "Event details"}
                </h4>
                <button
                  onClick={closeDetails}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Close
                </button>
              </div>

              {/* Basics */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Mode</span>
                  <p className="font-medium">{eventDetail?.mode}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type</span>
                  <p className="font-medium">{eventDetail?.event_type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Rounds</span>
                  <p className="font-medium">{eventDetail?.rounds}</p>
                </div>
                <div>
                  <span className="text-gray-500">Team size</span>
                  <p className="font-medium">
                    {eventDetail?.event_type === "individual"
                      ? "1"
                      : `${eventDetail?.min_team_size || 1}–${eventDetail?.max_team_size || 1}`}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Max per house</span>
                  <p className="font-medium">{eventDetail?.max_per_house || 1}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-3">
                <div className="inline-flex rounded-lg border overflow-hidden shadow-sm">
                  {["winners", "participants"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        activeTab === t ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Body scroll area */}
            <div className="p-4 overflow-y-auto">
              {/* Schedule */}
              <section className="mb-4">
                <h5 className="font-semibold mb-2">Schedule</h5>
                {eventSchedules.length === 0 ? (
                  <p className="text-sm text-gray-600">No schedule added yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {eventSchedules.map((r) => (
                      <li key={r._id} className="text-sm border rounded p-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Round {r.round_no}</span>
                          <span className="px-2 py-0.5 rounded text-xs border">{r.status}</span>
                        </div>
                        <div className="text-gray-600 mt-1">
                          {r.date ? new Date(r.date).toLocaleDateString() : "-"} • {r.time || "-"} • {r.venue || "-"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Winners or Participants */}
              {activeTab === "winners" ? (
                <section>
                  <h5 className="font-semibold mb-2">Winners</h5>
                  {resultsByEvent[openId]?.length ? (
                    <ul className="space-y-2">
                      {winnersView.map((w) => (
                        <li key={w.resultId} className="border rounded p-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Position {w.position}</span>
                            <span className="text-gray-700">{w.houseText}</span>
                          </div>
                          <div className="mt-2 max-h-28 overflow-y-auto pr-1">
                            {(w.members || []).slice(0, 50).map((m) => (
                              <div key={m._id} className="py-1 flex items-center justify-between text-sm">
                                <span className="text-gray-800 truncate">{m.name}</span>
                                <span className="text-gray-500 text-xs">{m.class || ""}</span>
                              </div>
                            ))}
                            {(!w.members || w.members.length === 0) && (
                              <p className="text-xs text-gray-500">No members listed.</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No approved results yet.</p>
                  )}
                </section>
              ) : (
                <section>
                  <h5 className="font-semibold mb-2">Participants</h5>
                  {eventTeams.length === 0 ? (
                    <p className="text-sm text-gray-600">No registrations yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {eventTeams.map((t) => (
                        <li key={t._id} className="border rounded p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {t.houseName || "House"} {t.houseCode ? `(${t.houseCode})` : ""}
                              </p>
                              <p className="text-xs text-gray-600">
                                {t.chest_no ? `Chest #${t.chest_no}` : "No chest number"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 max-h-28 overflow-y-auto pr-1">
                            {(t.members || []).length === 0 ? (
                              <p className="text-xs text-gray-600">No members added.</p>
                            ) : (
                              <ul>
                                {(t.members || []).map((m) => (
                                  <li key={m._id} className="py-1 flex items-center justify-between">
                                    <span className="text-gray-800 truncate">{m.name}</span>
                                    <span className="text-gray-500 text-xs">
                                      {m.class} {m.houseCode ? `• ${m.houseCode}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecentEvents;

/* Tailwind keyframes (optional):
   If using Tailwind v3, add to tailwind.config.js:
   theme.extend.animation + keyframes for fadeIn and popIn.
   Or replace classes with built-in transition utilities. */
