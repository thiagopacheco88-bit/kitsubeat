"use client";

import type { Verse } from "@/lib/types/lesson";
import { GRAMMAR_COLOR_CLASS } from "@/lib/types/lesson";
import { usePlayer } from "./PlayerContext";
import TokenSpan from "./TokenSpan";

export default function VerseBlock({
  verse,
  isActive = false,
}: {
  verse: Verse;
  isActive?: boolean;
}) {
  const { translationLang, showRomaji } = usePlayer();

  const translation =
    verse.translations[translationLang] ?? verse.translations["en"] ?? "";

  // Test-only attribute. Lets Playwright look up a verse's start_time_ms without
  // re-parsing synced_lrc on the client side. Gated EXCLUSIVELY on
  // NEXT_PUBLIC_APP_ENV === 'test' — single-condition gate, never leaks to dev/prod.
  // See plan 08.1-05 Task 2 verification.
  const testDataAttr =
    process.env.NEXT_PUBLIC_APP_ENV === "test"
      ? { "data-start-ms": String(verse.start_time_ms ?? "") }
      : {};

  return (
    <div
      data-verse-number={verse.verse_number}
      data-active={isActive ? "true" : "false"}
      {...testDataAttr}
      className={`rounded-lg border p-4 transition-all duration-300 ${
        isActive
          ? "border-red-500/50 bg-red-950/20 shadow-lg shadow-red-500/5"
          : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
      }`}
    >
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-600">
        Verse {verse.verse_number}
      </div>

      {/* Japanese tokens with furigana */}
      <div className="mb-3 flex flex-wrap gap-0.5 text-lg leading-loose font-[family-name:var(--font-noto-jp)]">
        {verse.tokens.map((token, i) => (
          <TokenSpan key={i} token={token} />
        ))}
      </div>

      {/* Romaji */}
      {showRomaji && (
        <p className="mb-2 text-xs leading-relaxed text-gray-500">
          {verse.tokens.map((t) => t.romaji).join(" ")}
        </p>
      )}

      {/* Translation */}
      <p className="mb-1.5 text-sm leading-relaxed text-gray-300">
        {translation}
      </p>

      {/* Collapsible word-by-word breakdown */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-400">
          Word-by-word breakdown
        </summary>
        <div className="mt-2 space-y-1">
          {verse.tokens
            .filter((t) => t.grammar !== "particle" || t.meaning)
            .map((token, i) => (
              <div key={i} className="flex items-baseline gap-2 text-xs">
                <span
                  className={`font-medium font-[family-name:var(--font-noto-jp)] ${GRAMMAR_COLOR_CLASS[token.grammar]}`}
                >
                  {token.surface}
                </span>
                <span className="text-gray-500">
                  {token.reading !== token.surface ? token.reading + " = " : ""}
                  {token.romaji}
                </span>
                <span className="text-gray-400">= {token.meaning}</span>
              </div>
            ))}
        </div>
        {verse.literal_meaning && (
          <p className="mt-2 text-xs text-gray-500">
            {verse.literal_meaning}
          </p>
        )}
        {verse.cultural_context && (
          <p className="mt-1 text-xs italic text-gray-600">
            {verse.cultural_context}
          </p>
        )}
      </details>
    </div>
  );
}
