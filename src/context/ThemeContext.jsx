// ─────────────────────────────────────────────────────────────
// Phase 2 – ThemeProvider (replaces next-themes for Vite/React)
// ─────────────────────────────────────────────────────────────
// Wraps the entire app.  Provides `theme`, `setTheme`,
// `resolvedTheme`, and `systemTheme` to any descendant.
//
// attribute="class"  →  adds/removes the `dark` class on <html>
// defaultTheme="system" →  respects prefers-color-scheme on first visit
// enableSystem        →  watches the OS media query in real time
// enableColorScheme   →  injects <meta name="color-scheme"> automatically

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const ThemeContext = createContext(undefined);

const STORAGE_KEY = "theme";

/**
 * Read the system preference once.
 * @returns {"light"|"dark"}
 */
function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * ThemeProvider – drop-in replacement for next-themes' ThemeProvider
 *
 * Props:
 *  - attribute        "class" | "data-theme"  (default "class")
 *  - defaultTheme     "light" | "dark" | "system" (default "system")
 *  - enableSystem     boolean (default true)
 *  - enableColorScheme boolean (default true)
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  enableColorScheme = true,
}) {
  // Persisted preference ("light" | "dark" | "system")
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return defaultTheme;
    return localStorage.getItem(STORAGE_KEY) || defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // resolvedTheme collapses "system" → actual light/dark
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  // ── Persist & apply ────────────────────────────────────────
  const setTheme = useCallback((next) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  // Apply `dark` class (or data-theme attribute) on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (attribute === "class") {
      root.classList.toggle("dark", resolvedTheme === "dark");
    } else {
      root.setAttribute(attribute, resolvedTheme);
    }
  }, [resolvedTheme, attribute]);

  // Inject/update <meta name="color-scheme">
  useEffect(() => {
    if (!enableColorScheme) return;
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", resolvedTheme === "dark" ? "dark light" : "light dark");
  }, [resolvedTheme, enableColorScheme]);

  // ── Watch system preference ────────────────────────────────
  useEffect(() => {
    if (!enableSystem) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [enableSystem]);

  // ── Suppress hydration warning on <html> ───────────────────
  // In a Vite SPA there is no real hydration mismatch, but we
  // set the attribute as early as possible via an inline script
  // in index.html (see Phase 3 / Phase 5).

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, systemTheme }),
    [theme, setTheme, resolvedTheme, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * useTheme – mirror of next-themes' useTheme()
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
