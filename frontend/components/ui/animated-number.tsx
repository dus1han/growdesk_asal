"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Counts up to `value` (spec §6, animated counters). Writes to the DOM directly so a count-up
 * doesn't re-render the component 60 times a second. Honours reduced motion.
 */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = format(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        el.textContent = format(n);
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, format, reduced]);

  return <span ref={ref}>{format(0)}</span>;
}
