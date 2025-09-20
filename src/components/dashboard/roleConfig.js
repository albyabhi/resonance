import {
  Users,
  Bell,
  ClipboardList,
  CheckCircle,
  UserPlus,
  Calendar,
} from "lucide-react";

export const roleConfig = {
  admin: {
    title: "System Administrator",
    actions: [
      { label: "Manage Users", icon: Users, to: "/users" },
      { label: "Notifications", icon: Bell, to: "/notifications" },
      { label: "Add Events", icon: Calendar, to: "/events/new" },
      { label: "Manage House", icon: UserPlus, to: "/houses" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  captain: {
    title: "Captain",
    actions: [
      { label: "Register Team", icon: UserPlus, to: "/teams/new" },
      { label: "House Events", icon: Calendar, to: "/events/house" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  student_coordinator: {
    title: "Student Coordinator",
    actions: [
      { label: "Enter Results", icon: ClipboardList, to: "/results/enter" },
      { label: "My Submissions", icon: CheckCircle, to: "/results/mine" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  faculty: {
    title: "Faculty",
    actions: [
      {
        label: "Pending Results (1)",
        icon: ClipboardList,
        to: "/results/pending",
      },
      { label: "Schedule", icon: Calendar, to: "/schedule" },
    ],
    modules: { standings: true, events: true, stats: true },
  },

  guest: {
    title: "Guest",
    actions: [],
    modules: { standings: true, events: true, stats: false },
  },
};
