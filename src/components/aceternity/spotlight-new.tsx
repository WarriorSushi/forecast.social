"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Adapted from Aceternity "Spotlight New". Two animated radial-gradient
 * curtains sweep gently across the hero.
 *
 * Tuned to read as LIFTED GEOMETRY, not a colored glow. Earlier versions
 * used a fully-saturated indigo (hue 258, sat 100%) which bled into
 * light mode as a warm-lavender wash — exactly the "indigo gradient on
 * slate" lane DESIGN.md §1.2 forbids. The new gradients use OKLCH at
 * very low chroma (0.01) so the effect is about depth, not hue.
 */
type SpotlightProps = {
  gradientFirst?: string;
  gradientSecond?: string;
  gradientThird?: string;
  translateY?: number;
  width?: number;
  height?: number;
  smallWidth?: number;
  duration?: number;
  xOffset?: number;
  showField?: boolean;
};

const DEFAULTS: Required<SpotlightProps> = {
  // Cool-neutral lifted highlight. Almost no chroma → reads as light,
  // not as a brand color. Same OKLCH range as our --border-strong and
  // --muted-foreground tokens; the gradient adapts to either theme
  // because the eye reads the alpha falloff, not the hue.
  gradientFirst: `radial-gradient(68.54% 68.72% at 55.02% 31.46%, oklch(75% 0.01 250 / 0.07) 0, oklch(60% 0.01 250 / 0.025) 50%, oklch(50% 0.01 250 / 0) 80%)`,
  gradientSecond: `radial-gradient(50% 50% at 50% 50%, oklch(75% 0.01 250 / 0.05) 0, oklch(60% 0.01 250 / 0.02) 80%, transparent 100%)`,
  gradientThird: `radial-gradient(50% 50% at 50% 50%, oklch(75% 0.01 250 / 0.03) 0, oklch(50% 0.01 250 / 0.01) 80%, transparent 100%)`,
  translateY: -350,
  width: 560,
  height: 1380,
  smallWidth: 240,
  duration: 7,
  xOffset: 100,
  showField: true,
};

const AMBIENT_POINTS = [
  { left: "8%", top: "24%", delay: "-9s", duration: "18s" },
  { left: "17%", top: "67%", delay: "-3s", duration: "22s" },
  { left: "29%", top: "15%", delay: "-14s", duration: "24s" },
  { left: "41%", top: "77%", delay: "-6s", duration: "20s" },
  { left: "56%", top: "31%", delay: "-17s", duration: "26s" },
  { left: "68%", top: "71%", delay: "-11s", duration: "21s" },
  { left: "79%", top: "18%", delay: "-5s", duration: "23s" },
  { left: "91%", top: "58%", delay: "-13s", duration: "25s" },
] as const;

export const SpotlightNew = (props: SpotlightProps = {}) => {
  const {
    gradientFirst,
    gradientSecond,
    gradientThird,
    translateY,
    width,
    height,
    smallWidth,
    duration,
    xOffset,
    showField,
  } = { ...DEFAULTS, ...props };
  const shouldReduceMotion = useReducedMotion();

  const sweepTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut" as const,
      };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 1.2 }}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
      aria-hidden="true"
    >
      {showField ? (
        <div className="forecast-ambient-field absolute inset-0">
          {AMBIENT_POINTS.map((point) => (
            <span
              key={`${point.left}-${point.top}`}
              className="forecast-ambient-point"
              style={{
                left: point.left,
                top: point.top,
                animationDelay: point.delay,
                animationDuration: point.duration,
              }}
            />
          ))}
        </div>
      ) : null}

      <motion.div
        animate={shouldReduceMotion ? { x: 0 } : { x: [0, xOffset, 0] }}
        transition={sweepTransition}
        className="absolute top-0 left-0 w-screen h-screen pointer-events-none"
      >
        <div
          style={{
            transform: `translateY(${translateY}px) rotate(-45deg)`,
            background: gradientFirst,
            width: `${width}px`,
            height: `${height}px`,
          }}
          className="absolute top-0 left-0"
        />
        <div
          style={{
            transform: "rotate(-45deg) translate(5%, -50%)",
            background: gradientSecond,
            width: `${smallWidth}px`,
            height: `${height}px`,
          }}
          className="absolute top-0 left-0 origin-top-left"
        />
        <div
          style={{
            transform: "rotate(-45deg) translate(-180%, -70%)",
            background: gradientThird,
            width: `${smallWidth}px`,
            height: `${height}px`,
          }}
          className="absolute top-0 left-0 origin-top-left"
        />
      </motion.div>

      <motion.div
        animate={shouldReduceMotion ? { x: 0 } : { x: [0, -xOffset, 0] }}
        transition={sweepTransition}
        className="absolute top-0 right-0 w-screen h-screen pointer-events-none"
      >
        <div
          style={{
            transform: `translateY(${translateY}px) rotate(45deg)`,
            background: gradientFirst,
            width: `${width}px`,
            height: `${height}px`,
          }}
          className="absolute top-0 right-0"
        />
        <div
          style={{
            transform: "rotate(45deg) translate(-5%, -50%)",
            background: gradientSecond,
            width: `${smallWidth}px`,
            height: `${height}px`,
          }}
          className="absolute top-0 right-0 origin-top-right"
        />
        <div
          style={{
            transform: "rotate(45deg) translate(180%, -70%)",
            background: gradientThird,
            width: `${smallWidth}px`,
            height: `${height}px`,
          }}
          className="absolute top-0 right-0 origin-top-right"
        />
      </motion.div>
    </motion.div>
  );
};
