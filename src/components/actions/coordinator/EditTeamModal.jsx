import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle, Loader2, Search, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Label } from "../../ui/label";
import { API_ROUTES, buildUrl, apiJson } from "../../../utils/apiClient";
import { getCoordinatorTeamId, getTeamLimits } from "./coordinatorGuards";

/**
 * Coordinator Edit modal — captain parity (v30/v30.1):
 * team events only, rename + roster swap, dirty-gated Save,
 * searchable event-scoped roster, Selected chips with X to deselect.
 */
export default function EditTeamModal({ open, team, event, onClose, onSaved }) {
  const [teamName, setTeamName] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);

  const teamId = team ? getCoordinatorTeamId(team) : null;
  const eventId = event?._id || event?.event_id || team?.event_id?._id || team?.event_id;
  const { min, max } = useMemo(() => getTeamLimits(event || team?.event_id || {}), [event, team]);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => {
    if (open && team) {
      setTeamName(team.name || "");
      setMemberIds((team.members || []).map((m) => String(m._id)));
      setSearch("");
    }
    if (!open) {
      setTeamName("");
      setMemberIds([]);
      setSearch("");
      setCandidates([]);
    }
  }, [open, team]);

  useEffect(() => {
    if (!open || !eventId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingCandidates(true);
        const payload = await apiJson(buildUrl(API_ROUTES.TEAMS.LIST({ event_id: String(eventId) })));
        if (cancelled) return;
        const rows = payload?.data || [];
        // Flatten unique participants across this event as edit candidates.
        const seen = new Map();
        rows.forEach((t) => {
          (t.members || []).forEach((m) => {
            if (!seen.has(String(m._id))) {
              seen.set(String(m._id), {
                _id: String(m._id),
                name: m.name,
                class: m.class,
                unique_id: m.unique_id,
                teamId: String(t._id),
              });
            }
          });
        });
        // Also fetch team group participants via members endpoint fallback is covered by rows above;
        // keep current members even if event list is paged.
        (team?.members || []).forEach((m) => {
          if (!seen.has(String(m._id))) {
            seen.set(String(m._id), {
              _id: String(m._id),
              name: m.name,
              class: m.class,
              unique_id: m.unique_id,
              teamId: String(teamId),
            });
          }
        });
        setCandidates([...seen.values()]);
      } catch {
        if (!cancelled) setCandidates((team?.members || []).map((m) => ({ ...m, _id: String(m._id) })));
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, eventId, team, teamId]);

  const registeredElsewhere = useMemo(() => {
    const mine = new Set((team?.members || []).map((m) => String(m._id)));
    const map = new Map();
    candidates.forEach((c) => {
      if (String(c.teamId) !== String(teamId) && !mine.has(String(c._id))) {
        map.set(String(c._id), true);
      }
    });
    return map;
  }, [candidates, team, teamId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.class || "").toLowerCase().includes(q) ||
      (c.unique_id || "").toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const isDirty = useMemo(() => {
    if (!team) return false;
    if ((team.name || "").trim() !== (teamName || "").trim()) return true;
    const orig = new Set((team.members || []).map((m) => String(m._id)));
    const next = new Set(memberIds.map(String));
    if (orig.size !== next.size) return true;
    for (const id of next) if (!orig.has(id)) return true;
    return false;
  }, [team, teamName, memberIds]);

  const toggleMember = (id) => {
    const sid = String(id);
    if (memberIds.includes(sid)) {
      setMemberIds((prev) => prev.filter((x) => x !== sid));
      return;
    }
    if (registeredElsewhere.has(sid)) {
      const c = candidates.find((x) => String(x._id) === sid);
      toast.error(`${c?.name || "Participant"} is already registered for this event`);
      return;
    }
    if (memberIds.length >= max) {
      toast.error(`Maximum ${max} members allowed for this event`);
      return;
    }
    setMemberIds((prev) => [...prev, sid]);
  };

  const saveDisabled =
    saving || !isDirty || !teamName.trim() || memberIds.length < min || memberIds.length > max;

  const handleSave = async () => {
    if (!teamId) return;
    if (!teamName.trim()) {
      toast.error("Please provide a team name");
      return;
    }
    if (memberIds.length < min) {
      toast.error(`Team too small: minimum ${min} members required`);
      return;
    }
    if (memberIds.length > max) {
      toast.error(`Team too large: maximum ${max} members allowed`);
      return;
    }
    if (!isDirty) {
      toast.error("No changes to save");
      return;
    }
    try {
      setSaving(true);
      await apiJson(buildUrl(API_ROUTES.TEAMS.UPDATE(teamId)), {
        method: "PATCH",
        body: JSON.stringify({ team_name: teamName.trim(), participant_ids: memberIds }),
      });
      toast.success(`Team "${teamName.trim()}" updated`);
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to update team");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent
        className={`flex flex-col gap-0 overflow-hidden p-0 ${
          isMobile ? "max-h-[92dvh]" : "max-h-[90vh] max-w-2xl"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader>
            <DialogTitle className="pr-8 text-left">
              Edit Team — {event?.title || event?.name || team?.event_id?.title || "Event"}
            </DialogTitle>
            <DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider">
                  Team Event
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {team?.group_id?.name || ""}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
            Team size {min}-{max} · {memberIds.length} selected
            {!isDirty ? " · No changes yet" : ""}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="space-y-2">
            <Label>
              Team Name <span className="text-accent-red">*</span>
            </Label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className={isMobile ? "min-h-[48px] text-base" : ""}
            />
            <p className="text-[10px] text-muted-foreground">
              Must be unique across all groups for this event.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest">
              Select Participants
            </Label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search participants in this event..."
                className={`pl-10 ${isMobile ? "min-h-[48px] text-base" : ""}`}
              />
            </div>
            <div className="max-h-[40dvh] divide-y divide-border overflow-y-auto rounded-lg border border-border sm:max-h-[300px]">
              {loadingCandidates ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm font-semibold text-muted-foreground">
                  No matching participants found
                </div>
              ) : (
                filtered.map((p) => {
                  const sid = String(p._id);
                  const isSelected = memberIds.includes(sid);
                  const blocked = !isSelected && registeredElsewhere.has(sid);
                  return (
                    <div
                      key={sid}
                      onClick={() => {
                        if (isSelected) { toggleMember(sid); return; }
                        if (registeredElsewhere.has(sid)) {
                          toast.error(`${p.name} is already registered for this event`);
                          return;
                        }
                        toggleMember(sid);
                      }}
                      className={`flex items-center justify-between transition-colors ${
                        isMobile ? "min-h-[56px] px-4 py-4" : "px-4 py-3"
                      } ${blocked ? "cursor-not-allowed opacity-40" : isSelected ? "bg-accent-blue/5" : "cursor-pointer hover:bg-accent-blue/5"}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected ? "bg-accent-blue text-white" : "bg-muted"
                          }`}
                        >
                          {isSelected ? <CheckCircle className="h-4 w-4" /> : <User className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-card-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.unique_id && <span>ID: {p.unique_id} · </span>}Class: {p.class || "—"}
                          </div>
                        </div>
                      </div>
                      {registeredElsewhere.has(sid) && !isSelected ? (
                        <Badge variant="success" className="text-[9px] font-bold uppercase tracking-widest">
                          Registered
                        </Badge>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {memberIds.length > 0 && (
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="mb-2 text-xs font-bold text-card-foreground">
                Selected ({memberIds.length}) — tap X to remove
              </div>
              <div className="flex flex-wrap gap-2">
                {memberIds.map((id) => {
                  const member = candidates.find((x) => String(x._id) === String(id))
                    || (team?.members || []).find((x) => String(x._id) === String(id));
                  if (!member) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent-blue/10 px-2.5 py-1 text-xs font-semibold text-accent-blue"
                    >
                      {member.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMember(id); }}
                        aria-label={`Remove ${member.name}`}
                        className="ml-0.5 hover:text-accent-red"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background px-5 py-4 sm:px-6">
          <div className="mb-3 text-xs text-muted-foreground">
            {memberIds.length} participant{memberIds.length !== 1 ? "s" : ""} selected
          </div>
          <div className={`flex gap-2.5 ${isMobile ? "flex-col" : "flex-row justify-end"}`}>
            <Button variant="outline" onClick={onClose} className="min-h-[48px] w-full sm:h-10 sm:min-h-0 sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveDisabled}
              className="min-h-[48px] w-full gap-2 sm:h-10 sm:min-h-0 sm:w-auto"
            >
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><CheckCircle className="h-4 w-4" />Save Changes</>)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
