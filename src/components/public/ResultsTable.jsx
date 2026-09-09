import React from "react";
import { ordinal, formatMemberLine, winnerMembersFromPublic } from "../../lib/publicUtils";

function positionBadgeClass(position) {
  if (position === 1) return "bg-warning text-white";
  if (position === 2) return "bg-muted-foreground text-white";
  if (position === 3) return "bg-accent-amber text-white";
  return "bg-muted text-muted-foreground";
}

// Placement rows: cards on phones (thumb-friendly), table on larger screens.
export default function ResultsTable({ results, groupLabel = "Group", showMetric = false }) {
  const sorted = [...results].sort((a, b) => a.position - b.position);

  return (
    <div>
      <ol className="sm:hidden space-y-2">
        {sorted.map((result) => {
          const memberLine = formatMemberLine(winnerMembersFromPublic(result));
          return (
          <li
            key={result._id}
            className="flex items-center gap-3 bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5"
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold tabular shrink-0 ${positionBadgeClass(result.position)}`}
            >
              {result.position}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 min-w-0">
                {result.group?.logoUrl && (
                  <img src={result.group.logoUrl} alt="" className="w-5 h-5 object-contain rounded shrink-0" />
                )}
                <span className="font-semibold text-foreground text-sm truncate">
                  {result.group?.name || "Unknown"}
                </span>
              </span>
              {memberLine && (
                <span className="block text-[13px] text-muted-foreground mt-0.5 leading-snug">
                  {memberLine}
                </span>
              )}
              <span className="block text-xs text-muted-foreground mt-0.5">
                {showMetric && result.metric ? result.metric : `${ordinal(result.position)} place`}
              </span>
            </span>
            <span className="text-right shrink-0">
              <span className="block font-bold text-foreground tabular text-sm">
                {result.total_points ?? result.points}
              </span>
              <span className="block text-[11px] text-muted-foreground">pts</span>
            </span>
          </li>
          );
        })}
      </ol>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Event placements by {groupLabel}</caption>
          <thead>
            <tr className="text-muted-foreground text-xs border-b border-border">
              <th scope="col" className="text-left py-2 pr-2 w-12 font-semibold">
                Rank
              </th>
              <th scope="col" className="text-left py-2 pr-2 font-semibold">
                {groupLabel}
              </th>
              <th scope="col" className="text-right py-2 pr-2 font-semibold">
                Points
              </th>
              {showMetric && (
                <th scope="col" className="text-right py-2 font-semibold">
                  Result
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((result) => {
              const memberLine = formatMemberLine(winnerMembersFromPublic(result));
              return (
              <tr key={result._id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-2">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold tabular ${positionBadgeClass(result.position)}`}
                  >
                    {result.position}
                  </span>
                </td>
                <td className="py-2.5 pr-2">
                  <span className="flex items-center gap-2 min-w-0">
                    {result.group?.logoUrl && (
                      <img src={result.group.logoUrl} alt="" className="w-5 h-5 object-contain rounded shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground truncate">
                        {result.group?.name || "Unknown"}
                      </span>
                      {memberLine && (
                        <span className="block text-xs font-normal text-muted-foreground mt-0.5 leading-snug">
                          {memberLine}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-2 text-right">
                  <span className="font-bold text-foreground tabular">{result.total_points ?? result.points}</span>
                  <span className="text-muted-foreground text-xs ml-1">pts</span>
                </td>
                {showMetric && (
                  <td className="py-2.5 text-right text-muted-foreground">
                    {result.metric || `${ordinal(result.position)} place`}
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
