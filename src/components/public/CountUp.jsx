import { useEffect, useRef, useState } from "react";

// Animated number that starts only when visible and respects reduced-motion.
export default function CountUp({ target, duration = 900 }) {
  const [value, setValue] = useState(0);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const holderRef = useRef(null);

  useEffect(() => {
    const node = holderRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setHasBeenVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasBeenVisible) return;
    const safeTarget = Number(target) || 0;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(safeTarget);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * safeTarget));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, hasBeenVisible]);

  return (
    <span ref={holderRef} className="tabular">
      {value}
    </span>
  );
}
