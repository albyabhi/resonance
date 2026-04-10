// ─────────────────────────────────────────────────────────────
// Phase 4 – Keep <meta name="theme-color"> in sync with the UI
// ─────────────────────────────────────────────────────────────
// This hook runs on the client.  Whenever the resolved theme
// changes it updates the *fallback* (no-media) theme-color tag
// so the browser toolbar colour stays in step with the page.

import { useEffect } from "react";
import { getMetaColor } from "../theme";

/**
 * useMetaThemeSync
 * @param {"light"|"dark"} resolvedTheme – the concrete theme (never "system")
 */
export default function useMetaThemeSync(resolvedTheme) {
  useEffect(() => {
    if (!resolvedTheme) return;

    const colour = getMetaColor(resolvedTheme);

    // Update the fallback meta tag (no media attribute)
    const fallback = document.querySelector(
      'meta[name="theme-color"]:not([media])'
    );
    if (fallback) {
      fallback.setAttribute("content", colour);
    }

    // Also update the matching media-query tag so that if the user
    // forces a theme that differs from the OS preference, the
    // toolbar still reflects the chosen theme.
    const lightTag = document.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
    );
    const darkTag = document.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'
    );

    if (resolvedTheme === "dark") {
      if (lightTag) lightTag.setAttribute("content", getMetaColor("dark"));
      if (darkTag) darkTag.setAttribute("content", getMetaColor("dark"));
    } else {
      if (lightTag) lightTag.setAttribute("content", getMetaColor("light"));
      if (darkTag) darkTag.setAttribute("content", getMetaColor("light"));
    }

    // Cleanup: restore media-aware defaults when hook unmounts
    return () => {
      if (lightTag) lightTag.setAttribute("content", getMetaColor("light"));
      if (darkTag) darkTag.setAttribute("content", getMetaColor("dark"));
    };
  }, [resolvedTheme]);
}
