"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useVerbProgress } from "@/stores/verbProgress";
import { VERB_CHART } from "@/lib/verbs/chart";
import { computeUnlockedVerbCount } from "@/lib/verbs/mastery";
import { buildVerbSession, type VerbQuestion } from "@/lib/verbs/selection";
import { FORM_GROUPS } from "@/lib/verbs/types";
import type { ConjFormId } from "@/lib/verbs/types";
import { VerbQuestionCard } from "./VerbQuestionCard";

interface Props {
  formGroupId: string;
}

const SESSION_LENGTH = 20;

export function VerbSession({ formGroupId }: Props) {
  const hasHydrated = useVerbProgress((s) => s._hasHydrated);
  const mastery = useVerbProgress((s) => s.mastery);
  const showRomaji = useVerbProgress((s) => s.showRomaji);
  const toggleRomaji = useVerbProgress((s) => s.toggleRomaji);
  const applyAnswer = useVerbProgress((s) => s.applyAnswer);
  const incrementSessions = useVerbProgress((s) => s.incrementSessionsCompleted);

  const group = FORM_GROUPS.find((g) => g.id === formGroupId) ?? FORM_GROUPS[0];

  // Snapshot mastery at session start — pool is fixed for the 20 questions.
  const startMastery = useRef<typeof mastery | null>(null);
  if (hasHydrated && startMastery.current === null) {
    startMastery.current = { ...mastery };
  }

  const session = useMemo<VerbQuestion[]>(() => {
    if (!hasHydrated || !startMastery.current) return [];
    const verbIds = VERB_CHART.map((v) => v.id);
    const unlockedCount = computeUnlockedVerbCount(startMastery.current, verbIds);
    const unlockedVerbs = VERB_CHART.slice(0, unlockedCount);
    return buildVerbSession({
      verbs: unlockedVerbs,
      forms: group.forms as ConjFormId[],
      mastery: startMastery.current,
      questionCount: SESSION_LENGTH,
    });
  }, [hasHydrated, group.forms]);

  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const lastCorrectRef = useRef<boolean | null>(null);

  if (!hasHydrated) {
    return <div className="h-80 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />;
  }

  if (session.length === 0) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card-ring)]">
        No questions available.{" "}
        <Link className="font-semibold text-[var(--color-text)] underline" href="/verbs">
          Back to verbs
        </Link>
      </div>
    );
  }

  if (index >= SESSION_LENGTH) {
    incrementSessions();
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-[var(--shadow-card-ring-strong)]">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Session complete</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {correctCount} / {SESSION_LENGTH} correct
        </p>
        <div className="flex gap-2">
          <Link
            href="/verbs/session"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90"
          >
            Practice again
          </Link>
          <Link
            href="/verbs"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-5 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            Back to verbs
          </Link>
        </div>
      </div>
    );
  }

  const q = session[index];

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring-strong)] sm:p-5">
      {/* Header: progress + quit + romaji toggle */}
      <header className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--color-text-muted)]">
        <span>Question {Math.min(index + 1, SESSION_LENGTH)} / {SESSION_LENGTH}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleRomaji}
            title={showRomaji ? "Hide romaji" : "Show romaji"}
            className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs transition-colors ${
              showRomaji
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            Romaji {showRomaji ? "on" : "off"}
          </button>
          <Link
            href="/verbs"
            className="rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text-muted)] no-underline transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            Quit
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-card-2)]">
        <div
          className="h-full rounded-[var(--radius-pill)] bg-[var(--color-accent)] transition-all"
          style={{ width: `${(index / SESSION_LENGTH) * 100}%` }}
        />
      </div>

      <VerbQuestionCard
        questionKey={`${index}-${q.verbId}-${q.formId}`}
        dict={q.dict}
        reading={q.reading}
        romaji={q.romaji}
        meaning={q.meaning}
        verbClass={q.verbClass}
        formLabel={q.formLabel}
        sentenceJpPre={q.sentenceJpPre}
        sentenceJpPost={q.sentenceJpPost}
        sentenceEn={q.sentenceEn}
        correct={q.correct}
        distractors={q.distractors}
        showRomaji={showRomaji}
        onAnswer={(correct) => {
          lastCorrectRef.current = correct;
          applyAnswer(q.verbId, q.formId, correct);
          if (correct) setCorrectCount((c) => c + 1);
        }}
        onContinue={() => {
          lastCorrectRef.current = null;
          setIndex((i) => i + 1);
        }}
      />
    </div>
  );
}
