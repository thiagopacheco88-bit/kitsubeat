/**
 * SongMasteredBanner — persistent ribbon overlay for 3-star mastered songs on the catalog card.
 *
 * Renders as a diagonal "MASTERED" ribbon at the top-right corner of the thumbnail.
 * Styled in amber/gold to complement the star mastery system.
 * Positioned absolutely — the parent container must be `relative`.
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
      {/* Diagonal ribbon strip rotated 45° — sits in the top-right corner */}
      <div
        className="absolute flex items-center justify-center bg-amber-500 text-[8px] font-bold tracking-widest text-amber-950 shadow-md"
        style={{
          width: 100,
          top: 18,
          right: -28,
          transform: "rotate(45deg)",
          padding: "2px 0",
        }}
      >
        MASTERED
      </div>
    </div>
  );
}
