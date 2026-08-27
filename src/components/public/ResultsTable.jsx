import React from "react";
import { ordinal, POSITION_COLORS } from "../../lib/publicUtils";

export default function ResultsTable({ results, groupLabel = "Group", showMetric = false }) {
  const sorted = [...results].sort((a, b) => a.position - b.position);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
          <th className="text-left py-2 pr-2 w-10">#</th>
          <th className="text-left py-2 pr-2">{groupLabel}</th>
          <th className="text-right py-2 pr-2">Points</th>
          {showMetric && (
            <th className="hidden sm:table-cell text-right py-2">Result</th>
          )}
        </tr>
      </thead>
      <tbody>
        {sorted.map((result) => (
          <tr key={result._id} className="border-b border-border/50 last:border-0">
            <td className="py-2.5 pr-2">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                  POSITION_COLORS[result.position] || "text-muted-foreground bg-muted"
                }`}
              >
                {result.position}
              </span>
            </td>
            <td className="py-2.5 pr-2">
              <div className="flex items-center gap-2.5">
                {result.group?.logoUrl && (
                  <img src={result.group.logoUrl} alt="" className="w-5 h-5 object-contain rounded" />
                )}
                <span className="font-semibold text-foreground">{result.group?.name || "Unknown"}</span>
              </div>
            </td>
            <td className="py-2.5 pr-2 text-right">
              <span className="font-bold text-foreground">{result.total_points}</span>
              <span className="text-muted-foreground text-xs ml-1">pts</span>
            </td>
            {showMetric && (
              <td className="hidden sm:table-cell py-2.5 text-right text-muted-foreground">
                {result.metric || `${ordinal(result.position)} place`}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
