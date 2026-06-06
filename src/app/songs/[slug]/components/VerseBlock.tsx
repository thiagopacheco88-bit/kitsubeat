"use client";

import type { Verse } from "@/lib/types/lesson";
import { GRAMMAR_COLOR_CLASS, localize } from "@/lib/types/lesson";
import { usePlayer } from "./PlayerContext";
import TokenSpan from "./TokenSpan";
import VerseStarIcon from "./VerseStarIcon";

export default function VerseBlock({
  verse,
  isActive = false,
  startMs,
  isDominated = false,
}: {
  verse: Verse;
  isActive?: boolean;
  /** When provided, clicking the verse seeks the player here and plays. */
  startMs?: number;
  /**
   * Phase 11.6 SPEC-REQ-14: render the gold VerseStarIcon next to the verse
   * number when the current user has dominated this verse. SSR-resolved by
   * LyricsPanel from getDominatedVerses().
   */
  isDominated?: boolean;
}) {
  const { translationLang, showRomaji, seekAndPlay } = usePlayer();
  const canSeek = typeof startMs === "number";

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

  const isFiller = verse.filler === true;

  return (
    <div
      data-verse-number={verse.verse_number}
      data-active={isActive ? "true" : "false"}
      data-filler={isFiller ? "true" : undefined}
      {...testDataAttr}
      onClick={
        canSeek
          ? (e) => {
              // Don't hijack clicks on nested interactive children (token
              // popups, the word-by-word <details> toggle, etc.).
              const target = e.target as HTMLElement;
              if (target.closest("button, summary, a, [role='button']")) return;
              seekAndPlay(startMs!);
            }
          : undefined
      }
      className={`rounded-[var(--radius-lg)] border p-4 transition-all duration-300 ${
        canSeek ? "cursor-pointer" : ""
      } ${
        isActive
          ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 shadow-[var(--shadow-hero-glow)]"
          : isFiller
            ? "border-[var(--color-border)] bg-[var(--color-card)]/40 opacity-70 hover:border-[var(--color-border-strong)]"
            : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-[var(--text-micro)] font-medium uppercase tracking-wider text-[var(--color-text-dim)]">
        {/* Phase 11.6 D-14: gold star next to dominated verses. Sits before
            the "Verse N" label so it reads as a badge on the verse. */}
        {isDominated && <VerseStarIcon />}
        {verse.speaker ? (
          <span className="text-[var(--color-accent)] font-semibold">{verse.speaker}</span>
        ) : (
          <span>Verse {verse.verse_number}</span>
        )}
        {isFiller && (
          <span className="rounded-[var(--radius-sm)] bg-[var(--color-card-2)] px-1.5 py-0.5 text-[var(--text-nano)] text-[var(--color-text-dim)]">
            placeholder
          </span>
        )}
      </div>

      {/* Japanese tokens with furigana */}
      <div className="mb-3 flex flex-wrap gap-0.5 text-lg leading-loose font-[family-name:var(--font-noto-jp)]">
        {verse.tokens.map((token, i) => (
          <TokenSpan key={i} token={token} />
        ))}
      </div>

      {/* Romaji (suppress for filler — surface already renders as romaji text) */}
      {showRomaji && !isFiller && (
        <p className="mb-2 text-xs leading-relaxed text-[var(--color-text-dim)]">
          {verse.tokens.map((t) => t.romaji).join(" ")}
        </p>
      )}

      {/* Translation — filler verses skip the placeholder gloss */}
      {!isFiller && (
        <p className="mb-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]" data-testid="verse-translation">
          {translation}
        </p>
      )}

      {/* Collapsible word-by-word breakdown — skipped for filler verses */}
      {!isFiller && (
      <details className="group">
        <summary className="cursor-pointer text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]">
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
                <span className="text-[var(--color-text-dim)]">
                  {token.reading !== token.surface ? token.reading + " = " : ""}
                  {token.romaji}
                </span>
                <span className="text-[var(--color-text-muted)]">
                  = {localize(token.meaning, translationLang)}
                </span>
              </div>
            ))}
        </div>
        {verse.literal_meaning && (
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            {localize(verse.literal_meaning, translationLang)}
          </p>
        )}
        {verse.cultural_context && (
          <p className="mt-1 text-xs italic text-[var(--color-text-dim)]">
            {localize(verse.cultural_context, translationLang)}
          </p>
        )}
      </details>
      )}
    </div>
  );
}
