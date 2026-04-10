// ─────────────────────────────────────────────────────────────
// Phase 1 – Single source-of-truth colour palette
// ─────────────────────────────────────────────────────────────

/**
 * Light-theme palette
 */
export const lightTheme = {
  "--bg": "#f8fafc",
  "--text": "#0f172a",
  "--accent": "#4f46e5",
  "--meta-color": "#f8fafc",
  "--card": "#ffffff",
  "--card-foreground": "#0f172a",
  "--card-border": "rgba(15, 23, 42, 0.06)",
  "--surface": "#e2e8f0",
};

/**
 * Dark-theme palette — flat solid, cleaner SaaS look
 */
export const darkTheme = {
  "--bg": "#020617",
  "--text": "#f1f5f9",
  "--accent": "#818cf8",
  "--meta-color": "#020617",
  "--card": "#0f172a",
  "--card-foreground": "#e2e8f0",
  "--card-border": "rgba(148, 163, 184, 0.1)",
  "--surface": "#1e293b",
};

/**
 * Convenience: get the meta-color for a given mode.
 * @param {"light" | "dark"} mode
 * @returns {string} CSS colour value
 */
export function getMetaColor(mode) {
  return mode === "dark" ? darkTheme["--meta-color"] : lightTheme["--meta-color"];
}
