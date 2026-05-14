"use client";

import React from "react";
import { motion } from "motion/react";

/**
 * Adapted from Aceternity "Spotlight New". Two animated radial-gradient
 * curtains sweep gently across the hero, tinted indigo to match our
 * accent token. Opacity is in the 0.04-0.08 range so the effect reads as
 * restrained light, not as a glow effect.
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

const INDIGO_HUE = 258;

const DEFAULTS: Required<SpotlightProps> = {
  // Three layered radial gradients in our indigo accent hue. Opacities
  // chosen to read as ambient light, not as a brand color flood.
  gradientFirst: `radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(${INDIGO_HUE}, 100%, 72%, 0.10) 0, hsla(${INDIGO_HUE}, 100%, 55%, 0.04) 50%, hsla(${INDIGO_HUE}, 100%, 45%, 0) 80%)`,
  gradientSecond: `radial-gradient(50% 50% at 50% 50%, hsla(${INDIGO_HUE}, 100%, 72%, 0.08) 0, hsla(${INDIGO_HUE}, 100%, 55%, 0.03) 80%, transparent 100%)`,
  gradientThird: `radial-gradient(50% 50% at 50% 50%, hsla(${INDIGO_HUE}, 100%, 72%, 0.05) 0, hsla(${INDIGO_HUE}, 100%, 45%, 0.02) 80%, transparent 100%)`,
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
