"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/lib/exercises/generator";
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
}

export default function LearnCard({
  question,
  partOfSpeech,
  jlptLevel,
  meaningText,
  lang,
  onDismiss,
}: LearnCardProps) {
  const [revealed, setRevealed] = useState(false);

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
  const hasMoreContent = hasMnemonic || hasKanjiBreakdown;

  return (
    <div
      data-testid="learn-card"
      onClick={onDismiss}
      className="rounded-lg border border-indigo-500/30 bg-indigo-900/10 p-4 cursor-pointer select-none"
    >
      {/* Header row: "New word" label + optional speaker icon */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-indigo-300">
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
            className="rounded-full p-1.5 text-gray-300 hover:bg-gray-800 hover:text-white"
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

      {/* Surface (kanji) + furigana (reading) — Tier 1 style: kanji big, reading small above */}
      <div className="mb-2">
        <ruby className="text-3xl font-semibold text-white">
          {question.vocabInfo.surface}
          <rt className="text-sm font-normal text-gray-400">
            {question.vocabInfo.reading}
          </rt>
        </ruby>
      </div>

      {/* Romaji + POS + optional JLPT */}
      <p className="mb-1 text-sm text-gray-400">
        <span className="italic">{question.vocabInfo.romaji}</span>
        <span className="mx-2 text-gray-600">&middot;</span>
        <span>{partOfSpeech}</span>
        {jlptLevel && (
          <>
            <span className="mx-2 text-gray-600">&middot;</span>
            <span className="text-xs uppercase tracking-wider text-gray-500">
              {jlptLevel}
            </span>
          </>
        )}
      </p>

      {/* Meaning */}
      <p className="mb-3 text-base text-gray-200">{meaningText}</p>

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
          className="text-sm text-indigo-300 underline hover:text-indigo-200"
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
            <div className="rounded-md border border-indigo-500/20 bg-indigo-900/20 p-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-indigo-400">
                Memory tip
              </p>
              <p className="text-sm text-gray-300">
                {localize(question.mnemonic, lang)}
              </p>
            </div>
          )}
          {hasKanjiBreakdown && question.kanji_breakdown && (
            <KanjiBreakdownSection
              breakdown={question.kanji_breakdown}
              lang={lang}
            />
          )}
        </div>
      )}

      {/* Footer hint — confirms the interaction model to users */}
      <p className="mt-3 text-xs text-gray-500">Tap anywhere to continue</p>
    </div>
  );
}
