/**
 * SongMasteredBanner — persistent ribbon overlay for 3-star mastered songs on the catalog card.
 *
 * Renders as a diagonal "MASTERED" ribbon at the top-right corner of the thumbnail.
 * Styled in amber/gold to complement the star mastery system.
 * Positioned absolutely — the parent container must be `relative`.
 *
 * Phase 14 Plan 14-06 — token migration:
 *   - bg-amber-500 (#f59e0b) → bg-[var(--color-jlpt-n3)] (semantic reuse, same #f59e0b)
 *   - text-amber-950 → inline color: rgba(0,0,0,0.78) (decoration on amber overlay;
 *     the dark text needs to read against the amber regardless of light/dark theme,
 *     so we use a theme-independent near-black via inline style. Per CONTEXT D-27,
 *     the mastery decoration is preserved verbatim — this is a token swap only,
 *     visually identical to amber-950 on amber-500.)
 *
 * Usage: render only when deriveStars(progress) === 3.
 */
export default function SongMasteredBanner({ className = "" }: { className?: string }) {
  return (
    <div
      aria-label="Song mastered"
      className={`pointer-events-none absolute top-0 right-0 overflow-hidden ${className}`}
      style={{ width: 80, height: 80 }}
    >
      {/* Diagonal ribbon strip rotated 45° — sits in the top-right corner.
          bg uses --color-jlpt-n3 token (= #f59e0b, same as amber-500).
          color uses inline rgba near-black to read against amber regardless of theme. */}
      <div
        className="absolute flex items-center justify-center bg-[var(--color-jlpt-n3)] text-[8px] font-bold tracking-widest shadow-md"
        style={{
          width: 100,
          top: 18,
          right: -28,
          transform: "rotate(45deg)",
          padding: "2px 0",
          color: "rgba(0,0,0,0.78)",
        }}
      >
        MASTERED
      </div>
    </div>
  );
}
