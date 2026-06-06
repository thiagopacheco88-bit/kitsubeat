"use client";

/* eslint-disable react-hooks/refs */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useKanaProgress } from "@/stores/kanaProgress";
import {
  HIRAGANA_ROWS,
  KATAKANA_ROWS,
  KANA_CHART,
} from "@/lib/kana/chart";
import { computeUnlockedRows } from "@/lib/kana/mastery";
import {
  buildDistractors,
  buildKanaSession,
  type EligibleChar,
} from "@/lib/kana/selection";
import type { KanaMode, Script } from "@/lib/kana/types";
import { KanaQuestionCard } from "./KanaQuestionCard";
import { KanaLearnCard } from "./KanaLearnCard";
import { RowUnlockModal } from "./RowUnlockModal";

interface Props {
  mode: KanaMode;
}

interface AnswerLog {
  script: Script;
  kana: string;
  correct: boolean;
  starsBefore: number;
  starsAfter: number;
}

const SESSION_LENGTH = 20;

export function KanaSession({ mode }: Props) {
  const hasHydrated = useKanaProgress((s) => s._hasHydrated);
  const hiragana = useKanaProgress((s) => s.hiragana);
  const katakana = useKanaProgress((s) => s.katakana);
  const applyAnswer = useKanaProgress((s) => s.applyAnswer);
  const setStars = useKanaProgress((s) => s.setStars);

  // Snapshot mastery + unlocks at session START — the session pool is fixed for these 20 questions
  // even if mid-session unlocks open new rows. (Mid-session new rows trigger the modal but do NOT
  // change the current pool — that would be confusing. New rows show up in the NEXT session.)
  const startSnapshot = useRef<{
    hiragana: Record<string, number>;
    katakana: Record<string, number>;
    unlocked: { hiragana: Set<string>; katakana: Set<string> };
  } | null>(null);
  if (hasHydrated && startSnapshot.current === null) {
    startSnapshot.current = {
      hiragana: { ...hiragana },
      katakana: { ...katakana },
      unlocked: {
        hiragana: computeUnlockedRows(HIRAGANA_ROWS, hiragana, "hiragana"),
        katakana: computeUnlockedRows(KATAKANA_ROWS, katakana, "katakana"),
      },
    };
  }

  const session = useMemo<EligibleChar[]>(() => {
    if (!hasHydrated || !startSnapshot.current) return [];
    return buildKanaSession({
      script: mode,
      mastery: startSnapshot.current,
      unlockedRows: startSnapshot.current.unlocked,
      chart: KANA_CHART,
      questionCount: SESSION_LENGTH,
    });
  }, [hasHydrated, mode]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"question" | "feedback" | "miss-relearn">(
    "question",
  );
  const [unlockedDuringSession, setUnlockedDuringSession] = useState<
    Set<string>
  >(new Set());
  const [pendingUnlock, setPendingUnlock] = useState<string | null>(null); // rowId
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  // Latched by onAnswer so the auto-fired onContinue can branch correct vs wrong
  // without re-reading the log.
  const lastCorrectRef = useRef<boolean | null>(null);

  // Persist answer log to sessionStorage when the session completes (Plan 09-06 reads it).
  // Done in an effect (NOT inline during render) to avoid React StrictMode double-write warnings.
  useEffect(() => {
    if (index >= SESSION_LENGTH && typeof window !== "undefined") {
      sessionStorage.setItem(
        "kitsubeat-kana-last-session",
        JSON.stringify({
          mode,
          log: answerLog,
          unlocked: [...unlockedDuringSession],
        }),
      );
    }
  }, [index, mode, answerLog, unlockedDuringSession]);

  if (!hasHydrated) {
    return (
      <div className="h-80 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
    );
  }

  if (session.length === 0) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card-ring)]">
        No unlocked rows for this mode.{" "}
        <Link className="font-semibold text-[var(--color-text)] underline" href="/kana">
          Back to grid
        </Link>
        .
      </div>
    );
  }

  // Session complete — defer summary rendering to Plan 09-06. For now, redirect-style placeholder
  // that Plan 06 will replace. The answerLog has already been written to sessionStorage by the
  // effect above so the summary screen can read it.
  if (index >= SESSION_LENGTH) {
    const correct = answerLog.filter((a) => a.correct).length;
    const accuracy = Math.round((correct / SESSION_LENGTH) * 100);
    const starsGained = answerLog.reduce((sum, a) => sum + Math.max(0, a.starsAfter - a.starsBefore), 0);
    return (
      <div className="flex flex-col items-center gap-5 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-[var(--shadow-card-ring-strong)]">
        <div className="session-emoji-pop text-5xl">
          {accuracy >= 80 ? "🎯" : accuracy >= 50 ? "📚" : "💪"}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Session complete!</h2>
          <p className="text-[var(--color-text-muted)]">
            {correct} / {SESSION_LENGTH} correct · {accuracy}%
          </p>
          {starsGained > 0 && (
            <p className="text-sm font-semibold text-[var(--color-jlpt-n5)]">
              ★ +{starsGained} stars earned
            </p>
          )}
        </div>
        <Link
          href="/kana/session/summary"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90"
        >
          See summary →
        </Link>
      </div>
    );
  }

  const current = session[index];
  const script = current.script;
  const glyph =
    script === "hiragana" ? current.char.hiragana : current.char.katakana;
  const correctStarsBefore =
    (script === "hiragana" ? hiragana : katakana)[glyph] ?? 0;

  // Post-miss relearn: re-teach the just-missed kana before advancing.
  if (phase === "miss-relearn") {
    return (
      <SessionFrame index={index} total={SESSION_LENGTH}>
        <KanaLearnCard
          kana={glyph}
          romaji={current.char.romaji}
          label="Missed — review"
          onGotIt={() => {
            setPhase("question");
            setIndex((i) => i + 1);
          }}
        />
        {pendingUnlock && (
          <RowUnlockModal
            rowLabel={labelForRow(script, pendingUnlock)}
            onClose={() => setPendingUnlock(null)}
          />
        )}
      </SessionFrame>
    );
  }

  // 0-star → KanaLearnCard variant.
  if (correctStarsBefore === 0 && phase === "question") {
    return (
      <SessionFrame index={index} total={SESSION_LENGTH}>
        <KanaLearnCard
          kana={glyph}
          romaji={current.char.romaji}
          onGotIt={() => {
            setStars(script, glyph, 1);
            setAnswerLog((log) => [
              ...log,
              {
                script,
                kana: glyph,
                correct: true,
                starsBefore: 0,
                starsAfter: 1,
              },
            ]);
            setIndex((i) => i + 1);
          }}
        />
        {pendingUnlock && (
          <RowUnlockModal
            rowLabel={labelForRow(script, pendingUnlock)}
            onClose={() => setPendingUnlock(null)}
          />
        )}
      </SessionFrame>
    );
  }

  // Standard 4-option question.
  const distractors = buildDistractors({
    correctRomaji: current.char.romaji,
    script,
    unlockedRows:
      script === "hiragana"
        ? startSnapshot.current!.unlocked.hiragana
        : startSnapshot.current!.unlocked.katakana,
    chart: KANA_CHART,
    count: 3,
  });

  return (
    <SessionFrame index={index} total={SESSION_LENGTH}>
      <KanaQuestionCard
        questionKey={`${index}-${glyph}`}
        kana={glyph}
        correctRomaji={current.char.romaji}
        distractors={distractors}
        onAnswer={(correct) => {
          lastCorrectRef.current = correct;
          applyAnswer(script, glyph, correct);
          const after = correct
            ? Math.min(10, correctStarsBefore + 1)
            : Math.max(0, correctStarsBefore - 2);
          setAnswerLog((log) => [
            ...log,
            {
              script,
              kana: glyph,
              correct,
              starsBefore: correctStarsBefore,
              starsAfter: after,
            },
          ]);
          // Detect a row unlock against the START snapshot's unlocked set vs current store mastery.
          // We diff after the store has applied the delta; use a microtask to read the latest state.
          queueMicrotask(() => {
            const latest = useKanaProgress.getState();
            const rows =
              script === "hiragana" ? HIRAGANA_ROWS : KATAKANA_ROWS;
            const startedUnlocked =
              script === "hiragana"
                ? startSnapshot.current!.unlocked.hiragana
                : startSnapshot.current!.unlocked.katakana;
            const nowUnlocked = computeUnlockedRows(
              rows,
              script === "hiragana" ? latest.hiragana : latest.katakana,
              script,
            );
            for (const id of nowUnlocked) {
              if (
                !startedUnlocked.has(id) &&
                !unlockedDuringSession.has(id)
              ) {
                setUnlockedDuringSession((s) => new Set(s).add(id));
                setPendingUnlock(id);
                break; // one modal per question; rare to unlock multiple at once
              }
            }
          });
          setPhase("feedback");
        }}
        onContinue={() => {
          if (lastCorrectRef.current === false) {
            // Miss: re-teach the just-missed kana before moving on.
            setPhase("miss-relearn");
          } else {
            setPhase("question");
            setIndex((i) => i + 1);
          }
          lastCorrectRef.current = null;
        }}
      />
      {pendingUnlock && (
        <RowUnlockModal
          rowLabel={labelForRow(script, pendingUnlock)}
          onClose={() => setPendingUnlock(null)}
        />
      )}
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
          href="/kana"
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

function labelForRow(script: Script, rowId: string): string {
  const rows = script === "hiragana" ? HIRAGANA_ROWS : KATAKANA_ROWS;
  return rows.find((r) => r.id === rowId)?.label ?? rowId;
}
