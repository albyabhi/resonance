// src/utils/permissionKeys.js
// Shared permission constants — mirrors backend DEFAULT_PERMISSIONS from role.js

/**
 * All 16 granular permission keys used across the platform.
 */
export const PERMISSION_KEYS = {
  CREATE_COMPETITION: "create_competition",
  EDIT_COMPETITION: "edit_competition",
  INVITE_USERS: "invite_users",
  DELETE_USERS: "delete_users",
  CREATE_EVENT: "create_event",
  EDIT_EVENT: "edit_event",
  CANCEL_EVENT: "cancel_event",
  REGISTER_TEAMS: "register_teams",
  EDIT_TEAM_MEMBERS: "edit_team_members",
  SUBMIT_SCORE: "submit_score",
  APPROVE_SCORE: "approve_score",
  EDIT_APPROVED_SCORE: "edit_approved_score",
  VIEW_ACTIVITY_LOGS: "view_activity_logs",
  MANAGE_ROLES: "manage_roles",
  VIEW_ANALYTICS: "view_analytics",
  EXPORT_REPORT: "export_report",
};

/**
 * Default permissions per backend role.
 * Must stay in sync with backend src/middleware/role.js DEFAULT_PERMISSIONS.
 *
 * Keys here are the *backend* role strings (admin, coordinator, faculty, participant).
 * The frontend normalizeRole() maps display roles (captain, student_coordinator) to these.
 */
export const DEFAULT_PERMISSIONS = {
  admin: {
    create_competition: true,
    edit_competition: true,
    invite_users: true,
    delete_users: true,
    create_event: true,
    edit_event: true,
    cancel_event: true,
    register_teams: true,
    edit_team_members: true,
    submit_score: true,
    approve_score: true,
    edit_approved_score: true,
    view_activity_logs: true,
    manage_roles: true,
    view_analytics: true,
    export_report: true,
  },
  coordinator: {
    create_competition: false,
    edit_competition: false,
    invite_users: true,
    delete_users: false,
    create_event: true,
    edit_event: true,
    cancel_event: false,
    register_teams: true,
    edit_team_members: true,
    submit_score: true,
    approve_score: false,
    edit_approved_score: false,
    view_activity_logs: false,
    manage_roles: false,
    view_analytics: true,
    export_report: true,
  },
  faculty: {
    create_competition: false,
    edit_competition: false,
    invite_users: false,
    delete_users: false,
    create_event: false,
    edit_event: false,
    cancel_event: false,
    register_teams: false,
    edit_team_members: false,
    submit_score: false,
    approve_score: true,
    edit_approved_score: false,
    view_activity_logs: false,
    manage_roles: false,
    view_analytics: false,
    export_report: false,
  },
  participant: {
    create_competition: false,
    edit_competition: false,
    invite_users: false,
    delete_users: false,
    create_event: false,
    edit_event: false,
    cancel_event: false,
    register_teams: false,
    edit_team_members: false,
    submit_score: false,
    approve_score: false,
    edit_approved_score: false,
    view_activity_logs: false,
    manage_roles: false,
    view_analytics: false,
    export_report: false,
  },
};

/**
 * Map frontend display role to backend role key used in DEFAULT_PERMISSIONS.
 */
export function mapDisplayRoleToBackendRole(displayRole) {
  const map = {
    admin: "admin",
    captain: "participant",
    student_coordinator: "coordinator",
    faculty: "faculty",
    participant: "participant",
    guest: "participant",
  };
  return map[displayRole] || "participant";
}
