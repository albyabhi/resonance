import { useMemo } from "react";
import { useAuth } from "../components/AuthContext";
import { roleConfig } from "../components/dashboard/roleConfig";

export default function usePermission() {
  const { user, role: contextRole } = useAuth();

  const resolvedRole = useMemo(() => {
    const raw = contextRole || user?.role || "viewer";
    return String(raw).toLowerCase().trim();
  }, [contextRole, user?.role]);

  const hasRole = useMemo(() => {
    return (role) => {
      if (!role) return true;
      return resolvedRole === role;
    };
  }, [resolvedRole]);

  const hasAnyRole = useMemo(() => {
    return (...roles) => {
      return roles.some((r) => resolvedRole === r);
    };
  }, [resolvedRole]);

  const isStaff = useMemo(() => {
    return ["super_admin", "organizer", "event_coordinator", "judge"].includes(resolvedRole);
  }, [resolvedRole]);

  const canManage = useMemo(() => {
    return ["super_admin", "organizer"].includes(resolvedRole);
  }, [resolvedRole]);

  const displayRole = useMemo(() => {
    const cfg = roleConfig[resolvedRole];
    return cfg?.title || resolvedRole;
  }, [resolvedRole]);

  return {
    hasRole,
    hasAnyRole,
    isStaff,
    canManage,
    role: resolvedRole,
    displayRole,
  };
}
