import React from "react";
import { BarChart3, CheckCircle2, Circle } from "lucide-react";

export default function PublicCategoryStats({ stats, primaryColor = "var(--primary)" }) {
  const categories = stats?.categories || [];

  if (categories.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
        No category data available yet.
      </div>
    );
  }

  const maxTotal = Math.max(...categories.map((c) => c.total), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5" style={{ color: primaryColor }} />
        <h3 className="font-bold text-foreground">Events by Category</h3>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const pct = Math.round((cat.total / maxTotal) * 100);
          const completedPct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
          return (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    {cat.completed}
                  </span>
                  <span>/</span>
                  <span>{cat.total}</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: primaryColor,
                    opacity: 0.8 + (completedPct / 100) * 0.2,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
