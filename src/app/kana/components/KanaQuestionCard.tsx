"use client";

import { useEffect, useMemo, useState } from "react";
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
  onContinue: () => void; // called when user taps "Continue" after seeing feedback
  questionKey: string; // change this to reset the card (caller passes question index + kana)
}

export function KanaQuestionCard({
  kana,
  correctRomaji,
  distractors,
  onAnswer,
  onContinue,
  questionKey,
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
      return "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";
    }
    if (option === correctRomaji)
      return "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100";
    if (option === chosen)
      return "border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100";
    return "border-zinc-200 text-zinc-400 dark:border-zinc-800";
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
