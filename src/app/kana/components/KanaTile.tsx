"use client";

interface Props {
  glyph: string; // "あ" or "ア" or "きゃ"
  romaji: string;
  stars: number; // 0..10
  locked: boolean;
}

/**
 * Single character tile with 10-pip mastery display.
 *
 * Pip dots reuse the filled/outline visual idea from
 * `src/app/songs/[slug]/components/StarDisplay.tsx` but rendered as a row
 * of 10 small circles beneath the glyph (compact for grid layouts).
 */
export function KanaTile({ glyph, romaji, stars, locked }: Props) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-center ${
        locked
          ? "border-zinc-200 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-700"
          : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
      aria-label={
        locked ? `${romaji} (locked)` : `${romaji} — ${stars} of 10 stars`
      }
    >
      <span className="text-2xl font-semibold leading-none">{glyph}</span>
      <span className="text-xs text-zinc-500">{romaji}</span>
      <div className="flex gap-0.5 mt-1" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`block h-1.5 w-1.5 rounded-full ${
              i < stars ? "bg-amber-400" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
