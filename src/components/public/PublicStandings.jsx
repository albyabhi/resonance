import React from "react";
import { Trophy, Medal, Award, TrendingDown } from "lucide-react";

const MEDAL_STYLES = [
  { border: "border-warning/50", glow: "shadow-warning/20", ring: "from-warning to-warning" },
  { border: "border-muted-foreground/50", glow: "shadow-muted-foreground/20", ring: "from-muted-foreground to-muted-foreground/70" },
  { border: "border-accent-amber/50", glow: "shadow-accent-amber/20", ring: "from-accent-amber to-accent-amber/80" },
];

export default function PublicStandings({ standings, groupLabel = "Group", primaryColor = "#2563EB" }) {
  const podium = standings.slice(0, 3);

  return (
    <section className="max-w-6xl mx-auto px-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="text-xl font-bold text-foreground">Standings</h2>
        <span className="text-xs text-muted-foreground font-medium ml-1">Overall {groupLabel} rankings</span>
      </div>

      {standings.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
          No standings available yet.
        </div>
      ) : (
        <>
          {/* Podium */}
          {podium.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 items-end">
              {podium.map((group, idx) => {
                const medal = MEDAL_STYLES[idx] || MEDAL_STYLES[2];
                const isLeader = idx === 0;
                return (
                  <div
                    key={group._id}
                    className={`relative bg-card border rounded-2xl p-4 sm:p-6 text-center shadow-2xl ${medal.border} ${medal.glow} ${
                      isLeader ? "scale-105 z-10 -translate-y-2" : ""
                    }`}
                  >
                    {isLeader && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-warning bg-card border border-warning/40 rounded-full px-2 py-0.5">
                          Leader
                        </span>
                      </div>
                    )}
                    <div
                      className={`mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${medal.ring} mb-3`}
                    >
                      {idx === 0 ? (
                        <Trophy className="w-5 h-5 text-white" />
                      ) : idx === 1 ? (
                        <Medal className="w-5 h-5 text-white" />
                      ) : (
                        <Award className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="font-bold text-foreground text-sm sm:text-base truncate">{group.name}</div>
                    <div className="text-2xl sm:text-4xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground">
                      {group.total_score}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">pts</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-xs">
                  <th className="text-left px-4 py-3 font-semibold w-12">#</th>
                  <th className="text-left px-4 py-3 font-semibold">{groupLabel}</th>
                  <th className="text-right px-4 py-3 font-semibold">Points</th>
                  <th className="hidden sm:table-cell text-right px-4 py-3 font-semibold">Behind Leader</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((group) => (
                  <tr key={group._id} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                          group.position <= 3
                            ? `bg-gradient-to-br ${MEDAL_STYLES[group.position - 1]?.ring || MEDAL_STYLES[2].ring} text-white`
                            : "text-muted-foreground bg-muted"
                        }`}
                      >
                        {group.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {group.logoUrl && (
                          <img src={group.logoUrl} alt="" className="w-6 h-6 object-contain rounded" />
                        )}
                        <span className="font-semibold text-foreground">{group.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{group.total_score}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right text-muted-foreground">
                      {group.points_behind > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" />
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
        </>
      )}
    </section>
  );
}