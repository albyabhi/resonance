// src/components/ManageEvents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { Share2, Copy, Download, X, QrCode, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRealtime } from "../../context/RealtimeContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const CATEGORIES = [
  { value: "sports", label: "Sports" },
  { value: "arts", label: "Arts" },
  { value: "academic", label: "Academic" },
  { value: "cultural", label: "Cultural" },
  { value: "technical", label: "Technical" },
];

const MODES = [
  { value: "onstage", label: "Onstage" },
  { value: "offstage", label: "Offstage" },
];

const EVENT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
];

const PARTICIPANT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "pair", label: "Pair" },
  { value: "group", label: "Group" },
];

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
];

const GENDER_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const DEFAULT_EVENT_FORM = {
  title: "",
  description: "",
  category: "cultural",
  subcategory: "",
  rounds: 1,
  min_team_size: 1,
  max_team_size: 1,
  min_participants: 1,
  max_participants: 1,
  mode: "onstage",
  event_type: "individual",
  participant_type: "individual",
  gender_filter: "all",
  age_group: { min: "", max: "" },
  max_per_group: 1,
  duration: "",
  instructions: "",
  requirements: [],
  rules: "",
  eligibility: "",
  status: "upcoming",
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

const getCurrentScheduleDefaults = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;

  return { date, time };
};


const ManageEvents = () => {
  const { token, competition } = useAuth();
  const { groupLabel } = useCompetition();
  const { lastUpdate } = useRealtime() || {};
  const [activeTab, setActiveTab] = useState("manage"); // manage | add | edit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data stores
  const [events, setEvents] = useState([]);
  const [usageByEventId, setUsageByEventId] = useState({}); // eventId -> { totalTeams, byHouse: {house_id: count} }

  // Forms
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT_FORM);
  const [roundsForm, setRoundsForm] = useState(() => {
    const defaults = getCurrentScheduleDefaults();
    return [{ ...DEFAULT_ROUND, date: defaults.date, time: defaults.time }];
  });
  const [pointsForm, setPointsForm] = useState([...DEFAULT_POINTS]);
  const [filter, setFilter] = useState({ mode: "all", type: "all", category: "all", query: "" });

  // UI toggles
  const [showParticipation, setShowParticipation] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [newRequirement, setNewRequirement] = useState("");

  // Client-side validation state
  const [fieldErrors, setFieldErrors] = useState({});
  const [sharingEvent, setSharingEvent] = useState(null);

  // Unified API call
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

  // Bootstrap data
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");

      const competitionId = competition?._id || competition?.id || competition?.competition_id;
      const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";

      const [{ events }] = await Promise.all([
        apiCall(`/api/event${competitionQuery}`),
      ]);
      setEvents(events || []);

      // Usage snapshot
      try {
        const { usage } = await apiCall(`/api/event/usage${competitionQuery}`);
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
  }, [token, lastUpdate]);

  // Helpers
  const resetForms = () => {
    setEventForm({ ...DEFAULT_EVENT_FORM });
    const defaults = getCurrentScheduleDefaults();
    setRoundsForm([{ ...DEFAULT_ROUND, date: defaults.date, time: defaults.time }]);
    setPointsForm([...DEFAULT_POINTS]);
    setEditingEventId(null);
    setShowParticipation(false);
    setShowEventDetails(false);
    setShowSchedule(true);
    setShowPoints(false);
    setNewRequirement("");
    setFieldErrors({});
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

      // Always fetch the core event
      const { data: event } = await apiCall(`/api/event/${eventId}`);

      // Try to fetch schedules
      let schedules = [];
      try {
        const scheduleResp = await apiCall(`/api/schedule?event_id=${eventId}`);
        schedules = scheduleResp.schedules || scheduleResp.schedule || [];
      } catch { /* schedule fetch is optional */ }

      // Populate forms with safe defaults
      setEventForm({
        title: event.title || event.name || "",
        description: event.description || "",
        category: event.category || "cultural",
        subcategory: event.subcategory || "",
        rounds: event.rounds ?? 1,
        min_team_size: event.min_team_size ?? 1,
        max_team_size: event.max_team_size ?? Math.max(1, event.min_team_size ?? 1),
        min_participants: event.min_participants ?? event.min_team_size ?? 1,
        max_participants: event.max_participants ?? event.max_team_size ?? 1,
        mode: event.mode || "onstage",
        event_type: event.event_type || "individual",
        participant_type: event.participant_type || "individual",
        gender_filter: event.gender_filter || "all",
        age_group: event.age_group ? { min: event.age_group.min ?? "", max: event.age_group.max ?? "" } : { min: "", max: "" },
        max_per_group: event.max_per_group ?? 1,
        duration: event.duration || "",
        instructions: event.instructions || "",
        requirements: event.requirements || [],
        rules: event.rules || "",
        eligibility: event.eligibility || "",
        status: event.status || "upcoming",
      });

      const roundsData = (schedules || [])
        .sort((a, b) => (a.round_no || 0) - (b.round_no || 0))
        .map((r) => ({
          round_no: r.round_no,
          date: r.date || "",
          time: r.time || "",
          venue: r.venue || "",
          status: r.status || "upcoming",
        }));
      const defaults = getCurrentScheduleDefaults();
      setRoundsForm(roundsData.length ? roundsData : [{ ...DEFAULT_ROUND, date: defaults.date, time: defaults.time }]);

      // Parse points_config
      const pts = [];
      if (event.points_config) {
        Object.entries(event.points_config).forEach(([pos, pts_val]) => {
          pts.push({ position: parseInt(pos, 10), points: pts_val });
        });
      }
      setPointsForm(pts.length ? pts.sort((a, b) => a.position - b.position) : [...DEFAULT_POINTS]);

      setActiveTab("edit");
      setShowSchedule(true);
      setShowPoints(false);
      setFieldErrors({});
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

  // Allow empty string during typing for numeric fields.
  // Validate but do not force values while user is typing.
  const handleEventChange = (field, value) => {
    setEventForm((prev) => {
      const numericFields = new Set([
        "min_team_size",
        "max_team_size",
        "rounds",
        "max_per_group",
      ]);

      let next = { ...prev };

      if (numericFields.has(field)) {
        if (value === "") {
          next[field] = ""; // let it be empty while typing
        } else {
          const n = parseInt(value, 10);
          if (!Number.isNaN(n)) next[field] = n;
        }
      } else {
        next[field] = value;
      }

      // If switching to individual, lock team sizes to 1
      if (field === "event_type" && value === "individual") {
        next.min_team_size = 1;
        next.max_team_size = 1;
      }

      // Keep max >= min only when both are numeric
      if (field === "min_team_size") {
        const minVal =
          typeof next.min_team_size === "number" ? next.min_team_size : null;
        const maxVal =
          typeof next.max_team_size === "number" ? next.max_team_size : null;
        if (minVal != null && maxVal != null && minVal > maxVal) {
          next.max_team_size = minVal;
        }
      }

      // Update rounds array only when rounds is a number
      if (field === "rounds" && typeof next.rounds === "number") {
        next.rounds = Math.max(1, next.rounds);
        setRoundsForm((old) => {
          let arr = [...old];
          if (arr.length < next.rounds) {
            const defaults = getCurrentScheduleDefaults();
            for (let i = arr.length + 1; i <= next.rounds; i++) {
              arr.push({ ...DEFAULT_ROUND, round_no: i, date: defaults.date, time: defaults.time });
            }
          } else if (arr.length > next.rounds) {
            arr = arr.slice(0, next.rounds);
          }
          arr = arr.map((it, idx) => ({ ...it, round_no: idx + 1 }));
          return arr;
        });
      }

      // Re-validate on change
      validateFields(next);

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

  const updateRoundDateTime = (idx, value) => {
    setRoundsForm((prev) => {
      const arr = [...prev];
      if (!value) {
        arr[idx] = { ...arr[idx], date: "", time: "" };
      } else {
        const [date, time] = value.split("T");
        arr[idx] = { ...arr[idx], date: date || "", time: time || "" };
      }
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

  // Validation: allow empty ("") or 0; if provided, must be >= 1 except when 0 is explicitly allowed
  // For this use case, user requested: "user can leave it empty or 0"; treat empty/0 as valid optional.
  const validateFields = (form) => {
    const errs = {};

    if (!form.title || !String(form.title).trim()) {
      errs.title = "Title is required";
    }

    // rounds: allow "" or 0 -> interpret later; if provided as number and < 1, flag
    if (form.rounds !== "" && typeof form.rounds === "number" && form.rounds < 1) {
      errs.rounds = "Rounds must be at least 1 when provided";
    }

    // For team sizes when event_type === "team": allow "" or 0, else if number, validate
    if (form.event_type === "team") {
      const min = form.min_team_size;
      const max = form.max_team_size;

      if (min !== "" && typeof min === "number" && min < 1) {
        errs.min_team_size = "Min team size must be ≥ 1 when provided";
      }
      if (max !== "" && typeof max === "number" && max < 1) {
        errs.max_team_size = "Max team size must be ≥ 1 when provided";
      }
      if (
        typeof min === "number" &&
        typeof max === "number" &&
        min >= 1 &&
        max >= 1 &&
        max < min
      ) {
        errs.max_team_size = "Max team size must be ≥ Min team size";
      }
    }

    // max_per_group: allow "" or 0; if number and < 0, flag
    if (
      form.max_per_group !== "" &&
      typeof form.max_per_group === "number" &&
      form.max_per_group < 0
    ) {
      errs.max_per_group = `Max per ${groupLabel.toLowerCase()} cannot be negative`;
    }

    setFieldErrors(errs);
    return errs;
  };

  // Sanitize before submit: convert "" to null, keep 0 if user typed 0, and enforce business defaults
  const sanitizeForSubmit = (form) => {
    const toNullableNumber = (v) => (v === "" ? null : typeof v === "number" ? v : null);

    const sanitized = {
      ...form,
      rounds:
        form.rounds === "" ? 1 : typeof form.rounds === "number" ? Math.max(1, form.rounds) : 1,
      max_per_group:
        form.max_per_group === "" ? null : typeof form.max_per_group === "number" ? form.max_per_group : null,
    };

    if (form.event_type === "individual") {
      sanitized.min_team_size = 1;
      sanitized.max_team_size = 1;
    } else {
      const min = toNullableNumber(form.min_team_size);
      const max = toNullableNumber(form.max_team_size);

      // Allow null or 0 to pass through; if both numeric, enforce max >= min
      if (typeof min === "number" && typeof max === "number") {
        sanitized.min_team_size = Math.max(1, min);
        sanitized.max_team_size = Math.max(sanitized.min_team_size, max);
      } else {
        // Keep null or 0 as-is for optional semantics
        sanitized.min_team_size = form.min_team_size === "" ? null : form.min_team_size ?? null;
        sanitized.max_team_size = form.max_team_size === "" ? null : form.max_team_size ?? null;
      }
    }

    return sanitized;
  };

  // Submit add/edit
  const saveEvent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      // Final validation
      const errs = validateFields(eventForm);
      if (Object.keys(errs).length > 0) {
        throw new Error("Please fix the highlighted fields");
      }

      // Sanitize payload
      const sanitizedEventForm = sanitizeForSubmit(eventForm);

      // Convert pointsForm to points_config object
      const pointsConfig = {};
      pointsForm.forEach((p) => {
        if (p.position > 0) {
          pointsConfig[String(p.position)] = p.points;
        }
      });

      const ageGroupPayload = (eventForm.age_group?.min || eventForm.age_group?.max)
        ? { min: eventForm.age_group.min || null, max: eventForm.age_group.max || null }
        : null;

      const eventPayload = {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        subcategory: eventForm.subcategory,
        mode: eventForm.mode,
        event_type: eventForm.event_type,
        participant_type: eventForm.participant_type,
        gender_filter: eventForm.gender_filter,
        age_group: ageGroupPayload,
        rounds: sanitizedEventForm.rounds,
        min_participants: sanitizedEventForm.min_team_size,
        max_participants: sanitizedEventForm.max_team_size,
        max_per_group: sanitizedEventForm.max_per_group,
        duration: eventForm.duration,
        instructions: eventForm.instructions,
        requirements: eventForm.requirements.filter(Boolean),
        rules: eventForm.rules,
        eligibility: eventForm.eligibility,
        status: sanitizedEventForm.status,
        points_config: pointsConfig,
        coordinator_id: sanitizedEventForm.coordinator_id,
        venue_id: sanitizedEventForm.venue_id,
        volunteers: sanitizedEventForm.volunteers,
        enable_blind_judging: sanitizedEventForm.enable_blind_judging,
      };

      // 1) Create or update event
      let savedEvent;
      if (editingEventId) {
        const { data: event } = await apiCall(`/api/event/${editingEventId}`, {
          method: "PUT",
          body: JSON.stringify(eventPayload),
        });
        savedEvent = event;
        setEvents((prev) =>
          prev.map((it) =>
            (it._id || it.event_id) === (event._id || event.event_id) ? event : it
          )
        );
      } else {
      const competitionId = competition?._id || competition?.id || competition?.competition_id;
        const payload = { 
          ...eventPayload, 
          competition_id: competitionId,
        };
        const { data: event } = await apiCall("/api/event", {
          method: "POST",
          body: JSON.stringify(payload),
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

      toast.success("Event saved successfully!");

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
      const catOk = filter.category === "all" || e.category === filter.category;
      const modeOk = filter.mode === "all" || e.mode === filter.mode;
      const typeOk = filter.type === "all" || e.event_type === filter.type;
      const queryOk =
        !q ||
        (e.title || e.name || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q);
      return catOk && modeOk && typeOk && queryOk;
    });
  }, [events, filter]);

  const getChip = (text, color) => (
    <span className={`px-2 py-1 text-xs rounded-full border ${color}`}>{text}</span>
  );

  return (
    <div className="min-h-dvh p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--card-fg)' }}>
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
        <div className="rounded-xl shadow-sm mb-4 p-1 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)' }}>
          <div className="flex gap-1">
            <button
              className={`flex-1 min-h-[44px] px-4 py-3 text-sm md:text-base font-medium rounded-lg transition ${
                activeTab === "manage"
                  ? "bg-orange-600 text-white shadow"
                  : "hover:bg-indigo-500/5"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
              style={activeTab !== "manage" ? { color: 'var(--card-fg)' } : {}}
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
                  ? "bg-orange-600 text-white shadow"
                  : "hover:bg-indigo-500/5"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
              style={(activeTab !== "add" && activeTab !== "edit") ? { color: 'var(--card-fg)' } : {}}
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
            <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  value={filter.query}
                  onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                  placeholder="Search by name or description"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                />
                <select
                  value={filter.category}
                  onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                >
                  <option value="all" className="bg-white dark:bg-[#0B1220]">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-white dark:bg-[#0B1220]">{c.label}</option>
                  ))}
                </select>
                <select
                  value={filter.mode}
                  onChange={(e) => setFilter({ ...filter, mode: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                >
                  <option value="all" className="bg-white dark:bg-[#0B1220]">All Modes</option>
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value} className="bg-white dark:bg-[#0B1220]">{m.label}</option>
                  ))}
                </select>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                >
                  <option value="all" className="bg-white dark:bg-[#0B1220]">All Types</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-white dark:bg-[#0B1220]">{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={startAdd}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
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
                    <div key={id} className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-lg" style={{ color: 'var(--card-fg)' }}>{e.name}</h3>
                          <p className="text-sm line-clamp-2" style={{ color: 'var(--chart-axis)' }}>
                            {e.description}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end max-w-[200px]">
                          {e.category && getChip(
                            e.category,
                            "bg-indigo-50 border-indigo-200 text-indigo-700"
                          )}
                          {getChip(
                            e.mode,
                            "bg-orange-50 border-orange-200 text-orange-700"
                          )}
                          {getChip(
                            e.event_type,
                            "bg-purple-50 border-purple-200 text-purple-700"
                          )}
                          {getChip(
                            e.status || "upcoming",
                            e.status === "completed"
                              ? "bg-green-50 border-green-200 text-green-700"
                              : e.status === "live"
                              ? "bg-red-50 border-red-200 text-red-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <span style={{ color: 'var(--chart-axis)' }}>Rounds</span>
                          <p className="font-semibold" style={{ color: 'var(--card-fg)' }}>{e.rounds}</p>
                        </div>
                        <div>
                          <span style={{ color: 'var(--chart-axis)' }}>Max/{groupLabel}</span>
                          <p className="font-semibold" style={{ color: 'var(--card-fg)' }}>{e.max_per_group}</p>
                        </div>
                        <div>
                          <span style={{ color: 'var(--chart-axis)' }}>Participants</span>
                          <p className="font-semibold" style={{ color: 'var(--card-fg)' }}>
                            {e.event_type === "individual"
                              ? "1"
                              : `${e.min_participants ?? e.min_team_size}–${e.max_participants ?? e.max_team_size}`}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: 'var(--chart-axis)' }}>Registered</span>
                          <p className="font-semibold" style={{ color: 'var(--card-fg)' }}>{usage.totalTeams}</p>
                        </div>
                        {e.gender_filter && e.gender_filter !== "all" && (
                          <div>
                            <span style={{ color: 'var(--chart-axis)' }}>Gender</span>
                            <p className="font-semibold capitalize" style={{ color: 'var(--card-fg)' }}>{e.gender_filter}</p>
                          </div>
                        )}
                        {e.duration && (
                          <div>
                            <span style={{ color: 'var(--chart-axis)' }}>Duration</span>
                            <p className="font-semibold" style={{ color: 'var(--card-fg)' }}>{e.duration}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() => startEdit(e)}
                          className="flex-1 px-3 py-2 min-h-[44px] border rounded-lg text-sm font-bold"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setSharingEvent(e)}
                          className="flex-1 px-3 py-2 min-h-[44px] border rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                        >
                          <Share2 className="h-4 w-4 text-orange-600" /> Share
                        </button>
                        <button
                          onClick={() => deleteEvent(id)}
                          className="flex-1 px-3 py-2 min-h-[44px] bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-bold"
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
            <div className="hidden md:block rounded-xl shadow-sm overflow-hidden border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b" style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--border-divider)' }}>
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Event</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Category</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Mode</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Type</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Status</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Rounds</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Participants</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Gender</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Max/{groupLabel}</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Registered</th>
                      <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--chart-axis)' }}>Actions</th>
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
                          <tr key={id} className="border-b hover:bg-indigo-500/5" style={{ borderBottomColor: 'var(--border-divider)' }}>
                            <td className="p-4">
                              <div className="font-semibold text-base" style={{ color: 'var(--card-fg)' }}>{e.name}</div>
                              <div className="text-sm line-clamp-1" style={{ color: 'var(--chart-axis)' }}>{e.description}</div>
                            </td>
                            <td className="p-4">
                              {getChip(e.category || "general", "bg-indigo-50 border-indigo-200 text-indigo-700")}
                            </td>
                            <td className="p-4">
                              {getChip(e.mode, "bg-orange-50 border-orange-200 text-orange-700")}
                            </td>
                            <td className="p-4">
                              {getChip(e.event_type, "bg-purple-50 border-purple-200 text-purple-700")}
                            </td>
                            <td className="p-4">
                              {getChip(
                                e.status || "upcoming",
                                e.status === "completed"
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : e.status === "live"
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : "bg-blue-50 border-blue-200 text-blue-700"
                              )}
                            </td>
                            <td className="p-4 font-semibold" style={{ color: 'var(--card-fg)' }}>{e.rounds}</td>
                            <td className="p-4 font-semibold" style={{ color: 'var(--card-fg)' }}>
                              {e.event_type === "individual" ? "1" : `${e.min_participants ?? e.min_team_size}–${e.max_participants ?? e.max_team_size}`}
                            </td>
                            <td className="p-4 font-semibold capitalize" style={{ color: 'var(--card-fg)' }}>
                              {e.gender_filter === "all" ? "Any" : e.gender_filter}
                            </td>
                            <td className="p-4 font-semibold" style={{ color: 'var(--card-fg)' }}>{e.max_per_group}</td>
                            <td className="p-4 font-semibold" style={{ color: 'var(--card-fg)' }}>{usage.totalTeams}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEdit(e)}
                                  className="px-3 py-1 border rounded-lg text-sm font-bold"
                                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setSharingEvent(e)}
                                  className="px-3 py-1 border rounded-lg text-sm font-bold flex items-center gap-1"
                                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                                >
                                  <Share2 className="h-3.5 w-3.5 text-orange-600" /> Share
                                </button>
                                <button
                                  onClick={() => deleteEvent(id)}
                                  className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-bold"
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
          <div className="rounded-xl shadow-sm p-4 md:p-6 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
            <form onSubmit={saveEvent} className="space-y-4" noValidate>

              {/* ───── SECTION 1: Event Basics (always open) ───── */}
              <section className="border rounded-lg p-4" style={{ borderColor: 'var(--border-divider)' }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--card-fg)' }}>Event Basics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Title *</label>
                    <input type="text" required value={eventForm.title}
                      onChange={(e) => handleEventChange("title", e.target.value)}
                      placeholder="Enter event title"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ backgroundColor: 'var(--surface)', borderColor: fieldErrors.title ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-divider)', color: 'var(--card-fg)' }} />
                    {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Status</label>
                    <select value={eventForm.status}
                      onChange={(e) => handleEventChange("status", e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                      {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value} className="bg-white dark:bg-[#0B1220]">{s.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Category *</label>
                    <select value={eventForm.category}
                      onChange={(e) => handleEventChange("category", e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                      {CATEGORIES.map((c) => (<option key={c.value} value={c.value} className="bg-white dark:bg-[#0B1220]">{c.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Subcategory</label>
                    <input type="text" value={eventForm.subcategory}
                      onChange={(e) => handleEventChange("subcategory", e.target.value)}
                      placeholder="e.g. Mono Act, Solo Dance"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Mode</label>
                    <select value={eventForm.mode}
                      onChange={(e) => handleEventChange("mode", e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                      {MODES.map((m) => (<option key={m.value} value={m.value} className="bg-white dark:bg-[#0B1220]">{m.label}</option>))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Description</label>
                    <textarea rows={3} value={eventForm.description}
                      onChange={(e) => handleEventChange("description", e.target.value)}
                      placeholder="Brief description of the event"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                  </div>
                </div>
              </section>

              {/* ───── SECTION 2: Participation (collapsible) ───── */}
              <section className="border rounded-lg" style={{ borderColor: 'var(--border-divider)' }}>
                <button type="button" onClick={() => setShowParticipation((s) => !s)}
                  className="w-full flex items-center justify-between p-4 text-left"
                  style={{ color: 'var(--card-fg)' }}>
                  <h2 className="text-lg font-bold">Participation Rules</h2>
                  {showParticipation ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
                {showParticipation && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-4" style={{ borderTopColor: 'var(--border-divider)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Event Type</label>
                        <select value={eventForm.event_type}
                          onChange={(e) => handleEventChange("event_type", e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                          {EVENT_TYPES.map((t) => (<option key={t.value} value={t.value} className="bg-white dark:bg-[#0B1220]">{t.label}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Participant Type</label>
                        <select value={eventForm.participant_type}
                          onChange={(e) => handleEventChange("participant_type", e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                          {PARTICIPANT_TYPES.map((t) => (<option key={t.value} value={t.value} className="bg-white dark:bg-[#0B1220]">{t.label}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Gender</label>
                        <select value={eventForm.gender_filter}
                          onChange={(e) => handleEventChange("gender_filter", e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                          {GENDER_OPTIONS.map((g) => (<option key={g.value} value={g.value} className="bg-white dark:bg-[#0B1220]">{g.label}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>
                          Max per {groupLabel.toLowerCase()}
                        </label>
                        <input type="number" min={0}
                          value={eventForm.max_per_group === 0 ? 0 : eventForm.max_per_group ?? ""}
                          onChange={(e) => handleEventChange("max_per_group", e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: fieldErrors.max_per_group ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-divider)', color: 'var(--card-fg)' }} />
                        {fieldErrors.max_per_group && <p className="mt-1 text-xs text-red-600">{fieldErrors.max_per_group}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Min Participants</label>
                        <input type="number" min={0}
                          disabled={eventForm.event_type === "individual"}
                          value={eventForm.event_type === "individual" ? 1 : eventForm.min_team_size ?? ""}
                          onChange={(e) => handleEventChange("min_team_size", e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: fieldErrors.min_team_size ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-divider)', color: 'var(--card-fg)', opacity: eventForm.event_type === "individual" ? 0.5 : 1 }} />
                        {fieldErrors.min_team_size && <p className="mt-1 text-xs text-red-600">{fieldErrors.min_team_size}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Max Participants</label>
                        <input type="number" min={0}
                          disabled={eventForm.event_type === "individual"}
                          value={eventForm.event_type === "individual" ? 1 : eventForm.max_team_size ?? ""}
                          onChange={(e) => handleEventChange("max_team_size", e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: fieldErrors.max_team_size ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-divider)', color: 'var(--card-fg)', opacity: eventForm.event_type === "individual" ? 0.5 : 1 }} />
                        {fieldErrors.max_team_size && <p className="mt-1 text-xs text-red-600">{fieldErrors.max_team_size}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Age Group (Min)</label>
                        <input type="number" min={0}
                          value={eventForm.age_group?.min ?? ""}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, age_group: { ...prev.age_group, min: e.target.value } }))}
                          placeholder="Min age"
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Age Group (Max)</label>
                        <input type="number" min={0}
                          value={eventForm.age_group?.max ?? ""}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, age_group: { ...prev.age_group, max: e.target.value } }))}
                          placeholder="Max age"
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* ───── SECTION 3: Event Details (collapsible) ───── */}
              <section className="border rounded-lg" style={{ borderColor: 'var(--border-divider)' }}>
                <button type="button" onClick={() => setShowEventDetails((s) => !s)}
                  className="w-full flex items-center justify-between p-4 text-left"
                  style={{ color: 'var(--card-fg)' }}>
                  <h2 className="text-lg font-bold">Rules & Requirements</h2>
                  {showEventDetails ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
                {showEventDetails && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-4" style={{ borderTopColor: 'var(--border-divider)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Duration</label>
                        <input type="text" value={eventForm.duration}
                          onChange={(e) => handleEventChange("duration", e.target.value)}
                          placeholder="e.g. 5 minutes"
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Rules</label>
                      <textarea rows={3} value={eventForm.rules}
                        onChange={(e) => handleEventChange("rules", e.target.value)}
                        placeholder="No vulgar content, no props, etc."
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Eligibility</label>
                      <textarea rows={2} value={eventForm.eligibility}
                        onChange={(e) => handleEventChange("eligibility", e.target.value)}
                        placeholder="Who can participate (e.g. Open to all classes 9-12)"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Instructions</label>
                      <textarea rows={2} value={eventForm.instructions}
                        onChange={(e) => handleEventChange("instructions", e.target.value)}
                        placeholder="Pre-event and during-event instructions"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Requirements / Equipment</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {eventForm.requirements.map((req, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                            {req}
                            <button type="button" onClick={() => {
                              const updated = eventForm.requirements.filter((_, i) => i !== idx);
                              setEventForm((prev) => ({ ...prev, requirements: updated }));
                            }} className="text-red-500 hover:text-red-700">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={newRequirement}
                          onChange={(e) => setNewRequirement(e.target.value)}
                          placeholder="Add requirement"
                          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newRequirement.trim()) {
                                setEventForm((prev) => ({ ...prev, requirements: [...prev.requirements, newRequirement.trim()] }));
                                setNewRequirement("");
                              }
                            }
                          }} />
                        <button type="button" onClick={() => {
                          if (newRequirement.trim()) {
                            setEventForm((prev) => ({ ...prev, requirements: [...prev.requirements, newRequirement.trim()] }));
                            setNewRequirement("");
                          }
                        }} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--chart-axis)' }}>Press Enter or click + to add. Click × to remove.</p>
                    </div>
                  </div>
                )}
              </section>

              {/* ───── SECTION 4: Rounds & Schedule (collapsible) ───── */}
              <section className="border rounded-lg" style={{ borderColor: 'var(--border-divider)' }}>
                <button type="button" onClick={() => setShowSchedule((s) => !s)}
                  className="w-full flex items-center justify-between p-4 text-left"
                  style={{ color: 'var(--card-fg)' }}>
                  <h2 className="text-lg font-bold">Rounds & Schedule</h2>
                  {showSchedule ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
                {showSchedule && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-4" style={{ borderTopColor: 'var(--border-divider)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Total rounds</label>
                        <input type="number" min={1} value={eventForm.rounds ?? ""}
                          onChange={(e) => handleEventChange("rounds", e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{ backgroundColor: 'var(--surface)', borderColor: fieldErrors.rounds ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-divider)', color: 'var(--card-fg)' }} />
                        {fieldErrors.rounds && <p className="mt-1 text-xs text-red-600">{fieldErrors.rounds}</p>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {roundsForm.map((r, idx) => (
                        <div key={idx} className="border rounded-lg p-3" style={{ borderColor: 'var(--border-divider)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg" style={{ color: 'var(--card-fg)' }}>Round {r.round_no}</h3>
                            <select value={r.status}
                              onChange={(e) => updateRoundField(idx, "status", e.target.value)}
                              className="px-3 py-2 border rounded-lg text-sm"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}>
                              {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value} className="bg-white dark:bg-[#0B1220]">{s.label}</option>))}
                            </select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Date & Time</label>
                              <input type="datetime-local"
                                value={r.date && r.time ? `${r.date}T${r.time}` : ""}
                                onChange={(e) => updateRoundDateTime(idx, e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Venue</label>
                              <input type="text" value={r.venue || ""}
                                onChange={(e) => updateRoundField(idx, "venue", e.target.value)}
                                placeholder="Enter venue"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* ───── SECTION 5: Points Config (collapsible) ───── */}
              <section className="border rounded-lg" style={{ borderColor: 'var(--border-divider)' }}>
                <button type="button" onClick={() => setShowPoints((s) => !s)}
                  className="w-full flex items-center justify-between p-4 text-left"
                  style={{ color: 'var(--card-fg)' }}>
                  <h2 className="text-lg font-bold">Points Configuration</h2>
                  {showPoints ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
                {showPoints && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-4" style={{ borderTopColor: 'var(--border-divider)' }}>
                    <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Define placements and points; leave empty to use global settings</p>
                    <div className="space-y-2">
                      {pointsForm.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2">
                          <div className="col-span-5 md:col-span-3">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Position</label>
                            <input type="number" min={1} value={row.position}
                              onChange={(e) => updatePointRow(idx, "position", e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                          </div>
                          <div className="col-span-5 md:col-span-3">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--chart-axis)' }}>Points</label>
                            <input type="number" min={0} value={row.points}
                              onChange={(e) => updatePointRow(idx, "points", e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }} />
                          </div>
                          <div className="col-span-2 md:col-span-2 flex items-end">
                            <button type="button" onClick={() => removePointRow(idx)}
                              className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">Remove</button>
                          </div>
                        </div>
                      ))}
                      <div>
                        <button type="button" onClick={addPointRow}
                          className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 text-sm font-medium">Add row</button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Footer actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { resetForms();
                    setActiveTab("manage");
                  }}
                  className="flex-1 md:flex-none md:min-w-[140px] px-4 py-3 border font-medium rounded-lg"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 md:flex-none md:min-w-[160px] px-4 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Share Modal */}
        {sharingEvent && (() => {
          const id = sharingEvent._id || sharingEvent.event_id;
          const shareLink = `${window.location.origin}/participate/${id}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareLink)}`;

          const copyToClipboard = () => {
            navigator.clipboard.writeText(shareLink);
            toast.success("Registration link copied to clipboard!");
          };

          const downloadQR = async () => {
            const loadToast = toast.loading("Generating QR Code...");
            try {
              const response = await fetch(qrUrl);
              const blob = await response.blob();
              const blobUrl = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = blobUrl;
              a.download = `QR_${sharingEvent.name.replace(/[^a-zA-Z0-9]+/g, "_")}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(blobUrl);
              toast.dismiss(loadToast);
              toast.success("QR Code downloaded successfully!");
            } catch {
              toast.dismiss(loadToast);
              window.open(qrUrl, "_blank");
            }
          };

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Share Participation Invite</h3>
                    <p className="text-xs text-slate-500 mt-1">Provide direct registration access for <b>{sharingEvent.name}</b></p>
                  </div>
                  <button
                    onClick={() => setSharingEvent(null)}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                      <img 
                        src={qrUrl} 
                        alt="Event QR Code" 
                        className="h-44 w-44 object-contain"
                        onError={() => toast.error("Failed to load QR code image")}
                      />
                    </div>
                    <button
                      onClick={downloadQR}
                      className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-xs font-semibold rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-orange-600" />
                      Download PNG QR Code
                    </button>
                  </div>

                  {/* Direct Link Container */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Direct Link</label>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-xs truncate flex-1 font-mono text-slate-500 pl-1">{shareLink}</span>
                      <button
                        onClick={copyToClipboard}
                        className="h-9 w-9 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-sm cursor-pointer"
                        title="Copy Link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ManageEvents;
