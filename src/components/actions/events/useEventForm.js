import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import {
  DEFAULT_EVENT_FORM,
  DEFAULT_ROUND,
  DEFAULT_POINTS,
  getCurrentScheduleDefaults,
} from "./eventConstants";

const DRAFT_KEY = "resonance:event-draft:v1";

export function loadDraft() {
  try {
    // eslint-disable-next-line no-restricted-syntax
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useEventForm({ apiCall, competition, groupLabel, onSaved }) {
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({ ...DEFAULT_EVENT_FORM });
  const [roundsForm, setRoundsForm] = useState(() => {
    const defaults = getCurrentScheduleDefaults();
    return [{ ...DEFAULT_ROUND, date: defaults.date, time: defaults.time }];
  });
  const [pointsForm, setPointsForm] = useState([...DEFAULT_POINTS]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  // ── Judges for Schedule & Points step (assign judge + judge type) ──
  // judge_type always mirrors eventForm.scoring_type (single-type per event).
  const [judges, setJudges] = useState([]);
  const [assignedJudges, setAssignedJudges] = useState([]);
  const [assignedJudgeIds, setAssignedJudgeIds] = useState([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [judgesError, setJudgesError] = useState("");

  const loadJudges = useCallback(async () => {
    try {
      setJudgesLoading(true);
      setJudgesError("");
      const judgesRes = await apiCall("/api/event/judges");
      setJudges(judgesRes.data || []);
    } catch (err) {
      setJudgesError(err.message);
    } finally {
      setJudgesLoading(false);
    }
  }, [apiCall]);

  const loadAssignments = useCallback(async (eventId) => {
    if (!eventId) {
      setAssignedJudges([]);
      setAssignedJudgeIds([]);
      return;
    }
    try {
      const assignRes = await apiCall(`/api/judge/assignments/event/${eventId}`);
      const list = assignRes.data || [];
      setAssignedJudges(list);
      setAssignedJudgeIds(list.map((a) => String(a.judge_id?._id || a.judge_id)));
    } catch {
      setAssignedJudges([]);
      setAssignedJudgeIds([]);
    }
  }, [apiCall]);

  const validateFields = useCallback(
    (form) => {
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
        errs.max_per_group = `Max per ${(groupLabel || "house").toLowerCase()} cannot be negative`;
      }
      setFieldErrors(errs);
      return errs;
    },
    [groupLabel]
  );

  /** Per-step validation for the wizard (subset of full validation). */
  const validateStep = useCallback(
    (step) => {
      const errs = validateFields(eventForm);
      if (step === 0) {
        const keys = ["title"];
        const subset = Object.fromEntries(
          Object.entries(errs).filter(([k]) => keys.includes(k))
        );
        setFieldErrors(subset);
        return subset;
      }
      if (step === 1) {
        const keys = ["min_team_size", "max_team_size", "max_per_group"];
        const subset = Object.fromEntries(
          Object.entries(errs).filter(([k]) => keys.includes(k))
        );
        setFieldErrors(subset);
        return subset;
      }
      if (step === 2) {
        const keys = ["rounds"];
        const subset = Object.fromEntries(
          Object.entries(errs).filter(([k]) => keys.includes(k))
        );
        setFieldErrors(subset);
        return subset;
      }
      return errs;
    },
    [eventForm, validateFields]
  );

  const sanitizeForSubmit = useCallback((form) => {
    const toNullableNumber = (v) =>
      v === "" ? null : typeof v === "number" ? v : null;
    const sanitized = {
      ...form,
      rounds:
        form.rounds === ""
          ? 1
          : typeof form.rounds === "number"
            ? Math.max(1, form.rounds)
            : 1,
      max_per_group:
        form.max_per_group === ""
          ? null
          : typeof form.max_per_group === "number"
            ? form.max_per_group
            : null,
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
        sanitized.min_team_size =
          form.min_team_size === "" ? null : (form.min_team_size ?? null);
        sanitized.max_team_size =
          form.max_team_size === "" ? null : (form.max_team_size ?? null);
      }
    }
    return sanitized;
  }, []);

  const handleEventChange = useCallback(
    (field, value) => {
      setEventForm((prev) => {
        const numericFields = new Set([
          "min_team_size",
          "max_team_size",
          "rounds",
          "max_per_group",
        ]);
        const next = { ...prev };
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
          const minVal =
            typeof next.min_team_size === "number" ? next.min_team_size : null;
          const maxVal =
            typeof next.max_team_size === "number" ? next.max_team_size : null;
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
                arr.push({
                  ...DEFAULT_ROUND,
                  round_no: i,
                  date: defaults.date,
                  time: defaults.time,
                });
              }
            } else if (arr.length > next.rounds) {
              arr = arr.slice(0, next.rounds);
            }
            arr = arr.map((it, idx) => ({ ...it, round_no: idx + 1 }));
            return arr;
          });
        }
        if (field === "scoring_type" && value === "rank") {
          // Rank events allow only one judge — keep the first selection.
          setAssignedJudgeIds((prev) => (prev.length > 1 ? prev.slice(0, 1) : prev));
          setAssignedJudges((prev) => (prev.length > 1 ? prev.slice(0, 1) : prev));
        }
        validateFields(next);
        return next;
      });
    },
    [validateFields]
  );

  const updateRoundField = useCallback((idx, field, value) => {
    setRoundsForm((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  }, []);

  const updateRoundDateTime = useCallback((idx, value) => {
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
  }, []);

  const addPointRow = useCallback(() => {
    setPointsForm((prev) => {
      const maxPos = prev.reduce((m, r) => Math.max(m, r.position), 0);
      return [...prev, { position: maxPos + 1, points: 0 }];
    });
  }, []);

  const updatePointRow = useCallback((idx, field, value) => {
    setPointsForm((prev) => {
      const arr = [...prev];
      const v = parseInt(value || 0, 10);
      arr[idx] = { ...arr[idx], [field]: Number.isNaN(v) ? 0 : v };
      return arr;
    });
  }, []);

  const removePointRow = useCallback((idx) => {
    setPointsForm((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const resetForms = useCallback(() => {
    setEventForm({ ...DEFAULT_EVENT_FORM });
    const defaults = getCurrentScheduleDefaults();
    setRoundsForm([{ ...DEFAULT_ROUND, date: defaults.date, time: defaults.time }]);
    setPointsForm([...DEFAULT_POINTS]);
    setEditingEventId(null);
    setNewRequirement("");
    setFieldErrors({});
    setFormError("");
    setAssignedJudges([]);
    setAssignedJudgeIds([]);
    setJudgesError("");
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const startAdd = useCallback(() => {
    resetForms();
    loadJudges();
  }, [resetForms, loadJudges]);

  // Toggle a judge in the Schedule & Points assignment picker.
  // Rank mode = single-select (replaces); score mode = multi-select (toggles).
  const toggleJudgeSelection = useCallback((judgeId) => {
    const id = String(judgeId);
    const isRank = (eventForm.scoring_type || "score") === "rank";
    if (isRank) {
      setAssignedJudgeIds((prev) => (prev.includes(id) ? [] : [id]));
      setAssignedJudges((prev) => {
        if (prev.some((a) => String(a.judge_id?._id || a.judge_id || a._id) === id)) return [];
        const found = judges.find((j) => String(j._id) === id);
        return found ? [{ judge_id: found }] : [{ judge_id: { _id: id } }];
      });
      return;
    }
    setAssignedJudgeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setAssignedJudges((prev) => {
      if (prev.some((a) => String(a.judge_id?._id || a.judge_id || a._id) === id)) {
        return prev.filter((a) => String(a.judge_id?._id || a.judge_id || a._id) !== id);
      }
      const found = judges.find((j) => String(j._id) === id);
      return [...prev, { judge_id: found || { _id: id } }];
    });
  }, [eventForm.scoring_type, judges]);

  const startEdit = useCallback(
    async (evt) => {
      try {
        setSaving(true);
        setFormError("");
        const eventId = evt._id || evt.event_id;
        setEditingEventId(eventId);
        const { data: event } = await apiCall(`/api/event/${eventId}`);
        let schedules = [];
        try {
          const scheduleResp = await apiCall(`/api/schedule?event_id=${eventId}`);
          schedules = scheduleResp.schedules || scheduleResp.schedule || [];
        } catch {
          /* ignore */
        }
        // Judges catalogue + current assignments for the Schedule & Points step
        loadJudges();
        loadAssignments(eventId);
        setEventForm({
          title: event.title || event.name || "",
          description: event.description || "",
          category: event.category || "cultural",
          subcategory: event.subcategory || "",
          rounds: event.rounds ?? 1,
          min_team_size: event.min_team_size ?? 1,
          max_team_size:
            event.max_team_size ?? Math.max(1, event.min_team_size ?? 1),
          min_participants: event.min_participants ?? event.min_team_size ?? 1,
          max_participants: event.max_participants ?? event.max_team_size ?? 1,
          registration_mode: event.registration_mode || "hybrid",
          max_self_registrations: event.max_self_registrations ?? null,
          mode: event.mode || "onstage",
          event_type: event.event_type || "individual",
          gender_filter: event.gender_filter || "all",
          age_group: event.age_group
            ? {
                min: event.age_group.min ?? "",
                max: event.age_group.max ?? "",
              }
            : { min: "", max: "" },
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
          coordinator_id:
            event.coordinator_id?._id || event.coordinator_id || "",
          venue_id: event.venue_id?._id || event.venue_id || "",
          scoring_type: event.scoring_type || "score",
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
        setRoundsForm(
          roundsData.length
            ? roundsData
            : [{ ...DEFAULT_ROUND, date: defaults.date, time: defaults.time }]
        );
        const pts = [];
        if (event.points_config) {
          Object.entries(event.points_config).forEach(([pos, ptsVal]) => {
            pts.push({ position: parseInt(pos, 10), points: ptsVal });
          });
        }
        setPointsForm(
          pts.length
            ? pts.sort((a, b) => a.position - b.position)
            : [...DEFAULT_POINTS]
        );
        setFieldErrors({});
      } catch (err) {
        setFormError(err.message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [apiCall, loadAssignments, loadJudges]
  );

  const saveEvent = useCallback(async () => {
    try {
      setSaving(true);
      setFormError("");
      const errs = validateFields(eventForm);
      if (Object.keys(errs).length > 0) {
        throw new Error("Please fix the highlighted fields");
      }
      const scoring_type = eventForm.scoring_type || "score";
      if (scoring_type === "rank" && assignedJudgeIds.length > 1) {
        throw new Error("Rank events allow only one judge — remove extras before saving");
      }
      const sanitizedEventForm = sanitizeForSubmit(eventForm);
      const pointsConfig = {};
      pointsForm.forEach((p) => {
        if (p.position > 0) {
          pointsConfig[String(p.position)] = p.points;
        }
      });
      const ageGroupPayload =
        eventForm.age_group?.min || eventForm.age_group?.max
          ? {
              min: eventForm.age_group.min || null,
              max: eventForm.age_group.max || null,
            }
          : null;
      const eventPayload = {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        subcategory: eventForm.subcategory,
        registration_mode: eventForm.registration_mode,
        max_self_registrations: eventForm.max_self_registrations
          ? Number(eventForm.max_self_registrations)
          : null,
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
        scoring_type,
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
      } else {
        const competitionId =
          competition?._id || competition?.id || competition?.competition_id;
        const payload = { ...eventPayload, competition_id: competitionId };
        const { data: event } = await apiCall("/api/event", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        savedEvent = event;
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
      // Sync judge assignments chosen in the Schedule & Points step.
      // Same judge_type as the event; rank mode keeps a single judge.
      try {
        const { data: current } = await apiCall(`/api/judge/assignments/event/${eventId}`);
        const currentIds = new Set((current || []).map((a) => String(a.judge_id?._id || a.judge_id)));
        const desiredIds = assignedJudgeIds.map(String);
        const toAdd = desiredIds.filter((id) => !currentIds.has(id));
        const toRemove = (current || []).filter((a) => !desiredIds.includes(String(a.judge_id?._id || a.judge_id)));
        if (toAdd.length) {
          await apiCall(`/api/judge/assignments/bulk`, {
            method: "POST",
            body: JSON.stringify({ event_id: eventId, judge_ids: toAdd }),
          });
        }
        for (const a of toRemove) {
          try {
            await apiCall(`/api/judge/assignments/${a._id}`, { method: "DELETE" });
          } catch {
            /* best-effort */
          }
        }
      } catch (syncErr) {
        toast.error(syncErr.message || "Event saved, but judge assignment failed");
      }
      toast.success("Event saved successfully!");
      onSaved?.(savedEvent, editingEventId);
      resetForms();
      return savedEvent;
    } catch (err) {
      setFormError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [
    eventForm,
    pointsForm,
    roundsForm,
    assignedJudgeIds,
    editingEventId,
    validateFields,
    sanitizeForSubmit,
    apiCall,
    competition,
    onSaved,
    resetForms,
  ]);

  const applyVenueSelection = useCallback(
    (newVenue, context) => {
      if (!newVenue) return;
      if (context?.source === "event_form") {
        handleEventChange("venue_id", newVenue._id);
      } else if (context?.source === "round" && context.roundIndex != null) {
        updateRoundField(context.roundIndex, "venue", newVenue.name);
      }
    },
    [handleEventChange, updateRoundField]
  );

  return {
    editingEventId,
    eventForm,
    setEventForm,
    roundsForm,
    setRoundsForm,
    pointsForm,
    fieldErrors,
    saving,
    formError,
    setFormError,
    newRequirement,
    setNewRequirement,
    handleEventChange,
    updateRoundField,
    updateRoundDateTime,
    addPointRow,
    updatePointRow,
    removePointRow,
    validateFields,
    validateStep,
    resetForms,
    startAdd,
    startEdit,
    saveEvent,
    applyVenueSelection,
    judges,
    assignedJudges,
    assignedJudgeIds,
    judgesLoading,
    judgesError,
    loadJudges,
    loadAssignments,
    toggleJudgeSelection,
  };
}
