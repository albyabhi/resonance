import React from "react";
import { TrendingDown } from "lucide-react";

function positionBadgeClass(position) {
  if (position === 1) return "bg-warning text-white";
  if (position === 2) return "bg-muted-foreground text-white";
  if (position === 3) return "bg-accent-amber text-white";
  return "bg-muted text-muted-foreground";
}

// Standings render as tappable-feel cards on phones and a real table on
// larger screens. One accent for the leader; everything else stays neutral
// so the ranking — not the chrome — carries the hierarchy.
export default function PublicStandings({ standings, groupLabel = "Group" }) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="font-semibold text-foreground">No standings yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Points appear here as soon as results are published.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ol className="sm:hidden space-y-2.5" aria-label={`${groupLabel} standings`}>
        {standings.map((group) => (
          <li
            key={group._id}
            className={`flex items-center gap-3 bg-card border rounded-xl px-3.5 py-3 min-h-16 ${
              group.position === 1 ? "border-primary/40 bg-primary/5" : "border-border"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold tabular shrink-0 ${positionBadgeClass(group.position)}`}
              aria-label={`Rank ${group.position}`}
            >
              {group.position}
            </span>
            <span className="flex items-center gap-2.5 min-w-0 flex-1">
              {group.logoUrl && (
                <img src={group.logoUrl} alt="" className="w-7 h-7 object-contain rounded shrink-0" />
              )}
              <span className="min-w-0">
                <span className="block font-semibold text-foreground truncate leading-tight">
                  {group.name}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {group.points_behind > 0 ? `${group.points_behind} behind leader` : "Leading"}
                </span>
              </span>
            </span>
            <span className="text-right shrink-0">
              <span className="block text-xl font-bold text-foreground tabular leading-none">
                {group.total_score}
              </span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">pts</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-130">
            <caption className="sr-only">Overall {groupLabel} rankings</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th scope="col" className="text-left px-4 py-3 font-semibold w-14">
                  Rank
                </th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">
                  {groupLabel}
                </th>
                <th scope="col" className="text-right px-4 py-3 font-semibold">
                  Points
                </th>
                <th scope="col" className="text-right px-4 py-3 font-semibold">
                  Behind leader
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((group) => (
                <tr
                  key={group._id}
                  className={`border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors ${
                    group.position === 1 ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold tabular ${positionBadgeClass(group.position)}`}
                    >
                      {group.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 min-w-0">
                      {group.logoUrl && (
                        <img src={group.logoUrl} alt="" className="w-6 h-6 object-contain rounded shrink-0" />
                      )}
                      <span className="font-semibold text-foreground truncate">{group.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground tabular">
                    {group.total_score}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {group.points_behind > 0 ? (
                      <span className="inline-flex items-center justify-end gap-1 tabular">
                        <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                        {group.points_behind}
                      </span>
                    ) : (
                      <span className="text-success font-semibold">Leader</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
