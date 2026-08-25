import type { Variants } from "motion/react";

/** One curve, four durations. Defined once, module level, never per render. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: "easeIn" } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

export const viewportOnce = { once: true, margin: "-50px" } as const;

/** Directional entrances mirror in RTL, so they are chosen by direction. */
export function slideIn(dir: "rtl" | "ltr"): Variants {
  const x = dir === "rtl" ? 40 : -40;
  return {
    hidden: { opacity: 0, x },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
  };
}
