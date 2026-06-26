import { getStatusMeta } from "../utils/eventStatus";

export default function EventStatusBadge({ status, size = "sm" }) {
  const meta = getStatusMeta(status);
  const sizeClasses = size === "lg"
    ? "px-3 py-1.5 text-sm"
    : "px-2 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${sizeClasses} ${meta.bg} ${meta.text} ${meta.border} ${meta.darkBg} ${meta.darkText} ${meta.darkBorder}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current`}
      />
      {meta.label}
    </span>
  );
}
