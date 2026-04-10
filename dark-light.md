# Dark / Light Theme System — Complete Implementation Guide

> **Last updated:** April 2026  
> **Stack:** Vite + React + Tailwind CSS v4  
> **Strategy:** CSS custom properties on `:root` / `.dark`, toggled via a `class` attribute on `<html>`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Map](#2-file-map)
3. [How It Works — Step by Step](#3-how-it-works--step-by-step)
4. [Design Tokens (Full Reference)](#4-design-tokens-full-reference)
5. [Utility Classes](#5-utility-classes)
6. [Component Patterns](#6-component-patterns)
7. [Chart Theming](#7-chart-theming)
8. [Adding a New Component (Checklist)](#8-adding-a-new-component-checklist)
9. [Common Mistakes & Rules](#9-common-mistakes--rules)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│  index.html  (Phase 5 — inline <script>)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Reads localStorage("theme") + prefers-color-scheme   │  │
│  │ Adds .dark class to <html> BEFORE React renders      │  │
│  │ → No flash of wrong theme (FOUC prevention)          │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│  main.jsx                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ <ThemeProvider attribute="class" defaultTheme="system">│  │
│  │   <AuthProvider>                                      │  │
│  │     <App />                                           │  │
│  │   </AuthProvider>                                     │  │
│  │ </ThemeProvider>                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│  ThemeContext.jsx  (Phase 2)                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Provides: theme, setTheme, resolvedTheme, systemTheme│  │
│  │ Toggles .dark class on <html>                         │  │
│  │ Persists choice in localStorage("theme")              │  │
│  │ Watches prefers-color-scheme media query               │  │
│  │ Injects <meta name="color-scheme">                    │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│  index.css  (Design Tokens layer)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ :root    → light palette + elevation + chart tokens   │  │
│  │ .dark    → dark  palette + elevation + chart tokens   │  │
│  │                                                       │  │
│  │ CSS variables auto-switch when .dark toggles          │  │
│  │ All utility classes consume these variables            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Key principle:** The `.dark` class on `<html>` is the single switch. Every color in the app is derived from CSS custom properties defined in `:root` (light) and `.dark` (dark). Components never hardcode separate light/dark colors — they read from variables.

---

## 2. File Map

| File | Role | Phase |
|------|------|-------|
| `index.html` | FOUC-prevention inline script | 5 |
| `src/main.jsx` | Wraps app in `<ThemeProvider>` | 2 |
| `src/context/ThemeContext.jsx` | React context: theme state, persistence, OS sync | 2 |
| `src/theme.js` | JS token objects (`lightTheme`, `darkTheme`, `getMetaColor`) | 1 |
| `src/index.css` | CSS variables (`:root` / `.dark`), utility classes | — |
| `src/hooks/useMetaThemeSync.js` | Syncs `<meta name="theme-color">` with resolved theme | 4 |
| `src/components/ThemeToggle.jsx` | UI toggle button (click = toggle, shift-click = system) | 7 |
| `src/components/AppShell.jsx` | Root layout shell using `var(--bg)` / `var(--text)` | — |

---

## 3. How It Works — Step by Step

### 3.1 First Page Load (no flash)

1. Browser parses `index.html`
2. **Inline `<script>` runs synchronously** before any paint:
   - Reads `localStorage.getItem("theme")`
   - Checks `prefers-color-scheme: dark` media query
   - If dark → adds `.dark` class to `<html>` immediately
   - Updates `<meta name="theme-color">` fallback tag
3. CSS loads → `:root` or `.dark` variables apply instantly
4. React mounts → `ThemeProvider` initializes, reads same `localStorage` key
5. No mismatch, no flash

### 3.2 Theme Toggle

1. User clicks `<ThemeToggle>` button in the header
2. `setTheme("light")` or `setTheme("dark")` is called
3. `ThemeContext` persists to `localStorage("theme")`
4. `useEffect` toggles `.dark` class on `<html>`
5. All CSS variables switch instantly (300ms transition on `body`)
6. `useMetaThemeSync` updates `<meta name="theme-color">` tags
7. Browser toolbar color changes

### 3.3 System Mode

- **Shift-click** on toggle → sets `theme = "system"`
- `ThemeProvider` watches `prefers-color-scheme` via `matchMedia`
- `resolvedTheme` automatically follows OS preference
- If OS changes mid-session (e.g. sunset mode), app reacts live

### 3.4 Values Exposed by `useTheme()`

```js
const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
```

| Value | Type | Description |
|-------|------|-------------|
| `theme` | `"light" \| "dark" \| "system"` | User's stored preference |
| `setTheme` | `(next) => void` | Set and persist a new preference |
| `resolvedTheme` | `"light" \| "dark"` | Actual active theme (never `"system"`) |
| `systemTheme` | `"light" \| "dark"` | Current OS preference |

---

## 4. Design Tokens (Full Reference)

### 4.1 Color Palette

| Variable | Light Value | Dark Value | Usage |
|----------|-------------|------------|-------|
| `--bg` | `#f8fafc` | `#020617` | Page background |
| `--text` | `#0f172a` | `#f1f5f9` | Default body text |
| `--accent` | `#4f46e5` | `#818cf8` | Brand accent (links, highlights) |
| `--meta-color` | `#f8fafc` | `#020617` | Browser toolbar meta tag |
| `--card` | `#ffffff` | `#0f172a` | Card / panel background |
| `--card-fg` | `#0f172a` | `#e2e8f0` | Text on cards |
| `--card-bdr` | `rgba(15,23,42,0.1)` | `rgba(148,163,184,0.1)` | Card border color |
| `--surface` | `#e2e8f0` | `#1e293b` | Secondary surfaces (chart inners, inputs) |

> **3-level hierarchy (light):** `--bg` (#f8fafc) → `--surface` (#e2e8f0) → `--card` (#ffffff)

### 4.2 Elevation Tokens

| Variable | Light Value | Dark Value |
|----------|-------------|------------|
| `--shadow-card` | `0 2px 6px rgba(..,0.06), 0 8px 24px rgba(..,0.08)` | `0 0 0 1px rgba(..,0.07), 0 1px 4px rgba(0,0,0,0.4)` |
| `--shadow-card-hover` | `0 4px 12px rgba(..,0.1), 0 12px 32px rgba(..,0.1)` | `0 0 0 1px rgba(indigo,0.15), 0 4px 16px rgba(0,0,0,0.5), glow` |
| `--shadow-section` | `0 1px 4px + 0 4px 12px` (medium) | `0 0 0 1px + 0 1px 3px` (ring) |
| `--border-card` | `1px solid rgba(15,23,42,0.06)` | `1px solid rgba(148,163,184,0.1)` |
| `--border-divider` | `rgba(15,23,42,0.1)` | `rgba(148,163,184,0.08)` |

**Design philosophy:**
- **Light mode** → **shadows + borders + solid colors** (no transparency/rgba backgrounds)
- **Dark mode** → **ring borders + glow + transparency** (`0 0 0 1px` outlines + rgba backgrounds)

> ⚠️ **CRITICAL RULE:** Never use `rgba()` backgrounds in light mode. They create a washed/foggy look.
> Use solid hex colors instead (`#eef2ff`, `#f8fafc`, `#e2e8f0`).
> Transparency ONLY works in dark mode because dark backgrounds make layered opacity visible.

### 4.3 Chart Tokens

| Variable | Light Value | Dark Value | Usage |
|----------|-------------|------------|-------|
| `--chart-grid` | `#e2e8f0` | `rgba(148,163,184,0.08)` | Grid lines in bar/area charts |
| `--chart-axis` | `#64748b` | `#94a3b8` | Axis labels & secondary text |
| `--chart-bar-default` | `#94a3b8` | `#475569` | Default (non-highlighted) bars |
| `--chart-surface` | `#f1f5f9` (solid) | `rgba(30,41,59,0.5)` | Inner container behind charts |

### 4.4 Layout Tokens

| Variable | Value | Usage |
|----------|-------|-------|
| `--header-h` | `64px` | Header height |
| `--sidebar-w` | `280px` | Sidebar width (expanded) |
| `--sidebar-w-collapsed` | `80px` | Sidebar width (collapsed) |

---

## 5. Utility Classes

### 5.1 Card System

| Class | Elevation | Use Case |
|-------|-----------|----------|
| `card-premium` | `--shadow-card` | Primary cards (charts, main panels) |
| `card-secondary` | `--shadow-section` | Secondary cards (sidebars, minor widgets) |
| `theme-card` | `--shadow-card` | Alias of card-premium for quick use |

All card classes include:
- `background-color: var(--card)`
- `border: var(--border-card)`
- `box-shadow: var(--shadow-card)` or `var(--shadow-section)`
- Hover state with `var(--shadow-card-hover)`
- `rounded-2xl`, `transition-all duration-300`

### 5.2 Glass Effect

```css
.glass {
  backdrop-blur-xl + border-b;
  Light: rgba(241, 245, 249, 0.85) bg
  Dark:  rgba(2, 6, 23, 0.85) bg
}
```

Used by: `Header.jsx`

### 5.3 Chart Surface

```css
.chart-surface {
  background: var(--chart-surface);
  border-radius: 14px;
  padding: 20px;
}
```

Wraps chart content inside `SectionCard` to give the chart visual grounding.

### 5.4 Text Utilities

| Class | Behavior |
|-------|----------|
| `theme-text-primary` | `color: var(--card-fg)` |
| `theme-text-secondary` | `text-slate-500 dark:text-slate-400` |
| `theme-text-muted` | `text-slate-400 dark:text-slate-500` |

### 5.5 Input Styling

```css
.theme-input {
  bg: var(--card), border: var(--border-card), color: var(--card-fg)
  placeholder: var(--chart-axis)
  focus: border-color → var(--accent)
}
```

### 5.6 Glow Effects

| Class | Effect |
|-------|--------|
| `glow-indigo` | Indigo ring + 20px spread |
| `glow-success` | Emerald ring + 20px spread |
| `shadow-soft` | `var(--shadow-section)` |
| `shadow-elevated` | `var(--shadow-card)` |

---

## 6. Component Patterns

### 6.1 Inline Style Pattern (for CSS variables)

When a component needs to use a CSS variable, use inline `style` props:

```jsx
// ✅ CORRECT – reads from CSS variable, auto-switches with theme
<h3 style={{ color: 'var(--card-fg)' }}>Title</h3>
<p style={{ color: 'var(--chart-axis)' }}>Subtitle</p>
<div style={{ borderBottom: '1px solid var(--border-divider)' }}>

// ✅ CORRECT – using utility classes
<div className="card-premium">...</div>
<div className="chart-surface">...</div>
```

### 6.2 Dynamic Theme in Charts (Recharts)

Charts can't use CSS variables directly in their props. Use `useTheme()`:

```jsx
import { useTheme } from "../../context/ThemeContext";

export default function MyChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "rgba(148,163,184,0.08)" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <CartesianGrid stroke={gridColor} />
    <XAxis tick={{ fill: axisColor }} />
  );
}
```

### 6.3 Background / Border Pattern for Containers

```jsx
// ✅ AppShell – root layout
<div style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>

// ✅ Sidebar
<div style={{ backgroundColor: 'var(--card)' }}>
<div style={{ borderRight: '1px solid var(--border-divider)' }}>

// ✅ Internal surfaces
<div style={{ backgroundColor: 'var(--surface)', border: 'var(--border-card)' }}>
```

### 6.4 Rank / Status Row Pattern

For ranked items, use low-opacity tints of the brand color:

```jsx
// ✅ Blue-based system (unified)
const getRankStyle = (index, isDark) => {
  if (index === 0) return {
    background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(79,70,229,0.04)',
    border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(79,70,229,0.1)'}`,
  };
  // ... secondary / tertiary with lower opacity
};
```

---

## 7. Chart Theming

### 7.1 Color Palettes

```js
// Bar / Pie charts
const COLORS_LIGHT = ["#4f46e5", "#8b5cf6", "#10b981", "#3b82f6", "#64748b"];
const COLORS_DARK  = ["#818cf8", "#a78bfa", "#34d399", "#60a5fa", "#94a3b8"];
```

- **No warm colors** (no amber / orange / gold) in the chart palette
- Dark palette uses brighter variants for visibility on dark backgrounds

### 7.2 Tooltip Pattern

```jsx
const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl p-3 shadow-lg"
           style={{ backgroundColor: 'var(--card)', border: 'var(--border-card)' }}>
        <p className="text-xs" style={{ color: 'var(--chart-axis)' }}>{payload[0].name}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{payload[0].value}</p>
      </div>
    );
  }
  return null;
};
```

### 7.3 Donut Chart Stroke

The stroke between pie segments must match the card background:

```jsx
stroke={isDark ? "#0f172a" : "#ffffff"}  // matches --card value
strokeWidth={3}
```

### 7.4 Area Chart Gradient

```jsx
<linearGradient id="fill">
  <stop offset="5%"  stopColor={lineColor} stopOpacity={isDark ? 0.2 : 0.15} />
  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
</linearGradient>
```

---

## 8. Adding a New Component (Checklist)

When creating a new themed component:

- [ ] **Card wrapper** → use `card-premium` or `card-secondary` class
- [ ] **Headings** → `style={{ color: 'var(--card-fg)' }}`
- [ ] **Subtitles** → `style={{ color: 'var(--chart-axis)' }}`
- [ ] **Dividers** → `style={{ borderBottom: '1px solid var(--border-divider)' }}`
- [ ] **Inner surfaces** → `style={{ backgroundColor: 'var(--surface)' }}`
- [ ] **Charts** → import `useTheme()`, derive `isDark`, pass theme-aware colors
- [ ] **Tooltips** → use the tooltip pattern from §7.2
- [ ] **No hardcoded colors** → never write `bg-white dark:bg-[#111827]` inline
- [ ] **No warm accent colors** → stick to indigo / violet / blue / slate

---

## 9. Common Mistakes & Rules

### ❌ DON'T

```jsx
// Hardcoded dual colors — fragile, inconsistent
<div className="bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800">

// Warm accent on a cool theme
<div className="bg-amber-50 dark:bg-amber-500/10">

// Recharts with fixed light-mode colors
<CartesianGrid stroke="#e5e7eb" />

// Applying body bg via Tailwind class
<div className="bg-slate-50 dark:bg-[#0B1220]">
```

### ✅ DO

```jsx
// CSS variable — theme auto-switches
<div className="card-premium">
<div style={{ backgroundColor: 'var(--card)' }}>

// Unified blue accent
<div style={{
  background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(79,70,229,0.04)',
  border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(79,70,229,0.1)'}`
}}>

// Theme-aware chart
const gridColor = isDark ? "rgba(148,163,184,0.08)" : "#e2e8f0";
<CartesianGrid stroke={gridColor} />

// Root layout using var()
<div style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
```

### Color System Rule

```
Primary   → Indigo  (#4f46e5 / #818cf8)
Secondary → Violet  (#8b5cf6 / #a78bfa)
Neutral   → Slate   (#64748b / #94a3b8)
Success   → Emerald (#10b981 / #34d399)
Warning   → Amber   (status indicators ONLY, not decorative)
Danger    → Rose    (#f43f5e / #f87171)

⚠️  NEVER use amber/orange/gold as decorative background or accent.
    It clashes with the cool blue system.
```

---

## Quick Reference Card

```
Light bg:      #f8fafc    Dark bg:      #020617
Light card:    #ffffff    Dark card:    #0f172a
Light text:    #0f172a    Dark text:    #e2e8f0
Light surface: #e2e8f0    Dark surface: #1e293b
Light chart:   #f1f5f9    Dark chart:   rgba(30,41,59,0.5)
Accent:        #4f46e5    Accent:       #818cf8

Toggle:     .dark class on <html>
Persist:    localStorage("theme")
Context:    useTheme() → { theme, setTheme, resolvedTheme }

Light strategy: Shadows + borders + solid colors
Dark strategy:  Borders + glow + transparency
```
