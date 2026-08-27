import React from "react";
import { Trophy, CalendarDays, MapPin } from "lucide-react";

const STATUS_STYLES = {
  upcoming: { label: "UPCOMING", classes: "text-warning border-warning/30 bg-warning/10", pulse: false },
  live: { label: "LIVE", classes: "text-success border-success/30 bg-success/10", pulse: true },
  completed: { label: "COMPLETED", classes: "text-info border-info/30 bg-info/10", pulse: false },
  archived: { label: "ARCHIVED", classes: "text-muted-foreground border-muted-foreground/30 bg-muted/10", pulse: false },
};

export default function PublicHero({ competition }) {
  const { name, year, status, logoUrl, branding } = competition;
  const statusInfo = STATUS_STYLES[status] || STATUS_STYLES.upcoming;

  return (
    <header className="relative border-b border-border">
      <div className="relative max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center gap-8">
        {logoUrl && (
          <div className="shrink-0">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl border border-border bg-card p-2 shadow-2xl"
            />
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          {branding?.organization_name && (
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground mb-2">
              {branding.organization_name}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tight text-foreground">
            {name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-widest ${statusInfo.classes}`}
            >
              {statusInfo.pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/75 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
              )}
              {statusInfo.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted text-muted-foreground text-xs font-semibold">
              <CalendarDays className="w-3.5 h-3.5" />
              {year}
            </span>
            {branding?.logo_url ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted text-muted-foreground text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                {branding.organization_name}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
