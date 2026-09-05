import { useState } from "react";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";
import { RefreshCw, Users } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import useAssignedEvents from "./coordinator/useAssignedEvents";
import AssignedEventList from "./coordinator/AssignedEventList";
import AssignedEventHeader from "./coordinator/AssignedEventHeader";
import TeamEntryCard from "./coordinator/TeamEntryCard";
import EditTeamModal from "./coordinator/EditTeamModal";
import RevokeEntryDialog from "./coordinator/RevokeEntryDialog";
import { API_ROUTES, buildUrl } from "../../utils/apiClient";
import { getCoordinatorTeamId } from "./coordinator/coordinatorGuards";

export default function CoordinatorParticipants() {
  const { token } = useAuth();
  const {
    apiCall,
    events,
    filteredEvents,
    counts,
    selectedEvent,
    selectedEventId,
    setSelectedEventId,
    selectedTeams,
    teamsLoading,
    loading,
    refreshing,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    reload,
    refreshTeams,
  } = useAssignedEvents({ token });

  const [actionLoading, setActionLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const teamId = getCoordinatorTeamId(revokeTarget);
    try {
      setRevokingId(teamId);
      setActionLoading(true);
      await apiCall(buildUrl(API_ROUTES.TEAMS.DELETE(teamId)), { method: "DELETE" });
      toast.success(`Entry "${revokeTarget.name || "Individual"}" revoked`);
      setRevokeTarget(null);
      await refreshTeams();
    } catch (err) {
      toast.error(err.message || "Failed to revoke entry");
    } finally {
      setRevokingId(null);
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    const { team, member } = removeTarget;
    try {
      setActionLoading(true);
      await apiCall(buildUrl(API_ROUTES.TEAMS.REMOVE_MEMBER(team._id, member._id)), {
        method: "DELETE",
      });
      toast.success(`${member.name} removed`);
      setRemoveTarget(null);
      await refreshTeams();
    } catch (err) {
      toast.error(err.message || "Failed to remove participant");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="w-full">
          <Card className="overflow-hidden">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-48 rounded-lg" />
              <Skeleton className="mt-3 h-9 w-full rounded-lg" />
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-9 w-20 rounded-full" />
                ))}
              </div>
            </div>
            <div className="space-y-2 p-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (      <div className="flex flex-col gap-4 sm:gap-6">
      {selectedEvent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">
            Showing entries for <span className="font-semibold text-foreground">{selectedEvent.title || selectedEvent.name || "this event"}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {counts.withEntries !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{counts.withEntries} of {counts.total} assigned events have entries</span>
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center">
          <span className="flex-1">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setError(""); reload(); }}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="w-full">
          <AssignedEventList
            title="Assigned Events"
            events={events}
            filteredEvents={filteredEvents}
            counts={counts}
            selectedEventId={selectedEventId}
            onSelect={setSelectedEventId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            typeFilter={typeFilter}
            onFilterChange={setTypeFilter}
            loading={false}
            onClearFilters={clearFilters}
          />
        </div>

        <div className="w-full">
          <Card className="overflow-hidden">
            {selectedEvent ? (
              <>
                <AssignedEventHeader event={selectedEvent} teams={selectedTeams} />
                {refreshing && (
                  <p className="border-b border-border bg-muted/50 px-4 py-1.5 text-[11px] text-muted-foreground">
                    Refreshing…
                  </p>
                )}
                <CardContent className="p-3 sm:p-4">
                  {teamsLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : selectedTeams.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">
                        No entries registered for this event
                      </p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        Entries appear here once groups register. Use Revoke to withdraw
                        an entry while registration is open.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTeams.map((team) => (
                        <TeamEntryCard
                          key={team._id}
                          team={team}
                          event={selectedEvent}
                          actionLoading={actionLoading}
                          showChest={false}
                          onEdit={setEditingTeam}
                          onRevoke={(t) =>
                            setRevokeTarget({
                              ...t,
                              eventTitle: selectedEvent.title || selectedEvent.name,
                            })
                          }
                          onDeleteMember={(t, m) => setRemoveTarget({ team: t, member: m })}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Select an event to view entries
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <EditTeamModal
        open={!!editingTeam}
        team={editingTeam}
        event={selectedEvent}
        onClose={() => setEditingTeam(null)}
        onSaved={refreshTeams}
      />

      <RevokeEntryDialog
        target={revokeTarget ? { team: revokeTarget, eventTitle: revokeTarget.eventTitle } : null}
        revoking={!!revokingId}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
      />

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => { if (!v) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove participant?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeTarget?.member?.name} from “{removeTarget?.team?.name || "Individual"}”?
              This is blocked once chest numbers, scores, results, or an active appeal exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemoveTarget(null)} className="min-h-[44px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              onClick={(e) => { e.preventDefault(); handleRemoveMember(); }}
              disabled={actionLoading}
              className="min-h-[44px]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
