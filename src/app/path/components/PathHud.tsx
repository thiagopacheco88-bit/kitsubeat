import { xpWithinCurrentLevel } from "@/lib/gamification/level-curve";
import type { GamificationState } from "@/lib/db/queries";

interface PathHudProps {
  userId: string;
  state: GamificationState;
  nextReward: {
    id: string;
    label: string;
    level_threshold: number;
  } | null;
}

/**
 * PathHud — server component rendering the user's XP level, progress bar,
 * streak, and equipped cosmetic avatar border on /path.
 *
 * Mirrors ProfileHud from Plan 05. Kept as a separate component so /profile
 * can evolve its HUD independently in future phases.
 *
 * M4 guard: renders NO next-reward section if nextReward is null.
 */
export function PathHud({ state, nextReward }: PathHudProps) {
  const { xpInLevel, xpToNext } = xpWithinCurrentLevel(state.xp_total);
  // Equipped border CSS class flows from cosmetic data (not palette utility) \u2014
  // fallback uses --color-border-strong token for theme parity.
  const borderClass =
    state.equipped_border?.css_class ?? "ring-2 ring-[var(--color-border-strong)]";

  return (
    <section
      data-testid="gamification-hud"
      className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex flex-col gap-4 mb-6"
      aria-label="Your progress"
    >
      <div className="flex items-center gap-6">
        {/* Avatar with equipped border. Avatar bg uses card-2 surface +
         * --color-grammar-adverb (#f97316 orange) for the SVG fox illustration \u2014
         * orange is the brand mascot color (CONTEXT D-22 token-only swap;
         * no new --color-avatar-bg token introduced \u2014 Phase 14.1 may revisit). */}
        <div className={`rounded-full p-1 ${borderClass} flex-shrink-0`}>
          <div
            className="w-14 h-14 rounded-full bg-[var(--color-card-2)] flex items-center justify-center text-2xl"
            role="img"
            aria-label="Avatar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              fill="none"
              className="w-9 h-9"
              aria-hidden="true"
            >
              <ellipse cx="24" cy="28" rx="12" ry="10" fill="var(--color-grammar-adverb)" />
              <polygon points="12,20 6,8 18,16" fill="var(--color-grammar-adverb)" />
              <polygon points="36,20 42,8 30,16" fill="var(--color-grammar-adverb)" />
              <ellipse cx="20" cy="28" rx="2" ry="2.5" fill="var(--color-text)" />
              <ellipse cx="28" cy="28" rx="2" ry="2.5" fill="var(--color-text)" />
              <ellipse cx="24" cy="32" rx="2" ry="1.5" fill="var(--color-jlpt-n3)" />
            </svg>
          </div>
        </div>

        {/* Level + XP bar. Progress bar uses card-2 (track) + accent (value);
         * the [&::*]: arbitrary prefix targets webkit/moz pseudo-elements. */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-[var(--color-text)] font-semibold">Level {state.level}</div>
          <progress
            value={xpInLevel}
            max={xpToNext}
            aria-label={`XP progress: ${xpInLevel} of ${xpToNext}`}
            className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[var(--color-card-2)] [&::-webkit-progress-value]:bg-[var(--color-accent)] [&::-moz-progress-bar]:bg-[var(--color-accent)]"
          />
          <div className="text-sm text-[var(--color-text-muted)]">
            {xpInLevel} / {xpToNext} XP to Level {state.level + 1}
          </div>
        </div>

        {/* Streak */}
        <div className="text-right flex-shrink-0">
          <div className="text-[var(--color-text)] font-semibold text-lg">
            {"\uD83D\uDD25"} {state.streak_current}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">Best: {state.streak_best}</div>
        </div>
      </div>

      {/* M4 guard: only render next-reward chip when non-null */}
      {nextReward !== null && (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-card-2)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          Next reward at L{nextReward.level_threshold}:{" "}
          <span className="font-medium text-[var(--color-text)]">{nextReward.label}</span>
        </div>
      )}
    </section>
  );
}
