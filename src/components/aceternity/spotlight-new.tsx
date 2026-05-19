"use client";

import React from "react";
import { motion } from "motion/react";

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
};

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
  } = { ...DEFAULTS, ...props };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
    >
      <motion.div
        animate={{ x: [0, xOffset, 0] }}
        transition={{
          duration,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
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
        animate={{ x: [0, -xOffset, 0] }}
        transition={{
          duration,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
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
