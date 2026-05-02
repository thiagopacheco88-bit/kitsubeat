/**
 * VerseStarIcon — Phase 11.6 D-14.
 *
 * Inline-SVG 5-point amber-400 star icon rendered next to verses that have a
 * row in `user_verse_domination`. Mirrors the BonusBadgeIcon pattern (33-line
 * inline SVG, named default export) but uses the same filled 5-point star
 * path that StarDisplay.tsx ships for the catalog mastery stars (lines 67-70)
 * — re-using the path keeps the visual language consistent: gold star = "you
 * earned this".
 *
 * Why amber-400 (#FBBF24) and not the existing --color-jlpt-n3 (#f59e0b
 * amber-500): the song header counter renders the icon at text-amber-500
 * (slightly deeper) so the lyrics-view star sits brighter than the counter,
 * keeping the "in-flow celebratory" feel against the dark background. Both
 * tones land within the amber palette; no new token added.
 *
 * Conditional render contract: parent renders <VerseStarIcon /> only when
 * `dominated_at IS NOT NULL` for (user, verse) (D-14). 4px right margin on
 * the wrapper span keeps the icon from kissing the verse number text.
 *
 * data-testid="verse-dominated-star" — consumed by tests/e2e/verse-domination-ui.spec.ts.
 */
export default function VerseStarIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center mr-1 ${className}`}
      aria-label="Verse dominated"
      title="Verse dominated"
      data-testid="verse-dominated-star"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4 text-amber-400"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
