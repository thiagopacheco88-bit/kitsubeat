"use client";

import { useCallback, useEffect, useState } from "react";
import type { GrammarSessionQuestion } from "@/lib/types/lesson";
import type { FSRSRating } from "@/lib/fsrs/rating";
import {
  saveGrammarSessionResults,
  startGrammarSession,
  type GrammarAnswerRecord,
  type SaveGrammarSessionResult,
} from "@/app/actions/grammarSession";
import GrammarMcqCard from "./GrammarMcqCard";
import GrammarWriteCard from "./GrammarWriteCard";

interface Props {
  userId: string;
  songVersionId: string;
  songSlug: string;
  onExit: () => void;
}

type RunState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "playing"; questions: GrammarSessionQuestion[]; index: number; answers: GrammarAnswerRecord[]; sessionStart: number }
  | { kind: "saving" }
  | { kind: "done"; result: SaveGrammarSessionResult };

/**
 * Grammar Session host — loads the question list from the server, walks the
 * user through each card, collects answers + FSRS ratings, and posts the
 * session summary on completion.
 *
 * Rating policy:
 *   correct  → 3 (Good) for MCQ, 4 (Easy) for advanced write (production-flavored)
 *   wrong    → 1 (Again)
 *
 * This mirrors the vocab-session RATING_WEIGHTS conventions (production > recog).
 */
export default function GrammarSessionRunner({
  userId,
  songVersionId,
  songSlug,
  onExit,
}: Props) {
  const [state, setState] = useState<RunState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const questions = await startGrammarSession(userId, songVersionId, 10);
        if (cancelled) return;
        if (questions.length === 0) {
          setState({
            kind: "error",
            message:
              "No grammar exercises available yet. The song may not have been linked to the grammar system — run scripts/seed/12-backfill-grammar-rules.ts.",
          });
          return;
        }
        setState({
          kind: "playing",
          questions,
          index: 0,
          answers: [],
          sessionStart: Date.now(),
        });
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[GrammarSessionRunner] load failed:", err);
        setState({ kind: "error", message: "Couldn't start the grammar session. Try again?" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, songVersionId]);

  const persist = useCallback(
    async (finalAnswers: GrammarAnswerRecord[], sessionStart: number) => {
      setState({ kind: "saving" });
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const result = await saveGrammarSessionResults({
          userId,
          songVersionId,
          songSlug,
          answers: finalAnswers,
          durationMs: Date.now() - sessionStart,
          tz,
        });
        setState({ kind: "done", result });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[GrammarSessionRunner] save failed:", err);
        setState({
          kind: "error",
          message: "Couldn't save the session results. Your answers are lost — please retry.",
        });
      }
    },
    [userId, songVersionId, songSlug]
  );

  if (state.kind === "loading") {
    return (
      <div className="flex flex-col gap-3 py-8 animate-pulse">
        <div className="h-5 w-1/3 rounded bg-gray-800" />
        <div className="h-32 w-full rounded-lg bg-gray-800" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-4 py-6">
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.message}
        </p>
        <button
          onClick={onExit}
          className="self-start rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
        >
          Back
        </button>
      </div>
    );
  }

  if (state.kind === "saving") {
    return <div className="py-10 text-center text-gray-400">Saving…</div>;
  }

  if (state.kind === "done") {
    const r = state.result;
    return (
      <div className="flex flex-col gap-4 py-6">
        <h3 className="text-lg font-semibold text-white">Grammar session complete</h3>
        <p className="text-sm text-gray-300">
          Accuracy: {Math.round(r.accuracy * 100)}% · Best: {Math.round(r.grammarBestAccuracy * 100)}%
        </p>
        {r.stars > r.previousStars && (
          <p className="text-sm text-yellow-300">
            New star earned — {r.stars} / 3
          </p>
        )}
        {r.promotions.length > 0 && (
          <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 p-3 text-sm text-emerald-200">
            <div className="font-semibold">Rule mastery promoted:</div>
            <ul className="mt-1 list-disc pl-5">
              {r.promotions.map((p) => (
                <li key={p.ruleId}>
                  {p.from} → {p.to}
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.xpGained > 0 && (
          <p className="text-xs text-gray-400">+{r.xpGained} XP</p>
        )}
        <button
          onClick={onExit}
          className="self-start rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Done
        </button>
      </div>
    );
  }

  // Playing
  const { questions, index, answers, sessionStart } = state;
  const q = questions[index];

  const advance = () => {
    if (index + 1 >= questions.length) {
      persist(answers, sessionStart);
      return;
    }
    setState({ ...state, index: index + 1 });
  };

  const recordAnswer = (chosen: string, correct: boolean, timeMs: number) => {
    const baseRating: FSRSRating = correct
      ? q.level === "advanced"
        ? 4
        : 3
      : 1;
    const nextAnswer: GrammarAnswerRecord = {
      exerciseId: q.exercise.id,
      ruleId: q.rule.id,
      level: q.level,
      correct,
      rating: baseRating,
      timeMs,
    };
    void chosen; // kept for future analytics; unused in rating derivation
    setState({ ...state, answers: [...answers, nextAnswer] });
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Grammar · question {index + 1} of {questions.length}
        </span>
        <button
          onClick={onExit}
          className="underline hover:text-gray-300"
        >
          Return
        </button>
      </div>
      {q.level === "advanced" ? (
        <GrammarWriteCard
          key={q.exercise.id}
          question={q}
          onAnswered={recordAnswer}
          onContinue={advance}
        />
      ) : (
        <GrammarMcqCard
          key={q.exercise.id}
          question={q}
          onAnswered={recordAnswer}
          onContinue={advance}
        />
      )}
    </div>
  );
}
