/**
 * HeroProgress — Phase 14.1 SPEC-REQ-4.
 *
 * Second half of the /path top chrome. Replaces the level/XP/streak/avatar
 * cluster from the deleted PathHud (CONTEXT D-06). Streak now lives in
 * <PathHeader> via <LanternStreak>; avatar is dropped (D-08); personal best
 * streak is dropped (D-07); next-reward chip moves here as third row (D-09).
 *
 * Two-column layout per demo:
 *   Left  : "Level" label + 28px tnum numeric level
 *   Right : "Now Learning" label + current song title (Noto Sans JP)
 * Below : XP progress bar with red accent fill + soft red glow
 * Below : Optional next-reward chip
 *
 * Server component — no client interactivity; pure render of server-fetched
 * gamification state.
 */
import { xpWithinCurrentLevel } from "@/lib/gamification/level-curve";
import type { GamificationState } from "@/lib/db/queries";

export interface HeroProgressProps {
  state: GamificationState;
  /**
   * Display title of the user's current path node (current_path_node_slug
   * resolved against the songs list). null when current_path_node_slug is null
   * (StarterPick branch — HeroProgress should still render but omit the
   * "Now Learning" callout).
   */
  currentSongTitle: string | null;
  /**
   * Next reward preview computed by getNextRewardPreview() in page.tsx.
   * null when user is at max level or has no upcoming reward.
   */
  nextReward: {
    id: string;
    label: string;
    level_threshold: number;
  } | null;
}

export function HeroProgress({
  state,
  currentSongTitle,
  nextReward,
}: HeroProgressProps) {
  const { xpInLevel, xpToNext } = xpWithinCurrentLevel(state.xp_total);

  return (
    <section
      data-testid="hero-progress"
      className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex flex-col gap-4 mb-6 shadow-[var(--shadow-hero-glow)]"
      aria-label="Your progress"
    >
      {/* Two-column row: Level | Now Learning */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Level
          </div>
          <div
            className="font-bold tabular-nums text-[var(--color-text)] leading-none mt-1"
            style={{ fontSize: "28px" }}
          >
            {state.level}
          </div>
        </div>
        {currentSongTitle && (
          <div className="min-w-0 text-right">
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Now Learning
            </div>
            <div
              className="text-sm font-semibold text-[var(--color-text)] truncate mt-1"
              style={{ fontFamily: "var(--font-jp)" }}
              data-testid="now-learning-title"
            >
              {currentSongTitle}
            </div>
          </div>
        )}
      </div>

      {/* XP bar — same recipe as PathHud's <progress>: card-2 track, accent value */}
      <div className="space-y-1">
        <progress
          value={xpInLevel}
          max={xpToNext}
          aria-label={`XP progress: ${xpInLevel} of ${xpToNext}`}
          className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[var(--color-card-2)] [&::-webkit-progress-value]:bg-[var(--color-accent)] [&::-moz-progress-bar]:bg-[var(--color-accent)]"
        />
        <div className="text-xs text-[var(--color-text-muted)]">
          {xpInLevel} / {xpToNext} XP to Level {state.level + 1}
        </div>
      </div>

      {/* Next-reward chip — third row per D-09. Only when non-null. */}
      {nextReward !== null && (
        <div
          className="rounded-[var(--radius-md)] bg-[var(--color-card-2)] px-3 py-2 text-xs text-[var(--color-text-muted)]"
          data-testid="next-reward-chip"
        >
          Next reward at Lv {nextReward.level_threshold}:{" "}
          <span className="font-medium text-[var(--color-text)]">
            {nextReward.label}
          </span>
        </div>
      )}
    </section>
  );
}
