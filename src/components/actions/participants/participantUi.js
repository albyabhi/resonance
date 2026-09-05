import { getParticipantStatusMeta } from "../../../utils/participantStatus";

// Derived credential state from list payload (backend strips hashes and
// adds setup_status/has_password/setup_expires — see participantService).
export function getCredentialMeta(stu) {
  if (stu?.has_password || stu?.setup_status === "active") {
    return { label: "Active", badge: "success", hint: "Password set — can log in. No link needed; Claim shows Already claimed." };
  }
  if (stu?.setup_status === "pending") {
    return { label: "Link pending", badge: "outline", hint: "Setup link shared, not used yet" };
  }
  if (stu?.setup_status === "expired") {
    return { label: "Expired", badge: "error", hint: "Link expired — regenerate" };
  }
  return { label: "No link", badge: "outline", hint: "Generate a setup link or ask them to Claim" };
}

export { getParticipantStatusMeta };

export const PARTICIPANT_PAGE_SIZE = 50;

export function buildParticipantListParams({ competitionId, groupId, klass, status, search, page, limit }) {
  const params = {};
  if (competitionId) params.competition_id = competitionId;
  if (groupId) params.group_id = groupId;
  if (klass) params.class = klass;
  if (status) params.status = status;
  if (search) params.search = search;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  return params;
}
