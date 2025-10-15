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
  const { token, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [schedulesByEvent, setSchedulesByEvent] = useState({});

  // details panel state
  const [openId, setOpenId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [eventSchedules, setEventSchedules] = useState([]);
  const [eventTeams, setEventTeams] = useState([]); // teams with members materialized

  // Public-friendly apiCall: include token only if present
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

  // Load recent events and per-event schedules
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const { events: evts } = await apiCall("/api/event");
        const schedulesMap = {};
        await Promise.all(
          (evts || []).map(async (e) => {
            const id = e._id || e.event_id;
            try {
              const { schedules } = await apiCall(`/api/schedule?event_id=${id}`);
              schedulesMap[id] = schedules || [];
            } catch {
              schedulesMap[id] = [];
            }
          })
        );
        if (!mounted) return;
        setEvents(evts || []);
        setSchedulesByEvent(schedulesMap);
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

  // Top 5 “recent” entries by status/date
  const recentList = useMemo(() => {
    const items = (events || []).map((e) => {
      const id = e._id || e.event_id;
      const sched = schedulesByEvent[id] || [];
      const chosen =
        sched.sort((a, b) => {
          const oa = statusOrder[a.status] || 0;
          const ob = statusOrder[b.status] || 0;
          if (oa !== ob) return ob - oa;
          const ad = new Date(a.date || 0).getTime();
          const bd = new Date(b.date || 0).getTime();
          if (ad !== bd) return ad - bd;
          return String(a.time || "").localeCompare(String(b.time || ""));
        })[0] || {};
      const status = chosen.status || "upcoming";
      return {
        key: id,
        name: e.name,
        typeText: `${modeLabel(e.mode)} • ${typeLabel(e.event_type)}`,
        status,
        color: statusBadge(status),
      };
    });
    return items.slice(0, 5);
  }, [events, schedulesByEvent]);

  // Open details and load all data, including all teams’ members
  const openDetails = async (eventId) => {
    try {
      setOpenId(eventId);
      setDetailsLoading(true);
      setError("");

      // 1) Event basics
      const { event } = await apiCall(`/api/event/${eventId}`);
      setEventDetail(event || null);

      // 2) Schedules
      const { schedules } = await apiCall(`/api/schedule?event_id=${eventId}`);
      const sortedSchedules = (schedules || []).sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
      setEventSchedules(sortedSchedules);

      // 3) Teams with members (always visible; no toggle)
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

      // Fetch members for all teams in parallel
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

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-semibold mb-2">🏅 Recent Events</h3>
      <p className="text-sm text-gray-500 mb-3">Latest competition events</p>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      {loading ? (
        <div className="text-gray-600 text-sm">Loading…</div>
      ) : recentList.length === 0 ? (
        <div className="text-gray-600 text-sm">No events found</div>
      ) : (
        recentList.map((evt) => (
          <button
            key={evt.key}
            onClick={() => openDetails(evt.key)}
            className="w-full text-left flex justify-between items-center p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div>
              <p className="font-medium">{evt.name}</p>
              <p className="text-xs text-gray-500">{evt.typeText}</p>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${evt.color}`}>
              {evt.status === "live" ? "Ongoing" : evt.status === "completed" ? "Completed" : "Upcoming"}
            </span>
          </button>
        ))
      )}

      {/* Details Drawer / Modal */}
      {openId && (
        <div
          className="fixed inset-0 bg-black/30 z-40 flex items-end md:items-center md:justify-center"
          onMouseDown={(e) => {
            // Close only when the backdrop itself is the event target
            if (e.target === e.currentTarget) closeDetails();
          }}
        >
          <div
            className="w-full md:max-w-2xl bg-white rounded-t-2xl md:rounded-2xl p-4 md:p-6 shadow-lg"
            onMouseDown={(e) => {
              // Prevent inside clicks from bubbling to the backdrop
              e.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">
                {eventDetail?.name || "Event details"}
              </h4>
              <button onClick={closeDetails} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">
                Close
              </button>
            </div>

            {detailsLoading ? (
              <div className="text-gray-600 text-sm">Loading details…</div>
            ) : (
              <>
                {/* Basics */}
                <section className="mb-4">
                  <p className="text-sm text-gray-700">
                    {eventDetail?.description || "No description provided."}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
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
                </section>

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
                            <span className="px-2 py-0.5 rounded text-xs border">
                              {r.status}
                            </span>
                          </div>
                          <div className="text-gray-600 mt-1">
                            {r.date ? new Date(r.date).toLocaleDateString() : "-"} • {r.time || "-"} • {r.venue || "-"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Participants */}
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

                          {/* Members list */}
                          <div className="mt-2">
                            {(t.members || []).length === 0 ? (
                              <p className="text-xs text-gray-600">No members added.</p>
                            ) : (
                              <ul className="pl-2">
                                {(t.members || []).map((m) => (
                                  <li key={m._id} className="py-1 flex items-center justify-between">
                                    <span className="text-gray-800">{m.name}</span>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecentEvents;
