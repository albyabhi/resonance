// ─────────────────────────────────────────────────────────────
// Keep <meta name="theme-color"> in sync with the UI
// ─────────────────────────────────────────────────────────────
// Runs on the client. Whenever the resolved theme changes it
// updates the fallback (no-media) theme-color tag plus both
// media-query tags, so the browser toolbar colour stays in step
// with the page — even when the user forces a theme that
// differs from the OS preference.
//
// The colour comes from the CSS token --meta-color (single
// source of truth). On the next full page load the static tags
// in index.html are re-applied, so no cleanup is required.

import { useEffect } from "react";
import { getThemeColor } from "../lib/theme/getThemeColor";

const FALLBACK = { dark: "#0B0C0C", light: "#F7F6F2" };

/**
 * useMetaThemeSync
 * @param {"light"|"dark"} resolvedTheme – the concrete theme (never "system")
 */
export default function useMetaThemeSync(resolvedTheme) {
  useEffect(() => {
    if (!resolvedTheme) return;

    const colour =
      getThemeColor("--meta-color") || FALLBACK[resolvedTheme];

    // Update the fallback meta tag (no media attribute)
    const fallback = document.querySelector(
      'meta[name="theme-color"]:not([media])'
    );
    if (fallback) fallback.setAttribute("content", colour);

    // Also update both media-query tags so that if the user forces
    // a theme that differs from the OS preference, the toolbar
    // still reflects the chosen theme.
    const lightTag = document.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
    );
    const darkTag = document.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'
    );
    if (lightTag) lightTag.setAttribute("content", colour);
    if (darkTag) darkTag.setAttribute("content", colour);
  }, [resolvedTheme]);
}
