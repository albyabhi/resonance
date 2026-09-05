// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import useRouteTransition from "./useRouteTransition";
import { Wordmark } from "../Header";

const SMOOTH_EASE = [0.22, 1, 0.36, 1];
const ENTER_MS = 180;

export function VeilPanel({ instant = false }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const ariaLabel = "Loading dashboard";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      key={`${location.pathname}${location.search}`}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
      style={{ backgroundColor: "var(--background)" }}
      initial={instant || reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        instant || reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: -12 }
      }
      transition={{
        duration: instant ? 0 : reduceMotion ? 0.2 : ENTER_MS / 1000,
        ease: SMOOTH_EASE,
      }}
    >
      <Wordmark size="lg" />
      <span className="veil-progress" aria-hidden="true" />
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
