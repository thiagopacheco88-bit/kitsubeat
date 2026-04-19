"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { saveSessionResults } from "@/app/actions/exercises";
import StarDisplay from "./StarDisplay";
import MasteryDetailPopover from "./MasteryDetailPopover";
import type { Question } from "@/lib/exercises/generator";
import type { AnswerRecord } from "@/stores/exerciseSession";
import { xpWithinCurrentLevel } from "@/lib/gamification/level-curve";

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
  /**
   * IANA timezone from Intl.DateTimeFormat().resolvedOptions().timeZone.
   * Read ONCE in ExerciseSession on mount and threaded here to avoid calling
   * Intl inside the async save() callback (no-op difference but cleaner).
   * Falls back to 'UTC' if not provided.
   */
  tz?: string;
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
  tz,
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
  // Phase 12 Plan 04 — gamification state
  const [xpGained, setXpGained] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [previousLevel, setPreviousLevel] = useState(1);
  const [leveledUp, setLeveledUp] = useState(false);
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [graceApplied, setGraceApplied] = useState(false);
  const [milestoneXp, setMilestoneXp] = useState(0);
  const [rewardSlotPreview, setRewardSlotPreview] = useState<{
    id: string;
    label: string;
    level_threshold: number;
  } | null>(null);
  const [pathAdvancedTo, setPathAdvancedTo] = useState<string | null>(null);

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
          songSlug,
          answers: answerArray,
          mode,
          durationMs: totalTimeMs,
          tz: tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        setStars(result.stars as 0 | 1 | 2 | 3);
        setPreviousStars(result.previousStars as 0 | 1 | 2 | 3);
        setBonusBadge(result.bonusBadge);
        setPreviousBonusBadge(result.previousBonusBadge);
        setSongMastery(result.songMastery);
        // Phase 12 Plan 04 — store gamification fields
        setXpGained(result.xpGained);
        setXpTotal(result.xpTotal);
        setCurrentLevel(result.currentLevel);
        setPreviousLevel(result.previousLevel);
        setLeveledUp(result.leveledUp);
        setStreakCurrent(result.streakCurrent);
        setGraceApplied(result.graceApplied);
        setMilestoneXp(result.milestoneXp);
        setRewardSlotPreview(result.rewardSlotPreview);
        setPathAdvancedTo(result.pathAdvancedTo);
        // Level-up console signal for Plan 06 overlay wiring
        if (result.leveledUp) {
          // eslint-disable-next-line no-console
          console.info("[gamification] level up to", result.currentLevel);
        }
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

      {/* Phase 12 Plan 04 — Gamification summary rows */}
      {!saving && xpGained > 0 && (
        <div
          className="w-full max-w-xs flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/80 px-4 py-3"
          data-level-up={leveledUp ? currentLevel : ""}
        >
          {/* XP gained row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">XP earned</span>
            <span className="font-semibold text-yellow-400">+{xpGained} XP</span>
          </div>
          {milestoneXp > 0 && (
            <p className="text-xs text-yellow-300">
              +{milestoneXp} streak milestone bonus!
            </p>
          )}

          {/* Streak flame */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Streak</span>
            <span className="font-semibold text-orange-400">
              {"\uD83D\uDD25"} {streakCurrent} day{streakCurrent === 1 ? "" : "s"}
            </span>
          </div>
          {graceApplied && (
            <p className="text-xs text-sky-300">
              Phew &mdash; your streak survived today 🎐
            </p>
          )}

          {/* Level progress bar */}
          {(() => {
            const { xpInLevel, xpToNext } = xpWithinCurrentLevel(xpTotal);
            const pct = xpToNext > 0 ? Math.round((xpInLevel / xpToNext) * 100) : 100;
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Level {currentLevel}</span>
                  <span>
                    {xpInLevel} / {xpToNext} XP to Level {currentLevel + 1}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${pct}%` }}
                    aria-label={`${pct}% progress to Level ${currentLevel + 1}`}
                  />
                </div>
              </div>
            );
          })()}

          {/* Next reward slot preview — M4: render NOTHING if null */}
          {rewardSlotPreview !== null && (
            <div className="mt-1 flex flex-col gap-0.5 border-t border-gray-700 pt-2">
              <p className="text-xs text-gray-500">
                Next reward at Level {rewardSlotPreview.level_threshold}
              </p>
              <p className="text-xs font-medium text-gray-300">
                {rewardSlotPreview.label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="w-full rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Practice Again
        </button>
        {/* Continue Path — shown when path advanced this session */}
        {pathAdvancedTo !== null && (
          <Link
            href="/path"
            className="w-full rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 text-center"
          >
            Continue Path
          </Link>
        )}
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
