// ─────────────────────────────────────────────────────────────
// Theme resolution — THE single decision table.
// This module is the source of truth for how a stored
// preference becomes a concrete light/dark theme.
//
// ⚠ SYNC: the inline script in index.html implements an
// identical decision table verbatim. If you change logic here,
// update that script too. The drift detector in ThemeContext
// warns at runtime if the two ever disagree.
// ─────────────────────────────────────────────────────────────

export const THEME_STORAGE_KEY = "theme";

export const THEME_VALUES = ["light", "dark", "system"];

/**
 * Resolve a stored preference to a concrete theme.
 *
 * Decision table:
 *   "dark"            → dark
 *   "light"           → light
 *   null (never set)  → system preference
 *   "system"          → system preference
 *   any other value   → system preference (garbage tolerant)
 *
 * @param {string|null} stored   Raw value from storage (already
 *                               normalised; null when unavailable).
 * @param {boolean} prefersDark  Current OS `prefers-color-scheme: dark`.
 * @returns {"light"|"dark"}
 */
export function resolveThemePreference(stored, prefersDark) {
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  return prefersDark ? "dark" : "light";
}

/**
 * Read the OS preference.
 * @returns {"light"|"dark"}
 */
export function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
