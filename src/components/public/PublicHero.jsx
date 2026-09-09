import React from "react";
import { CalendarDays } from "lucide-react";
import { competitionStatusMeta } from "../../lib/publicUtils";

// Compact guest header: small logo, fluid title, one status badge.
// Uses the real Competition.status enum (upcoming/live/completed/archived).
export default function PublicHero({ competition }) {
  const { name, year, status, logoUrl, branding, group_label_plural } = competition;
  const statusMeta = competitionStatusMeta(status);

  return (
    <header className="relative border-b border-border hero-bg">
      <div className="relative container-public py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl border border-border bg-card p-1.5 shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          {branding?.organization_name && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {branding.organization_name}
            </p>
          )}
          <h1 className="font-black font-heading tracking-tight text-foreground text-balance leading-tight mt-1 text-3xl sm:text-4xl">
            {name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-card text-xs font-semibold text-foreground">
              {statusMeta.pulse && (
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
              )}
              {statusMeta.label}
            </span>
            {year && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                {year}
              </span>
            )}
            {group_label_plural && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                {group_label_plural}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
