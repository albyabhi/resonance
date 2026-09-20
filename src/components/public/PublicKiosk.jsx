import React from "react";
import { Wifi } from "lucide-react";

function formatLastUpdate(lastUpdate) {
  if (!lastUpdate) return null;
  const diff = Date.now() - lastUpdate;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 30) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Full-screen HUD for venue displays (?display=kiosk).
// Fluid type via clamp() so TV landscape and tablet portrait both fit
// without the old fixed text-6xl / px-10 overflow.
export default function PublicKiosk({ competition, standings, lastUpdate }) {
  const lastUpdateLabel = formatLastUpdate(lastUpdate);

  return (
    <div className="min-h-screen font-sans bg-background text-foreground overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 pt-5">
        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2 min-h-4">
          {lastUpdateLabel && (
            <>
              <Wifi className="h-3 w-3 text-success" aria-hidden="true" />
              <span>
                Last updated: <span className="font-mono font-bold">{lastUpdateLabel}</span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2.5" role="status" aria-label="Live standings">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          <span className="text-sm font-bold tracking-[0.2em] uppercase text-success">Live</span>
        </div>
      </div>

      <h1
        className="text-center font-black text-foreground px-5 mt-4 mb-6 leading-tight text-balance"
        style={{ fontSize: "clamp(1.75rem, 4.5vw, 3.5rem)" }}
      >
        {competition.name}
      </h1>

      <main className="flex-1 px-5 sm:px-8 pb-6 grid gap-5 lg:grid-cols-12 min-h-0">
        <section
          aria-label={`${competition.group_label} standings`}
          className="lg:col-span-12 bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col shadow-2xl shadow-primary/10 min-h-0"
        >
          <h2
            className="font-bold text-foreground mb-4"
            style={{ fontSize: "clamp(1.25rem, 2.5vw, 2rem)" }}
          >
            {competition.group_label} standings
          </h2>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
            {standings.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-lg">No scores available yet.</p>
            ) : (
              standings.map((group, index) => (
                <div
                  key={group._id}
                  className={`relative overflow-hidden flex items-center justify-between gap-4 px-4 sm:px-5 py-4 rounded-xl border ${
                    index === 0
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/40 border-border/60"
                  }`}
                >
                  {index === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-primary" aria-hidden="true" />}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span
                      className="font-black text-muted-foreground tabular-nums shrink-0 w-8 text-center"
                      style={{ fontSize: "clamp(1.25rem, 3vw, 2.5rem)" }}
                    >
                      {index + 1}
                    </span>
                    <span
                      className="font-bold text-foreground truncate"
                      style={{ fontSize: "clamp(1.1rem, 2.6vw, 2rem)" }}
                    >
                      {group.name}
                    </span>
                  </div>
                  <div
                    className="font-black tracking-tight text-foreground tabular-nums shrink-0"
                    style={{ fontSize: "clamp(1.5rem, 4vw, 3.5rem)" }}
                  >
                    {group.total_score}
                    <span className="text-muted-foreground ml-2 font-medium" style={{ fontSize: "0.45em" }}>
                      pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
