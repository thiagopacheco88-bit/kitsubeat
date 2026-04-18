"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/exercises/generator";
import type { Token } from "@/lib/types/lesson";
import { useExerciseSession } from "@/stores/exerciseSession";
import { recordVocabAnswer } from "@/app/actions/exercises";
import { usePlayer } from "./PlayerContext";
import FeedbackPanel from "./FeedbackPanel";

/**
 * Phase 10 Plan 04 — Fill-the-Lyric Listening Drill (Exercise 6, drives Star 3).
 *
 * CONTEXT-locked behavior:
 *   - Full verse plays at normal speed via the YouTube iframe (no audio
 *     extraction, legal compliance).
 *   - Lyrics are visible with the target token surface AND its romaji blanked
 *     (Pitfall 8 — romaji leak prevention).
 *   - Replay is unlimited and carries NO FSRS penalty (telemetry tracked
 *     in useExerciseSession.listeningReplays for future UX tuning).
 *   - When embedState === "error" (watchdog-expired or explicit iframe
 *     failure), the card renders a CONTEXT-locked fallback message and
 *     nothing else — no option buttons, no Replay, no Skip. Star 3 is
 *     intentionally unreachable until the video works; the drill is a
 *     dead-end UI state on that song, NOT a skippable question.
 *   - No silent substitution of fill_lyric — the fallback is a hard gate.
 *
 * Player wiring goes through usePlayer() (Plan 10-02 PlayerContext imperative
 * API). The raw YT.Player reference stays scoped inside YouTubeEmbed; this
 * card never touches window.__kbPlayer (test-only instrumentation).
 */

// The CONTEXT-locked fallback copy. Kept in sync with the Phase 08.1-07
// regression spec — any change to this string must be mirrored in the spec.
const LOCKED_FALLBACK_COPY =
  "Listening Drill unavailable for this song (video not playable). Star 3 is unreachable until the video works.";

interface ListeningDrillCardProps {
  question: Question;
  /** Token list for the verse — used to render the blanked verse text. */
  verseTokens: Token[];
  /** Called when user selects an answer (before continue). */
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  /** Called when user clicks Continue in the feedback panel. */
  onContinue: () => void;
  /** Authenticated user ID — used for FSRS answer recording. */
  userId: string;
  /** Song version UUID — used for FSRS answer recording. */
  songVersionId: string;
}

/** Fisher-Yates shuffle (unbiased). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ListeningDrillCard({
  question,
  verseTokens,
  onAnswered,
  onContinue,
  userId,
  songVersionId,
}: ListeningDrillCardProps) {
  const { seekTo, play, isReady, embedState } = usePlayer();

  const [chosen, setChosen] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  const incrementListeningReplay = useExerciseSession(
    (s) => s.incrementListeningReplay
  );
  const setTier = useExerciseSession((s) => s.setTier);

  // Stable shuffle of options per question.id — 4 vocab surfaces (correct +
  // 3 distractors), matching fill_lyric's option pattern.
  const options = useMemo(
    () => shuffle([question.correctAnswer, ...question.distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  );

  // --- Auto-play the verse on mount + when the question changes ---
  //
  // Guards: only call seekTo/play when both embedState === "ready" AND the
  // imperative API has been registered (isReady). If the embed is still
  // "loading" when we mount, the effect retriggers via isReady/embedState
  // dependencies once the iframe is live.
  const verseStartMs = question.verseStartMs ?? 0;
  useEffect(() => {
    if (chosen !== null) return; // don't interrupt user reading feedback
    if (embedState !== "ready") return;
    if (!isReady) return;
    seekTo(verseStartMs);
    play();
    // We intentionally re-fire when question.id changes so the next drill
    // question re-seeks to its own verse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, embedState, isReady]);

  // Replay button: user-triggered seek+play. Each click increments the
  // telemetry counter — NOT fed to FSRS (CONTEXT: unlimited replays, no
  // penalty). The PlayerContext's 400ms debounce (Plan 10-02 seekAndPlay)
  // would dedupe rapid clicks, but we use discrete seekTo+play here so the
  // user perceives each tap as responsive.
  const handleReplay = () => {
    if (!isReady) return;
    incrementListeningReplay(question.id);
    seekTo(verseStartMs);
    play();
  };

  // Scroll feedback panel into view once answered.
  useEffect(() => {
    if (chosen !== null) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chosen]);

  // ---------------------------------------------------------------------------
  // Fallback path: render the CONTEXT-locked message ONLY.
  //
  // NO option buttons, NO Replay, NO Skip/Next, NO onAnswer/onSkip calls.
  // The user exits the Practice tab manually. Star 3 is intentionally
  // unreachable on this song until the YouTube iframe starts working.
  // ---------------------------------------------------------------------------
  if (embedState === "error") {
    return (
      <div
        data-question-id={question.id}
        data-question-type="listening_drill"
        data-yt-state="error"
        className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center"
      >
        <p className="text-sm font-medium text-red-200">
          {LOCKED_FALLBACK_COPY}
        </p>
      </div>
    );
  }

  const handleSelect = (option: string) => {
    if (chosen !== null) return;
    const timeMs = Date.now() - startTimeRef.current;
    const correct = option === question.correctAnswer;
    setChosen(option);
    setIsCorrect(correct);
    onAnswered(option, correct, timeMs);

    // Fire-and-await FSRS persistence. Same shape as QuestionCard.
    void (async () => {
      try {
        const result = await recordVocabAnswer({
          userId,
          vocabItemId: question.vocabItemId,
          songVersionId,
          exerciseType: question.type,
          correct,
          revealedReading: false,
          responseTimeMs: timeMs,
        });
        setTier(question.vocabItemId, result.newTier);
      } catch (err) {
        console.error("recordVocabAnswer failed (listening_drill):", err);
      }
    })();
  };

  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      return "border-gray-600 bg-gray-800 text-white hover:border-gray-400 hover:bg-gray-700";
    }
    if (option === question.correctAnswer) {
      return "border-green-500 bg-green-500/10 text-white";
    }
    if (option === chosen && !isCorrect) {
      return "border-red-500 bg-red-500/10 text-white";
    }
    return "border-gray-700 bg-gray-800/50 text-gray-500";
  };

  // Render the verse text with the target token's surface AND its romaji
  // blanked. Every OTHER token renders its surface + (if romaji toggle is on,
  // which is owned by PlayerContext globally) its romaji. Here the Listening
  // Drill UI is self-contained — we always show a condensed form: just the
  // surface string per token, blanking the target to keep the signal clean
  // (the card header tells the user what to do; the 4 options are the pool
  // of possible fill-ins). This deliberately avoids leaking the romaji of
  // the blanked token (RESEARCH Pitfall 8).
  const renderBlankedVerse = () => {
    return (
      <span className="flex flex-wrap gap-1 text-xl font-bold leading-snug text-white">
        {verseTokens.map((t, idx) => {
          const blanked = t.surface === question.correctAnswer;
          return (
            <span
              key={`${question.id}-token-${idx}`}
              data-blanked={blanked ? "true" : undefined}
            >
              {blanked ? "_____" : t.surface}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div
      data-question-id={question.id}
      data-question-type="listening_drill"
      className="flex flex-col gap-4"
    >
      <p className="text-xs uppercase tracking-wider text-gray-500">
        listening drill
      </p>

      <p className="text-sm text-gray-400">
        Listen to the verse and choose the missing word.
      </p>

      {/* Blanked verse display — target surface shown as _____ */}
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        {renderBlankedVerse()}
      </div>

      {/* Replay button — unlimited clicks, no FSRS penalty. Disabled until
          the PlayerContext API is registered so spam clicks don't throw. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleReplay}
          disabled={!isReady}
          aria-label="Replay verse"
          className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:border-gray-400 hover:bg-gray-700 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-900 disabled:text-gray-500"
        >
          Replay
        </button>
        {embedState === "loading" && (
          <span className="text-xs text-gray-500">Loading player…</span>
        )}
      </div>

      {/* Answer options — same 2x2 grid as QuestionCard */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={chosen !== null}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${getOptionStyle(
              option
            )}`}
          >
            {option}
          </button>
        ))}
      </div>

      {chosen !== null && (
        <div ref={feedbackRef} className="scroll-mb-4">
          <FeedbackPanel
            question={question}
            chosenAnswer={chosen}
            isCorrect={isCorrect}
            onContinue={onContinue}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}
