"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/exercises/generator";
import { Button } from "@/components/ui/Button";
import { hasJapaneseVoice, onVoicesChanged, speakJapanese } from "@/lib/tts";
import type { Counter, CounterForms, DrillDirection } from "@/lib/counters/types";

interface Props {
  counter: Counter;
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  direction: DrillDirection;
  /** Example object word — only present for "example-to-counter". */
  example?: string;
  /** All counters — used by "example-to-counter" to render option details. */
  allCounters: Counter[];
  correctAnswer: string;   // hiragana form | counter.what | counter.reading
  distractors: string[];   // 3 wrong options
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
  questionKey: string;
  autoAdvanceMsCorrect?: number;
  autoAdvanceMsWrong?: number;
}

const DEFAULT_AUTO_ADVANCE_CORRECT = 800;
const DEFAULT_AUTO_ADVANCE_WRONG = 1500;

/**
 * Direction-aware MCQ card — romaji primary, kanji secondary throughout.
 *
 * num-to-reading:
 *   Prompt: number + romaji reading + kanji
 *   Options: romaji numbered form (primary) · hiragana (secondary)
 *
 * reading-to-meaning:
 *   Prompt: romaji reading + kanji + sample form
 *   Options: English gloss strings
 *
 * example-to-counter:
 *   Prompt: number + object  e.g. "3  pen"
 *   Options: romaji numbered form (e.g. sanbon) + kanji (本) below
 *            After reveal: also shows what the counter counts (long/thin objects)
 *
 * Audio: plays correct hiragana form on every answer pick.
 * Speaker 🔊 button in prompt for user-initiated replay.
 */
export function CounterQuestionCard({
  counter,
  number,
  direction,
  example,
  allCounters,
  correctAnswer,
  distractors,
  onAnswer,
  onContinue,
  questionKey,
  autoAdvanceMsCorrect = DEFAULT_AUTO_ADVANCE_CORRECT,
  autoAdvanceMsWrong = DEFAULT_AUTO_ADVANCE_WRONG,
}: Props) {
  const options = useMemo(
    () => shuffle([correctAnswer, ...distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionKey],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(() => hasJapaneseVoice());

  useEffect(() => {
    const unsub = onVoicesChanged(() => setVoiceReady(hasJapaneseVoice()));
    return unsub;
  }, []);

  useEffect(() => { setChosen(null); }, [questionKey]);

  // Lookup map: counter reading → Counter (for example-to-counter option display).
  const counterMap = useMemo(
    () => Object.fromEntries(allCounters.map((c) => [c.reading, c])),
    [allCounters],
  );

  // Lookup: hiragana → romaji (for num-to-reading option display).
  const hiraganaToRomaji = useMemo(() => {
    return Object.fromEntries(
      Object.entries(counter.forms).map(([n, h]) => [
        h,
        counter.formRomaji[Number(n) as keyof CounterForms],
      ]),
    ) as Record<string, string>;
  }, [counter]);

  const hiraganaForm = counter.forms[number];

  const onContinueRef = useRef(onContinue);
  useEffect(() => { onContinueRef.current = onContinue; }, [onContinue]);
  useEffect(() => {
    if (chosen === null) return;
    const delay = chosen === correctAnswer ? autoAdvanceMsCorrect : autoAdvanceMsWrong;
    const t = setTimeout(() => onContinueRef.current(), delay);
    return () => clearTimeout(t);
  }, [chosen, correctAnswer, autoAdvanceMsCorrect, autoAdvanceMsWrong]);

  const handlePick = (option: string) => {
    if (chosen !== null) return;
    setChosen(option);
    onAnswer(option === correctAnswer);
    // Always speak the correct hiragana form to reinforce pronunciation.
    if (voiceReady) speakJapanese(hiraganaForm);
  };

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

  const getOptionStyle = (option: string): string => {
    if (chosen === null)
      return "border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-card-2)]";
    if (option === correctAnswer)
      return "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-jlpt-n5)]";
    if (option === chosen)
      return "border-[var(--color-jlpt-n1-ring)] bg-[var(--color-jlpt-n1-bg)] text-[var(--color-jlpt-n1)]";
    return "border-[var(--color-border)] text-[var(--color-text-dim)]";
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">

      {/* ── Prompt ─────────────────────────────────────────── */}
      {direction === "num-to-reading" ? (
        // "How do you say 3 hon?"
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3">
            <span className="text-5xl font-bold leading-none text-[var(--color-text)]">
              {number}
            </span>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-3xl font-bold leading-none text-[var(--color-text)]">
                {counter.reading}
              </span>
              <span className="text-sm leading-none text-[var(--color-text-dim)]">
                {counter.kanji}
              </span>
            </div>
            {voiceReady && (
              <button
                type="button"
                onClick={() => speakJapanese(hiraganaForm)}
                aria-label="Play pronunciation"
                className="rounded-full p-1.5 text-lg text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
              >
                🔊
              </button>
            )}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{counter.what}</span>
          <span className="text-xs text-[var(--color-text-dim)]">
            How do you say {number} {counter.reading}?
          </span>
        </div>

      ) : direction === "reading-to-meaning" ? (
        // "What does -hon- count?"
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold leading-none text-[var(--color-text)]">
              {counter.reading}
            </span>
            {voiceReady && (
              <button
                type="button"
                onClick={() => speakJapanese(hiraganaForm)}
                aria-label="Play pronunciation"
                className="rounded-full p-1.5 text-lg text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
              >
                🔊
              </button>
            )}
          </div>
          <span className="text-sm text-[var(--color-text-dim)]">{counter.kanji}</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            e.g. {hiraganaToRomaji[hiraganaForm] ?? hiraganaForm} ({number}×)
          </span>
          <span className="text-xs text-[var(--color-text-dim)]">
            What does -{counter.reading}- count?
          </span>
        </div>

      ) : (
        // example-to-counter: "3  pen — Which counter do you use?"
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-4">
            <span className="text-5xl font-bold leading-none text-[var(--color-text)]">
              {number}
            </span>
            <span className="text-3xl font-bold leading-none text-[var(--color-text)]">
              {example}
            </span>
            {/* Only reveal audio after answering — playing it beforehand gives away the correct counter. */}
            {voiceReady && chosen !== null && (
              <button
                type="button"
                onClick={() => speakJapanese(hiraganaForm)}
                aria-label="Play pronunciation"
                className="rounded-full p-1.5 text-lg text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
              >
                🔊
              </button>
            )}
          </div>
          <span className="text-xs text-[var(--color-text-dim)]">
            Which counter do you use?
          </span>
        </div>
      )}

      {/* ── Options ────────────────────────────────────────── */}
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option, i) => {
          const optionCounter =
            direction === "example-to-counter" ? counterMap[option] : undefined;

          return (
            <button
              key={option}
              type="button"
              onClick={() => handlePick(option)}
              disabled={chosen !== null}
              aria-label={`Option ${i + 1}: ${option}`}
              className={`min-h-14 rounded-[var(--radius-lg)] border px-4 py-3 text-center transition-colors ${getOptionStyle(option)}`}
            >
              {direction === "num-to-reading" ? (
                // Romaji numbered form (primary) · hiragana (secondary)
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--color-text-dim)]">{i + 1}.</span>
                    <span className="text-base font-semibold">
                      {hiraganaToRomaji[option] ?? option}
                    </span>
                  </span>
                  <span className="text-xs opacity-60">{option}</span>
                </span>

              ) : direction === "example-to-counter" && optionCounter ? (
                // Romaji numbered form (primary) · kanji (secondary) · what on reveal
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--color-text-dim)]">{i + 1}.</span>
                    <span className="text-base font-semibold">
                      {optionCounter.formRomaji[number]}
                    </span>
                  </span>
                  <span className="text-sm opacity-80">{optionCounter.kanji}</span>
                  {chosen !== null && (
                    <span className="text-xs opacity-60">{optionCounter.what}</span>
                  )}
                </span>

              ) : (
                // reading-to-meaning: English gloss
                <>
                  <span className="mr-2 text-xs text-[var(--color-text-dim)]">{i + 1}.</span>
                  <span className="text-base font-semibold">{option}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {chosen !== null && (
        <Button type="button" variant="secondary" size="md" onClick={onContinue} className="w-full">
          Continue (Space)
        </Button>
      )}
    </div>
  );
}
