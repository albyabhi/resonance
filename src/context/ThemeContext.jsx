// ─────────────────────────────────────────────────────────────
// ThemeProvider — drop-in replacement for next-themes (Vite/React)
// ─────────────────────────────────────────────────────────────
// Wraps the entire app.  Provides `theme`, `setTheme`,
// `toggleTheme`, `resolvedTheme`, `systemTheme`, and `isSystem`
// to any descendant.
//
// attribute="class"  →  adds/removes the `dark` class on <html>
// defaultTheme="system" →  respects prefers-color-scheme on first visit
// enableSystem        →  watches the OS media query in real time
// enableColorScheme   →  injects <meta name="color-scheme"> automatically

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  THEME_STORAGE_KEY,
  resolveThemePreference,
  getSystemTheme,
} from "../lib/theme/themeCore";
import { safeStorageGet, safeStorageSet } from "../lib/theme/safeStorage";

const ThemeContext = createContext(undefined);

/**
 * ThemeProvider – drop-in replacement for next-themes' ThemeProvider
 *
 * Props:
 *  - attribute        "class" | "data-theme"  (default "class")
 *  - defaultTheme     "light" | "dark" | "system" (default "system")
 *  - enableSystem     boolean (default true)
 *  - enableColorScheme boolean (default true)
 *  - enableSync       boolean (default true) - sync theme across tabs via storage event
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  enableColorScheme = true,
  enableSync = true,
}) {
  // Persisted preference ("light" | "dark" | "system")
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = safeStorageGet(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return defaultTheme;
  });

  const location = useLocation();
  const isWelcomePage = location.pathname === '/';

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // resolvedTheme collapses "system" → actual light/dark
  // (single decision table lives in themeCore.js)
  const resolvedTheme = resolveThemePreference(theme, systemTheme === "dark");

  // ── Persist & apply ────────────────────────────────────────
  const setTheme = useCallback((next) => {
    setThemeState(next);
    safeStorageSet(THEME_STORAGE_KEY, next);
  }, []);

  // Toggle the concrete theme. When in "system" mode this
  // flips the resolved theme and opts the user out of system.
  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setThemeState(next);
    safeStorageSet(THEME_STORAGE_KEY, next);
  }, [resolvedTheme]);

  // Apply `dark` class (or data-theme attribute) on <html>
  // On welcome page ("/"), force light mode — skip dark class
  useEffect(() => {
    const root = document.documentElement;
    if (isWelcomePage) {
      root.classList.remove("dark");
      return;
    }
    if (attribute === "class") {
      root.classList.toggle("dark", resolvedTheme === "dark");
    } else {
      root.setAttribute(attribute, resolvedTheme);
    }
  }, [resolvedTheme, attribute, isWelcomePage]);

  // Cross-tab sync: listen for storage events from other tabs
  useEffect(() => {
    if (!enableSync) return;
    const handleStorageChange = (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue !== e.oldValue) {
        const newTheme = e.newValue;
        if (newTheme === "light" || newTheme === "dark" || newTheme === "system") {
          setThemeState(newTheme);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [enableSync]);

  // Drift detector — the FOUC-prevention script in index.html
  // mirrors the decision table in themeCore.js. If the two ever
  // disagree (logic drift), fix the class and warn in dev.
  // Skip on welcome page — it intentionally overrides the theme.
  useEffect(() => {
    if (isWelcomePage) return;
    const root = document.documentElement;
    const applied = root.classList.contains("dark");
    if (applied !== (resolvedTheme === "dark")) {
      if (attribute === "class") {
        root.classList.toggle("dark", resolvedTheme === "dark");
      } else {
        root.setAttribute(attribute, resolvedTheme);
      }
      if (import.meta.env.DEV) {
        console.warn(
          "[ThemeContext] Drift detected: index.html inline script applied a " +
            "different theme than ThemeContext. Self-healed. Check that the " +
            "inline script matches src/lib/theme/themeCore.js."
        );
      }
    }
  }, [resolvedTheme, attribute, isWelcomePage]);

  // Opt-in transition: temporarily enable `.theme-transition` on
  // <body> while the palette swaps, then remove it. Respects
  // prefers-reduced-motion via the CSS media guard.
  // Skip on welcome page — no transition needed when forcing light.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current || isWelcomePage) {
      isFirstRun.current = false;
      return;
    }
    const body = document.body;
    body.classList.add("theme-transition");
    const timer = setTimeout(() => {
      body.classList.remove("theme-transition");
    }, 240);
    return () => {
      clearTimeout(timer);
      body.classList.remove("theme-transition");
    };
  }, [resolvedTheme, isWelcomePage]);

  // Inject/update <meta name="color-scheme">
  useEffect(() => {
    if (!enableColorScheme) return;
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }
    const effectiveTheme = isWelcomePage ? "light" : resolvedTheme;
    meta.setAttribute("content", effectiveTheme === "dark" ? "dark light" : "light dark");
  }, [resolvedTheme, enableColorScheme, isWelcomePage]);

  // ── Watch system preference ────────────────────────────────
  useEffect(() => {
    if (!enableSystem) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [enableSystem]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      resolvedTheme,
      systemTheme,
      isSystem: theme === "system",
    }),
    [theme, setTheme, toggleTheme, resolvedTheme, systemTheme],
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
