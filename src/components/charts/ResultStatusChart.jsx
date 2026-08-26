import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getThemeColor } from "../../lib/theme/getThemeColor";

export default function ResultStatusChart({ results = [] }) {
  const colorMap = {
    pending: getThemeColor("--warning"),
    approved: getThemeColor("--success"),
    rejected: getThemeColor("--destructive"),
  };

  const chartData = useMemo(() => {
    if (!results.length) return [];

    const statuses = results.reduce((acc, result) => {
      const s = result.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [results]);

  if (!chartData.length) {
    return <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--chart-axis)' }}>No result data available</div>;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl p-3 shadow-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="mb-1 text-xs" style={{ color: 'var(--chart-axis)' }}>{payload[0].name}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const legendColor = getThemeColor("--chart-axis");
  const strokeColor = getThemeColor("--background");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="44%"
          innerRadius={52}
          outerRadius={82}
          dataKey="value"
          animationDuration={1000}
          stroke={strokeColor}
          strokeWidth={3}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colorMap[entry.name] || getThemeColor("--chart-purple")} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span style={{ fontSize: '12px', color: legendColor }}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}