export const EASE_PRIMARY = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_PRIMARY },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: EASE_PRIMARY },
  },
};

export const logoSpring = { type: "spring" as const, stiffness: 300, damping: 14 };
