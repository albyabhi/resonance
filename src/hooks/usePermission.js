import { useMemo } from "react";
import { useAuth } from "../components/AuthContext";
import { normalizeRole } from "../components/dashboard/roleConfig";

export default function usePermission() {
  const { user, role: contextRole } = useAuth();
  const displayRole = normalizeRole(contextRole);

  const resolvedPermissions = useMemo(() => {
    const permissions = user?.permissions || {};
    if (Array.isArray(permissions)) {
      return permissions.reduce((acc, grant) => {
        if (grant?.key) acc[grant.key] = !!grant.allowed;
        return acc;
      }, {});
    }
    return Object.fromEntries(Object.entries(permissions).map(([key, value]) => [key, !!value]));
  }, [user?.permissions]);

  const hasPermission = useMemo(() => {
    return (key) => {
      if (!key) return true;
      return !!resolvedPermissions[key];
    };
  }, [resolvedPermissions]);

  return {
    hasPermission,
    resolvedPermissions,
    displayRole,
    permissionScopes: user?.permission_scopes || {},
  };
}
