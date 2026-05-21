import {
  Users,
  Bell,
  ClipboardList,
  CheckCircle,
  UserPlus,
  Calendar,
  Settings,
} from "lucide-react";

export const roleConfig = {
  admin: {
    title: "System Administrator",
    actions: [
      { label: "Manage Users", icon: Users },
      { label: "Manage Houses", icon: UserPlus },
      { label: "Manage Events", icon: Calendar },
      { label: "Manage Competition", icon: Settings },
      { label: "System Override", icon: CheckCircle },
      { label: "Activity Logs", icon: Bell },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  captain: {
    title: "Captain",
    actions: [
      { label: "My Teams", icon: Users },
      { label: "My Events", icon: Calendar },
      { label: "Event Registration", icon: UserPlus },
      { label: "Manage House Logo", icon: UserPlus },
      { label: "My Details", icon: Users },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  student_coordinator: {
    title: "Student Coordinator",
    actions: [
      { label: "Pending submissions", icon: ClipboardList },
      { label: "My submissions", icon: CheckCircle },
      { label: "Manage Competition", icon: Settings },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  faculty: {
    title: "Faculty",
    actions: [
      { label: "Pending approvals", icon: ClipboardList },
      { label: "Schedule", icon: Calendar },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  participant: {
    title: "Participant",
    actions: [
      { label: "Event Registration", icon: UserPlus },
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
