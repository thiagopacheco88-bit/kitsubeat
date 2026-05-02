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
 *
 * Phase 14 Plan 14-08 migration notes:
 * - Locked + unlocked surfaces tokenized to --color-card / --color-card-2 /
 *   --color-border / --color-text / --color-text-dim / --color-text-muted.
 *   Tokens auto-flip across light/dark themes via :root[data-theme="light"]
 *   in globals.css — no `dark:` Tailwind variant required (Pitfall 7).
 * - Filled mastery pip uses --color-jlpt-n3 (the canonical amber tone in the
 *   token surface) — semantic reuse rather than introducing a new accent
 *   color (matches Plan 14-06 SongMasteredBanner pattern).
 */
export function KanaTile({ glyph, romaji, stars, locked }: Props) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-[var(--radius-md)] border px-2 py-2 text-center ${
        locked
          ? "border-[var(--color-border)] bg-[var(--color-card-2)] text-[var(--color-text-dim)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-card)] text-[var(--color-text)]"
      }`}
      aria-label={
        locked ? `${romaji} (locked)` : `${romaji} — ${stars} of 10 stars`
      }
    >
      <span className="text-2xl font-semibold leading-none">{glyph}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{romaji}</span>
      <div className="flex gap-0.5 mt-1" aria-hidden="true">
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
