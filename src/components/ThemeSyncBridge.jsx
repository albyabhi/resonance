// ─────────────────────────────────────────────────────────────
// ThemeSyncBridge — keeps browser chrome (<meta name="theme-color">)
// in sync with the active theme. Mounted once in AppShell so the
// sync survives ThemeToggle re-renders.
// ─────────────────────────────────────────────────────────────

import { useTheme } from "../context/ThemeContext";
import useMetaThemeSync from "../hooks/useMetaThemeSync";

export default function ThemeSyncBridge() {
  const { resolvedTheme } = useTheme();
  useMetaThemeSync(resolvedTheme);
  return null;
}
