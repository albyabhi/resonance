import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useTheme } from "../../context/ThemeContext";

export default function HousePerformanceChart({ data, userHouseId }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--chart-axis)' }}>No performance data available</div>;
  }

  const chartData = data.map((d) => ({
    name: d.house?.name || "Unknown",
    points: d.points || 0,
    houseId: d.house?._id,
  }));

  const gridColor = isDark ? "rgba(148, 163, 184, 0.08)" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const defaultBarColor = isDark ? "#334155" : "#cbd5e1";
  const accentBarColor = isDark ? "#818cf8" : "#4f46e5";

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl p-3 shadow-lg" style={{ backgroundColor: 'var(--card)', border: 'var(--border-card)' }}>
          <p className="mb-1 text-xs" style={{ color: 'var(--chart-axis)' }}>{payload[0].payload.name}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {payload[0].value.toLocaleString()} <span className="text-xs" style={{ color: 'var(--chart-axis)' }}>Points</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
        <YAxis tick={{ fontSize: 11, fill: axisColor, fontWeight: 500 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: isDark ? "rgba(99, 102, 241, 0.04)" : "rgba(99, 102, 241, 0.06)" }} content={<CustomTooltip />} />
        <Bar dataKey="points" radius={[8, 8, 0, 0]} barSize={28} animationDuration={1200} animationBegin={200}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={userHouseId && userHouseId === entry.houseId ? accentBarColor : defaultBarColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
