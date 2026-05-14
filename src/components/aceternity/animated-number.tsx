"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue, useTransform } from "motion/react";
import { motion } from "motion/react";

/**
 * Counts from `from` to `to` once the element scrolls into view. Uses
 * motion's `useMotionValue` + `animate()` for a single smooth tween,
 * paired with `useTransform` to format the running value with commas.
 *
 * No bouncy spring on purpose. Forecast scores are confident numbers —
 * cubic-bezier easing reads "settled," springs read "playful." Tabular
 * numerics on the parent so digits don't shift mid-tween.
 */
export function AnimatedNumber({
  from = 0,
  to,
  duration = 1.2,
  className,
}: {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const value = useMotionValue(from);
  const display = useTransform(value, (latest) =>
    Math.round(latest).toLocaleString("en-US"),
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(value, to, {
      duration,
      ease: [0.22, 1, 0.36, 1], // cubic-bezier, settled
    });
    return () => controls.stop();
  }, [inView, to, duration, value]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
