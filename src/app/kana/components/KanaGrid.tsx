"use client";

import { HIRAGANA_ROWS, KATAKANA_ROWS } from "@/lib/kana/chart";
import { computeUnlockedRows } from "@/lib/kana/mastery";
import type { Script } from "@/lib/kana/types";
import { useKanaProgress } from "@/stores/kanaProgress";
import { KanaTile } from "./KanaTile";

interface Props {
  script: Script; // grid renders ONE script at a time; mode "mixed" stacks two grids
}

/**
 * Row-grouped chart with locked/unlocked styling.
 *
 * Reads the persisted mastery map for the active script via the store,
 * derives the unlocked-row set with `computeUnlockedRows`, and dims
 * (opacity-50) any row that is not yet reachable. Tiles inside locked
 * rows still render their pip count (always 0) but are non-interactive
 * by virtue of the page never wiring an onClick.
 */
export function KanaGrid({ script }: Props) {
  const mastery = useKanaProgress((s) =>
    script === "hiragana" ? s.hiragana : s.katakana,
  );
  const rows = script === "hiragana" ? HIRAGANA_ROWS : KATAKANA_ROWS;
  const unlocked = computeUnlockedRows(rows, mastery, script);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring)] sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          {script === "hiragana" ? "Hiragana" : "Katakana"}
        </h2>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          {rows.length} rows
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const isUnlocked = unlocked.has(row.id);
          return (
            <div
              key={row.id}
              className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] p-3 ${
                isUnlocked ? "" : "opacity-55"
              }`}
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
                {row.label}
              </div>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-10">
                {row.chars.map((c) => {
                  const glyph = script === "hiragana" ? c.hiragana : c.katakana;
                  return (
                    <KanaTile
                      key={glyph}
                      glyph={glyph}
                      romaji={c.romaji}
                      stars={mastery[glyph] ?? 0}
                      locked={!isUnlocked}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
