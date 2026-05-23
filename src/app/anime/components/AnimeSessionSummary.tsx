"use client";

import type { AnimeCarouselSessionResult } from "@/app/actions/anime-carousel";

interface AnimeSessionSummaryProps {
  result: AnimeCarouselSessionResult;
  onBackToCarousel: () => void;
}

export default function AnimeSessionSummary({
  result,
  onBackToCarousel,
}: AnimeSessionSummaryProps) {
  const accuracy =
    result.totalCount > 0
      ? Math.round((result.correctCount / result.totalCount) * 100)
      : 0;

  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-6 py-12 text-center">
      <div className="text-5xl">
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

      <button
        onClick={onBackToCarousel}
        className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-accent-fg)] hover:opacity-90 transition-opacity"
      >
        Back to carousel
      </button>
    </div>
  );
}
