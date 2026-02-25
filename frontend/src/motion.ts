import type { Variants, Transition } from 'framer-motion';

// --- Transitions ---
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
};

export const smoothTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94],
};

// --- Page transition ---
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

// --- Fade in ---
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// --- Slide up ---
export const slideUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, y: 12 },
};

// --- Scale in ---
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.95 },
};

// --- Stagger container ---
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// --- Stagger item ---
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// --- Card hover ---
export const cardHover = {
  rest: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.06)' },
  hover: {
    scale: 1.015,
    boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(148,163,184,0.12)',
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  tap: { scale: 0.98 },
};

// --- Glow pulse ---
export const glowPulse: Variants = {
  initial: { boxShadow: '0 0 8px rgba(129, 140, 248, 0.15)' },
  animate: {
    boxShadow: [
      '0 0 8px rgba(129, 140, 248, 0.15)',
      '0 0 24px rgba(129, 140, 248, 0.3)',
      '0 0 8px rgba(129, 140, 248, 0.15)',
    ],
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

// --- Modal backdrop ---
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// --- Modal content ---
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};
