"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hasJapaneseVoice, onVoicesChanged, speakJapanese } from "@/lib/tts";
import { shuffle } from "@/lib/exercises/generator";
import { Button } from "@/components/ui/Button";

interface Props {
  kana: string; // glyph to render large
  correctRomaji: string;
  distractors: string[]; // typically 3
  onAnswer: (correct: boolean) => void;
  onContinue: () => void; // called when user taps "Continue" after seeing feedback (or auto-fired)
  questionKey: string; // change this to reset the card (caller passes question index + kana)
  autoAdvanceMsCorrect?: number; // delay before auto-firing onContinue on a correct pick
  autoAdvanceMsWrong?: number; // delay before auto-firing onContinue on a wrong pick
}

const DEFAULT_AUTO_ADVANCE_CORRECT = 800;
const DEFAULT_AUTO_ADVANCE_WRONG = 1500;

/**
 * 4-option MCQ for kana drilling.
 *
 * Phase 14 Plan 14-08 migration notes:
 * - Default option border + text uses --color-border-strong + --color-text;
 *   feedback states use JLPT-N5 alpha tokens (green ≈ correct) and JLPT-N1
 *   alpha tokens (red ≈ wrong). Same semantic-color reuse pattern as Plan
 *   14-07's daily-cap toast (JLPT-N3 amber) and review's "New" tag (JLPT-N4
 *   blue) — keeps the token surface tight without a dedicated correct/wrong
 *   color pair.
 * - Continue CTA uses Button primitive variant=primary; speaker icon button
 *   tokenized to muted hover; option count "1." labels muted.
 */
export function KanaQuestionCard({
  kana,
  correctRomaji,
  distractors,
  onAnswer,
  onContinue,
  questionKey,
  autoAdvanceMsCorrect = DEFAULT_AUTO_ADVANCE_CORRECT,
  autoAdvanceMsWrong = DEFAULT_AUTO_ADVANCE_WRONG,
}: Props) {
  const options = useMemo(
    () => shuffle([correctRomaji, ...distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionKey], // shuffle only when the question changes; stable across re-renders within the same Q
  );
  const [chosen, setChosen] = useState<string | null>(null);

  // TTS gate (RESEARCH Pattern: LearnCard.tsx:35-39)
  const [voiceReady, setVoiceReady] = useState(() => hasJapaneseVoice());
  useEffect(() => {
    const unsub = onVoicesChanged(() => setVoiceReady(hasJapaneseVoice()));
    return unsub;
  }, []);

  // Reset internal feedback state on question change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChosen(null);
  }, [questionKey]);

  // Auto-advance after showing feedback. Correct picks get a short confirmation
  // glance; wrong picks linger slightly longer so the correct answer registers
  // before the parent transitions to the miss-relearn card.
  // onContinue is held in a ref so parent re-renders don't reset the timer.
  const onContinueRef = useRef(onContinue);
  useEffect(() => {
    onContinueRef.current = onContinue;
  }, [onContinue]);
  useEffect(() => {
    if (chosen === null) return;
    const delay =
      chosen === correctRomaji ? autoAdvanceMsCorrect : autoAdvanceMsWrong;
    const t = setTimeout(() => onContinueRef.current(), delay);
    return () => clearTimeout(t);
  }, [chosen, correctRomaji, autoAdvanceMsCorrect, autoAdvanceMsWrong]);

  const handlePick = (option: string) => {
    if (chosen !== null) return;
    setChosen(option);
    onAnswer(option === correctRomaji);
    // Speak the kana on reveal — same reinforcement pattern as CounterQuestionCard
    speakJapanese(kana);
  };

  // Keyboard shortcuts: 1-4 selects option; Space/Enter continues after feedback.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (chosen === null) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx >= 0 && idx < options.length) {
          handlePick(options[idx]);
        }
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, options, onContinue]);

  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      return "border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-card-2)]";
    }
    if (option === correctRomaji)
      return "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-jlpt-n5)]";
    if (option === chosen)
      return "border-[var(--color-jlpt-n1-ring)] bg-[var(--color-jlpt-n1-bg)] text-[var(--color-jlpt-n1)]";
    return "border-[var(--color-border)] text-[var(--color-text-dim)]";
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
      <div className="flex items-center gap-3">
        <span className="text-7xl font-semibold leading-none text-[var(--color-text)]">
          {kana}
        </span>
        {voiceReady && (
          <button
            type="button"
            aria-label={`Play pronunciation of ${kana}`}
            onClick={() => speakJapanese(kana)}
            className="min-h-11 min-w-11 rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
          >
            <span aria-hidden="true">🔊</span>
          </button>
        )}
      </div>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => handlePick(option)}
            disabled={chosen !== null}
            aria-label={`Option ${i + 1}: ${option}`}
            className={`min-h-14 rounded-[var(--radius-lg)] border px-4 py-3 text-center text-base font-semibold transition-colors ${getOptionStyle(option)}`}
          >
            <span className="mr-2 text-xs text-[var(--color-text-dim)]">
              {i + 1}.
            </span>
            {option}
          </button>
        ))}
      </div>

      {chosen !== null && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onContinue}
          className="w-full"
        >
          Continue (Space)
        </Button>
      )}
    </div>
  );
}
