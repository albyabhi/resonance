import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const MIN_MS = 500;

function isDashboardPath(pathname) {
  return pathname.startsWith("/dashboard");
}

function isEnteringDashboard(prev, next) {
  if (!next) return false;
  if (!isDashboardPath(next)) return false;
  if (!prev) return true;
  return !isDashboardPath(prev.pathname);
}

/**
 * useRouteTransition — fires the global veil ONLY on transitions that
 * enter the /dashboard shell from outside it (e.g. / → /dashboard,
 * /login → /dashboard, /view/:slug → /dashboard). Every other route
 * change stays silent. Once inside the dashboard, the dashboard itself
 * renders its own in-content loader based on useDashboardData() and
 * manages the rest of the loading beat.
 */
export default function useRouteTransition() {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [activeKey, setActiveKey] = useState(0);
  const prevRef = useRef(null);
  const exitTimerRef = useRef(null);
  const firstMountRef = useRef(true);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { pathname: location.pathname, search: location.search };

    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }

    if (
      prev &&
      prev.pathname === location.pathname &&
      prev.search === location.search
    ) {
      return;
    }

    if (!isEnteringDashboard(prev, location.pathname)) {
      return;
    }

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    setActive(true);
    setActiveKey((k) => k + 1);

    exitTimerRef.current = setTimeout(() => setActive(false), MIN_MS);

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [location.pathname, location.search]);

  return { active, key: activeKey };
}
