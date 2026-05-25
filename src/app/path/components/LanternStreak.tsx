/**
 * LanternStreak — Phase 14.1 SPEC-REQ-3.
 *
 * Displays the user's day streak with a glowing lantern icon and a
 * hover tooltip. Icon is a PNG lantern; tooltip is pure CSS (no extra deps).
 *
 * Tiers (CONTEXT Specifics):
 *   count < 7   -> dim     (opacity 0.55)
 *   7 <= n < 30 -> warm    (opacity 0.80)
 *   count >= 30 -> blazing (opacity 1.0)
 *
 * W-5 testid discipline:
 *   - data-testid="lantern-streak"        on the root wrapper
 *   - data-testid="lantern-streak-count"  on the count <span> only
 */

import Image from "next/image";

interface LanternStreakProps {
  count: number;
}

function lanternOpacity(count: number): number {
  if (count >= 30) return 1;
  if (count >= 7) return 0.8;
  return 0.55;
}

function streakLabel(count: number): string {
  if (count >= 30) return `🔥 ${count}-day streak — on fire!`;
  if (count >= 7) return `🏮 ${count}-day streak — keep it up!`;
  return `🏮 ${count}-day streak`;
}

export function LanternStreak({ count }: LanternStreakProps) {
  const opacity = lanternOpacity(count);

  return (
    <span
      role="img"
      aria-label={`${count}-day streak`}
      className="relative inline-flex items-center gap-1.5 group cursor-default"
      data-testid="lantern-streak"
    >
      {/* Lantern icon */}
      <Image
        src="/streak-lantern.png"
        width={26}
        height={26}
        alt=""
        aria-hidden="true"
        className="flex-shrink-0 rounded-full"
        style={{ opacity }}
      />

      {/* Streak count */}
      <span
        className="text-sm font-semibold tabular-nums text-[var(--color-text)]"
        data-testid="lantern-streak-count"
      >
        {count}
      </span>

      {/* Tooltip — appears above on hover, CSS only */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          whitespace-nowrap rounded-md bg-[var(--color-card-2)] border border-[var(--color-border)]
          px-2.5 py-1 text-xs font-medium text-[var(--color-text)]
          shadow-[var(--shadow-md)]
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
        "
      >
        {streakLabel(count)}
      </span>
    </span>
  );
}
