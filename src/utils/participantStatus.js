export const PARTICIPANT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "disqualified", label: "Disqualified" },
];

export const TEAM_STATUSES = [
  { value: "active", label: "Active" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "disqualified", label: "Disqualified" },
];

export const getParticipantStatusMeta = (status) => {
  const map = {
    active: { label: "Active", badge: "success", icon: "check-circle" },
    inactive: { label: "Inactive", badge: "secondary", icon: "x-circle" },
    withdrawn: { label: "Withdrawn", badge: "warning", icon: "arrow-left-circle" },
    disqualified: { label: "Disqualified", badge: "destructive", icon: "alert-triangle" },
  };
  return map[status] || { label: status, badge: "secondary", icon: "help-circle" };
};

export const getTeamStatusMeta = (status) => {
  const map = {
    active: { label: "Active", badge: "success", icon: "check-circle" },
    withdrawn: { label: "Withdrawn", badge: "warning", icon: "arrow-left-circle" },
    disqualified: { label: "Disqualified", badge: "destructive", icon: "alert-triangle" },
  };
  return map[status] || { label: status || "Active", badge: "success", icon: "check-circle" };
};
