import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Hash,
  Loader2,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import useAssignedEvents from "./coordinator/useAssignedEvents";
import AssignedEventList from "./coordinator/AssignedEventList";
import AssignedEventHeader from "./coordinator/AssignedEventHeader";
import TeamEntryCard from "./coordinator/TeamEntryCard";
import EditTeamModal from "./coordinator/EditTeamModal";
import RevokeEntryDialog from "./coordinator/RevokeEntryDialog";
import { API_ROUTES, buildUrl } from "../../utils/apiClient";
import { getCoordinatorTeamId } from "./coordinator/coordinatorGuards";

export default function CoordinatorEventManagement() {
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
  const [chestPrefix, setChestPrefix] = useState("");
  const [prefixSaving, setPrefixSaving] = useState(false);
  const [autoStart, setAutoStart] = useState(1);
  const [autoPrefix, setAutoPrefix] = useState("");
  const [editingChest, setEditingChest] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editingTeam, setEditingTeam] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [autoConfirmOpen, setAutoConfirmOpen] = useState(false);

  const eventsNeedingChestNumbers = useMemo(
    () =>
      events.filter((evt) => {
        if (!["judging", "result_pending"].includes(evt.status)) return false;
        return !evt.chest_prefix?.trim();
      }),
    [events]
  );

  useEffect(() => {
    if (selectedEvent) {
      setChestPrefix(selectedEvent.chest_prefix || "");
      setAutoPrefix(selectedEvent.chest_prefix || "");
      setEditingChest(null);
      setEditValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
  };

  const assignedCount = useMemo(
    () => selectedTeams.filter((t) => t.chest_no).length,
    [selectedTeams]
  );
  const unassignedCount = selectedTeams.length - assignedCount;

  const savePrefix = async () => {
    if (!selectedEvent) return;
    const eventId = selectedEvent._id || selectedEvent.event_id;
    try {
      setPrefixSaving(true);
      await apiCall(buildUrl(API_ROUTES.EVENTS.UPDATE(eventId)), {
        method: "PUT",
        body: JSON.stringify({ chest_prefix: chestPrefix.trim() }),
      });
      toast.success("Chest prefix saved");
      reload();
    } catch (err) {
      toast.error(err.message || "Failed to save chest prefix");
    } finally {
      setPrefixSaving(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!selectedEvent) return;
    const eventId = selectedEvent._id || selectedEvent.event_id;
    if (!autoPrefix.trim() && !autoStart) {
      toast.error("Enter a prefix or start number");
      return;
    }
    try {
      setActionLoading(true);
      const resp = await apiCall(buildUrl(API_ROUTES.TEAMS.BULK_CHEST), {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          prefix: autoPrefix.trim(),
          start_number: autoStart,
        }),
      });
      if (resp.success) {
        toast.success(`Assigned chest numbers to ${resp.data.total} entr${resp.data.total !== 1 ? "ies" : "y"}`);
        await refreshTeams();
      }
    } catch (err) {
      toast.error(err.message || "Auto-assign failed");
    } finally {
      setActionLoading(false);
      setAutoConfirmOpen(false);
    }
  };

  const assignSingleChest = async () => {
    if (!editingChest || !editValue.trim()) return;
    try {
      setActionLoading(true);
      const resp = await apiCall(buildUrl(API_ROUTES.TEAMS.CHEST(editingChest)), {
        method: "PATCH",
        body: JSON.stringify({ chest_no: editValue.trim() }),
      });
      if (resp.success) {
        toast.success("Chest number saved");
        await refreshTeams();
      }
    } catch (err) {
      toast.error(err.message || "Failed to assign chest number");
    } finally {
      setActionLoading(false);
      setEditingChest(null);
      setEditValue("");
    }
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          <Card className="overflow-hidden">
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </Card>
        </div>
        <div className="min-w-0 flex-1">
          <Card>
            <div className="space-y-2 p-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
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

      {eventsNeedingChestNumbers.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-accent-amber/20 bg-accent-amber/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-accent-amber">Chest Numbers Required</p>
            <p className="text-xs text-accent-amber/80">
              {eventsNeedingChestNumbers.length} event{eventsNeedingChestNumbers.length !== 1 ? "s" : ""} in
              judging or result-pending need chest numbers before judging can proceed.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          <AssignedEventList
            title="My Events"
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

        <div className="min-w-0 flex-1">
          <Card className="overflow-hidden">
            {selectedEvent ? (
              <>
                <AssignedEventHeader event={selectedEvent} teams={selectedTeams} />
                {refreshing && (
                  <p className="border-b border-border bg-muted/50 px-4 py-1.5 text-[11px] text-muted-foreground">
                    Refreshing…
                  </p>
                )}

                <div className="space-y-3 border-b border-border p-3 sm:p-4">
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Chest Number Prefix
                      </label>
                      <Input
                        type="text"
                        value={chestPrefix}
                        onChange={(e) => setChestPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder="e.g. GD, SD, MT"
                        maxLength={10}
                        className="min-h-[44px] w-full font-mono sm:min-h-[40px]"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={savePrefix}
                      disabled={prefixSaving}
                      className="min-h-[44px] w-full gap-1.5 sm:w-auto"
                      size="sm"
                    >
                      {prefixSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {prefixSaving ? "Saving..." : "Save Prefix"}
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-3 sm:flex-row sm:items-end">
                    <div className="w-full sm:w-24">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Start #
                      </label>
                      <Input
                        type="number"
                        value={autoStart}
                        onChange={(e) => setAutoStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min={1}
                        className="min-h-[44px] w-full sm:min-h-[40px]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Prefix for auto-assign
                      </label>
                      <Input
                        type="text"
                        value={autoPrefix}
                        onChange={(e) => setAutoPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder={chestPrefix || "Optional prefix"}
                        maxLength={10}
                        className="min-h-[44px] w-full font-mono sm:min-h-[40px]"
                      />
                    </div>
                    <Button
                      onClick={() => setAutoConfirmOpen(true)}
                      disabled={actionLoading || unassignedCount === 0}
                      className="min-h-[44px] w-full gap-1.5 bg-accent-amber text-white hover:bg-accent-amber/90 sm:w-auto"
                      size="sm"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {actionLoading ? "Assigning..." : `Auto-Assign (${unassignedCount})`}
                    </Button>
                  </div>
                </div>

                <CardContent className="p-3 sm:p-4">
                  {teamsLoading ? (
                    <div className="space-y-3">
                      {[0, 1].map((i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : selectedTeams.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No entries registered for this event</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTeams.map((team) => (
                        <TeamEntryCard
                          key={team._id}
                          team={team}
                          event={selectedEvent}
                          actionLoading={actionLoading}
                          showChest
                          chestEditingId={editingChest}
                          chestValue={editValue}
                          onStartChest={(t) => {
                            setEditingChest(t._id);
                            setEditValue(t.chest_no || "");
                          }}
                          onChestChange={setEditValue}
                          onConfirmChest={assignSingleChest}
                          onCancelChest={() => {
                            setEditingChest(null);
                            setEditValue("");
                          }}
                          onEdit={setEditingTeam}
                          onRevoke={(t) =>
                            setRevokeTarget({
                              ...t,
                              eventTitle: selectedEvent.title || selectedEvent.name,
                            })
                          }
                          onDeleteMember={undefined}
                        />
                      ))}
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        Tip: manage names and rosters with Edit, withdraw with Revoke. Chest edits stay available after registration closes.
                      </p>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
                <Hash className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Select an event to manage chest numbers</p>
              </CardContent>
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

      <Dialog open={autoConfirmOpen} onOpenChange={setAutoConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-assign chest numbers?</DialogTitle>
            <DialogDescription>
              Assign {autoPrefix.trim() ? `"${autoPrefix.trim()}-${autoStart}..." ` : `${autoStart}... `}to{" "}
              {unassignedCount} unassigned entr{unassignedCount !== 1 ? "ies" : "y"}? Existing numbers are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setAutoConfirmOpen(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button
              onClick={handleAutoAssign}
              disabled={actionLoading}
              className="min-h-[44px] bg-accent-amber text-white hover:bg-accent-amber/90"
            >
              {actionLoading ? "Assigning..." : "Auto-Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
