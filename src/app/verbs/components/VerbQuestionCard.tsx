"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/exercises/generator";
import { Button } from "@/components/ui/Button";
import type { VerbClass } from "@/lib/verbs/types";

interface Props {
  questionKey: string;
  dict: string;
  reading: string;
  romaji: string;
  meaning: string;
  verbClass: VerbClass;
  formLabel: string;
  sentenceJpPre: string;
  sentenceJpPost: string;
  sentenceEn: string;
  correct: string;
  distractors: string[];
  showRomaji: boolean;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
  autoAdvanceMsCorrect?: number;
  autoAdvanceMsWrong?: number;
}

const CLASS_LABELS: Record<VerbClass, string> = {
  ichidan: "Ichidan (ru-verb)",
  godan: "Godan (u-verb)",
  irregular: "Irregular",
};

export function VerbQuestionCard({
  questionKey,
  dict,
  reading,
  romaji,
  meaning,
  verbClass,
  formLabel,
  sentenceJpPre,
  sentenceJpPost,
  sentenceEn,
  correct,
  distractors,
  showRomaji,
  onAnswer,
  onContinue,
  autoAdvanceMsCorrect = 900,
  autoAdvanceMsWrong = 1800,
}: Props) {
  const options = useMemo(
    () => shuffle([correct, ...distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionKey],
  );
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    setChosen(null);
  }, [questionKey]);

  const onContinueRef = useRef(onContinue);
  useEffect(() => { onContinueRef.current = onContinue; }, [onContinue]);

  useEffect(() => {
    if (chosen === null) return;
    const delay = chosen === correct ? autoAdvanceMsCorrect : autoAdvanceMsWrong;
    const t = setTimeout(() => onContinueRef.current(), delay);
    return () => clearTimeout(t);
  }, [chosen, correct, autoAdvanceMsCorrect, autoAdvanceMsWrong]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (chosen === null) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx >= 0 && idx < options.length) handlePick(options[idx]);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, options, onContinue]);

  const handlePick = (option: string) => {
    if (chosen !== null) return;
    setChosen(option);
    onAnswer(option === correct);
  };

  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      return "border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-card-2)]";
    }
    if (option === correct)
      return "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-jlpt-n5)]";
    if (option === chosen)
      return "border-[var(--color-jlpt-n1-ring)] bg-[var(--color-jlpt-n1-bg)] text-[var(--color-jlpt-n1)]";
    return "border-[var(--color-border)] text-[var(--color-text-dim)]";
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      {/* Verb header */}
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[var(--color-text)]">
            {showRomaji ? romaji : dict}
          </span>
          {showRomaji && (
            <ruby className="text-xl text-[var(--color-text-muted)]">
              {dict}
              <rt className="text-xs">{reading}</rt>
            </ruby>
          )}
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">{meaning}</span>
        {/* Verb class hint — subtle tag */}
        <span className="mt-0.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-dim)]">
          {CLASS_LABELS[verbClass]}
        </span>
      </div>

      {/* Form label + sentence */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-4 py-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          {formLabel}
        </p>
        {/* Japanese sentence with blank */}
        <p className="mt-1.5 text-base font-medium text-[var(--color-text)]">
          {sentenceJpPre}
          <span className="mx-1 inline-block min-w-[3ch] border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]">
            ___
          </span>
          {sentenceJpPost}
        </p>
        {/* English translation */}
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {sentenceEn}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => handlePick(option)}
            disabled={chosen !== null}
            aria-label={`Option ${i + 1}: ${option}`}
            className={`min-h-14 rounded-[var(--radius-lg)] border px-3 py-3 text-center text-sm font-semibold transition-colors ${getOptionStyle(option)}`}
          >
            <span className="mr-1.5 text-xs text-[var(--color-text-dim)]">{i + 1}.</span>
            {option}
          </button>
        ))}
      </div>

      {chosen !== null && (
        <Button type="button" variant="secondary" size="md" onClick={onContinue} className="w-full">
          Continue (Space)
        </Button>
      )}
    </div>
  );
}
