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
  const borderClass = state.equipped_border?.css_class ?? "ring-2 ring-gray-600";

  return (
    <section
      data-testid="gamification-hud"
      className="rounded-xl border border-gray-700 bg-gray-900 p-6 flex flex-col gap-4 mb-6"
      aria-label="Your progress"
    >
      <div className="flex items-center gap-6">
        {/* Avatar with equipped border */}
        <div className={`rounded-full p-1 ${borderClass} flex-shrink-0`}>
          <div
            className="w-14 h-14 rounded-full bg-orange-900 flex items-center justify-center text-2xl"
            aria-label="Avatar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              fill="none"
              className="w-9 h-9"
              aria-hidden="true"
            >
              <ellipse cx="24" cy="28" rx="12" ry="10" fill="#f97316" />
              <polygon points="12,20 6,8 18,16" fill="#f97316" />
              <polygon points="36,20 42,8 30,16" fill="#f97316" />
              <ellipse cx="20" cy="28" rx="2" ry="2.5" fill="#1f2937" />
              <ellipse cx="28" cy="28" rx="2" ry="2.5" fill="#1f2937" />
              <ellipse cx="24" cy="32" rx="2" ry="1.5" fill="#fbbf24" />
            </svg>
          </div>
        </div>

        {/* Level + XP bar */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-white font-semibold">Level {state.level}</div>
          <progress
            value={xpInLevel}
            max={xpToNext}
            aria-label={`XP progress: ${xpInLevel} of ${xpToNext}`}
            className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:bg-red-500 [&::-moz-progress-bar]:bg-red-500"
          />
          <div className="text-sm text-gray-400">
            {xpInLevel} / {xpToNext} XP to Level {state.level + 1}
          </div>
        </div>

        {/* Streak */}
        <div className="text-right flex-shrink-0">
          <div className="text-white font-semibold text-lg">
            {"\uD83D\uDD25"} {state.streak_current}
          </div>
          <div className="text-xs text-gray-400">Best: {state.streak_best}</div>
        </div>
      </div>

      {/* M4 guard: only render next-reward chip when non-null */}
      {nextReward !== null && (
        <div className="rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300">
          Next reward at L{nextReward.level_threshold}:{" "}
          <span className="font-medium text-white">{nextReward.label}</span>
        </div>
      )}
    </section>
  );
}
