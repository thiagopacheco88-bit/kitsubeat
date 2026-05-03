"use client";

/**
 * Carousel — Phase 14.2 SPEC §Req 6/7 (containers for ContinueCard / CoverCard / AnimeCard).
 *
 * Horizontal scroll-snap container. Pure CSS today; 'use client' directive keeps the
 * door open for future scroll-position state, programmatic scroll, or indicator dots
 * (CONTEXT D-09 + PATTERNS.md §Carousel).
 *
 * Children get scroll-snap-align via their own classNames (each card is a snap target).
 *
 * Token discipline (CONTEXT D-12): no raw values; reuses tailwind utilities + global
 * scrollbar-hidden class. NO new tokens authored.
 */
interface CarouselProps {
  children: React.ReactNode;
  testId?: string;
  ariaLabel?: string;
}

export function Carousel({ children, testId, ariaLabel }: CarouselProps) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory px-4"
      data-testid={testId}
      aria-label={ariaLabel}
      role={ariaLabel ? "region" : undefined}
    >
      {children}
    </div>
  );
}
