export const EVENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "reporting", label: "Reporting" },
  { value: "ongoing", label: "Ongoing" },
  { value: "judging", label: "Judging" },
  { value: "result_pending", label: "Result Pending" },
  { value: "published", label: "Published" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
  { value: "cancelled", label: "Cancelled" },
];

export const STATUS_META = {
  draft: {
    label: "Draft",
    color: "neutral",
    border: "border-accent-neutral/30",
    bg: "bg-accent-neutral/10",
    text: "text-accent-neutral",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  registration_open: {
    label: "Registration Open",
    color: "amber",
    border: "border-accent-amber/40",
    bg: "bg-accent-amber/10",
    text: "text-accent-amber",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  registration_closed: {
    label: "Registration Closed",
    color: "neutral",
    border: "border-accent-neutral/30",
    bg: "bg-accent-neutral/10",
    text: "text-accent-neutral",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  reporting: {
    label: "Reporting",
    color: "teal",
    border: "border-accent-teal/30",
    bg: "bg-accent-teal/10",
    text: "text-accent-teal",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  ongoing: {
    label: "Ongoing",
    color: "green",
    border: "border-accent-green/30",
    bg: "bg-accent-green/10",
    text: "text-accent-green",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  judging: {
    label: "Judging",
    color: "amber",
    border: "border-warning/30",
    bg: "bg-warning/10",
    text: "text-warning",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  result_pending: {
    label: "Result Pending",
    color: "blue",
    border: "border-accent-blue/30",
    bg: "bg-accent-blue/10",
    text: "text-accent-blue",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  published: {
    label: "Published",
    color: "purple",
    border: "border-accent-purple/30",
    bg: "bg-accent-purple/10",
    text: "text-accent-purple",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  completed: {
    label: "Completed",
    color: "green",
    border: "border-accent-green/30",
    bg: "bg-accent-green/10",
    text: "text-accent-green",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  delayed: {
    label: "Delayed",
    color: "red",
    border: "border-destructive/30",
    bg: "bg-destructive/10",
    text: "text-destructive",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
  cancelled: {
    label: "Cancelled",
    color: "neutral",
    border: "border-accent-neutral/30",
    bg: "bg-accent-neutral/10",
    text: "text-accent-neutral",
    darkBorder: "",
    darkBg: "",
    darkText: "",
  },
};

export const STATUS_OPTIONS = EVENT_STATUSES.map((s) => ({
  value: s.value,
  label: s.label,
}));

export function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.draft;
}

export const CAN_MANAGE_STATUS = ["super_admin", "organizer", "event_coordinator"];

export const LIVE_STATUSES = ["ongoing", "judging"];

export const SCOREBOARD_STATUSES = ["completed", "published", "locked"];

// Canonical predicates — Event.status === "completed" is the single source of
// truth (backend auto-completes on full publish). isEventFinished treats
// transient "published" as finished for display so dashboards never lag the
// publish → completed hop or a missed SSE tick.
export const FINISHED_STATUSES = ["published", "completed"];
export const isEventCompleted = (event) => (event?.status || "") === "completed";
export const isEventFinished = (event) => FINISHED_STATUSES.includes(event?.status || "");
export const isEventPublic = (event) => ["published", "completed"].includes(event?.status || "");