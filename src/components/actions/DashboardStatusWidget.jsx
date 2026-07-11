const DASHBOARD_STATUS_GROUPS = [
  { key: "registration_open", label: "Registrations Open", color: "bg-blue-500" },
  { key: "ongoing", label: "Ongoing", color: "bg-emerald-500" },
  { key: "judging", label: "Judging", color: "bg-amber-500" },
  { key: "result_pending", label: "Results Pending", color: "bg-orange-500" },
  { key: "delayed", label: "Delayed", color: "bg-rose-500" },
  { key: "draft", label: "Draft", color: "bg-gray-400" },
];

export default function DashboardStatusWidget({ summary = null, loading = false }) {
  const total = summary
    ? Object.values(summary).reduce((a, b) => a + b, 0)
    : 0;

  if (loading && !summary) {
    return (
      <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--card-fg)" }}>Event Status Overview</h3>
        <div className="text-xs theme-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--card-fg)" }}>Event Status Overview</h3>
        <span className="text-xs theme-text-secondary">{total} total</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {DASHBOARD_STATUS_GROUPS.map((group) => {
          const count = summary[group.key] || 0;
          return (
            <div
              key={group.key}
              className="flex flex-col items-center justify-center p-3 rounded-lg border"
              style={{ borderColor: "var(--border-divider)" }}
            >
              <span className="text-2xl font-bold" style={{ color: "var(--card-fg)" }}>
                {count}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`h-2 w-2 rounded-full ${group.color}`} />
                <span className="text-xs theme-text-secondary">{group.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
