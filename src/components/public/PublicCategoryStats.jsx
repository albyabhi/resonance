import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Category breakdown as a real chart (Recharts is already a dependency).
// Falls back to a calm empty state instead of an empty card.
export default function PublicCategoryStats({ stats }) {
  const categories = stats?.categories || [];

  if (categories.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground">Events by category</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Category totals will appear once events are scheduled.
        </p>
      </div>
    );
  }

  const chartData = categories.map((cat) => ({
    name: cat.name.length > 12 ? `${cat.name.slice(0, 12)}…` : cat.name,
    fullName: cat.name,
    total: cat.total,
    completed: cat.completed,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <h3 className="font-semibold text-foreground">Events by category</h3>
      <p className="text-sm text-muted-foreground mt-0.5">
        Scheduled vs completed per category
      </p>

      <div className="h-64 mt-4" role="img" aria-label="Bar chart of events by category">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -12 }} barGap={3}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--popover-foreground)",
                fontSize: "12px",
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
            />
            <Bar dataKey="total" name="Scheduled" fill="var(--chart-bar-default)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 space-y-1.5">
        {categories.map((cat) => (
          <li key={cat.name} className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium truncate">{cat.name}</span>
            <span className="text-muted-foreground tabular shrink-0 ml-3">
              {cat.completed}/{cat.total} done
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
