export const PERMISSION_CATEGORIES = [
  "Competition",
  "Events",
  "Results",
  "Participants",
  "Reports",
  "Notifications",
  "Analytics",
];

export const PERMISSION_CATALOG = [
  { key: "create_competition", label: "Create competition", category: "Competition" },
  { key: "edit_competition", label: "Edit competition", category: "Competition" },
  { key: "advance_competition_stage", label: "Advance competition stage", category: "Competition" },
  { key: "manage_groups", label: "Manage groups", category: "Competition" },
  { key: "upload_competition_assets", label: "Upload competition assets", category: "Competition" },
  { key: "view_events", label: "View events", category: "Events" },
  { key: "view_event_usage", label: "View event usage", category: "Events" },
  { key: "create_event", label: "Create events", category: "Events" },
  { key: "edit_event", label: "Edit events", category: "Events" },
  { key: "cancel_event", label: "Cancel events", category: "Events" },
  { key: "manage_schedule", label: "Manage schedules", category: "Events" },
  { key: "view_results", label: "View results", category: "Results" },
  { key: "submit_score", label: "Submit scores", category: "Results" },
  { key: "approve_score", label: "Approve scores", category: "Results" },
  { key: "edit_approved_score", label: "Edit approved scores", category: "Results" },
  { key: "view_teams", label: "View teams", category: "Participants" },
  { key: "register_teams", label: "Register teams", category: "Participants" },
  { key: "edit_team_members", label: "Edit team members", category: "Participants" },
  { key: "assign_team_numbers", label: "Assign team numbers", category: "Participants" },
  { key: "delete_teams", label: "Delete teams", category: "Participants" },
  { key: "participate_events", label: "Participate in events", category: "Participants" },
  { key: "manage_participants", label: "Manage participants", category: "Participants" },
  { key: "manage_own_group_profile", label: "Manage own group profile", category: "Participants" },
  { key: "invite_users", label: "Invite users", category: "Participants" },
  { key: "delete_users", label: "Delete users", category: "Participants" },
  { key: "manage_permissions", label: "Manage permissions", category: "Participants" },
  { key: "export_report", label: "Export reports", category: "Reports" },
  { key: "view_activity_logs", label: "View audit logs", category: "Reports" },
  { key: "manage_activity_logs", label: "Undo and redo audit actions", category: "Reports" },
  { key: "manage_notifications", label: "Manage notifications", category: "Notifications" },
  { key: "view_analytics", label: "View analytics", category: "Analytics" },
];

export const catalogByCategory = (catalog = PERMISSION_CATALOG) =>
  PERMISSION_CATEGORIES.map((category) => ({
    category,
    permissions: catalog.filter((permission) => permission.category === category),
  })).filter((group) => group.permissions.length);

export const permissionLabel = (key) =>
  PERMISSION_CATALOG.find((permission) => permission.key === key)?.label || String(key || "").replace(/_/g, " ");
