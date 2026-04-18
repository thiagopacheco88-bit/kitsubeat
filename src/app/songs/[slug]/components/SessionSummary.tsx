"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { saveSessionResults } from "@/app/actions/exercises";
import StarDisplay from "./StarDisplay";
import MasteryDetailPopover from "./MasteryDetailPopover";
import type { Question } from "@/lib/exercises/generator";
import type { AnswerRecord } from "@/stores/exerciseSession";

interface SessionSummaryProps {
  questions: Question[];
  answers: Record<string, AnswerRecord>;
  mode: "short" | "full";
  songSlug: string;
  songVersionId: string;
  // TODO: replace with Clerk userId from auth()
  userId: string;
  onRetry: () => void;
  onClose: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/**
 * SessionSummary — displayed after all questions are answered.
 *
 * 1. Computes stats from answers
 * 2. Calls saveSessionResults server action
 * 3. Shows accuracy, correct/total, time, stars
 * 4. Fires confetti if a new star is earned
 * 5. CTAs: Practice Again, Try Another Song, Dashboard
 */
export default function SessionSummary({
  questions,
  answers,
  mode,
  songSlug,
  songVersionId,
  userId,
  onRetry,
}: SessionSummaryProps) {
  const [saving, setSaving] = useState(true);
  const [stars, setStars] = useState<0 | 1 | 2 | 3>(0);
  const [previousStars, setPreviousStars] = useState<0 | 1 | 2 | 3>(0);
  // Phase 10 Plan 07 — bonus badge state pair so the summary can surface the
  // subtle "Bonus mastery unlocked!" callout on false → true transition.
  const [bonusBadge, setBonusBadge] = useState(false);
  const [previousBonusBadge, setPreviousBonusBadge] = useState(false);
  const [songMastery, setSongMastery] = useState<{
    total: number;
    mastered: number;
    learning: number;
    new: number;
  } | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [wordsExpanded, setWordsExpanded] = useState(false);

  // --- Compute stats ---
  const totalQuestions = questions.length;
  const answeredKeys = Object.keys(answers);
  const correctCount = answeredKeys.filter((id) => answers[id]?.correct).length;
  const accuracyPct =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const totalTimeMs = answeredKeys.reduce(
    (sum, id) => sum + (answers[id]?.timeMs ?? 0),
    0
  );

  // --- Save results on mount ---
  useEffect(() => {
    const save = async () => {
      try {
        const answerArray = questions
          .filter((q) => answers[q.id])
          .map((q) => ({
            questionId: q.id,
            type: q.type,
            // Phase 08.1-06: thread vocabItemId so saveSessionResults can
            // upsert user_vocab_mastery rows for FSRS scheduling.
            vocabItemId: q.vocabItemId,
            chosen: answers[q.id]!.chosen,
            correct: answers[q.id]!.correct,
            timeMs: answers[q.id]!.timeMs,
          }));

        const result = await saveSessionResults({
          userId,
          songVersionId,
          answers: answerArray,
          mode,
          durationMs: totalTimeMs,
        });

        setStars(result.stars as 0 | 1 | 2 | 3);
        setPreviousStars(result.previousStars as 0 | 1 | 2 | 3);
        setBonusBadge(result.bonusBadge);
        setPreviousBonusBadge(result.previousBonusBadge);
        setSongMastery(result.songMastery);
      } catch (err) {
        console.error("Failed to save session results:", err);
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    };

    void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // --- Accuracy color ---
  const accuracyColor =
    accuracyPct >= 80
      ? "text-green-400"
      : accuracyPct >= 60
        ? "text-yellow-400"
        : "text-red-400";

  const newStarEarned = !saving && stars > previousStars;
  // Phase 10 Plan 07 — bonus badge transition: false → true unlock. Subtle
  // one-line callout (NO confetti) per CONTEXT — stars remain the primary
  // signal; bonus badge is secondary.
  const bonusUnlocked = !saving && bonusBadge && !previousBonusBadge;
  // Star 3 earns the "song mastered!" wording; Stars 1/2 keep the original
  // "You earned Star N!" wording. Also covers the edge case where a user
  // skipped from Star 1 directly to Star 3 in a single session (same
  // condition — stars > previousStars, not stars - previousStars === 1).
  const masteredThisSession = newStarEarned && stars === 3;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <h2 className="text-xl font-bold text-white">Session Complete!</h2>

      {/* Accuracy display */}
      <div className="flex flex-col items-center gap-1">
        <span className={`text-6xl font-bold ${accuracyColor}`}>
          {accuracyPct}%
        </span>
        <span className="text-sm text-gray-400">accuracy</span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-8 text-sm text-gray-400">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xl font-semibold text-white">{correctCount}/{totalQuestions}</span>
          <span>correct</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xl font-semibold text-white">{formatTime(totalTimeMs)}</span>
          <span>time</span>
        </div>
      </div>

      {/* Song mastery breakdown — real coverage (new/learning/mastered of total),
          replaces the session-credit "progress" number which overstated closeness. */}
      {!saving && songMastery && songMastery.total > 0 && (() => {
        const { total, mastered, learning, new: newCount } = songMastery;
        const pct = (n: number) => (n / total) * 100;
        const masteredPct = Math.round(pct(mastered));
        return (
          <div className="w-full max-w-xs flex flex-col gap-1.5 text-left">
            <div className="flex items-baseline justify-between text-xs text-gray-400">
              <span>Song mastery</span>
              <span>
                <span className="font-semibold text-white">{masteredPct}%</span>
                {" "}mastered
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
              {mastered > 0 && (
                <div
                  className="bg-green-500"
                  style={{ width: `${pct(mastered)}%` }}
                  aria-label={`${mastered} mastered`}
                />
              )}
              {learning > 0 && (
                <div
                  className="bg-yellow-500"
                  style={{ width: `${pct(learning)}%` }}
                  aria-label={`${learning} learning`}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {mastered} mastered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                {learning} learning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                {newCount} new
              </span>
              <span className="text-gray-500">/ {total}</span>
            </div>
          </div>
        );
      })()}

      {/* Words reviewed disclosure list with mastery popovers */}
      {(() => {
        const reviewedWords = questions.filter((q) => q.vocabItemId && answers[q.id]);
        // Deduplicate by vocabItemId to show each word once
        const seen = new Set<string>();
        const uniqueWords = reviewedWords.filter((q) => {
          if (seen.has(q.vocabItemId)) return false;
          seen.add(q.vocabItemId);
          return true;
        });
        if (uniqueWords.length === 0) return null;
        return (
          <div className="w-full max-w-xs text-left">
            <button
              type="button"
              onClick={() => setWordsExpanded((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              <span>Words reviewed ({uniqueWords.length})</span>
              <span className="text-gray-500">{wordsExpanded ? "▲" : "▼"}</span>
            </button>
            {wordsExpanded && (
              <ul className="mt-1 rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-2 text-sm text-gray-200 flex flex-col gap-1.5">
                {uniqueWords.map((q) => (
                  <li key={q.vocabItemId} className="flex items-center gap-2">
                    <MasteryDetailPopover
                      vocabItemId={q.vocabItemId}
                      userId={userId}
                      trigger={
                        <span className="font-medium text-white">
                          {q.vocabInfo.surface}
                        </span>
                      }
                    />
                    <span className="text-gray-500 text-xs">
                      {q.vocabInfo.reading !== q.vocabInfo.surface
                        ? q.vocabInfo.reading
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      {/* Stars */}
      {!saving && (
        <div className="flex flex-col items-center gap-2">
          <StarDisplay stars={stars} animate={newStarEarned} />
          {newStarEarned && (
            <p className="text-sm font-semibold text-yellow-400 animate-pulse">
              {masteredThisSession
                ? "You earned 3 stars — song mastered!"
                : `You earned Star ${stars}!`}
            </p>
          )}
          {/* Phase 10 Plan 07 — subtle bonus mastery unlock callout.
              Deliberately plain text (no animation, no confetti) so the
              stars remain the primary signal. CONTEXT-locked. */}
          {bonusUnlocked && (
            <p className="text-xs font-medium text-amber-300">
              Bonus mastery unlocked!
            </p>
          )}
        </div>
      )}
      {saving && (
        <div className="h-8 w-24 animate-pulse rounded bg-gray-800" />
      )}

      {saveError && (
        <p className="text-xs text-gray-500">
          Progress could not be saved this time.
        </p>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="w-full rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Practice Again
        </button>
        <Link
          href="/songs"
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 text-center"
        >
          Try Another Song
        </Link>
        <Link
          href="/"
          className="text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
