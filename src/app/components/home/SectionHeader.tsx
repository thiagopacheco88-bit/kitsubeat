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
      className="mb-4 flex items-baseline gap-2 px-4"
      data-testid={testId}
    >
      <span
        className="text-base font-bold text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-jp)" }}
        data-testid="section-header-title-jp"
      >
        {titleJp}
      </span>
      {viewAll ? (
        <Link
          href={viewAll}
          aria-label={viewAllLabel}
          className="group flex items-center gap-1 text-xl font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
        >
          <h2>{title}</h2>
          <span className="text-base text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">›</span>
        </Link>
      ) : (
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{title}</h2>
      )}
    </div>
  );
}
