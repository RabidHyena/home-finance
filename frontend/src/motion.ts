import type { Variants, Transition } from 'framer-motion';

export const fastTransition: Transition = { duration: 0.15, ease: 'easeOut' };

export const springTransition: Transition = fastTransition;
export const smoothTransition: Transition = fastTransition;

export const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.1, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.1 } },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: fastTransition },
  exit:    { opacity: 0, transition: { duration: 0.1 } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: fastTransition },
  exit:    { opacity: 0, transition: { duration: 0.1 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: fastTransition },
  exit:    { opacity: 0, scale: 0.98, transition: { duration: 0.1 } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: fastTransition },
};

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.1 } },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: fastTransition },
  exit:    { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.1 } },
};

export const cardHover = {};
export const glowPulse: Variants = { initial: {}, animate: {} };
