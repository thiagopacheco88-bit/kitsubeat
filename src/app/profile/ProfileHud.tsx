import Image from "next/image";
import { getUserGamificationState } from "@/lib/db/queries";
import { xpWithinCurrentLevel } from "@/lib/gamification/level-curve";

/**
 * ProfileHud — server component rendering the user's XP level, progress bar,
 * streak, and equipped cosmetic avatar border.
 *
 * Placement: /profile only. Must NOT appear on /songs or /songs/[slug].
 * Plan 06 will reuse this component on /path as well.
 *
 * Phase 14 Plan 14-09 (D-PRE-10 chrome cleanup): all palette utilities + bare
 * achromatic colors -> token vars. SVG fox illustration colors -> token refs
 * (--color-grammar-adverb for orange brand-mascot, --color-text for eyes,
 * --color-jlpt-n3 for amber accents). Same recipe as PathHud.tsx; both HUDs
 * share visual language so they share the token surface.
 */
export async function ProfileHud({ userId }: { userId: string }) {
  const s = await getUserGamificationState(userId);
  const { xpInLevel, xpToNext } = xpWithinCurrentLevel(s.xp_total);

  // Equipped border CSS class flows from cosmetic data (not palette utility);
  // fallback uses --color-border-strong for theme parity. Same idiom as PathHud.
  const borderClass =
    s.equipped_border?.css_class ?? "ring-2 ring-[var(--color-border-strong)]";

  return (
    <section
      className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex items-center gap-6 mb-6"
      aria-label="Your progress"
    >
      {/* Avatar placeholder with equipped border ring. Avatar bg uses card-2
       * surface (CONTEXT D-22 token-only swap; matches PathHud recipe). */}
      <div className={`rounded-full p-1 ${borderClass} flex-shrink-0`}>
        <div
          className="w-16 h-16 rounded-full bg-[var(--color-card-2)] flex items-center justify-center overflow-hidden"
          role="img"
          aria-label="Avatar"
        >
          <Image src="/logo-transparent.png" width={56} height={56} alt="KitsuBeat mascot" />
        </div>
      </div>

      {/* XP + level. Progress bar: card-2 (track) + accent (value); the [&::*]:
       * arbitrary prefix targets webkit/moz pseudo-elements (same as PathHud). */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-[var(--color-text)] font-semibold">Level {s.level}</div>
        <progress
          value={xpInLevel}
          max={xpToNext}
          aria-label={`XP progress: ${xpInLevel} of ${xpToNext}`}
          className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[var(--color-card-2)] [&::-webkit-progress-value]:bg-[var(--color-accent)] [&::-moz-progress-bar]:bg-[var(--color-accent)]"
        />
        <div className="text-sm text-[var(--color-text-muted)]">
          {xpInLevel} / {xpToNext} XP to Level {s.level + 1}
        </div>
      </div>

      {/* Streak */}
      <div className="text-right flex-shrink-0">
        <div className="text-[var(--color-text)] font-semibold text-lg flex items-center justify-end gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
            <defs>
              <linearGradient id="flame-outer" x1="0" y1="1" x2="0.4" y2="0">
                <stop offset="0%" stopColor="#c2410c" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <linearGradient id="flame-inner" x1="0" y1="1" x2="0.3" y2="0">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
            </defs>
            {/* outer flame */}
            <path
              d="M12 2 C10 5 7 7 7 11 C7 14.5 9 16.5 9 16.5 C9 14 10.5 12.5 10.5 12.5 C10.5 15 12 17 12 19.5 C14 17.5 15 15 14.5 12.5 C14.5 12.5 16.5 14.5 16.5 17 C17.5 15.5 17 13 17 11 C17 7 14 5 12 2Z"
              fill="url(#flame-outer)"
            />
            {/* inner flame */}
            <path
              d="M12 8 C11 10 10 11.5 10 13 C10 15 11 16.5 12 17.5 C13 16.5 14 15 14 13 C14 11.5 13 10 12 8Z"
              fill="url(#flame-inner)"
              opacity="0.9"
            />
          </svg>
          {s.streak_current}
        </div>
        <div className="text-xs text-[var(--color-text-muted)]">
          Best: {s.streak_best}
        </div>
      </div>
    </section>
  );
}
