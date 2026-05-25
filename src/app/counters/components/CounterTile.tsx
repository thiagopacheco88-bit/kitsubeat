"use client";

interface Props {
  kanji: string;      // e.g. "本"
  reading: string;    // e.g. "hon"
  what: string;       // e.g. "long/thin objects"
  stars: number;      // 0..10
  locked: boolean;
}

/**
 * Single counter tile — romaji primary, kanji secondary.
 *
 * Follows the vocab/grammar track hierarchy from TierText:
 *   reading (romaji)  ← text-xl font-semibold — primary
 *   kanji             ← text-xs text-dim      — secondary reference
 *   what it counts    ← text-[10px]           — gloss
 *   mastery pips      ← 10 dots
 *
 * The priority is learning the counter word, not the kanji.
 */
export function CounterTile({ kanji, reading, what, stars, locked }: Props) {
  return (
    <div
      className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border px-2 py-3 text-center ${
        locked
          ? "border-[var(--color-border)] bg-[var(--color-card-2)] text-[var(--color-text-dim)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-card)] text-[var(--color-text)]"
      }`}
      aria-label={
        locked
          ? `${reading} (${kanji}) — locked`
          : `${reading} (${kanji}) — ${what} — ${stars} of 10 stars`
      }
    >
      {/* Romaji — primary */}
      <span className="text-xl font-semibold leading-none">{reading}</span>
      {/* Kanji — secondary reference */}
      <span className="text-xs text-[var(--color-text-dim)]">{kanji}</span>
      {/* Gloss */}
      <span className="mt-0.5 max-w-[7rem] text-center text-[10px] leading-tight text-[var(--color-text-dim)]">
        {what}
      </span>
      {/* Mastery pips */}
      <div className="mt-1.5 flex max-w-full flex-wrap justify-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`block h-1.5 w-1.5 rounded-full ${
              i < stars
                ? "bg-[var(--color-jlpt-n3)]"
                : "bg-[var(--color-border-strong)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
