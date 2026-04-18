"use client";
import { useEffect, useRef, useState } from "react";
import { useExerciseSession } from "@/stores/exerciseSession";

interface Props {
  songId: string;
  initial: { total: number; known: number; mastered: number; learning: number };
}

export default function KnownWordCount({ songId, initial }: Props) {
  const [counts, setCounts] = useState(initial);
  const questions = useExerciseSession((s) => s.questions);
  const currentIndex = useExerciseSession((s) => s.currentIndex);
  const lastFetchedKey = useRef<string>("");

  // Detect "session just finished": store has questions loaded AND currentIndex passed the last one.
  const justFinished =
    questions.length > 0 && currentIndex >= questions.length;

  useEffect(() => {
    if (!justFinished) return;
    // Avoid duplicate fetches for the same finished session.
    const key = `${questions.length}-${currentIndex}`;
    if (lastFetchedKey.current === key) return;
    lastFetchedKey.current = key;

    let cancelled = false;
    fetch(`/api/review/known-count?songId=${encodeURIComponent(songId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCounts(data);
      })
      .catch(() => {
        /* keep last-known counts; no user-facing error for a background refresh */
      });
    return () => {
      cancelled = true;
    };
  }, [justFinished, songId, questions.length, currentIndex]);

  // Zero state per CONTEXT decision: "New to you" pill, not "0/12".
  if (counts.total === 0 || counts.known === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1 text-xs font-medium text-gray-300">
        New to you
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full border border-green-700/40 bg-green-900/20 px-3 py-1 text-xs font-medium text-green-300"
      aria-label={`You know ${counts.known} of ${counts.total} words in this song`}
    >
      You know {counts.known}/{counts.total} words
    </span>
  );
}
