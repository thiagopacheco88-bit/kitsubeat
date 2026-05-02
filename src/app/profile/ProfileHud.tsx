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
          className="w-16 h-16 rounded-full bg-[var(--color-card-2)] flex items-center justify-center text-2xl"
          aria-label="Avatar"
        >
          {/* Kitsune SVG placeholder — replace with final asset in Plan 06 polish.
           * Phase 14 Plan 14-09: SVG fills swapped to token refs to match PathHud. */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            fill="none"
            className="w-10 h-10"
            aria-hidden="true"
          >
            {/* Simple fox ears + face outline */}
            <ellipse cx="24" cy="28" rx="12" ry="10" fill="var(--color-grammar-adverb)" />
            <polygon points="12,20 6,8 18,16" fill="var(--color-grammar-adverb)" />
            <polygon points="36,20 42,8 30,16" fill="var(--color-grammar-adverb)" />
            <ellipse cx="20" cy="28" rx="2" ry="2.5" fill="var(--color-text)" />
            <ellipse cx="28" cy="28" rx="2" ry="2.5" fill="var(--color-text)" />
            <ellipse cx="24" cy="32" rx="2" ry="1.5" fill="var(--color-jlpt-n3)" />
          </svg>
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
        <div className="text-[var(--color-text)] font-semibold text-lg">
          🔥 {s.streak_current}
        </div>
        <div className="text-xs text-[var(--color-text-muted)]">
          Best: {s.streak_best}
        </div>
      </div>
    </section>
  );
}
