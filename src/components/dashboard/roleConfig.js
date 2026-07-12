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
  Image,
  MapPin,
  PenTool,
  Upload,
  Hash,
  Trophy,
} from "lucide-react";

export const roleConfig = {
  super_admin: {
    title: "Super Admin",
    actions: [
      { label: "Manage Users", icon: Shield },
      { label: "Manage Groups", icon: UserPlus },
      { label: "Manage Events", icon: Calendar },
      { label: "Manage Competition", icon: Settings },
      { label: "Manage Participants", icon: Users },
      { label: "Scoring", icon: Trophy },
      { label: "Activity Logs", icon: Bell },
      { label: "Manage Venues", icon: MapPin },
      { label: "Export Report", icon: FileDown },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  organizer: {
    title: "Organizer",
    actions: [
      { label: "Manage Groups", icon: UserPlus },
      { label: "Manage Events", icon: Calendar },
      { label: "Manage Competition", icon: Settings },
      { label: "Manage Participants", icon: Users },
      { label: "Scoring", icon: Trophy },
      { label: "Export Report", icon: FileDown },
      { label: "Activity Logs", icon: Bell },
      { label: "Manage Venues", icon: MapPin },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  event_coordinator: {
    title: "Event Coordinator",
    actions: [
      { label: "Manage Events", icon: Calendar },
      { label: "Event Participants", icon: Users },
      { label: "Assign Chest Numbers", icon: Hash },
      { label: "Manage Venues", icon: MapPin },
      { label: "Scoring", icon: Trophy },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  judge: {
    title: "Judge",
    actions: [
      { label: "Judge Dashboard", icon: ClipboardList },
      { label: "My Scores", icon: CheckCircle },
    ],
    modules: { standings: false, events: false, stats: false },
  },

  house_captain: {
    title: "House Captain",
    actions: [
      { label: "Events", icon: Calendar },
      { label: "My Group", icon: Users },
      { label: "Manage Group Logo", icon: Image },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  participant: {
    title: "Participant",
    actions: [
      { label: "Event Registration", icon: UserPlus },
      { label: "My Events", icon: Calendar },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  viewer: {
    title: "Viewer",
    actions: [],
    modules: { standings: true, events: true, stats: true },
  },
};

export function normalizeRole(role, isCaptain = false) {
  const key = String(role || "").toLowerCase().trim();

  if (["super_admin", "admin", "administrator"].includes(key)) return "super_admin";
  if (["organizer"].includes(key)) return "organizer";
  if (["event_coordinator", "coordinator", "student coordinator", "student_coordinator"].includes(key)) return "event_coordinator";
  if (["judge", "faculty", "faculty coordinator", "faculty_coordinator"].includes(key)) return "judge";
  if (["participant", "student"].includes(key)) {
    if (isCaptain) return "house_captain";
    return "participant";
  }
  if (["captain", "house_captain", "house", "house captain", "house_captain", "house coordinator", "house_coordinator"].includes(key)) return "house_captain";
  return "viewer";
}

export function getUserActions(roleKey) {
  const cfg = roleConfig[roleKey] ?? roleConfig.viewer;
  return [...(cfg.actions ?? [])];
}
