"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCounterProgress } from "@/stores/counterProgress";
import { COUNTERS_ORDERED } from "@/lib/counters/chart";
import { computeUnlockedCounters } from "@/lib/counters/mastery";
import {
  buildCounterSession,
  buildCounterDistractors,
} from "@/lib/counters/selection";
import type { CounterQuestion as CQ, DrillDirection } from "@/lib/counters/types";
import { CounterQuestionCard } from "./CounterQuestionCard";

interface AnswerLog {
  counterId: string;
  direction: DrillDirection;
  correct: boolean;
  starsBefore: number;
  starsAfter: number;
}

const SESSION_LENGTH = 20;

/**
 * Counter session state machine.
 *
 * Mirrors KanaSession — snapshots mastery at session start, builds a fixed
 * 20-question pool, advances on correct/wrong, writes sessionStorage for the
 * summary page, detects new counter unlocks.
 */
export function CounterSession() {
  const hasHydrated = useCounterProgress((s) => s._hasHydrated);
  const mastery = useCounterProgress((s) => s.mastery);
  const applyAnswer = useCounterProgress((s) => s.applyAnswer);

  // Snapshot at session start — pool is fixed for these 20 questions.
  const startSnapshot = useRef<{
    mastery: Record<string, number>;
    unlockedIds: Set<string>;
  } | null>(null);
  if (hasHydrated && startSnapshot.current === null) {
    startSnapshot.current = {
      mastery: { ...mastery },
      unlockedIds: computeUnlockedCounters(COUNTERS_ORDERED, mastery),
    };
  }

  const session = useMemo<CQ[]>(() => {
    if (!hasHydrated || !startSnapshot.current) return [];
    return buildCounterSession({
      mastery: startSnapshot.current.mastery,
      unlockedIds: startSnapshot.current.unlockedIds,
      counters: COUNTERS_ORDERED,
      questionCount: SESSION_LENGTH,
    });
  }, [hasHydrated]);

  const [index, setIndex] = useState(0);
  const [unlockedDuringSession, setUnlockedDuringSession] = useState<Set<string>>(new Set());
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const lastCorrectRef = useRef<boolean | null>(null);

  // Write sessionStorage when session completes.
  useEffect(() => {
    if (index >= SESSION_LENGTH && typeof window !== "undefined") {
      sessionStorage.setItem(
        "kitsubeat-counter-last-session",
        JSON.stringify({ log: answerLog, unlocked: [...unlockedDuringSession] }),
      );
    }
  }, [index, answerLog, unlockedDuringSession]);

  if (!hasHydrated) {
    return (
      <div className="h-80 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
    );
  }

  if (session.length === 0) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card-ring)]">
        No unlocked counters yet.{" "}
        <Link className="font-semibold text-[var(--color-text)] underline" href="/counters">
          Back to grid
        </Link>
        .
      </div>
    );
  }

  // Session complete — send to summary.
  if (index >= SESSION_LENGTH) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-[var(--shadow-card-ring-strong)]">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Session complete</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Answered {answerLog.filter((a) => a.correct).length}/{SESSION_LENGTH} correctly.
        </p>
        <Link
          href="/counters/session/summary"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90"
        >
          See summary
        </Link>
      </div>
    );
  }

  const current = session[index];
  const correctStarsBefore = (mastery[current.counter.id] ?? 0);

  // Correct answer for this question.
  const correctAnswer =
    current.direction === "num-to-reading"
      ? current.counter.forms[current.number]
      : current.direction === "reading-to-meaning"
      ? current.counter.what
      : current.counter.reading; // example-to-counter → pick the right counter word

  const distractors = buildCounterDistractors({
    question: current,
    unlockedIds: startSnapshot.current!.unlockedIds,
    counters: COUNTERS_ORDERED,
    count: 3,
  });

  return (
    <SessionFrame index={index} total={SESSION_LENGTH}>
      <CounterQuestionCard
        questionKey={`${index}-${current.counter.id}-${current.number}-${current.direction}`}
        counter={current.counter}
        number={current.number}
        direction={current.direction}
        example={current.example}
        correctAnswer={correctAnswer}
        distractors={distractors}
        allCounters={COUNTERS_ORDERED}
        onAnswer={(correct) => {
          lastCorrectRef.current = correct;
          applyAnswer(current.counter.id, correct);
          const after = correct
            ? Math.min(10, correctStarsBefore + 1)
            : Math.max(0, correctStarsBefore - 2);
          setAnswerLog((log) => [
            ...log,
            {
              counterId: current.counter.id,
              direction: current.direction,
              correct,
              starsBefore: correctStarsBefore,
              starsAfter: after,
            },
          ]);
          // Detect new unlocks after store delta is applied.
          queueMicrotask(() => {
            const latest = useCounterProgress.getState();
            const nowUnlocked = computeUnlockedCounters(COUNTERS_ORDERED, latest.mastery);
            for (const id of nowUnlocked) {
              if (
                !startSnapshot.current!.unlockedIds.has(id) &&
                !unlockedDuringSession.has(id)
              ) {
                setUnlockedDuringSession((s) => new Set(s).add(id));
                break;
              }
            }
          });
        }}
        onContinue={() => {
          lastCorrectRef.current = null;
          setIndex((i) => i + 1);
        }}
      />
    </SessionFrame>
  );
}

function SessionFrame({
  index,
  total,
  children,
}: {
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring-strong)] sm:p-5">
      <header className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--color-text-muted)]">
        <span>
          Question {Math.min(index + 1, total)} / {total}
        </span>
        <Link
          href="/counters"
          className="rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text-muted)] no-underline transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          Quit
        </Link>
      </header>
      <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-card-2)]">
        <div
          className="h-full rounded-[var(--radius-pill)] bg-[var(--color-accent)] transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
      {children}
    </div>
  );
}
