/**
 * BonusBadgeIcon — subtle inline icon for bonus mastery on the catalog card.
 *
 * Rendered alongside StarDisplay when both Ex 5 (Grammar Conjugation) and
 * Ex 7 (Sentence Order) best accuracy are >= 80%.
 *
 * Visual: a small star-burst / sparkle inline SVG (~16px). Stars remain the
 * primary mastery signal — this badge is intentionally subtle (muted color,
 * small size, hover tooltip for context).
 *
 * Usage: render only when deriveBonusBadge(progress) === true.
 */
export default function BonusBadgeIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center ${className}`}
      aria-label="Bonus mastery"
      title="Bonus mastery: Grammar Conjugation + Sentence Order"
    >
      {/* Sparkle / star-burst SVG — 16×16, muted purple to distinguish from gold stars */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4 text-violet-400"
        aria-hidden="true"
      >
        {/* 4-point sparkle shape */}
        <path d="M8 0 L9 6 L15 8 L9 10 L8 16 L7 10 L1 8 L7 6 Z" />
      </svg>
    </span>
  );
}
