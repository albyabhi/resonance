import React, { useMemo } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useTheme } from "../../context/ThemeContext";

export default function EventTimelineChart({ schedules = [] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const chartData = useMemo(() => {
    if (!schedules.length) return [];

    const byDate = schedules.reduce((acc, sch) => {
      if (!sch.date) return acc;
      const parsedDate = new Date(sch.date);
      if (isNaN(parsedDate.getTime())) return acc;

      const dateKey = parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(byDate).map(([date, count]) => ({ date, events: count }));
  }, [schedules]);

  if (!chartData.length) {
    return <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--chart-axis)' }}>No timeline data available</div>;
  }

  const gridColor = isDark ? "rgba(148, 163, 184, 0.08)" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const lineColor = isDark ? "#818cf8" : "#4f46e5";
  const dotFill = isDark ? "#0f172a" : "#fff";

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl p-3 shadow-lg" style={{ backgroundColor: 'var(--card)', border: 'var(--border-card)' }}>
          <p className="mb-1 text-xs" style={{ color: 'var(--chart-axis)' }}>{payload[0].payload.date}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {payload[0].value} <span className="text-xs" style={{ color: 'var(--chart-axis)' }}>Events</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={isDark ? 0.2 : 0.15} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
        <YAxis tick={{ fontSize: 11, fill: axisColor, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: `${lineColor}33`, strokeWidth: 2 }} />
        <Area
          type="monotone"
          dataKey="events"
          stroke={lineColor}
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorEvents)"
          dot={{ strokeWidth: 2, r: 4, fill: dotFill, stroke: lineColor }}
          activeDot={{ r: 6, fill: lineColor, stroke: dotFill, strokeWidth: 2 }}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
