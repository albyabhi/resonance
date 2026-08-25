// ─────────────────────────────────────────────────────────────
// JS theme adapter — the ONLY way JavaScript reads theme values.
// CSS (index.css :root / .dark) is the single source of truth;
// JS never hardcodes palette values. Charts, canvas, and browser
// API code call getThemeColor("--var") and always get the value
// for the CURRENTLY active theme.
// ─────────────────────────────────────────────────────────────

/**
 * Read a CSS custom property from the document root.
 * Resolves against the active theme (:root or .dark).
 *
 * @param {string} variable  e.g. "--primary"
 * @returns {string}  Trimmed value; "" if undefined.
 */
export function getThemeColor(variable) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}
