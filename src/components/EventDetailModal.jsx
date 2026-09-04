import { useEffect, useState } from "react";
import {
  X,
  MapPin,
  CalendarDays,
  Users,
  Trophy,
  Crown,
  Medal,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import EventStatusBadge from "./EventStatusBadge";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shortDate(value) {
  const d = safeDate(value);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fullDate(value) {
  const d = safeDate(value);
  if (!d) return null;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function rankRowClasses(position) {
  if (position === 1) return "border-warning/30 bg-warning/10";
  if (position === 2) return "border-border bg-muted/40";
  if (position === 3) return "border-accent-amber/30 bg-accent-amber/10";
  return "border-border bg-card";
}

function RankMark({ position }) {
  if (position === 1)
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
        <Crown className="h-5 w-5" />
      </span>
    );
  if (position === 2)
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Medal className="h-5 w-5" />
      </span>
    );
  if (position === 3)
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-amber/15 text-accent-amber">
        <Medal className="h-5 w-5" />
      </span>
    );
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted font-mono text-sm font-bold text-muted-foreground">
      {position}
    </span>
  );
}

export default function EventDetailModal({
  event,
  schedules = [],
  teams = [],
  winners = [],
  loading = false,
  groupLabel = "Group",
  onClose,
}) {
  const [tab, setTab] = useState("results");

  useEffect(() => {
    setTab("results");
  }, [event?._id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!event && !loading) return null;

  const title = event?.title || event?.name || "Event details";
  const status = event?.status || "draft";
  const rounds = event?.rounds || schedules.length || 1;
  const isTeam = event?.event_type === "team";
  const teamSize = isTeam
    ? `${event?.min_participants ?? event?.min_team_size ?? 1}–${event?.max_participants ?? event?.max_team_size ?? 1}`
    : "Individual";
  const maxPerGroup = event?.max_per_group ?? "—";

  const sortedSchedules = [...(schedules || [])].sort(
    (a, b) => (a.round_no || 0) - (b.round_no || 0)
  );
  const nextRound =
    sortedSchedules.find((s) => s.status === "live" || s.status === "ongoing") ||
    sortedSchedules.find((s) => safeDate(s.date)) ||
    sortedSchedules[0];
  const nextDate = nextRound ? shortDate(nextRound.date) : null;
  const nextFull = nextRound ? fullDate(nextRound.date) : null;

  const coordinator = event?.coordinator_id;
  const coordinatorName =
    typeof coordinator === "object" ? coordinator?.name : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft">
        <div className="accent-stripe" aria-hidden="true" />

        <header className="border-b border-border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-xl font-bold tracking-tight text-card-foreground">
                  {title}
                </h2>
                <EventStatusBadge status={status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {event?.category && (
                  <Badge variant="secondary" className="font-semibold capitalize">
                    {event.category}
                  </Badge>
                )}
                {event?.subcategory && <span>{event.subcategory}</span>}
                <span className="inline-flex items-center gap-1 capitalize">
                  <MapPin className="h-3 w-3" />
                  {event?.mode === "onstage" ? "Onstage" : event?.mode || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {isTeam ? "Team" : "Individual"}
                </span>
                <span className="font-mono uppercase tracking-wide">
                  {rounds} round{rounds !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {nextFull || nextDate
                  ? `Next: ${nextFull || nextDate}${nextRound?.time ? ` · ${nextRound.time}` : ""}${nextRound?.venue ? ` — ${nextRound.venue}` : ""}`
                  : "Fixture dates to be announced"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close event details"
              className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!loading && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <span className="icon-tile-teal flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Schedule
                  </span>
                  <span className="block truncate text-sm font-semibold text-card-foreground">
                    {nextDate
                      ? `${nextDate}${nextRound?.time ? ` · ${nextRound.time}` : ""}`
                      : "TBD"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {nextRound?.venue || "Venue TBD"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <span className="icon-tile-purple flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Users className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Entry
                  </span>
                  <span className="block truncate text-sm font-semibold text-card-foreground">
                    {teamSize}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Max {maxPerGroup} per {groupLabel}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <span className="icon-tile-amber flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Trophy className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Field
                  </span>
                  <span className="block truncate text-sm font-semibold text-card-foreground">
                    {teams.length} squad{teams.length !== 1 ? "s" : ""}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {winners.length
                      ? `${winners.length} placed`
                      : "Results pending"}
                  </span>
                </span>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3 py-8">
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
              <p className="pt-2 text-center text-sm text-muted-foreground">
                Loading fixture…
              </p>
            </div>
          ) : (
            <>
              {event?.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {event.description}
                </p>
              )}

              {coordinatorName && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {coordinatorName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Coordinator
                    </p>
                    <p className="truncate text-sm font-semibold text-card-foreground">
                      {coordinatorName}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {coordinator?.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {coordinator.email}
                        </span>
                      )}
                      {coordinator?.phone && coordinator?.phone_visible && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {coordinator.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <section aria-label="Fixture">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Fixture · {sortedSchedules.length || rounds} round
                  {(sortedSchedules.length || rounds) !== 1 ? "s" : ""}
                </h3>
                {sortedSchedules.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                    Fixture not published yet. Check back after scheduling.
                  </div>
                ) : (
                  <ol className="relative space-y-0 border-l border-border pl-0">
                    {sortedSchedules.map((r) => {
                      const d = fullDate(r.date) || shortDate(r.date);
                      return (
                        <li
                          key={r._id || r.round_no}
                          className="relative pb-4 pl-6 last:pb-0"
                        >
                          <span
                            className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card"
                            aria-hidden="true"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-card-foreground">
                              Round {r.round_no}
                            </span>
                            {r.status && (
                              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                                {(r.status || "").replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-card-foreground">
                            {r.venue || "Venue TBD"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d || "Date TBD"}
                            {r.time ? ` · ${r.time}` : ""}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="results" className="flex-1 sm:flex-none">
                    Results
                    {winners.length > 0 && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px]">
                        {winners.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="lineups" className="flex-1 sm:flex-none">
                    Line-ups
                    {teams.length > 0 && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px]">
                        {teams.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="results" className="mt-4">
                  {winners.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <Trophy className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-sm font-medium text-card-foreground">
                        No official results yet
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Standings appear here once results are approved.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {winners.map((w) => (
                        <div
                          key={w.resultId}
                          className={`flex items-center gap-4 rounded-lg border p-4 ${rankRowClasses(w.position)}`}
                        >
                          <RankMark position={w.position} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-card-foreground">
                              {w.houseText || "—"}
                            </p>
                            {w.points != null && (
                              <p className="font-mono text-xs text-muted-foreground">
                                {w.points} pts
                                {w.metric ? ` · ${w.metric}` : ""}
                              </p>
                            )}
                            {w.members?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {w.members.map((m) => (
                                  <span
                                    key={m._id || m.name}
                                    className="rounded-md border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground"
                                  >
                                    {m.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            P{w.position}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="lineups" className="mt-4">
                  {teams.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No squads entered for this event yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {teams.map((t) => (
                        <div
                          key={t._id}
                          className="rounded-lg border border-border bg-card p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 truncate text-sm font-semibold text-card-foreground">
                              {t.houseName || "Unassigned"}
                            </p>
                            {t.chest_no ? (
                              <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-card-foreground">
                                {t.chest_no}
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                No chest no.
                              </span>
                            )}
                          </div>
                          {t.members?.length > 0 ? (
                            <ul className="mt-3 divide-y divide-border border-t border-border">
                              {t.members.map((m) => (
                                <li
                                  key={m._id || m.name}
                                  className="flex items-center justify-between gap-2 py-2 text-xs"
                                >
                                  <span className="min-w-0 truncate text-card-foreground">
                                    {m.name}
                                  </span>
                                  {m.class && (
                                    <span className="shrink-0 text-muted-foreground">
                                      {m.class}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-xs text-muted-foreground">
                              Roster not published.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
