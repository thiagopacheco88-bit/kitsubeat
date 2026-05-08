"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/lib/exercises/generator";
import type { TrackKind } from "@/lib/exercises/generator";
import { localize } from "@/lib/types/lesson";
import { speakJapanese, hasJapaneseVoice, onVoicesChanged } from "@/lib/tts";
import KanjiBreakdownSection from "./KanjiBreakdownSection";

interface LearnCardProps {
  /** Full question carries vocabInfo + explanation + mnemonic + kanji_breakdown (Phase 08.3 extensions). */
  question: Question;
  /** Part-of-speech + JLPT level shown on the card. Passed through because Question doesn't carry them. */
  partOfSpeech: string;
  jlptLevel: string | null;
  /** Localized meaning for the current language (already resolved via localize()). */
  meaningText: string;
  /** Language for KanjiBreakdownSection localize() calls. */
  lang: string;
  /** Called when any tap/swipe outside the reveal control or speaker icon dismisses the card. */
  onDismiss: () => void;
  /**
   * Phase 11.6-09: track driving this session.
   * - "kanji" → KanjiBreakdownSection lifted out of accordion and shown prominently in card body.
   * - all others → KanjiBreakdownSection stays in revealed accordion (existing Plan 08.3 behaviour).
   */
  trackKind?: TrackKind;
}

export default function LearnCard({
  question,
  partOfSpeech,
  jlptLevel,
  meaningText,
  lang,
  onDismiss,
  trackKind,
}: LearnCardProps) {
  const [revealed, setRevealed] = useState(false);
  // Phase 11.4: silent-fail flag — when the image 404s, collapse to no-image.
  const [imageFailed, setImageFailed] = useState(false);

  // Voices load async in Chromium — re-check after "voiceschanged" fires so
  // the speaker icon appears once the voice list populates.
  const [voiceReady, setVoiceReady] = useState<boolean>(() => hasJapaneseVoice());
  useEffect(() => {
    const unsub = onVoicesChanged(() => setVoiceReady(hasJapaneseVoice()));
    return unsub;
  }, []);

  const hasMnemonic = !!question.mnemonic;
  const hasKanjiBreakdown =
    question.kanji_breakdown != null && question.kanji_breakdown.characters.length > 0;
  // For Kanji track, KanjiBreakdownSection is rendered prominently in the card body
  // (outside the accordion) — the accordion only needs to show the mnemonic.
  const isKanjiTrack = trackKind === "kanji";
  const hasMoreContent = isKanjiTrack
    ? hasMnemonic
    : hasMnemonic || hasKanjiBreakdown;

  return (
    <div
      data-testid="learn-card"
      data-ai-generated="true"
      onClick={onDismiss}
      className="cursor-pointer select-none rounded-[var(--radius-xl)] border border-[var(--color-jlpt-n4-ring)] bg-[var(--color-jlpt-n4-bg)] p-4 shadow-[var(--shadow-card-ring)]"
    >
      {/* Header row: "New word" label + optional speaker icon */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-jlpt-n4)" }}>
          New word
        </span>
        {voiceReady && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              speakJapanese(question.vocabInfo.surface);
            }}
            aria-label="Play pronunciation"
            data-testid="learn-card-speaker"
            className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
          >
            {/* Minimal speaker SVG — matches existing iconography (no external lib) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.241 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
            </svg>
          </button>
        )}
      </div>

      {/* Phase 11.4: optional Unsplash image. Inherits outer onClick={onDismiss} —
          NO own onClick (Pitfall 4). Numeric width/height (224 = w-56) reserves
          layout to prevent CLS. Silent collapse on fetch error per D-07. */}
      {question.image_url && !imageFailed && (
        <div className="mb-3 flex justify-center">
          <img
            src={question.image_url}
            alt={question.meaning_en ?? meaningText}
            width={224}
            height={224}
            loading="lazy"
            onError={() => {
              console.warn(
                `[LearnCard] image failed: ${question.image_url} (${question.vocabItemId})`
              );
              setImageFailed(true);
            }}
            data-testid="learn-card-image"
            className="aspect-square w-56 h-56 rounded-md object-cover"
          />
        </div>
      )}

      {/* Surface (kanji) + furigana (reading) — Tier 1 style: kanji big, reading small above.
          Omit the <rt> when surface === reading (pure-kana words like すごい) — matches
          TierText's isPureKana handling and prevents the word from visually stacking on itself. */}
      <div className="mb-2">
        {question.vocabInfo.surface === question.vocabInfo.reading ? (
          <span className="text-3xl font-semibold text-[var(--color-text)]">
            {question.vocabInfo.surface}
          </span>
        ) : (
          <ruby className="text-3xl font-semibold text-[var(--color-text)]">
            {question.vocabInfo.surface}
            <rt className="text-sm font-normal text-[var(--color-text-muted)]">
              {question.vocabInfo.reading}
            </rt>
          </ruby>
        )}
      </div>

      {/* Romaji + POS + optional JLPT */}
      <p className="mb-1 text-sm text-[var(--color-text-muted)]">
        <span className="italic">{question.vocabInfo.romaji}</span>
        <span className="mx-2 text-[var(--color-text-dim)]">&middot;</span>
        <span>{partOfSpeech}</span>
        {jlptLevel && (
          <>
            <span className="mx-2 text-[var(--color-text-dim)]">&middot;</span>
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
              {jlptLevel}
            </span>
          </>
        )}
      </p>

      {/* Meaning */}
      <p className="mb-3 text-base text-[var(--color-text)]">{meaningText}</p>

      {/* Phase 11.6-09: Kanji track — KanjiBreakdownSection lifted out of accordion
          and shown prominently so learners see it before answering the typed question.
          Non-Kanji tracks keep breakdown in the accordion (Plan 08.3 behaviour). */}
      {isKanjiTrack && hasKanjiBreakdown && question.kanji_breakdown && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="my-3 rounded-[var(--radius-lg)] bg-[var(--color-card)] p-3"
          data-testid="learn-card-kanji-breakdown-prominent"
        >
          <KanjiBreakdownSection breakdown={question.kanji_breakdown} lang={lang} />
        </div>
      )}

      {/* Show more control — the ONE dedicated reveal. Never advances. */}
      {hasMoreContent && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(!revealed);
          }}
          aria-expanded={revealed}
          data-testid="learn-card-reveal"
          className="text-sm underline hover:opacity-80"
          style={{ color: "var(--color-jlpt-n4)" }}
        >
          {revealed ? "Hide details" : "Show more"}
        </button>
      )}

      {/* Revealed body — stops propagation so users can read without advancing */}
      {hasMoreContent && revealed && (
        <div
          onClick={(e) => e.stopPropagation()}
          data-testid="learn-card-more"
          className="mt-3 flex flex-col gap-3"
        >
          {hasMnemonic && question.mnemonic && (
            <div className="rounded-md border border-[var(--color-jlpt-n4-ring)] bg-[var(--color-jlpt-n4-bg)] p-3">
              <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: "var(--color-jlpt-n4)" }}>
                Memory tip
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {localize(question.mnemonic, lang)}
              </p>
            </div>
          )}
          {/* Kanji track: breakdown is shown prominently above (not duplicated in accordion) */}
          {!isKanjiTrack && hasKanjiBreakdown && question.kanji_breakdown && (
            <KanjiBreakdownSection
              breakdown={question.kanji_breakdown}
              lang={lang}
            />
          )}
        </div>
      )}

      {/* Footer hint — confirms the interaction model to users */}
      <p className="mt-3 text-xs text-[var(--color-text-dim)]">Tap anywhere to continue</p>
    </div>
  );
}
