import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { useRealtime } from "../../context/RealtimeContext";
import ManageJudges from "./ManageJudges";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
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

const ManageEvents = () => {
  const { token, competition, role } = useAuth();
  const { groupLabel } = useCompetition();
  const { lastUpdate } = useRealtime() || {};
  const [activeTab, setActiveTab] = useState("manage");
  const [sharingEvent, setSharingEvent] = useState(null);
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

  const canAdd = role !== "event_coordinator";
  const showFormTab = role !== "event_coordinator" || form.editingEventId;

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

  const onTabChange = (v) => {
    if (v === "manage") {
      cancelForm();
    } else {
      startAdd();
    }
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

        <Tabs
          value={activeTab === "manage" ? "manage" : "form"}
          onValueChange={onTabChange}
          className="mb-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="manage" className="min-h-[40px] flex-1">
              Manage Events
            </TabsTrigger>
            {showFormTab && (
              <TabsTrigger value="form" className="min-h-[40px] flex-1">
                {form.editingEventId ? "Edit Event" : "Add Event"}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="manage" className="mt-4 space-y-4">
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
              onManageJudges={setManagingJudges}
              onStatusChange={changeStatus}
              onDelay={(id) => setDelayResume({ action: "delay", eventId: id })}
              onResume={(id) => setDelayResume({ action: "resume", eventId: id })}
              onDelete={handleDeleteClick}
              onAdd={startAdd}
              canAdd={canAdd}
            />
          </TabsContent>

          <TabsContent value="form" className="mt-4">
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
          </TabsContent>
        </Tabs>

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

        <DeleteEventDialog
          openEventId={deleteConfirmId}
          deletionImpact={deletionImpact}
          deletionLoading={deletionLoading}
          deletionConfirmText={deletionConfirmText}
          setDeletionConfirmText={setDeletionConfirmText}
          onCancel={closeDeleteDialog}
          onConfirm={executeDelete}
        />

        <VenueDialog
          open={showCreateVenue}
          onClose={() => {
            setShowCreateVenue(false);
            setCreateVenueContext(null);
          }}
          onCreate={handleVenueCreate}
        />

        <DelayResumeDialog
          mode={delayResume}
          onClose={() => setDelayResume(null)}
          onConfirm={(remarks) =>
            delayResume?.action === "delay"
              ? delayEvent(delayResume.eventId, remarks)
              : resumeEvent(delayResume.eventId, remarks)
          }
        />

        {managingJudges && (
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
