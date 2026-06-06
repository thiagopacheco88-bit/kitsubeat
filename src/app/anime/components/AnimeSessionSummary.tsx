"use client";

import type { AnimeCarouselSessionResult } from "@/app/actions/anime-carousel";
import type { WordResult } from "./AnimeCarouselExerciseSession";

interface AnimeSessionSummaryProps {
  result: AnimeCarouselSessionResult;
  wordResults?: WordResult[];
  onBackToCarousel: () => void;
}

export default function AnimeSessionSummary({
  result,
  wordResults = [],
  onBackToCarousel,
}: AnimeSessionSummaryProps) {
  const accuracy =
    result.totalCount > 0
      ? Math.round((result.correctCount / result.totalCount) * 100)
      : 0;

  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-6 py-12 text-center">
      <div className="session-emoji-pop text-5xl">
        {accuracy >= 80 ? "🎯" : accuracy >= 50 ? "📚" : "💪"}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Session complete!</h2>
        <p className="text-[var(--color-text-muted)]">
          {result.correctCount} / {result.totalCount} correct
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-[var(--color-accent)]">{accuracy}%</span>
          <span className="text-xs text-[var(--color-text-muted)]">Accuracy</span>
        </div>
        <div className="w-px bg-[var(--color-border)]" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-[var(--color-accent)]">+{result.xpGained}</span>
          <span className="text-xs text-[var(--color-text-muted)]">XP gained</span>
        </div>
        <div className="w-px bg-[var(--color-border)]" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-[var(--color-accent)]">{result.streakDays}</span>
          <span className="text-xs text-[var(--color-text-muted)]">Day streak</span>
        </div>
      </div>

      {wordResults.length > 0 && (
        <div className="w-full text-left">
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">Words this session</h3>
          <div className="flex flex-wrap gap-2">
            {wordResults.map((w, i) => (
              <span
                key={i}
                className={`inline-flex flex-col items-center rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs ${
                  w.correct
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-[var(--color-jlpt-n1-ring)] bg-[var(--color-jlpt-n1-bg)]"
                }`}
              >
                <span className={`font-bold text-sm ${w.correct ? "text-[var(--color-text)]" : "text-[var(--color-jlpt-n1)]"}`}>
                  {w.surface}
                </span>
                <span className="text-[var(--color-text-muted)]">{w.romaji}</span>
                {!w.correct && w.meaning && (
                  <span className="mt-0.5 text-[10px] text-[var(--color-text-muted)] italic">{w.meaning}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onBackToCarousel}
        className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-accent-fg)] hover:opacity-90 transition-opacity"
      >
        Back to carousel
      </button>
    </div>
  );
}
