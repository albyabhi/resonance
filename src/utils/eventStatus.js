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
    color: "gray",
    border: "border-gray-200",
    bg: "bg-gray-50",
    text: "text-gray-600",
    darkBorder: "dark:border-gray-700",
    darkBg: "dark:bg-gray-800/50",
    darkText: "dark:text-gray-400",
  },
  registration_open: {
    label: "Registration Open",
    color: "blue",
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    darkBorder: "dark:border-blue-500/20",
    darkBg: "dark:bg-blue-500/10",
    darkText: "dark:text-blue-400",
  },
  registration_closed: {
    label: "Registration Closed",
    color: "slate",
    border: "border-slate-200",
    bg: "bg-slate-50",
    text: "text-slate-600",
    darkBorder: "dark:border-slate-500/20",
    darkBg: "dark:bg-slate-500/10",
    darkText: "dark:text-slate-400",
  },
  reporting: {
    label: "Reporting",
    color: "yellow",
    border: "border-yellow-200",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    darkBorder: "dark:border-yellow-500/20",
    darkBg: "dark:bg-yellow-500/10",
    darkText: "dark:text-yellow-400",
  },
  ongoing: {
    label: "Ongoing",
    color: "emerald",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    darkBorder: "dark:border-emerald-500/20",
    darkBg: "dark:bg-emerald-500/10",
    darkText: "dark:text-emerald-400",
  },
  judging: {
    label: "Judging",
    color: "amber",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    darkBorder: "dark:border-amber-500/20",
    darkBg: "dark:bg-amber-500/10",
    darkText: "dark:text-amber-400",
  },
  result_pending: {
    label: "Result Pending",
    color: "orange",
    border: "border-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-700",
    darkBorder: "dark:border-orange-500/20",
    darkBg: "dark:bg-orange-500/10",
    darkText: "dark:text-orange-400",
  },
  published: {
    label: "Published",
    color: "sky",
    border: "border-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-700",
    darkBorder: "dark:border-sky-500/20",
    darkBg: "dark:bg-sky-500/10",
    darkText: "dark:text-sky-400",
  },
  completed: {
    label: "Completed",
    color: "green",
    border: "border-green-200",
    bg: "bg-green-50",
    text: "text-green-700",
    darkBorder: "dark:border-green-500/20",
    darkBg: "dark:bg-green-500/10",
    darkText: "dark:text-green-400",
  },
  delayed: {
    label: "Delayed",
    color: "rose",
    border: "border-rose-200",
    bg: "bg-rose-50",
    text: "text-rose-700",
    darkBorder: "dark:border-rose-500/20",
    darkBg: "dark:bg-rose-500/10",
    darkText: "dark:text-rose-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "zinc",
    border: "border-zinc-200",
    bg: "bg-zinc-50",
    text: "text-zinc-500",
    darkBorder: "dark:border-zinc-600/20",
    darkBg: "dark:bg-zinc-600/10",
    darkText: "dark:text-zinc-400",
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
