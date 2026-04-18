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
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {script === "hiragana" ? "Hiragana" : "Katakana"}
      </h2>
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const isUnlocked = unlocked.has(row.id);
          return (
            <div key={row.id} className={`${isUnlocked ? "" : "opacity-50"}`}>
              <div className="text-xs uppercase text-zinc-400 mb-1">
                {row.label}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
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
