/**
 * Button primitive — Phase 14 Plan 14-02 (D-05, D-07).
 *
 * CVA-based variant API. 3 variants (primary|secondary|ghost) × 3 sizes
 * (sm|md|lg). Every size carries `min-h-[44px]` to satisfy SPEC AC #11
 * tap-target compliance (≥44×44px on mobile).
 *
 * Token-only consumption per CONTEXT D-18 spirit — every color/shadow/radius
 * is a `var(--color-*)` / `var(--shadow-*)` / `var(--radius-*)` reference,
 * not a raw hex / palette utility.
 *
 * Replaces the inline button anti-pattern at LevelUpTakeover.tsx:96-103
 * (the surface migration plans in Wave 2+ swap call sites to this primitive).
 */
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const button = cva(
  [
    "inline-flex items-center justify-center font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
    "disabled:opacity-50 disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-accent)] text-white shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90",
        secondary:
          "bg-[var(--color-card-2)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
        ghost:
          "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-2)]",
      },
      size: {
        sm: "h-9 px-3 rounded-[var(--radius-sm)] text-sm min-h-[44px]",
        md: "h-11 px-4 rounded-[var(--radius-md)] min-h-[44px]",
        lg: "h-12 px-6 rounded-[var(--radius-lg)] text-lg min-h-[44px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      suppressHydrationWarning
      className={twMerge(clsx(button({ variant, size }), className))}
      {...props}
    />
  ),
);
Button.displayName = "Button";
