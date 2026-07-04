import type { Variants } from "motion/react";

export const cinemaEase = [0.16, 1, 0.3, 1] as const;

export const curtainReveal: Variants = {
  hidden: { opacity: 0, y: 34, filter: "blur(10px)", clipPath: "inset(0 0 100% 0)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    clipPath: "inset(0 0 0% 0)",
    transition: { duration: 0.8, ease: cinemaEase },
  },
};

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96, rotateX: 5 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { duration: 0.65, ease: cinemaEase },
  },
  exit: { opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.22 } },
};

export const staggerContainer = (delay = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { delayChildren: 0.12, staggerChildren: delay } },
});

export const tactile = {
  whileHover: { y: -7, scale: 1.015, transition: { type: "spring" as const, stiffness: 360, damping: 24 } },
  whileTap: { scale: 0.985 },
};
