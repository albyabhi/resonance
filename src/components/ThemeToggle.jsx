// ─────────────────────────────────────────────────────────────
// Phase 7 – Premium UI toggle component
// ─────────────────────────────────────────────────────────────
// • Click → toggles between light / dark
// • Shift-click → sets "system" (auto-follow OS preference)
// • Calls useMetaThemeSync to keep the toolbar colour in step
// • Smooth icon rotation animation via CSS transition

import { useTheme } from "../context/ThemeContext";
import useMetaThemeSync from "../hooks/useMetaThemeSync";
import { Sun, Moon, Monitor } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Phase 4 – keep <meta name="theme-color"> in sync
  useMetaThemeSync(resolvedTheme);

  const handleClick = (e) => {
    if (e.shiftKey) {
      // Shift-click → system
      setTheme("system");
    } else {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  };

  // Choose icon based on current state
  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;
  const label =
    theme === "system"
      ? "System"
      : resolvedTheme === "dark"
        ? "Light"
        : "Dark";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 text-gray-600 transition-all duration-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white ${className}`}
      aria-label={`Switch to ${label} theme (Shift-click for System)`}
      title={`${theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"} · Shift-click → System`}
    >
      <Icon className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-45" />
    </button>
  );
}
