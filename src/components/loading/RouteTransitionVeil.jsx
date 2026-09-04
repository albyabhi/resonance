// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useRouteTransition from "./useRouteTransition";

const SMOOTH_EASE = [0.22, 1, 0.36, 1];
const ENTER_MS = 120;
const EXIT_MS = 220;
const TICK_COUNT = 12;
const DURATION_MS = 2000;

const GRAIN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

function routeFamily(pathname) {
  if (pathname === "/" || pathname === "") return "Returning to the hall";
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/setup-password") ||
    pathname.startsWith("/participant-setup-password") ||
    pathname.startsWith("/setup")
  ) {
    return "Opening the gates";
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/my-details")) {
    return "Tuning the hall";
  }
  return "Setting the stage";
}

function VeilMandala({ reduceMotion }) {
  const rotate = (duration, from = 0) => ({
    initial: { rotate: from },
    animate: reduceMotion ? { rotate: from } : { rotate: from + 360 },
    transition: { duration, ease: "linear", repeat: Infinity },
  });

  return (
    <svg
      viewBox="0 0 80 80"
      className="block h-full w-full"
      fill="none"
      style={{ color: "var(--muted-foreground)" }}
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="0.5" opacity="0.45" />
      <motion.rect
        x="20"
        y="20"
        width="40"
        height="40"
        rx="10"
        stroke="currentColor"
        strokeWidth="0.5"
        style={{ transformOrigin: "40px 40px", transformBox: "fill-box" }}
        {...rotate(20)}
      />
      <motion.polygon
        points="40,18 58,29 58,51 40,62 22,51 22,29"
        stroke="currentColor"
        strokeWidth="0.5"
        style={{ transformOrigin: "40px 40px", transformBox: "fill-box" }}
        {...rotate(28, 180)}
      />
   </svg>
  );
}

function ProgressTicks({ filled }) {
  return (
    <div className="flex flex-1 gap-[3px]" aria-hidden="true">
      {Array.from({ length: TICK_COUNT }).map((_, i) => (
        <span
          key={i}
          className="route-veil-tick h-[2px] flex-1 rounded-full"
          style={{
            backgroundColor: i < filled ? "var(--primary)" : "var(--border)",
          }}
        />
      ))}
   </div>
  );
}

export function VeilPanel({ caption: captionProp, progressOverride, instant = false }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    if (progressOverride !== undefined) return;
    let raf;
    let start = performance.now();
    setInternalProgress(0);
    const tick = (now) => {
      const elapsed = now - start;
      const ratio = Math.min(elapsed / DURATION_MS, 1);
      setInternalProgress(Math.round(ratio * TICK_COUNT));
      if (ratio < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.search, progressOverride]);

  const progress = progressOverride !== undefined ? progressOverride : internalProgress;
  const caption = captionProp ?? routeFamily(location.pathname);

  return (
    <motion.div
      role="status"
      aria-label={`Loading — ${caption}`}
      className="fixed inset-0 z-[90] flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--background)" }}
      initial={instant || reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={instant || reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
      transition={{
        duration: instant ? 0 : reduceMotion ? 0 : ENTER_MS / 1000,
        ease: SMOOTH_EASE,
      }}
    >
      <div
        className="relative flex w-full max-w-sm flex-col items-center gap-5 overflow-hidden rounded-2xl px-7 py-7"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: "var(--accent-stripe-1)" }}
          aria-hidden="true"
        />
        <span
          className="absolute inset-x-0 bottom-0 h-[2px]"
          style={{ background: "var(--accent-stripe-1)" }}
          aria-hidden="true"
        />

        <div className="h-20 w-20">
          <VeilMandala reduceMotion={reduceMotion} />
       </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <span
            className="font-mono text-[10px] uppercase"
            style={{ letterSpacing: "0.18em", color: "var(--muted-foreground)" }}
          >
            Resonance
         </span>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "20px",
              color: "var(--foreground)",
              letterSpacing: "-0.02em",
            }}
          >
            {caption}
         </p>
       </div>

        <div className="flex w-full items-center gap-3">
          <ProgressTicks filled={progress} />
          <span
            className="font-mono text-[10px] font-semibold tabular-nums"
            style={{
              minWidth: "2.5rem",
              textAlign: "right",
              color: "var(--muted-foreground)",
            }}
            aria-hidden="true"
          >
            {String(Math.round((progress / TICK_COUNT) * 100)).padStart(2, "0")}%
         </span>
       </div>

        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: GRAIN_BG, opacity: 0.04 }}
          aria-hidden="true"
        />
     </div>
   </motion.div>
  );
}

/**
 * RouteTransitionVeil — fires only when entering the /dashboard shell from
 * outside it (e.g. / → /dashboard, /login → /dashboard, /view/:slug → /dashboard).
 * Stays silent for every other route change. Dashboard renders its own
 * in-content loader once mounted, so this just covers the brief moment
 * between the route swap and Dashboard's first render.
 */
export default function RouteTransitionVeil() {
  const { active } = useRouteTransition();
  return (
    <AnimatePresence>
      {active && <VeilPanel key="route-veil-panel" />}
   </AnimatePresence>
  );
}
