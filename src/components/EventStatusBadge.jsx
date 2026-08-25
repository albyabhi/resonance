import { getStatusMeta, LIVE_STATUSES } from "../utils/eventStatus";

export default function EventStatusBadge({ status, size = "sm" }) {
  const meta = getStatusMeta(status);
  const sizeClasses = size === "lg"
    ? "px-3 py-1.5 text-sm"
    : "px-2 py-1 text-xs";
  const isLive = LIVE_STATUSES.includes(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${sizeClasses} ${meta.bg} ${meta.text} ${meta.border} ${meta.darkBg} ${meta.darkText} ${meta.darkBorder} ${isLive ? "animate-pulse" : ""}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${isLive ? "animate-pulse" : ""}`}
      />
      {meta.label}
    </span>
  );
}
