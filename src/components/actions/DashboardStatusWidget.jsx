import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const DASHBOARD_STATUS_GROUPS = [
  { key: "registration_open", label: "Registrations Open", color: "bg-accent-blue" },
  { key: "ongoing", label: "Ongoing", color: "bg-accent-green" },
  { key: "judging", label: "Judging", color: "bg-accent-amber" },
  { key: "result_pending", label: "Results Pending", color: "bg-accent-purple" },
  { key: "delayed", label: "Delayed", color: "bg-accent-red" },
  { key: "draft", label: "Draft", color: "bg-muted-foreground" },
];

export default function DashboardStatusWidget({ summary = null, loading = false }) {
  const total = summary
    ? Object.values(summary).reduce((a, b) => a + b, 0)
    : 0;

  if (loading && !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Event Status Overview</CardTitle>
          <span className="text-xs text-muted-foreground">{total} total</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {DASHBOARD_STATUS_GROUPS.map((group) => {
            const count = summary[group.key] || 0;
            return (
              <div
                key={group.key}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-border"
              >
                <span className="text-2xl font-bold text-card-foreground">
                  {count}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`h-2 w-2 rounded-full ${group.color}`} />
                  <span className="text-xs text-muted-foreground">{group.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
