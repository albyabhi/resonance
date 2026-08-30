import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { Share2, Copy, Download, X, ChevronDown, ChevronRight, Plus, UserCheck, MapPin } from "lucide-react";
import { useRealtime } from "../../context/RealtimeContext";
import EventStatusBadge from "../EventStatusBadge";
import EventStatusSelector from "../EventStatusSelector";
import ManageJudges from "./ManageJudges";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../ui/alert-dialog";

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

import { STATUS_OPTIONS as STATUS_OPTIONS_FULL } from "../../utils/eventStatus";
const STATUS_OPTIONS = STATUS_OPTIONS_FULL;

const GENDER_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const REGISTRATION_MODES = [
  { value: "hybrid", label: "Hybrid" },
  { value: "captain", label: "Captain Only" },
  { value: "participant", label: "Participant Only" },
];

const CREATION_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
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
  registration_mode: "hybrid",
  max_self_registrations: null,
  mode: "onstage",
  event_type: "individual",
  gender_filter: "all",
  age_group: { min: "", max: "" },
  max_per_group: 1,
  duration: "",
  instructions: "",
  requirements: [],
  rules: "",
  eligibility: "",
  status: "draft",
  registration_closes_at: "",
  coordinator_id: "",
  venue_id: "",
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
  const { token, competition, role } = useAuth();
  const { groupLabel } = useCompetition();
  const { lastUpdate } = useRealtime() || {};
  const [activeTab, setActiveTab] = useState("manage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [events, setEvents] = useState([]);
  const [usageByEventId, setUsageByEventId] = useState({});

  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT_FORM);
  const [roundsForm, setRoundsForm] = useState(() => {
    const defaults = getCurrentScheduleDefaults();
    return [{ ...DEFAULT_ROUND, date: defaults.date, time: defaults.time }];
  });
  const [pointsForm, setPointsForm] = useState([...DEFAULT_POINTS]);
  const [filter, setFilter] = useState({ mode: "all", type: "all", category: "all", query: "" });

  const [showParticipation, setShowParticipation] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [newRequirement, setNewRequirement] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [sharingEvent, setSharingEvent] = useState(null);
  const [managingJudges, setManagingJudges] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletionImpact, setDeletionImpact] = useState(null);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [deletionConfirmText, setDeletionConfirmText] = useState("");

  const [coordinators, setCoordinators] = useState([]);
  const [venues, setVenues] = useState([]);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [createVenueContext, setCreateVenueContext] = useState(null); // {source: "event_form" | "round", roundIndex?: number}
  const [venueForm, setVenueForm] = useState({ name: "", location: "", capacity: "" });

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    });
  }, [token]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const competitionId = competition?._id || competition?.id || competition?.competition_id;
      const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";

      const [{ events }] = await Promise.all([
        apiCall(`/api/event${competitionQuery}`),
      ]);
      setEvents(events || []);

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
  }, [competition, apiCall]);

  useEffect(() => {
    if (token) fetchAll();
  }, [token, lastUpdate, fetchAll]);

  useEffect(() => {
    if (!token) return;
    const fetchCoordinators = async () => {
      try {
        const { data } = await apiCall("/api/event/coordinators");
        setCoordinators(data || []);
      } catch {
        setCoordinators([]);
      }
    };
    fetchCoordinators();
  }, [token, apiCall]);

  useEffect(() => {
    if (!token) return;
    const fetchVenues = async () => {
      try {
        const competitionId = competition?._id || competition?.id || competition?.competition_id;
        const query = competitionId ? `?competition_id=${competitionId}` : "";
        const { data } = await apiCall(`/api/venues${query}`);
        setVenues(data || []);
      } catch {
        setVenues([]);
      }
    };
    fetchVenues();
  }, [token, apiCall, competition]);

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
    setActiveTab("form");
  };

  const startEdit = async (evt) => {
    try {
      setLoading(true);
      setError("");
      const eventId = evt._id || evt.event_id;
      setEditingEventId(eventId);

      const { data: event } = await apiCall(`/api/event/${eventId}`);

      let schedules = [];
      try {
        const scheduleResp = await apiCall(`/api/schedule?event_id=${eventId}`);
        schedules = scheduleResp.schedules || scheduleResp.schedule || [];
      } catch { /* ignore */ }

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
        registration_mode: event.registration_mode || "hybrid",
        max_self_registrations: event.max_self_registrations ?? null,
        mode: event.mode || "onstage",
        event_type: event.event_type || "individual",
        gender_filter: event.gender_filter || "all",
        age_group: event.age_group ? { min: event.age_group.min ?? "", max: event.age_group.max ?? "" } : { min: "", max: "" },
        max_per_group: event.max_per_group ?? 1,
        duration: event.duration || "",
        instructions: event.instructions || "",
        requirements: event.requirements || [],
        rules: event.rules || "",
        eligibility: event.eligibility || "",
        status: event.status || "draft",
        registration_closes_at: event.registration_closes_at
          ? new Date(event.registration_closes_at).toISOString().slice(0, 16)
          : "",
        coordinator_id: event.coordinator_id?._id || event.coordinator_id || "",
        venue_id: event.venue_id?._id || event.venue_id || "",
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

      const pts = [];
      if (event.points_config) {
        Object.entries(event.points_config).forEach(([pos, pts_val]) => {
          pts.push({ position: parseInt(pos, 10), points: pts_val });
        });
      }
      setPointsForm(pts.length ? pts.sort((a, b) => a.position - b.position) : [...DEFAULT_POINTS]);

      setActiveTab("form");
      setShowSchedule(true);
      setShowPoints(false);
      setFieldErrors({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const BLOCKED_DELETE_STATUSES = ["ongoing", "judging", "result_pending", "published", "completed"];

  const getDeleteBlockedReason = (status) => {
    const reasons = {
      ongoing: "This event is currently LIVE. Cancel it before deleting.",
      judging: "Judges are actively scoring. Cancel it before deleting.",
      result_pending: "Results are being finalized. Cancel it before deleting.",
      published: "Results are public. Cancel it before deleting.",
      completed: "Completed events cannot be deleted.",
    };
    return reasons[status] || null;
  };

  const canDeleteEvent = (event) => !BLOCKED_DELETE_STATUSES.includes(event.status);

  const fetchDeletionImpact = async (eventId) => {
    try {
      setDeletionLoading(true);
      const { data } = await apiCall(`/api/event/${eventId}/deletion-impact`);
      setDeletionImpact(data);
    } catch (err) {
      toast.error(err.message || "Failed to assess deletion impact");
      setDeleteConfirmId(null);
    } finally {
      setDeletionLoading(false);
    }
  };

  const handleDeleteClick = (eventId) => {
    setDeleteConfirmId(eventId);
    setDeletionImpact(null);
    setDeletionConfirmText("");
    fetchDeletionImpact(eventId);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setLoading(true);
      setError("");
      await apiCall(`/api/event/${deleteConfirmId}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => (e._id || e.event_id) !== deleteConfirmId));
      toast.success("Event deleted successfully");
      setDeleteConfirmId(null);
      setDeletionImpact(null);
      setDeletionConfirmText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (eventId, newStatus) => {
    try {
      setLoading(true);
      setError("");
      await apiCall(`/api/event/${eventId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setEvents((prev) => prev.map((e) => {
        if ((e._id || e.event_id) === eventId) {
          return { ...e, status: newStatus };
        }
        return e;
      }));
      toast.success(`Status changed to ${newStatus.replace(/_/g, " ")}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const delayEvent = async (eventId) => {
    try {
      setLoading(true);
      setError("");
      const remarks = window.prompt("Reason for delay (optional):") || "";
      await apiCall(`/api/event/${eventId}/delay`, {
        method: "POST",
        body: JSON.stringify({ remarks }),
      });
      setEvents((prev) => prev.map((e) => {
        if ((e._id || e.event_id) === eventId) {
          return { ...e, status: "delayed", previous_status: e.status };
        }
        return e;
      }));
      toast.success("Event delayed");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resumeEvent = async (eventId) => {
    try {
      setLoading(true);
      setError("");
      const remarks = window.prompt("Reason for resuming (optional):") || "";
      await apiCall(`/api/event/${eventId}/resume`, {
        method: "POST",
        body: JSON.stringify({ remarks }),
      });
      setEvents((prev) => prev.map((e) => {
        if ((e._id || e.event_id) === eventId) {
          return { ...e, status: e.previous_status || "draft", previous_status: null };
        }
        return e;
      }));
      toast.success("Event resumed");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          next[field] = "";
        } else {
          const n = parseInt(value, 10);
          if (!Number.isNaN(n)) next[field] = n;
        }
      } else {
        next[field] = value;
      }

      if (field === "event_type") {
        if (value === "individual") {
          next.min_team_size = 1;
          next.max_team_size = 1;
        } else if (
          (!next.min_team_size || next.min_team_size <= 1) &&
          (!next.max_team_size || next.max_team_size <= 1)
        ) {
          next.min_team_size = 1;
          next.max_team_size = 10;
        }
      }

      if (field === "min_team_size") {
        const minVal = typeof next.min_team_size === "number" ? next.min_team_size : null;
        const maxVal = typeof next.max_team_size === "number" ? next.max_team_size : null;
        if (minVal != null && maxVal != null && minVal > maxVal) {
          next.max_team_size = minVal;
        }
      }

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

  const saveVenueFromEvents = async () => {
    try {
      setError("");
      if (!venueForm.name.trim() || !venueForm.location.trim()) {
        setError("Venue name and location are required");
        return;
      }
      const competitionId = competition?._id || competition?.id || competition?.competition_id;
      const payload = {
        name: venueForm.name.trim(),
        location: venueForm.location.trim(),
        capacity: venueForm.capacity ? parseInt(venueForm.capacity, 10) : null,
        competition_id: competitionId,
      };
      const { data: newVenue } = await apiCall("/api/venues", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Refresh venues list
      const query = competitionId ? `?competition_id=${competitionId}` : "";
      const { data: updatedVenues } = await apiCall(`/api/venues${query}`);
      setVenues(updatedVenues || []);
      // Auto-select the new venue in the correct place
      if (createVenueContext?.source === "event_form") {
        handleEventChange("venue_id", newVenue._id);
      } else if (createVenueContext?.source === "round" && createVenueContext.roundIndex != null) {
        updateRoundField(createVenueContext.roundIndex, "venue", newVenue.name);
      }
      setShowCreateVenue(false);
      setCreateVenueContext(null);
      setVenueForm({ name: "", location: "", capacity: "" });
      toast.success("Venue created successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const validateFields = (form) => {
    const errs = {};

    if (!form.title || !String(form.title).trim()) {
      errs.title = "Title is required";
    }

    if (form.rounds !== "" && typeof form.rounds === "number" && form.rounds < 1) {
      errs.rounds = "Rounds must be at least 1 when provided";
    }

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

      if (typeof min === "number" && typeof max === "number") {
        sanitized.min_team_size = Math.max(1, min);
        sanitized.max_team_size = Math.max(sanitized.min_team_size, max);
      } else {
        sanitized.min_team_size = form.min_team_size === "" ? null : form.min_team_size ?? null;
        sanitized.max_team_size = form.max_team_size === "" ? null : form.max_team_size ?? null;
      }
    }

    return sanitized;
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const errs = validateFields(eventForm);
      if (Object.keys(errs).length > 0) {
        throw new Error("Please fix the highlighted fields");
      }

      const sanitizedEventForm = sanitizeForSubmit(eventForm);

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
        registration_mode: eventForm.registration_mode,
        max_self_registrations: eventForm.max_self_registrations ? Number(eventForm.max_self_registrations) : null,
        mode: eventForm.mode,
        event_type: eventForm.event_type,
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
        registration_closes_at: eventForm.registration_closes_at
          ? new Date(eventForm.registration_closes_at).toISOString()
          : null,
        points_config: pointsConfig,
        coordinator_id: sanitizedEventForm.coordinator_id,
        venue_id: sanitizedEventForm.venue_id,
        volunteers: sanitizedEventForm.volunteers,
        enable_blind_judging: sanitizedEventForm.enable_blind_judging,
      };

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

  const onTabChange = (v) => {
    if (v === "manage") {
      setActiveTab("manage");
      resetForms();
    } else {
      startAdd();
    }
  };

  return (
    <div className="min-h-dvh p-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 text-card-foreground">
            Events Management
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Create and schedule events, define rules, and configure scoring
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive-foreground px-4 py-3 rounded-lg mb-4 flex items-center">
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError("")} className="text-destructive-foreground hover:text-destructive ml-2 p-0 h-auto">
              ×
            </Button>
          </div>
        )}

        <Tabs value={activeTab === "manage" ? "manage" : "form"} onValueChange={onTabChange} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="manage" className="flex-1">Manage Events</TabsTrigger>
            {(role !== "event_coordinator" || editingEventId) && (
              <TabsTrigger value="form" className="flex-1">
                {editingEventId ? "Edit Event" : "Add Event"}
              </TabsTrigger>
            )}
          </TabsList>

          {activeTab === "manage" && (
            <TabsContent value="manage" className="space-y-4 mt-4">
              <Card className="rounded-lg">
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Input
                      value={filter.query}
                      onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                      placeholder="Search by name or description"
                    />
                    <Select value={filter.category} onValueChange={(v) => setFilter({ ...filter, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filter.mode} onValueChange={(v) => setFilter({ ...filter, mode: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Modes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        {MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filter.type} onValueChange={(v) => setFilter({ ...filter, type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {EVENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {role !== "event_coordinator" && (
                      <Button onClick={startAdd} className="bg-accent-amber text-white hover:bg-accent-amber/90">
                        Add Event
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="md:hidden space-y-3">
                {loading ? (
                  <div className="text-muted-foreground">Loading…</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-muted-foreground">No events found</div>
                ) : (
                  filteredEvents.map((e) => {
                    const id = e._id || e.event_id;
                    const usage = usageByEventId[id] || { totalTeams: 0, byHouse: {} };
                    return (
                      <Card key={id} className="rounded-lg">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-lg text-card-foreground">{e.title || e.name}</h3>
                              <p className="text-sm line-clamp-2 text-muted-foreground">{e.description}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0 flex-wrap justify-end max-w-[200px]">
                              {e.category && (
                                <Badge variant="secondary" className="bg-accent-blue/10 text-accent-blue border-accent-blue/30">
                                  {e.category}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="bg-accent-amber/10 text-accent-amber border-accent-amber/30">
                                {e.mode}
                              </Badge>
                              <Badge variant="secondary">{e.event_type}</Badge>
                              <EventStatusBadge status={e.status || "draft"} size="sm" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Rounds</span>
                              <p className="font-semibold text-card-foreground">{e.rounds}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max/{groupLabel}</span>
                              <p className="font-semibold text-card-foreground">{e.max_per_group}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Participants</span>
                              <p className="font-semibold text-card-foreground">
                                {e.event_type === "individual"
                                  ? "1"
                                  : `${e.min_participants ?? e.min_team_size}–${e.max_participants ?? e.max_team_size}`}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Registered</span>
                              <p className="font-semibold text-card-foreground">{usage.totalTeams}</p>
                            </div>
                            {e.gender_filter && e.gender_filter !== "all" && (
                              <div>
                                <span className="text-muted-foreground">Gender</span>
                                <p className="font-semibold capitalize text-card-foreground">{e.gender_filter}</p>
                              </div>
                            )}
                            {e.duration && (
                              <div>
                                <span className="text-muted-foreground">Duration</span>
                                <p className="font-semibold text-card-foreground">{e.duration}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => startEdit(e)} className="flex-1">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setManagingJudges(e)} className="flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 text-accent-amber" /> Judges
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setSharingEvent(e)} className="flex-1 flex items-center justify-center gap-1">
                              <Share2 className="h-4 w-4 text-accent-amber" /> Share
                            </Button>
                            {(() => {
                              const s = e.status || "draft";
                              if (s === "draft") {
                                return (
                                  <Button variant="default" size="sm" onClick={() => changeStatus(id, "registration_open")} className="flex-1">
                                    Open Registration
                                  </Button>
                                );
                              }
                              if (s === "registration_open") {
                                return (
                                  <Button variant="secondary" size="sm" onClick={() => changeStatus(id, "registration_closed")} className="flex-1">
                                    Close Registration
                                  </Button>
                                );
                              }
                              if (s !== "delayed" && s !== "cancelled") {
                                return (
                                  <Button variant="outline" size="sm" onClick={() => delayEvent(id)}>
                                    Delay
                                  </Button>
                                );
                              }
                              if (s === "delayed") {
                                return (
                                  <Button variant="default" size="sm" onClick={() => resumeEvent(id)}>
                                    Resume
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(id)} className="flex-1" disabled={!canDeleteEvent(e)} title={getDeleteBlockedReason(e.status)}>
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-muted-foreground">Event</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-muted-foreground">Mode</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Rounds</TableHead>
                      <TableHead className="text-muted-foreground">Participants</TableHead>
                      <TableHead className="text-muted-foreground">Gender</TableHead>
                      <TableHead className="text-muted-foreground">Max/{groupLabel}</TableHead>
                      <TableHead className="text-muted-foreground">Registered</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-muted-foreground">Loading…</TableCell>
                      </TableRow>
                    ) : filteredEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-muted-foreground">No events found</TableCell>
                      </TableRow>
                    ) : (
                      filteredEvents.map((e) => {
                        const id = e._id || e.event_id;
                        const usage = usageByEventId[id] || { totalTeams: 0 };
                        return (
                          <TableRow key={id} className="hover:bg-muted border-b border-border">
                            <TableCell>
                              <div className="font-semibold text-base text-card-foreground">{e.title || e.name}</div>
                              <div className="text-sm line-clamp-1 text-muted-foreground">{e.description}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-accent-blue/10 text-accent-blue border-accent-blue/30">
                                {e.category || "general"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-accent-amber/10 text-accent-amber border-accent-amber/30">
                                {e.mode}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{e.event_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <EventStatusBadge status={e.status || "draft"} />
                            </TableCell>
                            <TableCell className="font-semibold text-card-foreground">{e.rounds}</TableCell>
                            <TableCell className="font-semibold text-card-foreground">
                              {e.event_type === "individual" ? "1" : `${e.min_participants ?? e.min_team_size}–${e.max_participants ?? e.max_team_size}`}
                            </TableCell>
                            <TableCell className="font-semibold capitalize text-card-foreground">
                              {e.gender_filter === "all" ? "Any" : e.gender_filter}
                            </TableCell>
                            <TableCell className="font-semibold text-card-foreground">{e.max_per_group}</TableCell>
                            <TableCell className="font-semibold text-card-foreground">{usage.totalTeams}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" size="sm" onClick={() => startEdit(e)}>Edit</Button>
                                <Button variant="outline" size="sm" onClick={() => setManagingJudges(e)} className="flex items-center gap-1">
                                  <UserCheck className="h-3.5 w-3.5 text-accent-amber" /> Judges
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setSharingEvent(e)} className="flex items-center gap-1">
                                  <Share2 className="h-3.5 w-3.5 text-accent-amber" /> Share
                                </Button>
                                {(() => {
                                  const s = e.status || "draft";
                                  if (s === "draft") {
                                    return (
                                      <Button variant="default" size="sm" onClick={() => changeStatus(id, "registration_open")}>
                                        Open Registration
                                      </Button>
                                    );
                                  }
                                  if (s === "registration_open") {
                                    return (
                                      <Button variant="secondary" size="sm" onClick={() => changeStatus(id, "registration_closed")}>
                                        Close Registration
                                      </Button>
                                    );
                                  }
                                  if (s !== "delayed" && s !== "cancelled") {
                                    return (
                                      <Button variant="outline" size="sm" onClick={() => delayEvent(id)}>
                                        Delay
                                      </Button>
                                    );
                                  }
                                  if (s === "delayed") {
                                    return (
                                      <Button variant="default" size="sm" onClick={() => resumeEvent(id)}>
                                        Resume
                                      </Button>
                                    );
                                  }
                                  return null;
                                })()}
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(id)} disabled={!canDeleteEvent(e)} title={getDeleteBlockedReason(e.status)}>Delete</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {(activeTab === "form") && (
            <TabsContent value="form" className="space-y-4 mt-4">
              <Card className="rounded-lg">
                <CardContent className="p-5 md:p-6">
                  <form onSubmit={saveEvent} className="space-y-4" noValidate>

                    <div className="border border-border rounded-lg p-4">
                      <h2 className="text-lg font-bold mb-4 text-card-foreground">Event Basics</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <Label className="text-muted-foreground mb-2 block">Title *</Label>
                          <Input type="text" required value={eventForm.title}
                            onChange={(e) => handleEventChange("title", e.target.value)}
                            placeholder="Enter event title"
                            className={fieldErrors.title ? "border-destructive" : ""} />
                          {fieldErrors.title && <p className="mt-1 text-xs text-destructive-foreground">{fieldErrors.title}</p>}
                        </div>
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Status</Label>
                          {editingEventId ? (
                            <div className="flex items-center gap-2">
                              <EventStatusBadge status={eventForm.status || "draft"} size="lg" />
                              <EventStatusSelector
                                event={{ _id: editingEventId, status: eventForm.status }}
                                onStatusChanged={() => {
                                  const fetchEvent = async () => {
                                    try {
                                      const { data: evt } = await apiCall(`/api/event/${editingEventId}`);
                                      setEventForm((prev) => ({ ...prev, status: evt.status }));
                                    } catch (e) { console.error("Failed to refresh event status", e); }
                                  };
                                  fetchEvent();
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <Select value={eventForm.status || "draft"} onValueChange={(v) => handleEventChange("status", v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select starting status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CREATION_STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="mt-1 text-xs text-muted-foreground">Draft by default — you may pick a different starting status.</p>
                            </>
                          )}
                        </div>
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Category *</Label>
                          <Select value={eventForm.category} onValueChange={(v) => handleEventChange("category", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Subcategory</Label>
                          <Input type="text" value={eventForm.subcategory}
                            onChange={(e) => handleEventChange("subcategory", e.target.value)}
                            placeholder="e.g. Mono Act, Solo Dance" />
                        </div>
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Mode</Label>
                          <Select value={eventForm.mode} onValueChange={(v) => handleEventChange("mode", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              {MODES.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-muted-foreground mb-2 block">Description</Label>
                          <textarea rows={3} value={eventForm.description}
                            onChange={(e) => handleEventChange("description", e.target.value)}
                            placeholder="Brief description of the event"
                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-amber bg-muted text-card-foreground" />
                        </div>
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Event Coordinator</Label>
                          <Select value={eventForm.coordinator_id} onValueChange={(v) => handleEventChange("coordinator_id", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {coordinators.map((c) => (
                                <SelectItem key={c._id} value={c._id}>
                                  {c.name}{c.email ? ` (${c.email})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Venue</Label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Select value={eventForm.venue_id || "none"} onValueChange={(v) => handleEventChange("venue_id", v === "none" ? "" : v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {venues.map((v) => (
                                    <SelectItem key={v._id} value={v._id}>
                                      {v.name}{v.location ? ` (${v.location})` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button type="button" variant="outline" size="icon" onClick={() => { setCreateVenueContext({ source: "event_form" }); setVenueForm({ name: "", location: "", capacity: "" }); setShowCreateVenue(true); }} title="Add new venue">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-border rounded-lg">
                      <button type="button" onClick={() => setShowParticipation((s) => !s)}
                        className="w-full flex items-center justify-between p-4 text-left text-card-foreground">
                        <h2 className="text-lg font-bold">Participation Rules</h2>
                        {showParticipation ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      {showParticipation && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Event Type</Label>
                              <Select value={eventForm.event_type} onValueChange={(v) => handleEventChange("event_type", v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {EVENT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Gender</Label>
                              <Select value={eventForm.gender_filter} onValueChange={(v) => handleEventChange("gender_filter", v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                  {GENDER_OPTIONS.map((g) => (
                                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Registration Mode</Label>
                              <Select value={eventForm.registration_mode} onValueChange={(v) => handleEventChange("registration_mode", v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                  {REGISTRATION_MODES.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Registration Closes</Label>
                              <Input type="datetime-local"
                                value={eventForm.registration_closes_at || ""}
                                onChange={(e) => setEventForm((prev) => ({ ...prev, registration_closes_at: e.target.value }))} />
                            </div>
                            {eventForm.event_type === "team" && (
                              <>
                                <div>
                                  <Label className="text-muted-foreground mb-2 block">Min Members per Team</Label>
                                  <Input type="number" min={1}
                                    value={eventForm.min_team_size ?? ""}
                                    onChange={(e) => handleEventChange("min_team_size", e.target.value)}
                                    className={fieldErrors.min_team_size ? "border-destructive" : ""} />
                                  {fieldErrors.min_team_size && <p className="mt-1 text-xs text-destructive-foreground">{fieldErrors.min_team_size}</p>}
                                </div>
                                <div>
                                  <Label className="text-muted-foreground mb-2 block">Max Members per Team</Label>
                                  <Input type="number" min={1}
                                    value={eventForm.max_team_size ?? ""}
                                    onChange={(e) => handleEventChange("max_team_size", e.target.value)}
                                    className={fieldErrors.max_team_size ? "border-destructive" : ""} />
                                  {fieldErrors.max_team_size && <p className="mt-1 text-xs text-destructive-foreground">{fieldErrors.max_team_size}</p>}
                                </div>
                              </>
                            )}
                            <div>
                              <Label className="text-muted-foreground mb-2 block">
                                {eventForm.event_type === "team"
                                  ? `Max Teams per ${groupLabel.toLowerCase()}`
                                  : `Max Participants per ${groupLabel.toLowerCase()}`}
                              </Label>
                              <Input type="number" min={1}
                                value={eventForm.max_per_group === 0 ? 0 : eventForm.max_per_group ?? ""}
                                onChange={(e) => handleEventChange("max_per_group", e.target.value)}
                                className={fieldErrors.max_per_group ? "border-destructive" : ""} />
                              {fieldErrors.max_per_group && <p className="mt-1 text-xs text-destructive-foreground">{fieldErrors.max_per_group}</p>}
                            </div>
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Age Group (Min)</Label>
                              <Input type="number" min={0}
                                value={eventForm.age_group?.min ?? ""}
                                onChange={(e) => setEventForm((prev) => ({ ...prev, age_group: { ...prev.age_group, min: e.target.value } }))}
                                placeholder="Min age" />
                            </div>
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Age Group (Max)</Label>
                              <Input type="number" min={0}
                                value={eventForm.age_group?.max ?? ""}
                                onChange={(e) => setEventForm((prev) => ({ ...prev, age_group: { ...prev.age_group, max: e.target.value } }))}
                                placeholder="Max age" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {eventForm.event_type === "team"
                              ? `Each entry is one team. Every member must meet the gender and age rules, and each ${groupLabel.toLowerCase()} can register up to the maximum teams allowed.`
                              : `Each entry is a single participant who must meet the gender and age rules. Each ${groupLabel.toLowerCase()} can register up to the maximum participants allowed.`}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border border-border rounded-lg">
                      <button type="button" onClick={() => setShowEventDetails((s) => !s)}
                        className="w-full flex items-center justify-between p-4 text-left text-card-foreground">
                        <h2 className="text-lg font-bold">Rules & Requirements</h2>
                        {showEventDetails ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      {showEventDetails && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Duration</Label>
                              <Input type="text" value={eventForm.duration}
                                onChange={(e) => handleEventChange("duration", e.target.value)}
                                placeholder="e.g. 5 minutes" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground mb-2 block">Rules</Label>
                            <textarea rows={3} value={eventForm.rules}
                              onChange={(e) => handleEventChange("rules", e.target.value)}
                              placeholder="No vulgar content, no props, etc."
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-amber bg-muted text-card-foreground" />
                          </div>
                          <div>
                            <Label className="text-muted-foreground mb-2 block">Eligibility</Label>
                            <textarea rows={2} value={eventForm.eligibility}
                              onChange={(e) => handleEventChange("eligibility", e.target.value)}
                              placeholder="Who can participate (e.g. Open to all classes 9-12)"
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-amber bg-muted text-card-foreground" />
                          </div>
                          <div>
                            <Label className="text-muted-foreground mb-2 block">Instructions</Label>
                            <textarea rows={2} value={eventForm.instructions}
                              onChange={(e) => handleEventChange("instructions", e.target.value)}
                              placeholder="Pre-event and during-event instructions"
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-amber bg-muted text-card-foreground" />
                          </div>
                          <div>
                            <Label className="text-muted-foreground mb-2 block">Requirements / Equipment</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {eventForm.requirements.map((req, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border border-border bg-muted text-card-foreground">
                                  {req}
                                  <button type="button" onClick={() => {
                                    const updated = eventForm.requirements.filter((_, i) => i !== idx);
                                    setEventForm((prev) => ({ ...prev, requirements: updated }));
                                  }} className="text-destructive-foreground hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input type="text" value={newRequirement}
                                onChange={(e) => setNewRequirement(e.target.value)}
                                placeholder="Add requirement"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (newRequirement.trim()) {
                                      setEventForm((prev) => ({ ...prev, requirements: [...prev.requirements, newRequirement.trim()] }));
                                      setNewRequirement("");
                                    }
                                  }
                                }} />
                              <Button type="button" onClick={() => {
                                if (newRequirement.trim()) {
                                  setEventForm((prev) => ({ ...prev, requirements: [...prev.requirements, newRequirement.trim()] }));
                                  setNewRequirement("");
                                }
                              }} className="bg-accent-amber text-white hover:bg-accent-amber/90">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs mt-1 text-muted-foreground">Press Enter or click + to add. Click × to remove.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-border rounded-lg">
                      <button type="button" onClick={() => setShowSchedule((s) => !s)}
                        className="w-full flex items-center justify-between p-4 text-left text-card-foreground">
                        <h2 className="text-lg font-bold">Rounds & Schedule</h2>
                        {showSchedule ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      {showSchedule && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Total rounds</Label>
                              <Input type="number" min={1} value={eventForm.rounds ?? ""}
                                onChange={(e) => handleEventChange("rounds", e.target.value)}
                                className={fieldErrors.rounds ? "border-destructive" : ""} />
                              {fieldErrors.rounds && <p className="mt-1 text-xs text-destructive-foreground">{fieldErrors.rounds}</p>}
                            </div>
                          </div>
                          <div className="space-y-4">
                            {roundsForm.map((r, idx) => (
                              <div key={idx} className="border border-border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-semibold text-lg text-card-foreground">Round {r.round_no}</h3>
                                  <Select value={r.status} onValueChange={(v) => updateRoundField(idx, "status", v)}>
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                  <div className="md:col-span-2">
                                    <Label className="text-muted-foreground mb-2 block">Date & Time</Label>
                                    <Input type="datetime-local"
                                      value={r.date && r.time ? `${r.date}T${r.time}` : ""}
                                      onChange={(e) => updateRoundDateTime(idx, e.target.value)} />
                                  </div>
                                  <div className="md:col-span-2">
                                    <Label className="text-muted-foreground mb-2 block">Venue</Label>
                                    <div className="flex gap-2">
                                      <div className="flex-1">
                                        <Select value={r.venue || "none"} onValueChange={(v) => updateRoundField(idx, "venue", v === "none" ? "" : v)}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select venue" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {venues.map((v) => (
                                              <SelectItem key={v._id} value={v.name}>
                                                {v.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Button type="button" variant="outline" size="icon" onClick={() => { setCreateVenueContext({ source: "round", roundIndex: idx }); setVenueForm({ name: "", location: "", capacity: "" }); setShowCreateVenue(true); }} title="Add new venue">
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-border rounded-lg">
                      <button type="button" onClick={() => setShowPoints((s) => !s)}
                        className="w-full flex items-center justify-between p-4 text-left text-card-foreground">
                        <h2 className="text-lg font-bold">Points Configuration</h2>
                        {showPoints ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      {showPoints && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                          <p className="text-sm text-muted-foreground">Define placements and points; leave empty to use global settings</p>
                          <div className="space-y-2">
                            {pointsForm.map((row, idx) => (
                              <div key={idx} className="grid grid-cols-12 gap-2">
                                <div className="col-span-5 md:col-span-3">
                                  <Label className="text-muted-foreground mb-2 block">Position</Label>
                                  <Input type="number" min={1} value={row.position}
                                    onChange={(e) => updatePointRow(idx, "position", e.target.value)} />
                                </div>
                                <div className="col-span-5 md:col-span-3">
                                  <Label className="text-muted-foreground mb-2 block">Points</Label>
                                  <Input type="number" min={0} value={row.points}
                                    onChange={(e) => updatePointRow(idx, "points", e.target.value)} />
                                </div>
                                <div className="col-span-2 md:col-span-2 flex items-end">
                                  <Button type="button" variant="destructive" size="sm" onClick={() => removePointRow(idx)}>
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <div>
                              <Button type="button" variant="outline" size="sm" onClick={addPointRow} className="text-accent-amber">
                                Add row
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => { resetForms(); setActiveTab("manage"); }} className="flex-1 md:flex-none md:min-w-[140px]">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading} className="flex-1 md:flex-none md:min-w-[160px] bg-accent-amber text-white hover:bg-accent-amber/90 disabled:opacity-50">
                        {loading ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={!!sharingEvent} onOpenChange={(open) => { if (!open) setSharingEvent(null); }}>
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
                // eslint-disable-next-line no-restricted-syntax
                const response = await fetch(qrUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = `QR_${sharingEvent.title || sharingEvent.name}.replace(/[^a-zA-Z0-9]+/g, "_")}.png`;
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Participation Invite</DialogTitle>
                  <DialogDescription>Provide direct registration access for <strong>{sharingEvent.title || sharingEvent.name}</strong></DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-2">
                  <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-2xl border border-border">
                    <div className="bg-card p-3 rounded-2xl shadow-sm border border-border">
                      <img
                        src={qrUrl}
                        alt="Event QR Code"
                        className="h-44 w-44 object-contain"
                        onError={() => toast.error("Failed to load QR code image")}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={downloadQR} className="mt-4 flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-accent-amber" />
                      Download PNG QR Code
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Direct Link</Label>
                    <div className="flex items-center gap-2 bg-muted p-2.5 rounded-xl border border-border">
                      <span className="text-xs truncate flex-1 font-mono text-muted-foreground pl-1">{shareLink}</span>
                      <Button onClick={copyToClipboard} size="icon" className="h-9 w-9 bg-accent-amber hover:bg-accent-amber/90 text-white shrink-0">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            );
          })()}
        </Dialog>

        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) { setDeleteConfirmId(null); setDeletionImpact(null); setDeletionConfirmText(""); } }}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {deletionImpact && !deletionImpact.deletable ? (
                  <>
                    <span className="text-destructive">Deletion Blocked</span>
                  </>
                ) : deletionImpact && deletionImpact.groupScoreChanges?.length > 0 ? (
                  <>
                    <span className="text-destructive">Delete Event — Impact on Standings</span>
                  </>
                ) : (
                  <>
                    <span>Delete Event</span>
                  </>
                )}
              </AlertDialogTitle>

              {deletionLoading ? (
                <AlertDialogDescription>
                  <div className="flex items-center gap-2 py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Assessing deletion impact...</span>
                  </div>
                </AlertDialogDescription>
              ) : deletionImpact ? (
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    {deletionImpact.blockReason ? (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                        {deletionImpact.blockReason}
                      </div>
                    ) : (
                      <>
                        {deletionImpact.groupScoreChanges?.length > 0 && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                            <p className="font-semibold text-destructive mb-2">This will affect group standings:</p>
                            {deletionImpact.groupScoreChanges.map((g) => (
                              <p key={g.group_id} className="text-xs">
                                <span className="font-medium">{g.group_name}</span>: {g.current_score} → {g.new_score} ({g.delta} pts)
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">This will permanently delete:</p>
                          <ul className="space-y-0.5 text-xs">
                            {deletionImpact.impact.teams > 0 && (
                              <li>• {deletionImpact.impact.teams} team registration{deletionImpact.impact.teams !== 1 ? "s" : ""} ({deletionImpact.impact.participants} participant{deletionImpact.impact.participants !== 1 ? "s" : ""})</li>
                            )}
                            {deletionImpact.impact.scoreSheets > 0 && (
                              <li>• {deletionImpact.impact.scoreSheets} score sheet{deletionImpact.impact.scoreSheets !== 1 ? "s" : ""}</li>
                            )}
                            {deletionImpact.impact.results.total > 0 && (
                              <li>• {deletionImpact.impact.results.total} result{deletionImpact.impact.results.total !== 1 ? "s" : ""} ({deletionImpact.impact.results.published} published, {deletionImpact.impact.results.draft} draft)</li>
                            )}
                            {deletionImpact.impact.appeals > 0 && (
                              <li>• {deletionImpact.impact.appeals} filed appeal{deletionImpact.impact.appeals !== 1 ? "s" : ""}</li>
                            )}
                            {deletionImpact.impact.schedules > 0 && (
                              <li>• {deletionImpact.impact.schedules} schedule{deletionImpact.impact.schedules !== 1 ? "s" : ""}</li>
                            )}
                            {deletionImpact.impact.judgeSessions > 0 && (
                              <li>• {deletionImpact.impact.judgeSessions} judge session{deletionImpact.impact.judgeSessions !== 1 ? "s" : ""}</li>
                            )}
                            {deletionImpact.impact.judgeAssignments > 0 && (
                              <li>• {deletionImpact.impact.judgeAssignments} judge assignment{deletionImpact.impact.judgeAssignments !== 1 ? "s" : ""}</li>
                            )}
                            {deletionImpact.impact.teams === 0 && deletionImpact.impact.scoreSheets === 0 && deletionImpact.impact.results.total === 0 && (
                              <li>• No registrations or results — safe to delete</li>
                            )}
                          </ul>
                        </div>

                        {deletionImpact.groupScoreChanges?.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Type event name to confirm:
                            </Label>
                            <Input
                              type="text"
                              value={deletionConfirmText}
                              onChange={(e) => setDeletionConfirmText(e.target.value)}
                              placeholder={deletionImpact.event?.title || ""}
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
              ) : (
                <AlertDialogDescription>
                  Delete this event and all associated data? This action cannot be undone.
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={() => { setDeleteConfirmId(null); setDeletionImpact(null); setDeletionConfirmText(""); }}>
                Cancel
              </AlertDialogCancel>
              {deletionImpact && !deletionImpact.blockReason && !deletionLoading && (
                <AlertDialogAction
                  onClick={executeDelete}
                  disabled={deletionLoading || (deletionImpact.groupScoreChanges?.length > 0 && deletionConfirmText !== deletionImpact.event?.title)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletionImpact.groupScoreChanges?.length > 0 ? "Force Delete Event" : "Delete Event"}
                </AlertDialogAction>
              )}
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showCreateVenue} onOpenChange={(open) => { if (!open) { setShowCreateVenue(false); setCreateVenueContext(null); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent-amber" />
                Add New Venue
              </DialogTitle>
              <DialogDescription>Create a venue to use in this event.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-muted-foreground mb-2 block">Name *</Label>
                <Input type="text" value={venueForm.name}
                  onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                  placeholder="Auditorium" />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Location *</Label>
                <Input type="text" value={venueForm.location}
                  onChange={(e) => setVenueForm({ ...venueForm, location: e.target.value })}
                  placeholder="Main Building, 2nd Floor" />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Capacity</Label>
                <Input type="number" value={venueForm.capacity}
                  onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })}
                  placeholder="100" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveVenueFromEvents} className="bg-accent-amber text-white hover:bg-accent-amber/90">
                  Create & Select
                </Button>
                <Button variant="outline" onClick={() => { setShowCreateVenue(false); setCreateVenueContext(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {managingJudges && (
          <ManageJudges
            event={managingJudges}
            onClose={() => setManagingJudges(null)}
            onUpdated={() => { fetchAll(); }}
          />
        )}
      </div>
    </div>
  );
};

export default ManageEvents;
