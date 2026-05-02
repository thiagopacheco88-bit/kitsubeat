/**
 * Skeleton primitive — Phase 14 Plan 14-02 (D-discretion + D-13).
 *
 * Shimmer placeholder used in the 24 loading states cataloged by Plan 14-04.
 * Renders a token-driven base color + Tailwind's `animate-pulse` — the global
 * `prefers-reduced-motion: reduce` override in globals.css (D-13) collapses
 * the pulse animation to instant rest state automatically. No JS guard needed.
 *
 * Variants (4): card | list-item | hero | badge-row. Each variant sets a
 * sensible default height + width + corner radius from the radii token scale;
 * className overrides via twMerge if a surface needs custom dimensions.
 */
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import type { HTMLAttributes } from "react";

const skeleton = cva(
  [
    "bg-[var(--color-card-2)] relative overflow-hidden",
    // Tailwind's built-in pulse animation. Plan 14-01 globals.css reduced-motion
    // override (animation-duration: 0ms !important) collapses this to a static
    // rest-state when the user prefers reduced motion.
    "animate-pulse",
  ],
  {
    variants: {
      variant: {
        card: "h-32 w-full rounded-[var(--radius-lg)]",
        "list-item": "h-12 w-full rounded-[var(--radius-md)]",
        hero: "h-48 w-full rounded-[var(--radius-2xl)]",
        "badge-row": "h-6 w-24 rounded-[var(--radius-pill)]",
      },
    },
    defaultVariants: { variant: "card" },
  },
);

export type SkeletonProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof skeleton>;

export function Skeleton({ variant, className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      aria-live="polite"
      className={twMerge(clsx(skeleton({ variant }), className))}
      {...props}
    />
  );
}
