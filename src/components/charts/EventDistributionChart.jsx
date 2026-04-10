import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "../../context/ThemeContext";

const COLORS = ["#4f46e5", "#8b5cf6", "#10b981", "#3b82f6", "#64748b"];
const COLORS_DARK = ["#818cf8", "#a78bfa", "#34d399", "#60a5fa", "#94a3b8"];

export default function EventDistributionChart({ events = [] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const palette = isDark ? COLORS_DARK : COLORS;

  const chartData = useMemo(() => {
    if (!events.length) return [];

    const modes = events.reduce((acc, event) => {
      const m = event.mode || "other";
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(modes).map(([name, value]) => ({ name, value }));
  }, [events]);

  if (!chartData.length) {
    return <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--chart-axis)' }}>No event distribution data available</div>;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl p-3 shadow-lg" style={{ backgroundColor: 'var(--card)', border: 'var(--border-card)' }}>
          <p className="mb-1 text-xs" style={{ color: 'var(--chart-axis)' }}>{payload[0].name}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {payload[0].value} <span className="text-xs" style={{ color: 'var(--chart-axis)' }}>Events</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const legendColor = isDark ? "#94a3b8" : "#64748b";
  const strokeColor = isDark ? "#0f172a" : "#ffffff";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="44%"
          innerRadius={64}
          outerRadius={96}
          paddingAngle={4}
          dataKey="value"
          animationDuration={1200}
          stroke={strokeColor}
          strokeWidth={3}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: '12px', color: legendColor }}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
