import { CheckCircle, Hash, Pencil, Trash2, UserMinus, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { getTeamStatusMeta, getParticipantStatusMeta } from "../../../utils/participantStatus";
import {
  getCoordinatorTeamId,
  getEditBlockedReason,
  getRevokeBlockedReason,
  isEditableEntry,
  isRevocableEntry,
  isTeamEvent,
} from "./coordinatorGuards";

/**
 * Coordinator entry row.
 * Compact on mobile, expandable, with labeled actions.
 * Chest inline edit stays here so chest + roster never split across tabs.
 */
export default function TeamEntryCard({
  team,
  event,
  actionLoading,
  chestEditingId,
  chestValue,
  onStartChest,
  onChestChange,
  onConfirmChest,
  onCancelChest,
  onEdit,
  onRevoke,
  onDeleteMember,
  showChest = true,
}) {
  const teamId = getCoordinatorTeamId(team);
  const revocable = isRevocableEntry(team, event);
  const editable = isEditableEntry(team, event);
  const revokeReason = getRevokeBlockedReason(team, event);
  const editReason = getEditBlockedReason(team, event);
  const teamEvent = isTeamEvent(event || team?.event_id || {});
  const [expanded, setExpanded] = useState(false);

  const members = team.members || [];
  const visibleMembers = expanded ? members : members.slice(0, 6);

  return (
    <div className={`rounded-lg border border-border bg-card ${expanded ? "border-accent-amber/40" : "border-border"}`}>
      <div className="p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-col gap-3 w-full"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-card-foreground">
                  {team.name || "Individual"}
                </p>
                {team.status && team.status !== "active" && (
                  <Badge variant={getTeamStatusMeta(team.status).badge} className="text-[10px]">
                    {getTeamStatusMeta(team.status).label}
                  </Badge>
                )}
                {team.chest_no && (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1 border-accent-amber/20 bg-accent-amber/10 text-xs font-bold text-accent-amber"
                  >
                    <Hash className="h-3 w-3" />
                    {team.chest_no}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {team.group_id?.name || "No group"} · {members.length} member
                {members.length !== 1 ? "s" : ""}
              </p>
              {!revocable && (
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                  Locked — registration is not open.
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {showChest &&
                (chestEditingId === teamId ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={chestValue}
                      onChange={(e) =>
                        onChestChange(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
                      }
                      placeholder="Chest #"
                      maxLength={20}
                      className="h-9 w-24 font-mono text-xs sm:w-28"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onConfirmChest();
                        if (e.key === "Escape") onCancelChest();
                      }}
                      aria-label={`Chest number for ${team.name || "entry"}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onConfirmChest}
                      disabled={actionLoading || !chestValue.trim()}
                      className="h-9 px-2 text-accent-green hover:bg-accent-green/10"
                      aria-label="Save chest number"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancelChest}
                      className="h-9 px-2 hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Cancel chest edit"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStartChest?.(team)}
                    className="min-h-[44px] gap-1.5 sm:min-h-[36px]"
                    aria-label={`${team.chest_no ? "Edit" : "Assign"} chest number for ${team.name || "entry"}`}
                  >
                    <Hash className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">{team.chest_no ? "Chest" : "Assign"}</span>
                  </Button>
                ))}

              {teamEvent && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!editable}
                  title={editReason || "Edit team name and members"}
                  aria-label={`Edit team ${team.name || "entry"}`}
                  onClick={() => onEdit?.(team)}
                  className="min-h-[44px] gap-1.5 sm:min-h-[36px] disabled:opacity-40"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">Edit</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!revocable}
                title={revokeReason || "Revoke this entry"}
                aria-label={`Revoke entry ${team.name || "entry"}`}
                onClick={() => onRevoke?.(team)}
                className="min-h-[44px] gap-1.5 text-accent-red hover:bg-accent-red/10 hover:text-accent-red sm:min-h-[36px] disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">Revoke</span>
              </Button>
            </div>
          </div>

          {members.length > 0 ? (
            <div className="space-y-1.5">
              {visibleMembers.map((m) => (
                    <div
                      key={m._id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-2 sm:px-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-accent-blue/10 text-xs font-bold text-accent-blue">
                            {(m.name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-card-foreground sm:text-sm">
                            {m.name}
                            {m.status && m.status !== "active" && (
                              <Badge
                                variant={getParticipantStatusMeta(m.status).badge}
                                className="ml-1 text-[9px]"
                              >
                                {getParticipantStatusMeta(m.status).label}
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                            {[m.unique_id, m.class].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!revocable || actionLoading}
                        title={revokeReason || `Remove ${m.name}`}
                        onClick={() => onDeleteMember?.(team, m)}
                        className="h-9 shrink-0 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        aria-label={`Remove ${m.name} from ${team.name || "entry"}`}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        <span className="hidden text-xs min-[420px]:inline">Remove</span>
                      </Button>
                    </div>
                  ))}
              {members.length > 6 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs font-semibold text-accent-blue hover:underline"
                >
                  {expanded ? "Show less" : `Show all ${members.length} members`}
                </button>
              )}
            </div>
          ) : (
            <p className="py-1 text-center text-xs text-muted-foreground">
              No members in this entry
            </p>
          )}
        </button>
      </div>
    </div>
  );
}
