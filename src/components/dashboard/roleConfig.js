import {
  Users,
  Bell,
  ClipboardList,
  CheckCircle,
  UserPlus,
  Calendar,
  Settings,
  FileDown,
  BarChart3,
  Shield,
} from "lucide-react";

/**
 * Role configuration with permissionKey on each action.
 *
 * `permissionKey` ties each dashboard action to a granular permission from
 * the backend permission catalog. The Sidebar and Dashboard use the `usePermission` hook
 * to filter actions dynamically — only actions whose permissionKey resolves
 * to `true` are rendered.
 *
 * Actions with no permissionKey (null/undefined) are always shown.
 */
export const roleConfig = {
  admin: {
    title: "System Administrator",
    actions: [
      { label: "Manage Users", icon: Users, permissionKey: "manage_permissions" },
      { label: "Manage Houses", icon: UserPlus, permissionKey: "manage_groups" },
      { label: "Manage Events", icon: Calendar, permissionKey: "create_event" },
      { label: "Manage Competition", icon: Settings, permissionKey: "edit_competition" },
      { label: "Scoreboard Contributions", icon: CheckCircle, permissionKey: "edit_approved_score" },
      { label: "Activity Logs", icon: Bell, permissionKey: "view_activity_logs" },
      { label: "Export Report", icon: FileDown, permissionKey: "export_report" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  captain: {
    title: "Captain",
    actions: [
      { label: "My Teams", icon: Users, permissionKey: "view_teams" },
      { label: "My Events", icon: Calendar, permissionKey: "view_events" },
      { label: "Event Registration", icon: UserPlus, permissionKey: "participate_events" },
      { label: "Manage House Logo", icon: UserPlus, permissionKey: "manage_own_group_profile" },
      { label: "My Details", icon: Users, permissionKey: "manage_own_group_profile" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  student_coordinator: {
    title: "Student Coordinator",
    actions: [
      { label: "Submit Results", icon: ClipboardList, permissionKey: "submit_score" },
      { label: "My submissions", icon: CheckCircle, permissionKey: "submit_score" },
      { label: "Manage Competition", icon: Settings, permissionKey: "edit_competition" },
      { label: "Manage Events", icon: Calendar, permissionKey: "create_event" },
      { label: "Activity Logs", icon: Bell, permissionKey: "view_activity_logs" },
      { label: "Export Report", icon: FileDown, permissionKey: "export_report" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  faculty: {
    title: "Faculty",
    actions: [
      { label: "Pending approvals", icon: ClipboardList, permissionKey: "approve_score" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  participant: {
    title: "Participant",
    actions: [
      { label: "Event Registration", icon: UserPlus, permissionKey: "participate_events" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  guest: {
    title: "Guest",
    actions: [],
    modules: { standings: true, events: true, stats: true },
  },
};

// Normalize various role strings to the keys used in `roleConfig`.
export function normalizeRole(role) {
  const key = String(role || "").toLowerCase().trim();

  if (["admin", "administrator"].includes(key)) return "admin";

  if (
    [
      "captain",
      "house",
      "house captain",
      "house_captain",
      "house coordinator",
      "house_coordinator",
      "house co-ordinator",
    ].includes(key)
  ) {
    return "captain";
  }

  if (["coordinator", "student coordinator", "student_coordinator"].includes(key)) {
    return "student_coordinator";
  }

  if (["participant", "student"].includes(key)) return "participant";

  if (
    ["faculty", "faculty coordinator", "faculty_coordinator"].includes(key)
  )
    return "faculty";

  return "guest";
}

/**
 * Dynamically resolves all active and permitted dashboard actions for the current user session.
 * It combines the static role actions and dynamically appends any custom overridden permission actions.
 */
export function getUserActions(roleKey, hasPermission) {
  const cfg = roleConfig[roleKey] ?? roleConfig.guest;
  const actions = [...(cfg.actions ?? [])];

  const addActionIfMissing = (label, icon, permissionKey) => {
    if (!actions.some(a => a.label === label)) {
      actions.push({ label, icon, permissionKey });
    }
  };

  // Dynamically append permission-based actions if the user has permission
  if (hasPermission("manage_permissions")) {
    addActionIfMissing("Manage Users", Users, "manage_permissions");
  }
  if (hasPermission("manage_groups")) {
    addActionIfMissing("Manage Houses", UserPlus, "manage_groups");
  }
  if (hasPermission("create_event")) {
    addActionIfMissing("Manage Events", Calendar, "create_event");
  }
  if (hasPermission("edit_competition")) {
    addActionIfMissing("Manage Competition", Settings, "edit_competition");
  }
  if (hasPermission("view_activity_logs")) {
    addActionIfMissing("Activity Logs", Bell, "view_activity_logs");
  }
  if (hasPermission("export_report")) {
    addActionIfMissing("Export Report", FileDown, "export_report");
  }
  if (hasPermission("submit_score")) {
    addActionIfMissing("Submit Results", ClipboardList, "submit_score");
    addActionIfMissing("My submissions", CheckCircle, "submit_score");
  }
  if (hasPermission("approve_score")) {
    addActionIfMissing("Pending approvals", ClipboardList, "approve_score");
  }
  if (hasPermission("edit_approved_score")) {
    addActionIfMissing("Scoreboard Contributions", CheckCircle, "edit_approved_score");
  }

  return actions;
}
