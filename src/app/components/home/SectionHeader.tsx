/**
 * SectionHeader — Phase 14.2 SPEC §Req 6.
 *
 * Pure-display server component. Renders a Japanese eyebrow title (Noto Sans JP via
 * var(--font-jp)) + English title + optional View all link.
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
  testId?: string;
}

export function SectionHeader({
  titleJp,
  title,
  viewAll,
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
          className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          View all &rarr;
        </Link>
      )}
    </div>
  );
}
