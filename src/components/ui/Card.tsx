/**
 * Card primitive — Phase 14 Plan 14-02 (D-07).
 *
 * Two faces:
 *   - <Card> renders a <div> with no interactivity baked in.
 *   - <CardLink> renders a Next.js <Link> for navigation cards.
 *
 * No `asChild` polymorphism (deferred to Phase 18 per D-07) — the two
 * exports are deliberately separate component faces for now.
 *
 * Variants (3): flat | elevated | hero. Hero gets the red-glow shadow recipe
 * (SPEC §A.6). Sizes (3): sm | md | lg. Defaults: flat × md.
 *
 * Migration target: SongCard.tsx:100-167 inline `Link`-as-card pattern with
 * palette utilities → `<CardLink variant="flat" href={...}>` (Wave 2+).
 */
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import {
  forwardRef,
  type HTMLAttributes,
  type AnchorHTMLAttributes,
} from "react";

const card = cva(["block overflow-hidden transition-colors"], {
  variants: {
    variant: {
      flat: "bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
      elevated:
        "bg-[var(--color-card-2)] shadow-[var(--shadow-card-ring-strong)]",
      hero: "bg-[var(--color-card)] shadow-[var(--shadow-hero-glow)]",
    },
    size: {
      sm: "p-3 rounded-[var(--radius-md)]",
      md: "p-4 rounded-[var(--radius-lg)]",
      lg: "p-6 rounded-[var(--radius-2xl)]",
    },
  },
  defaultVariants: { variant: "flat", size: "md" },
});

export type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof card>;

export type CardLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof card> & { href: string };

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(clsx(card({ variant, size }), className))}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardLink = forwardRef<HTMLAnchorElement, CardLinkProps>(
  ({ className, variant, size, href, ...props }, ref) => (
    <Link
      href={href}
      ref={ref}
      className={twMerge(clsx(card({ variant, size }), "group", className))}
      {...props}
    />
  ),
);
CardLink.displayName = "CardLink";
