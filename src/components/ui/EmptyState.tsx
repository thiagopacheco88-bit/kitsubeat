/**
 * EmptyState primitive — Phase 14 Plan 14-02 (D-16).
 *
 * Composable shell for empty / loading-finished-with-no-data / error states.
 * Per SPEC AC #6, every async surface needs designed empty + loading + error
 * — Plan 14-04 catalogs 24 such states; this primitive is their shared shell.
 *
 * Variants:
 *   - default: muted icon + heading + body, optional CTA
 *   - error:   accent-bordered shell, error-tinted icon, retry CTA expected
 *
 * CTA can be a button (onCtaClick) or a link (ctaHref). If both are supplied,
 * ctaHref wins.
 */
import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { Button } from "./Button";

export type EmptyStateProps = {
  variant?: "default" | "error";
  icon?: ReactNode;
  heading: string;
  body?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  /** Alternative to onCtaClick — renders an <a> wrapping a Button. */
  ctaHref?: string;
  className?: string;
  "aria-label"?: string;
};

export function EmptyState({
  variant = "default",
  icon,
  heading,
  body,
  ctaLabel,
  onCtaClick,
  ctaHref,
  className,
  "aria-label": ariaLabel,
}: EmptyStateProps) {
  const hasCta = Boolean(ctaLabel) && (Boolean(onCtaClick) || Boolean(ctaHref));
  const buttonVariant = variant === "error" ? "primary" : "secondary";

  return (
    <div
      role={variant === "error" ? "alert" : undefined}
      aria-label={ariaLabel}
      className={twMerge(
        clsx(
          "flex flex-col items-center text-center p-8 rounded-[var(--radius-2xl)]",
          variant === "default" && "bg-[var(--color-card)]",
          variant === "error" &&
            "bg-[var(--color-card)] border border-[var(--color-accent)]/30",
          className,
        ),
      )}
    >
      {icon && (
        <div
          className={clsx(
            "mb-4 text-[var(--color-text-muted)]",
            variant === "error" && "text-[var(--color-accent)]",
          )}
        >
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-text)]">
        {heading}
      </h3>
      {body && (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{body}</p>
      )}
      {hasCta && (
        <div className="mt-6">
          {ctaHref ? (
            <a href={ctaHref}>
              <Button variant={buttonVariant} size="md">
                {ctaLabel}
              </Button>
            </a>
          ) : (
            <Button variant={buttonVariant} size="md" onClick={onCtaClick}>
              {ctaLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
