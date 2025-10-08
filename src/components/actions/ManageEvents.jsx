// src/components/ManageEvents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const MODES = [
  { value: "onstage", label: "Onstage" },
  { value: "offstage", label: "Offstage" },
];

const EVENT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
];

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
];

const DEFAULT_EVENT_FORM = {
  name: "",
  description: "",
  rounds: 1,
  min_team_size: 1,
  max_team_size: 1,
  mode: "onstage",
  event_type: "individual",
  max_per_house: 1,
};

const DEFAULT_ROUND = {
  round_no: 1,
  date: "",
  time: "",
  venue: "",
  status: "upcoming",
};

const DEFAULT_POINTS = [
  { position: 1, points: 5 },
  { position: 2, points: 3 },
  { position: 3, points: 1 },
];

const ManageEvents = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("manage"); // manage | add | edit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data stores
  const [events, setEvents] = useState([]);
  const [houses, setHouses] = useState([]);
  const [usageByEventId, setUsageByEventId] = useState({}); // eventId -> { totalTeams, byHouse: {house_id: count} }

  // Forms
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT_FORM);
  const [roundsForm, setRoundsForm] = useState([{ ...DEFAULT_ROUND }]);
  const [pointsForm, setPointsForm] = useState([...DEFAULT_POINTS]);
  const [filter, setFilter] = useState({ mode: "all", type: "all", query: "" });

  // Progressive disclosure toggles (UI only)
  const [showSchedule, setShowSchedule] = useState(true);
  const [showPoints, setShowPoints] = useState(false);

  // Unified API call
  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    const config = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON:", text);
      throw new Error("Invalid JSON response from server");
    }
    if (!res.ok) throw new Error(data.message || "API call failed");
    return data;
  };

  // Bootstrap data
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [{ events }, housesResp] = await Promise.all([
        apiCall("/api/event"),
        apiCall("/api/house"),
      ]);
      setEvents(events || []);
      setHouses(Array.isArray(housesResp) ? housesResp : housesResp.houses || []);

      // Usage snapshot
      try {
        const { usage } = await apiCall("/api/event/usage");
        const map = {};
        (usage || []).forEach((u) => {
          const byHouse = {};
          (u.byHouse || []).forEach((h) => (byHouse[h.house_id] = h.count));
          map[u.event_id] = { totalTeams: u.totalTeams || 0, byHouse };
        });
        setUsageByEventId(map);
      } catch {
        setUsageByEventId({});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Helpers
  const resetForms = () => {
    setEventForm(DEFAULT_EVENT_FORM);
    setRoundsForm([{ ...DEFAULT_ROUND }]);
    setPointsForm([...DEFAULT_POINTS]);
    setEditingEventId(null);
    setShowSchedule(true);
    setShowPoints(false);
  };

  const startAdd = () => {
    resetForms();
    setActiveTab("add");
  };

  const startEdit = async (evt) => {
    try {
      setLoading(true);
      setError("");
      const eventId = evt._id || evt.event_id;
      setEditingEventId(eventId);

      const [{ event }, scheduleResp, { points }] = await Promise.all([
        apiCall(`/api/event/${eventId}`),
        apiCall(`/api/schedule?event_id=${eventId}`),
        apiCall(`/api/event/points?event_id=${eventId}`),
      ]);

      setEventForm({
        name: event.name || "",
        description: event.description || "",
        rounds: event.rounds || 1,
        min_team_size: event.min_team_size || 1,
        max_team_size: event.max_team_size || Math.max(1, event.min_team_size || 1),
        mode: event.mode || "onstage",
        event_type: event.event_type || "individual",
        max_per_house: event.max_per_house || 1,
      });

      const schedules = scheduleResp.schedules || scheduleResp.schedule || [];
      const roundsData = (schedules || [])
        .sort((a, b) => (a.round_no || 0) - (b.round_no || 0))
        .map((r) => ({
          round_no: r.round_no,
          date: r.date || "",
          time: r.time || "",
          venue: r.venue || "",
          status: r.status || "upcoming",
        }));
      setRoundsForm(roundsData.length ? roundsData : [{ ...DEFAULT_ROUND }]);

      const pt = (points || []).map((p) => ({ position: p.position, points: p.points }));
      setPointsForm(pt.length ? pt : [...DEFAULT_POINTS]);

      setActiveTab("edit");
      setShowSchedule(true);
      setShowPoints(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm("Delete this event and its schedules?")) return;
    try {
      setLoading(true);
      setError("");
      await apiCall(`/api/event/${eventId}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => (e._id || e.event_id) !== eventId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Form logic
  const handleEventChange = (field, value) => {
    setEventForm((prev) => {
      let next = { ...prev, [field]: value };
      if (field === "event_type" && value === "individual") {
        next.min_team_size = 1;
        next.max_team_size = 1;
      }
      if (field === "min_team_size") {
        const n = parseInt(value || 0, 10);
        if (!Number.isNaN(n)) {
          next.min_team_size = n;
          if (n > next.max_team_size) next.max_team_size = n;
        }
      }
      if (field === "max_team_size") {
        const n = parseInt(value || 0, 10);
        if (!Number.isNaN(n)) {
          next.max_team_size = Math.max(n, next.min_team_size || 1);
        }
      }
      if (field === "rounds") {
        const r = parseInt(value || 1, 10);
        next.rounds = Math.max(1, r);
        setRoundsForm((old) => {
          let arr = [...old];
          if (arr.length < next.rounds) {
            for (let i = arr.length + 1; i <= next.rounds; i++) {
              arr.push({ ...DEFAULT_ROUND, round_no: i });
            }
          } else if (arr.length > next.rounds) {
            arr = arr.slice(0, next.rounds);
          }
          arr = arr.map((it, idx) => ({ ...it, round_no: idx + 1 }));
          return arr;
        });
      }
      return next;
    });
  };

  const updateRoundField = (idx, field, value) => {
    setRoundsForm((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  };

  const addPointRow = () => {
    const maxPos = pointsForm.reduce((m, r) => Math.max(m, r.position), 0);
    setPointsForm([...pointsForm, { position: maxPos + 1, points: 0 }]);
  };

  const updatePointRow = (idx, field, value) => {
    setPointsForm((prev) => {
      const arr = [...prev];
      const v = parseInt(value || 0, 10);
      arr[idx] = {
        ...arr[idx],
        [field]: Number.isNaN(v) ? 0 : v,
      };
      return arr;
    });
  };

  const removePointRow = (idx) => {
    setPointsForm((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit add/edit
  const saveEvent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      // 1) Create or update event
      let savedEvent;
      if (editingEventId) {
        const { event } = await apiCall(`/api/event/${editingEventId}`, {
          method: "PUT",
          body: JSON.stringify(eventForm),
        });
        savedEvent = event;
        setEvents((prev) =>
          prev.map((it) =>
            (it._id || it.event_id) === (event._id || event.event_id) ? event : it
          )
        );
      } else {
        const { event } = await apiCall("/api/event", {
          method: "POST",
          body: JSON.stringify(eventForm),
        });
        savedEvent = event;
        setEvents((prev) => [event, ...prev]);
      }

      const eventId = savedEvent._id || savedEvent.event_id;

      // 2) Bulk upsert schedule
      const schedulePayload = roundsForm.map((r) => ({
        event_id: eventId,
        round_no: r.round_no,
        date: r.date || null,
        time: r.time || null,
        venue: r.venue || "",
        status: r.status || "upcoming",
      }));
      await apiCall(`/api/schedule/bulkUpsert`, {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, rounds: schedulePayload }),
      });

      // 3) Upsert event-specific points mapping
      await apiCall(`/api/event/points/bulkUpsert`, {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          points: pointsForm
            .filter((p) => p.position > 0)
            .map((p) => ({ position: p.position, points: p.points })),
        }),
      });

      resetForms();
      setActiveTab("manage");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered list
  const filteredEvents = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return (events || []).filter((e) => {
      const modeOk = filter.mode === "all" || e.mode === filter.mode;
      const typeOk = filter.type === "all" || e.event_type === filter.type;
      const queryOk =
        !q ||
        (e.name || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q);
      return modeOk && typeOk && queryOk;
    });
  }, [events, filter]);

  const getChip = (text, color) => (
    <span className={`px-2 py-1 text-xs rounded-full border ${color}`}>{text}</span>
  );

  return (
    <div className="min-h-dvh bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Events Management
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Create and schedule events, define rules, and configure scoring
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-4 p-1">
          <div className="flex gap-1">
            <button
              className={`flex-1 min-h-[44px] px-4 py-3 text-sm md:text-base font-medium rounded-lg transition ${
                activeTab === "manage"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
              onClick={() => {
                setActiveTab("manage");
                resetForms();
              }}
            >
              Manage Events
            </button>
            <button
              className={`flex-1 min-h-[44px] px-4 py-3 text-sm md:text-base font-medium rounded-lg transition ${
                activeTab === "add" || activeTab === "edit"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
              onClick={startAdd}
            >
              {editingEventId ? "Edit Event" : "Add Event"}
            </button>
          </div>
        </div>

        {/* Manage List */}
        {activeTab === "manage" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  value={filter.query}
                  onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                  placeholder="Search by name or description"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={filter.mode}
                  onChange={(e) => setFilter({ ...filter, mode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Modes</option>
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={startAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Add Event
                </button>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="text-gray-600">Loading…</div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-gray-600">No events found</div>
              ) : (
                filteredEvents.map((e) => {
                  const id = e._id || e.event_id;
                  const usage = usageByEventId[id] || { totalTeams: 0, byHouse: {} };
                  return (
                    <div key={id} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900">{e.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {e.description}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {getChip(e.mode, "bg-blue-50 text-blue-700 border-blue-200")}
                          {getChip(e.event_type, "bg-purple-50 text-purple-700 border-purple-200")}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Rounds</span>
                          <p className="font-medium">{e.rounds}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Max/House</span>
                          <p className="font-medium">{e.max_per_house}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Team size</span>
                          <p className="font-medium">
                            {e.event_type === "individual" ? "1" : `${e.min_team_size}–${e.max_team_size}`}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Registered teams</span>
                          <p className="font-medium">{usage.totalTeams}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => startEdit(e)}
                          className="flex-1 px-3 py-2 min-h-[44px] bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEvent(id)}
                          className="flex-1 px-3 py-2 min-h-[44px] bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Event</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Mode</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Rounds</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Team Size</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Max/House</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Registered</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="p-4 text-gray-600">Loading…</td>
                      </tr>
                    ) : filteredEvents.length === 0 ? (
                      <tr>
                        <td className="p-4 text-gray-600">No events found</td>
                      </tr>
                    ) : (
                      filteredEvents.map((e) => {
                        const id = e._id || e.event_id;
                        const usage = usageByEventId[id] || { totalTeams: 0 };
                        return (
                          <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4">
                              <div className="font-semibold text-gray-900">{e.name}</div>
                              <div className="text-sm text-gray-500 line-clamp-1">{e.description}</div>
                            </td>
                            <td className="p-4">
                              {getChip(e.mode, "bg-blue-50 text-blue-700 border-blue-200")}
                            </td>
                            <td className="p-4">
                              {getChip(e.event_type, "bg-purple-50 text-purple-700 border-purple-200")}
                            </td>
                            <td className="p-4 text-gray-700">{e.rounds}</td>
                            <td className="p-4 text-gray-700">
                              {e.event_type === "individual" ? "1" : `${e.min_team_size}–${e.max_team_size}`}
                            </td>
                            <td className="p-4 text-gray-700">{e.max_per_house}</td>
                            <td className="p-4 text-gray-700">{usage.totalTeams}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEdit(e)}
                                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteEvent(id)}
                                  className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(activeTab === "add" || activeTab === "edit") && (
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <form onSubmit={saveEvent} className="space-y-6">
              {/* Event Basics */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Event details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      required
                      value={eventForm.name}
                      onChange={(e) => handleEventChange("name", e.target.value)}
                      placeholder="Enter event name"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                    <select
                      value={eventForm.mode}
                      onChange={(e) => handleEventChange("mode", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description / Rules
                    </label>
                    <textarea
                      rows={3}
                      value={eventForm.description}
                      onChange={(e) => handleEventChange("description", e.target.value)}
                      placeholder="Add rules or details for this event"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              {/* Type & Team sizes */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Type & participation</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={eventForm.event_type}
                      onChange={(e) => handleEventChange("event_type", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min team size
                    </label>
                    <input
                      type="number"
                      min={1}
                      disabled={eventForm.event_type === "individual"}
                      value={eventForm.event_type === "individual" ? 1 : eventForm.min_team_size}
                      onChange={(e) => handleEventChange("min_team_size", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max team size
                    </label>
                    <input
                      type="number"
                      min={1}
                      disabled={eventForm.event_type === "individual"}
                      value={eventForm.event_type === "individual" ? 1 : eventForm.max_team_size}
                      onChange={(e) => handleEventChange("max_team_size", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max per house
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={eventForm.max_per_house}
                      onChange={(e) => handleEventChange("max_per_house", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              {/* Rounds & Schedule (toggle) */}
              <section>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Rounds & schedule</h2>
                  <button
                    type="button"
                    onClick={() => setShowSchedule((s) => !s)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showSchedule ? "Hide" : "Show"}
                  </button>
                </div>
                {showSchedule && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total rounds
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={eventForm.rounds}
                          onChange={(e) => handleEventChange("rounds", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {roundsForm.map((r, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">Round {r.round_no}</h3>
                            <select
                              value={r.status}
                              onChange={(e) => updateRoundField(idx, "status", e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                              <input
                                type="date"
                                value={r.date || ""}
                                onChange={(e) => updateRoundField(idx, "date", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                              <input
                                type="time"
                                value={r.time || ""}
                                onChange={(e) => updateRoundField(idx, "time", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                              <input
                                type="text"
                                value={r.venue || ""}
                                onChange={(e) => updateRoundField(idx, "venue", e.target.value)}
                                placeholder="Enter venue"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Points Config (toggle) */}
              <section>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Points configuration</h2>
                  <button
                    type="button"
                    onClick={() => setShowPoints((s) => !s)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showPoints ? "Hide" : "Show"}
                  </button>
                </div>
                {showPoints && (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      Define placements and points; leave empty to use global settings
                    </p>
                    <div className="space-y-2">
                      {pointsForm.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2">
                          <div className="col-span-5 md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Position
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={row.position}
                              onChange={(e) => updatePointRow(idx, "position", e.target.value)}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-5 md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Points
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={row.points}
                              onChange={(e) => updatePointRow(idx, "points", e.target.value)}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-2 md:col-span-2 flex items-end">
                            <button
                              type="button"
                              onClick={() => removePointRow(idx)}
                              className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      <div>
                        <button
                          type="button"
                          onClick={addPointRow}
                          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                        >
                          Add row
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* Footer actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForms();
                    setActiveTab("manage");
                  }}
                  className="flex-1 md:flex-none md:min-w-[140px] px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 md:flex-none md:min-w-[160px] px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageEvents;
