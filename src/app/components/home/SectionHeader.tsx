/**
 * SectionHeader — Phase 14.2 SPEC §Req 6.
 *
 * Pure-display server component. Renders a Japanese eyebrow title (Noto Sans JP via
 * var(--font-jp)) + English title + optional contextual browse link.
 *
 * Used by all 4 narrative sections on /: Continue Learning (auth-only), Foundations,
 * Browse by Anime, Featured Songs. Plan 14.2-10 (page.tsx refactor) composes them.
 *
 * Token discipline (CONTEXT D-12): every color via var(--color-*); no raw hex / palette.
 */
import Link from "next/link";

interface SectionHeaderProps {
  titleJp: string;
  title: string;
  viewAll?: string;
  viewAllLabel?: string;
  testId?: string;
}

export function SectionHeader({
  titleJp,
  title,
  viewAll,
  viewAllLabel = "Browse",
  testId,
}: SectionHeaderProps) {
  return (
    <div
      className="mb-4 flex items-center justify-between gap-3 px-4"
      data-testid={testId}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className="text-base font-bold text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-jp)" }}
          data-testid="section-header-title-jp"
        >
          {titleJp}
        </span>
        <h2 className="text-xl font-semibold text-[var(--color-text)] truncate">
          {title}
        </h2>
      </div>
      {viewAll && (
        <Link
          href={viewAll}
          aria-label={viewAllLabel}
          className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          {viewAllLabel}
        </Link>
      )}
    </div>
  );
}
