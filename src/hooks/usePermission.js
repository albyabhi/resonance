// src/hooks/usePermission.js
import { useMemo } from "react";
import { useAuth } from "../components/AuthContext";
import { normalizeRole } from "../components/dashboard/roleConfig";
import { DEFAULT_PERMISSIONS, mapDisplayRoleToBackendRole } from "../utils/permissionKeys";

/**
 * Hook that resolves effective permissions for the current user.
 *
 * Resolution order:
 *   1. user.permissions (custom overrides from Membership.custom_permissions)
 *   2. DEFAULT_PERMISSIONS[backendRole]  (role defaults)
 *
 * Returns:
 *   - hasPermission(key) → boolean
 *   - resolvedPermissions → { [key]: boolean }
 *   - backendRole → string  (admin | coordinator | faculty | participant)
 */
export default function usePermission() {
  const { user, role: contextRole } = useAuth();

  const displayRole = normalizeRole(contextRole);
  const backendRole = mapDisplayRoleToBackendRole(displayRole);

  const resolvedPermissions = useMemo(() => {
    const defaults = DEFAULT_PERMISSIONS[backendRole] || {};
    const overrides = user?.permissions || {};

    // Merge: overrides win when present, otherwise fall back to defaults
    const merged = { ...defaults };
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined && value !== null) {
        merged[key] = !!value;
      }
    }
    return merged;
  }, [backendRole, user?.permissions]);

  const hasPermission = useMemo(() => {
    return (key) => {
      if (!key) return true; // actions with no permissionKey are always visible
      return !!resolvedPermissions[key];
    };
  }, [resolvedPermissions]);

  return { hasPermission, resolvedPermissions, backendRole, displayRole };
}
