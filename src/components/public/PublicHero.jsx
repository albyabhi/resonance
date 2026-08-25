import React from "react";
import { Trophy, CalendarDays, MapPin, Sparkles } from "lucide-react";

const STATUS_STYLES = {
  upcoming: { label: "UPCOMING", classes: "text-amber-300 border-amber-500/30 bg-amber-500/10", pulse: false },
  live: { label: "LIVE", classes: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", pulse: true },
  completed: { label: "COMPLETED", classes: "text-blue-300 border-blue-500/30 bg-blue-500/10", pulse: false },
  archived: { label: "ARCHIVED", classes: "text-neutral-400 border-neutral-500/30 bg-neutral-500/10", pulse: false },
};

export default function PublicHero({ competition }) {
  const { name, year, status, logoUrl, branding, current_stage, group_label_plural } = competition;
  const primary = branding?.primary_color || "#2563EB";
  const statusInfo = STATUS_STYLES[status] || STATUS_STYLES.upcoming;

  return (
    <header className="relative overflow-hidden border-b border-neutral-800">
      {/* Glow accents */}
      <div
        className="absolute -top-32 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: primary }}
      />
      <div className="absolute -bottom-40 -right-24 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ backgroundColor: primary }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center gap-8">
        {logoUrl && (
          <div className="shrink-0">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl border border-neutral-700 bg-neutral-900 p-2 shadow-2xl"
            />
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          {branding?.organization_name && (
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-400 mb-2">
              {branding.organization_name}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            {name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-widest ${statusInfo.classes}`}
            >
              {statusInfo.pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              {statusInfo.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 text-xs font-semibold">
              <CalendarDays className="w-3.5 h-3.5" />
              {year}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" style={{ color: primary }} />
              {current_stage || `${group_label_plural} Battle`}
            </span>
            {branding?.logo_url ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                {branding.organization_name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 hidden sm:flex flex-col items-center gap-1 opacity-80">
          <Trophy className="w-10 h-10" style={{ color: primary }} />
        </div>
      </div>
    </header>
  );
}
