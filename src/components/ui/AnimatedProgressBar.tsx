"use client";
import { motion, useReducedMotion } from "framer-motion";

interface AnimatedProgressBarProps {
  value: number;
  max: number;
  ariaLabel?: string;
}

export function AnimatedProgressBar({ value, max, ariaLabel }: AnimatedProgressBarProps) {
  const prefersReduced = useReducedMotion();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
      className="w-full h-2 rounded-full overflow-hidden bg-[var(--color-card-2)]"
    >
      <motion.div
        className="h-full bg-[var(--color-accent)] rounded-full"
        initial={{ width: "0%" }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: prefersReduced ? 0 : 0.8, ease: "easeOut" }}
      />
    </div>
  );
}
