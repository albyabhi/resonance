import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { useRealtime } from "../../context/RealtimeContext";
import ManageJudges from "./ManageJudges";
import { Button } from "../ui/button";
import { useEvents } from "./events/useEvents";
import { useEventForm } from "./events/useEventForm";
import EventFilters from "./events/EventFilters";
import EventList from "./events/EventList";
import EventFormWizard from "./events/EventFormWizard";
import {
  ShareEventDialog,
  DeleteEventDialog,
  VenueDialog,
  DelayResumeDialog,
} from "./events/EventDialogs";
import EventRegistrationsDialog from "./events/EventRegistrationsDialog";

const ManageEvents = () => {
  const { token, competition, role } = useAuth();
  const { groupLabel } = useCompetition();
  const { lastUpdate } = useRealtime() || {};
  const [activeTab, setActiveTab] = useState("manage");
  const [sharingEvent, setSharingEvent] = useState(null);
  const [viewingRegistrations, setViewingRegistrations] = useState(null);
  const [managingJudges, setManagingJudges] = useState(null);
  const [delayResume, setDelayResume] = useState(null);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [createVenueContext, setCreateVenueContext] = useState(null);

  const eventsApi = useEvents({ token, competition, lastUpdate });
  const {
    filteredEvents,
    events,
    usageByEventId,
    coordinators,
    venues,
    loading,
    error,
    setError,
    filter,
    setFilter,
    activeFilterCount,
    apiCall,
    changeStatus,
    delayEvent,
    resumeEvent,
    upsertEventInList,
    createVenue,
    deleteConfirmId,
    deletionImpact,
    deletionLoading,
    deletionConfirmText,
    setDeletionConfirmText,
    handleDeleteClick,
    closeDeleteDialog,
    executeDelete,
  } = eventsApi;

  const form = useEventForm({
    apiCall,
    competition,
    groupLabel,
    onSaved: (savedEvent, editingId) => {
      upsertEventInList(savedEvent, editingId);
      setActiveTab("manage");
    },
  });

  const isCoordinator = role === "event_coordinator";
  const canAdd = !isCoordinator;
  // Coordinators: edit + open/close registration only. No create/delete,
  // no delay/resume, no judge management (all 403 on the backend).
  const canDelete = !isCoordinator;
  const canDelayResume = !isCoordinator;
  const canManageJudges = !isCoordinator;
  const showFormTab = !isCoordinator || form.editingEventId;

  const startAdd = () => {
    form.startAdd();
    setActiveTab("form");
  };

  const startEdit = async (evt) => {
    try {
      await form.startEdit(evt);
      setActiveTab("form");
    } catch {
      /* error surfaced in form */
      setActiveTab("form");
    }
  };

  const cancelForm = () => {
    form.resetForms();
    setActiveTab("manage");
  };

  const refreshEditedStatus = async () => {
    if (!form.editingEventId) return;
    try {
      const { data: evt } = await apiCall(`/api/event/${form.editingEventId}`);
      form.setEventForm((prev) => ({ ...prev, status: evt.status }));
    } catch (e) {
      console.error("Failed to refresh event status", e);
    }
  };

  const handleVenueCreate = async (venueForm) => {
    const newVenue = await createVenue(venueForm);
    form.applyVenueSelection(newVenue, createVenueContext);
    setShowCreateVenue(false);
    setCreateVenueContext(null);
    return newVenue;
  };

  return (
    <div className="min-h-dvh bg-background p-3 sm:p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4">
          <h1 className="mb-1 text-xl font-bold text-card-foreground md:text-2xl">
            Events Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and schedule events, define rules, and configure scoring
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive-foreground">
            <span className="flex-1 text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError("")}
              className="ml-2 h-auto p-1 text-destructive-foreground hover:text-destructive"
              aria-label="Dismiss error"
            >
              ×
            </Button>
          </div>
        )}

        <div className="mb-4 space-y-4">
          {activeTab === "manage" ? (
            <>
              <EventFilters
                filter={filter}
                onChange={setFilter}
                onAdd={startAdd}
                canAdd={canAdd}
                resultCount={filteredEvents.length}
                totalCount={events.length}
                activeFilterCount={activeFilterCount}
              />
              <EventList
                events={filteredEvents}
                usageByEventId={usageByEventId}
                loading={loading}
                groupLabel={groupLabel}
                onEdit={startEdit}
                onShare={setSharingEvent}
                onViewRegistrations={setViewingRegistrations}
                onManageJudges={canManageJudges ? setManagingJudges : undefined}
                onStatusChange={changeStatus}
                onDelay={canDelayResume ? (id) => setDelayResume({ action: "delay", eventId: id }) : undefined}
                onResume={canDelayResume ? (id) => setDelayResume({ action: "resume", eventId: id }) : undefined}
                onDelete={canDelete ? handleDeleteClick : undefined}
                onAdd={startAdd}
                canAdd={canAdd}
                canManageJudges={canManageJudges}
                canDelete={canDelete}
                canDelayResume={canDelayResume}
              />
            </>
          ) : showFormTab ? (
            <EventFormWizard
              form={form}
              coordinators={coordinators}
              venues={venues}
              groupLabel={groupLabel}
              onCancel={cancelForm}
              onStatusChanged={refreshEditedStatus}
              onRequestVenue={(ctx) => {
                setCreateVenueContext(ctx);
                setShowCreateVenue(true);
              }}
            />
          ) : null}
        </div>

        {/* Mobile FAB for quick create */}
        {canAdd && activeTab === "manage" && (
          <Button
            onClick={startAdd}
            aria-label="Create new event"
            className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-accent-amber p-0 text-white shadow-lg hover:bg-accent-amber/90 md:hidden"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        <ShareEventDialog
          event={sharingEvent}
          onClose={() => setSharingEvent(null)}
        />

        <EventRegistrationsDialog
          event={viewingRegistrations}
          open={!!viewingRegistrations}
          onClose={() => setViewingRegistrations(null)}
          apiCall={apiCall}
          competitionId={
            competition?._id || competition?.id || competition?.competition_id
          }
        />

        {canDelete && (
          <DeleteEventDialog
            openEventId={deleteConfirmId}
            deletionImpact={deletionImpact}
            deletionLoading={deletionLoading}
            deletionConfirmText={deletionConfirmText}
            setDeletionConfirmText={setDeletionConfirmText}
            onCancel={closeDeleteDialog}
            onConfirm={executeDelete}
          />
        )}

        <VenueDialog
          open={showCreateVenue}
          onClose={() => {
            setShowCreateVenue(false);
            setCreateVenueContext(null);
          }}
          onCreate={handleVenueCreate}
        />

        {canDelayResume && (
          <DelayResumeDialog
            mode={delayResume}
            onClose={() => setDelayResume(null)}
            onConfirm={(remarks) =>
              delayResume?.action === "delay"
                ? delayEvent(delayResume.eventId, remarks)
                : resumeEvent(delayResume.eventId, remarks)
            }
          />
        )}

        {canManageJudges && managingJudges && (
          <ManageJudges
            event={managingJudges}
            onClose={() => setManagingJudges(null)}
            onUpdated={() => eventsApi.fetchAll()}
          />
        )}
      </div>
    </div>
  );
};

export default ManageEvents;
