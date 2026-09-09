// One-time celebration burst for the public Winners section.
// Lazy-imports canvas-confetti so no canvas code ships until it fires.

const FALLBACK_PRIMARY = "#376D62";
const ACCENTS = ["#E0A442", "#8B5B83", "#FFFFFF"];

// Primary must be a concrete color (canvas can't parse `var(--primary)`),
// so callers pass competition.branding.primary_color, never the CSS var.
export async function fireWinnerConfetti(primaryColor) {
  const primary = typeof primaryColor === "string" && primaryColor.startsWith("#")
    ? primaryColor
    : FALLBACK_PRIMARY;

  try {
    const { default: confetti } = await import("canvas-confetti");
    const colors = [primary, ...ACCENTS];
    const shared = { colors, ticks: 150, disableForReducedMotion: true };
    confetti({ ...shared, particleCount: 60, spread: 70, origin: { x: 0.2, y: 0.35 } });
    confetti({ ...shared, particleCount: 60, spread: 70, origin: { x: 0.8, y: 0.35 } });
  } catch {
    // Celebration is decorative — a blocked CDN/chunk must never break the page.
  }
}
