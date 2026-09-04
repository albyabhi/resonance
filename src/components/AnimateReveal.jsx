import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';

// Shared smooth entrance easing — expo-out feel (fast start, soft settle).
const SMOOTH_EASE = [0.22, 1, 0.36, 1];

const OFFSETS = {
  down: (d) => ({ x: 0, y: -d }),
  up: (d) => ({ x: 0, y: d }),
  left: (d) => ({ x: -d, y: 0 }),
  right: (d) => ({ x: d, y: 0 }),
  none: () => ({ x: 0, y: 0 }),
};

/**
 * SlideReveal — smooth directional slide + fade entrance.
 *
 * @param {string} direction "down" | "up" | "left" | "right" | "none"
 * @param {number} delay stagger delay in seconds
 * @param {number} duration animation duration in seconds
 * @param {number} distance slide distance in px
 * @param {string} trigger "load" (animate on mount) | "scroll" (animate on in-view, once)
 * @param {number|null} scaleFrom optional initial scale (e.g. 0.96 for hero visuals)
 * @param {Array} ease easing curve, defaults to smooth expo-out
 */
export function SlideReveal({
  children,
  as = "div",
  direction = "up",
  delay = 0,
  duration = 0.7,
  distance = 32,
  trigger = "load",
  scaleFrom = null,
  ease = SMOOTH_EASE,
  className = "",
  style,
  once = true,
}) {
  const reduceMotion = useReducedMotion();
  const offset = (OFFSETS[direction] || OFFSETS.up)(distance);
  const MotionTag = motion[as] || motion.div;
  const PlainTag = as || "div";

  // Reduced motion: render instantly, no slide/fade.
  if (reduceMotion) {
    return <PlainTag className={className} style={style}>{children}</PlainTag>;
  }

  const initial = {
    opacity: 0,
    ...offset,
    ...(scaleFrom != null ? { scale: scaleFrom } : {}),
  };
  const target = {
    opacity: 1,
    x: 0,
    y: 0,
    ...(scaleFrom != null ? { scale: 1 } : {}),
  };
  const transition = { duration, delay, ease };

  if (trigger === "scroll") {
    return (
      <MotionTag
        initial={initial}
        whileInView={target}
        viewport={{ once, margin: "-80px" }}
        transition={transition}
        className={className}
        style={style}
      >
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      initial={initial}
      animate={target}
      transition={transition}
      className={className}
      style={style}
    >
      {children}
    </MotionTag>
  );
}

export function AnimateReveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.6, 
        delay: delay, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, className = "", style }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: delay, 
        ease: "easeOut" 
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
