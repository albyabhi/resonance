export const getCoordinatorEventId = (event) =>
  event?._id || event?.event_id || event?.id || null;

export const getCoordinatorTeamId = (team) =>
  team?._id || team?.team_id || null;

export const isTeamEvent = (event) =>
  (event?.event_type || "") === "team";

export const isRegistrationOpen = (eventOrStatus) => {
  const status =
    typeof eventOrStatus === "string"
      ? eventOrStatus
      : eventOrStatus?.status || "";
  return status === "registration_open";
};

// A registration/team entry is revocable only while its event is open.
// Mirrors captain isRevocable (CaptainEventRegister) for coordinator parity.
export const isRevocableEntry = (team, event) => {
  const status = event?.status || team?.event_id?.status || team?.status || "";
  // Team list rows embed event_id as object when populated; fall back to event arg.
  if (event) return isRegistrationOpen(event);
  return isRegistrationOpen(status);
};

// Team events get Edit + Revoke; individual events stay revoke-only.
// Mirrors captain isEditable = isTeamReg && isRevocable.
export const isEditableEntry = (team, event) => {
  const resolvedEvent = event || team?.event_id || {};
  // Populated event_id object may carry event_type; plain team rows rely on event arg.
  const eventType = resolvedEvent?.event_type || team?.event_id?.event_type || "";
  if (eventType && eventType !== "team") return false;
  // When event shape is unknown, require explicit event arg to avoid enabling Edit wrongly.
  if (!eventType && !event) return false;
  return isRevocableEntry(team, resolvedEvent);
};

export const getRevokeBlockedReason = (team, event) => {
  if (!isRevocableEntry(team, event))
    return "Entries can only be revoked while registration is open";
  if (team?.chest_no) return "Chest numbers already assigned — contact the organizer";
  return null;
};

export const getEditBlockedReason = (team, event) => {
  const resolvedEvent = event || team?.event_id || {};
  const eventType = resolvedEvent?.event_type || team?.event_id?.event_type || "";
  if (eventType && eventType !== "team")
    return "Individual entries support revoke only";
  if (!isRevocableEntry(team, resolvedEvent))
    return "Teams can only be edited while registration is open";
  if (team?.chest_no) return "Chest numbers already assigned — contact the organizer";
  return null;
};

export const getTeamLimits = (event = {}) => {
  if ((event?.event_type || "") === "individual") return { min: 1, max: 1 };
  const min =
    event?.min_participants ?? event?.min_team_size ?? 1;
  const max =
    event?.max_participants ?? event?.max_team_size ?? 1;
  return { min: Number(min) || 1, max: Number(max) || 1 };
};
