/**
 * LanternStreak — Phase 14.1 SPEC-REQ-3.
 *
 * STUB: This file is authored by Plan 04 in wave 2. This stub exists only
 * to satisfy the PathHeader (Plan 05) import during parallel wave execution.
 * Plan 04's output supersedes this file at merge time.
 *
 * Implements the same interface as Plan 04's real component so PathHeader
 * tests pass in this worktree.
 */

interface LanternStreakProps {
  count: number;
}

export function LanternStreak({ count }: LanternStreakProps) {
  const flameOpacity = count >= 30 ? 1 : count >= 7 ? 0.7 : 0.45;

  return (
    <span
      role="img"
      aria-label={`${count}-day streak`}
      data-testid="lantern-streak"
      className="inline-flex items-center gap-1"
    >
      <svg
        width="24"
        height="32"
        viewBox="0 0 24 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Paper warm body */}
        <rect
          x="4"
          y="10"
          width="16"
          height="16"
          rx="3"
          fill="var(--color-jlpt-n3)"
        />
        {/* Bamboo ribs */}
        <line
          x1="4"
          y1="15"
          x2="20"
          y2="15"
          stroke="var(--color-text-muted)"
          strokeWidth="1"
        />
        <line
          x1="4"
          y1="20"
          x2="20"
          y2="20"
          stroke="var(--color-text-muted)"
          strokeWidth="1"
        />
        {/* Flame core */}
        <ellipse
          cx="12"
          cy="8"
          rx="4"
          ry="5"
          fill="var(--color-grammar-adverb)"
          opacity={flameOpacity}
          className="ka-flicker"
        />
      </svg>
      <span data-testid="lantern-streak-count">{count}</span>
    </span>
  );
}
