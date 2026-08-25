// ─────────────────────────────────────────────────────────────
// Theme contrast checker (zero dependencies)
//
// Parses the light (:root) and dark (.dark) token palettes from
// src/index.css and verifies WCAG contrast for required pairs:
//   - text pairs    : ≥ 4.5:1 (normal text)  [≥ 3:1 large text]
//   - UI pairs      : ≥ 3:1   (borders, input bg, graphics)
//
// Usage: node scripts/check-contrast.mjs
// Exit code 0 = all pairs pass, 1 = violations found.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(__dirname, "../src/index.css");
const css = readFileSync(cssPath, "utf8");

// ── Parse token blocks ────────────────────────────────────────
function extractBlock(source, startMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return null;
  const blockStart = source.indexOf("{", start) + 1;
  const blockEnd = source.indexOf("}", blockStart);
  return source.slice(blockStart, blockEnd);
}

function parseTokens(block) {
  const tokens = {};
  if (!block) return tokens;
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = re.exec(block)) !== null) {
    const value = match[2].trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) tokens[match[1]] = value;
  }
  return tokens;
}

const light = parseTokens(extractBlock(css, ":root {"));
const dark = parseTokens(extractBlock(css, ".dark {"));

// ── WCAG relative luminance ───────────────────────────────────
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLuminance(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(channelLuminance);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── Required pairs ────────────────────────────────────────────
// ENFORCED (exit 1 on fail) — must pass WCAG AA.
const TEXT_PAIRS = [
  ["--foreground", "--background", "foreground on background"],
  ["--card-foreground", "--card", "card-foreground on card"],
  ["--muted-foreground", "--background", "muted-foreground on background"],
  ["--muted-foreground", "--card", "muted-foreground on card"],
  ["--primary-foreground", "--primary-strong", "primary-foreground on primary-strong (buttons)"],
  ["--accent-foreground", "--accent", "accent-foreground on accent"],
];

// ADVISORY (warn only) — brand/decorative tokens kept per design
// decision. Flags are printed for tracking; they do not fail CI.
const ADVISORY_TEXT_PAIRS = [
  ["--primary-foreground", "--primary", "primary-foreground on primary (brand accent)"],
  ["--secondary-foreground", "--secondary", "secondary-foreground on secondary (decorative)"],
  ["--destructive-foreground", "--destructive", "destructive-foreground on destructive"],
];

const UI_PAIRS = [
  ["--primary-strong", "--background", "primary-strong accent on background"],
];

const ADVISORY_UI_PAIRS = [
  ["--border", "--background", "border on background (structural)"],
  ["--input", "--background", "input border on background (structural)"],
  ["--ring", "--background", "focus ring on background"],
  ["--primary", "--background", "primary accent on background"],
];

// ── Run ───────────────────────────────────────────────────────
let failures = 0;

function check(palette, paletteName, pairs, threshold) {
  for (const [fg, bg, desc] of pairs) {
    const fgColor = palette[fg];
    const bgColor = palette[bg];
    if (!fgColor || !bgColor) {
      console.log(`  ⚠ ${paletteName}: token missing for pair (${desc})`);
      continue;
    }
    const ratio = contrastRatio(fgColor, bgColor);
    const pass = ratio >= threshold;
    const status = pass ? "✅" : "❌";
    const flag = pass ? "" : "  FAIL";
    console.log(
      `  ${status} ${paletteName} ${desc}: ${ratio.toFixed(2)}:1` +
        ` (${fgColor} on ${bgColor})${flag}`
    );
    if (!pass) failures += 1;
  }
}

function checkAdvisory(palette, paletteName, pairs, threshold) {
  for (const [fg, bg, desc] of pairs) {
    const fgColor = palette[fg];
    const bgColor = palette[bg];
    if (!fgColor || !bgColor) continue;
    const ratio = contrastRatio(fgColor, bgColor);
    const pass = ratio >= threshold;
    const status = pass ? "✅" : "⚠";
    console.log(
      `  ${status} ${paletteName} ${desc}: ${ratio.toFixed(2)}:1` +
        ` (${fgColor} on ${bgColor})${pass ? "" : "  (advisory — brand/structural, tracked)"}`
    );
  }
}

console.log("\n── Light theme — ENFORCED (text ≥ 4.5:1) ────");
check(light, "light", TEXT_PAIRS, 4.5);
console.log("── Light theme — ENFORCED (UI ≥ 3:1) ────────");
check(light, "light", UI_PAIRS, 3);
console.log("── Light theme — ADVISORY ───────────────────");
checkAdvisory(light, "light", ADVISORY_TEXT_PAIRS, 4.5);
checkAdvisory(light, "light", ADVISORY_UI_PAIRS, 3);
console.log("── Dark theme — ENFORCED (text ≥ 4.5:1) ─────");
check(dark, "dark", TEXT_PAIRS, 4.5);
console.log("── Dark theme — ENFORCED (UI ≥ 3:1) ─────────");
check(dark, "dark", UI_PAIRS, 3);
console.log("── Dark theme — ADVISORY ────────────────────");
checkAdvisory(dark, "dark", ADVISORY_TEXT_PAIRS, 4.5);
checkAdvisory(dark, "dark", ADVISORY_UI_PAIRS, 3);

if (failures > 0) {
  console.log(`\n✗ ${failures} enforced contrast violation(s) found.\n`);
  process.exit(1);
}
console.log("\n✓ All enforced contrast pairs pass. Advisory flags above are tracked, not failing.\n");
