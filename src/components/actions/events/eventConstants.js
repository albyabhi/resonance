export const CATEGORIES = [
  { value: "sports", label: "Sports" },
  { value: "arts", label: "Arts" },
  { value: "academic", label: "Academic" },
  { value: "cultural", label: "Cultural" },
  { value: "technical", label: "Technical" },
];

export const MODES = [
  { value: "onstage", label: "Onstage" },
  { value: "offstage", label: "Offstage" },
];

export const EVENT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
];

export const GENDER_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const REGISTRATION_MODES = [
  { value: "hybrid", label: "Hybrid" },
  { value: "captain", label: "Captain Only" },
  { value: "participant", label: "Participant Only" },
];

export const CREATION_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
];

/** Round-level statuses — distinct from the 11 event-level statuses. */
export const ROUND_STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const SCORING_TYPE_OPTIONS = [
  { value: "score", label: "Score — judge enters marks" },
  { value: "rank", label: "Ranking — judge assigns ranks (1 judge only)" },
];

export const DEFAULT_EVENT_FORM = {
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
  scoring_type: "score",
  enable_negative_marks: false,
  negative_max_deduction: 5,
  negative_require_reason: true,
};

export const DEFAULT_ROUND = {
  round_no: 1,
  date: "",
  time: "",
  venue: "",
  status: "upcoming",
};

export const DEFAULT_POINTS = [
  { position: 1, points: 5 },
  { position: 2, points: 3 },
  { position: 3, points: 1 },
];

export const getCurrentScheduleDefaults = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const time = `${hours}:${minutes}`;
  return { date, time };
};

export const BLOCKED_DELETE_STATUSES = [
  "ongoing",
  "judging",
  "result_pending",
  "published",
  "completed",
];

export const getDeleteBlockedReason = (status) => {
  const reasons = {
    ongoing: "This event is currently LIVE. Cancel it before deleting.",
    judging: "Judges are actively scoring. Cancel it before deleting.",
    result_pending: "Results are being finalized. Cancel it before deleting.",
    published: "Results are public. Cancel it before deleting.",
    completed: "Completed events cannot be deleted.",
  };
  return reasons[status] || null;
};

export const canDeleteEvent = (event) =>
  !BLOCKED_DELETE_STATUSES.includes(event?.status);

export const getEventId = (e) => e?._id || e?.event_id;

export const formatParticipants = (e) =>
  e?.event_type === "individual"
    ? "1"
    : `${e?.min_participants ?? e?.min_team_size ?? 1}–${
        e?.max_participants ?? e?.max_team_size ?? 1
      }`;

export const DEFAULT_FILTER = {
  mode: "all",
  type: "all",
  category: "all",
  status: "all",
  query: "",
};
