export const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const formatStatus = (status) =>
  (status || "draft").replace(/_/g, " ").toUpperCase();

export const formatDate = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

export const formatFullDate = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

export const timeAgo = (date) => {
  if (!date) return "";
  try {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return "";
  }
};

export const EVENT_STATUS_STYLES = {
  draft: "text-accent-neutral border-accent-neutral/40 bg-accent-neutral/10",
  registration_open:
    "text-accent-amber border-accent-amber/40 bg-accent-amber/10",
  registration_closed:
    "text-accent-neutral border-accent-neutral/40 bg-accent-neutral/10",
  reporting: "text-accent-teal border-accent-teal/40 bg-accent-teal/10",
  ongoing: "text-accent-green border-accent-green/40 bg-accent-green/10",
  judging: "text-warning border-warning/40 bg-warning/10",
  result_pending: "text-accent-blue border-accent-blue/40 bg-accent-blue/10",
  published: "text-accent-purple border-accent-purple/40 bg-accent-purple/10",
  completed: "text-accent-green border-accent-green/40 bg-accent-green/10",
  delayed: "text-destructive border-destructive/40 bg-destructive/10",
  cancelled: "text-destructive border-destructive/40 bg-destructive/10",
};

export const POSITION_COLORS = {
  1: "bg-gradient-to-br from-warning to-accent-amber text-white",
  2: "bg-gradient-to-br from-muted-foreground to-muted-foreground/70 text-white",
  3: "bg-gradient-to-br from-accent-amber to-accent-amber/80 text-white",
};

export const MEDAL_STYLES = [
  {
    border: "border-warning/50",
    glow: "shadow-warning/20",
    ring: "from-warning to-accent-amber",
    bg: "bg-gradient-to-br from-warning to-accent-amber",
    text: "text-white",
  },
  {
    border: "border-muted-foreground/50",
    glow: "shadow-muted-foreground/20",
    ring: "from-muted-foreground to-muted-foreground/70",
    bg: "bg-gradient-to-br from-muted-foreground to-muted-foreground/70",
    text: "text-white",
  },
  {
    border: "border-accent-amber/50",
    glow: "shadow-accent-amber/20",
    ring: "from-accent-amber to-accent-amber/80",
    bg: "bg-gradient-to-br from-accent-amber to-accent-amber/80",
    text: "text-white",
  },
];

export const LIVE_STATUSES = ["ongoing", "judging"];

// Token-safe tint for competition branding.
// The old `${primaryColor}22` hex hack broke when primaryColor was
// `var(--primary)`; color-mix works for hex + var() + named colors.
export const tintedBackground = (primaryColor) => {
  if (!primaryColor) return undefined;
  try {
    return `color-mix(in srgb, ${primaryColor} 12%, transparent)`;
  } catch {
    return undefined;
  }
};

// Competition statuses are upcoming | live | completed | archived
// (Competition model enum). Map to a small human badge, not event statuses.
export const COMPETITION_STATUS_META = {
  upcoming: { label: "Upcoming", pulse: false },
  live: { label: "Live now", pulse: true },
  completed: { label: "Completed", pulse: false },
  archived: { label: "Archived", pulse: false },
};

export const competitionStatusMeta = (status) =>
  COMPETITION_STATUS_META[status] || COMPETITION_STATUS_META.upcoming;

// Winner members shared by PublicWinners + ResultsTable (single-scroll page
// shows placements in three places: Winners cards, Events accordion, detail
// modal). Backend attaches additive `team: {_id, name, members[]}` with
// name + class only — no contact/PII ever reaches guests.
export const winnerMembersFromPublic = (entry) => {
  const members = entry?.team?.members;
  return Array.isArray(members) ? members.filter(Boolean) : [];
};

// One member renders as "Name · Class"; missing class renders bare name.
export const formatMemberLine = (members) => {
  const list = Array.isArray(members) ? members.filter(Boolean) : [];
  return list
    .map((member) => {
      const name = member?.name?.trim();
      if (!name) return "";
      const className = member?.class?.trim();
      return className ? `${name} · ${className}` : name;
    })
    .filter(Boolean)
    .join(", ");
};

// Fallback chain when a result predates member enrichment:
// members → team name → group name (never blank, never chest numbers).
export const winnerFallbackLabel = (entry) => {
  const memberLine = formatMemberLine(winnerMembersFromPublic(entry));
  if (memberLine) return memberLine;
  const teamName = entry?.team?.name?.trim();
  if (teamName) return teamName;
  return entry?.group?.name || "Unknown";
};
