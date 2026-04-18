"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hasJapaneseVoice, onVoicesChanged, speakJapanese } from "@/lib/tts";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
      return "border-gray-600 text-white hover:bg-white/10";
    }
    if (option === correctRomaji)
      return "border-emerald-500 bg-emerald-900 text-emerald-100";
    if (option === chosen)
      return "border-rose-500 bg-rose-900 text-rose-100";
    return "border-gray-800 text-gray-500";
  };

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <span className="text-7xl font-semibold leading-none">{kana}</span>
        {voiceReady && (
          <button
            type="button"
            aria-label={`Play pronunciation of ${kana}`}
            onClick={() => speakJapanese(kana)}
            className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span aria-hidden="true">🔊</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => handlePick(option)}
            disabled={chosen !== null}
            aria-label={`Option ${i + 1}: ${option}`}
            className={`rounded-lg border px-4 py-3 text-center text-base font-medium transition-colors ${getOptionStyle(option)}`}
          >
            <span className="mr-2 text-xs text-zinc-400">{i + 1}.</span>
            {option}
          </button>
        ))}
      </div>

      {chosen !== null && (
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          Continue (Space)
        </button>
      )}
    </div>
  );
}
