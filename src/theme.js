// ─────────────────────────────────────────────────────────────
// Theme palette — JS-side tokens matching index.css variables
// ─────────────────────────────────────────────────────────────

export const lightTheme = {
  "--background": "#F4F5F7",
  "--foreground": "#0A0A0A",
  "--card": "#FFFFFF",
  "--card-foreground": "#0A0A0A",
  "--primary": "#1EA1FF",
  "--primary-foreground": "#FFFFFF",
  "--muted": "#EFF1F3",
  "--muted-foreground": "#6B7280",
  "--meta-color": "#F4F5F7",
  "--border": "#E5E7EB",
  "--accent-red": "#FA6567",
  "--accent-amber": "#F5A15A",
  "--accent-teal": "#12B8AF",
  "--accent-blue": "#1EA1FF",
  "--accent-purple": "#A39BFD",
  "--accent-green": "#22C55E",
};

export const darkTheme = {
  "--background": "#111827",
  "--foreground": "#F3F4F6",
  "--card": "#1F2937",
  "--card-foreground": "#F3F4F6",
  "--primary": "#60A5FA",
  "--primary-foreground": "#FFFFFF",
  "--muted": "#374151",
  "--muted-foreground": "#9CA3AF",
  "--meta-color": "#111827",
  "--border": "#374151",
  "--accent-red": "#F87171",
  "--accent-amber": "#FBBF24",
  "--accent-teal": "#2DD4BF",
  "--accent-blue": "#60A5FA",
  "--accent-purple": "#A78BFA",
  "--accent-green": "#34D399",
};

export function getMetaColor(mode) {
  return mode === "dark" ? darkTheme["--meta-color"] : lightTheme["--meta-color"];
}
