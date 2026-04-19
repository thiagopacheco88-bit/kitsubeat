import { getUserGamificationState } from "@/lib/db/queries";
import { xpWithinCurrentLevel } from "@/lib/gamification/level-curve";

/**
 * ProfileHud — server component rendering the user's XP level, progress bar,
 * streak, and equipped cosmetic avatar border.
 *
 * Placement: /profile only. Must NOT appear on /songs or /songs/[slug].
 * Plan 06 will reuse this component on /path as well.
 */
export async function ProfileHud({ userId }: { userId: string }) {
  const s = await getUserGamificationState(userId);
  const { xpInLevel, xpToNext } = xpWithinCurrentLevel(s.xp_total);

  const borderClass = s.equipped_border?.css_class ?? "ring-2 ring-gray-600";

  return (
    <section
      className="rounded-xl border border-gray-700 bg-gray-900 p-6 flex items-center gap-6 mb-6"
      aria-label="Your progress"
    >
      {/* Avatar placeholder with equipped border ring */}
      <div className={`rounded-full p-1 ${borderClass} flex-shrink-0`}>
        <div
          className="w-16 h-16 rounded-full bg-orange-900 flex items-center justify-center text-2xl"
          aria-label="Avatar"
        >
          {/* Kitsune SVG placeholder — replace with final asset in Plan 06 polish */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            fill="none"
            className="w-10 h-10"
            aria-hidden="true"
          >
            {/* Simple fox ears + face outline */}
            <ellipse cx="24" cy="28" rx="12" ry="10" fill="#f97316" />
            <polygon points="12,20 6,8 18,16" fill="#f97316" />
            <polygon points="36,20 42,8 30,16" fill="#f97316" />
            <ellipse cx="20" cy="28" rx="2" ry="2.5" fill="#1f2937" />
            <ellipse cx="28" cy="28" rx="2" ry="2.5" fill="#1f2937" />
            <ellipse cx="24" cy="32" rx="2" ry="1.5" fill="#fbbf24" />
          </svg>
        </div>
      </div>

      {/* XP + level */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-white font-semibold">Level {s.level}</div>
        <progress
          value={xpInLevel}
          max={xpToNext}
          aria-label={`XP progress: ${xpInLevel} of ${xpToNext}`}
          className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:bg-red-500 [&::-moz-progress-bar]:bg-red-500"
        />
        <div className="text-sm text-gray-400">
          {xpInLevel} / {xpToNext} XP to Level {s.level + 1}
        </div>
      </div>

      {/* Streak */}
      <div className="text-right flex-shrink-0">
        <div className="text-white font-semibold text-lg">
          🔥 {s.streak_current}
        </div>
        <div className="text-xs text-gray-400">
          Best: {s.streak_best}
        </div>
      </div>
    </section>
  );
}
