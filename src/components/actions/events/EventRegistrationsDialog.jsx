import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import EventStatusBadge from "../../EventStatusBadge";
import { getTeamStatusMeta } from "../../../utils/participantStatus";
import { getEventId } from "./eventConstants";

/**
 * Read-only registrations viewer for Events Management.
 * Shows teams + members for one event (team count + participant headcount).
 * Data comes from GET /api/team?event_id=&competition_id= (already includes members).
 */
export default function EventRegistrationsDialog({
  event,
  open,
  onClose,
  apiCall,
  competitionId,
}) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const eventId = getEventId(event);

  useEffect(() => {
    if (!open || !eventId) return;
    let cancelled = false;
    setTeams([]);
    setSearch("");
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({ event_id: String(eventId) });
        if (competitionId) params.set("competition_id", String(competitionId));
        const { data } = await apiCall(`/api/team?${params.toString()}`);
        if (!cancelled) setTeams(data || []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load registrations");
          setTeams([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, eventId, competitionId, apiCall]);

  const totalParticipants = useMemo(
    () =>
      (teams || []).reduce(
        (sum, t) => sum + (Array.isArray(t?.members) ? t.members.length : 0),
        0
      ),
    [teams]
  );

  const filteredTeams = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return teams || [];
    return (teams || []).filter((t) => {
      const teamName = (t?.name || "Individual").toLowerCase();
      const groupName = (t?.group_id?.name || "").toLowerCase();
      const chest = (t?.chest_no || "").toLowerCase();
      const memberHit = (t?.members || []).some((m) =>
        (m?.name || "").toLowerCase().includes(q)
      );
      return (
        teamName.includes(q) ||
        groupName.includes(q) ||
        chest.includes(q) ||
        memberHit
      );
    });
  }, [teams, search]);

  const title = event?.title || event?.name || "Event";

  return (
    <Dialog open={!!open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{title}</span>
            {event?.status && <EventStatusBadge status={event.status} size="sm" />}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Loading registrations…"
              : `${teams.length} team${teams.length !== 1 ? "s" : ""} · ${totalParticipants} participant${totalParticipants !== 1 ? "s" : ""}`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team, group, member, chest no…"
            className="pl-9"
            aria-label="Search registrations"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 py-2" aria-label="Loading registrations">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => onClose?.()}>
                Close
              </Button>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search.trim()
                  ? "No registrations match your search"
                  : "No teams registered for this event"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {filteredTeams.map((team) => {
                const members = Array.isArray(team?.members) ? team.members : [];
                return (
                  <div
                    key={team._id || team.id}
                    className="rounded-xl border border-border bg-muted p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-card-foreground">
                        {team.name || "Individual"}
                      </p>
                      {team.chest_no && (
                        <Badge variant="outline" className="text-xs">
                          #{team.chest_no}
                        </Badge>
                      )}
                      {team.status && team.status !== "active" && (
                        <Badge
                          variant={getTeamStatusMeta(team.status).badge}
                          className="text-[10px]"
                        >
                          {getTeamStatusMeta(team.status).label}
                        </Badge>
                      )}
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {team.group_id?.name || "No group"} · {members.length}{" "}
                      participant{members.length !== 1 ? "s" : ""}
                    </p>
                    {members.length > 0 ? (
                      <div className="space-y-1.5">
                        {members.map((m) => (
                          <div
                            key={m._id || m.id}
                            className="flex items-center gap-3 rounded-lg bg-card px-3 py-2"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-accent-blue/10 text-xs font-bold text-accent-blue">
                                {(m.name || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-card-foreground">
                                {m.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[m.unique_id, m.class].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-1 text-center text-xs text-muted-foreground">
                        No members in this team
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border pt-3">
          <Button
            variant="outline"
            onClick={() => onClose?.()}
            className="min-h-[44px]"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
