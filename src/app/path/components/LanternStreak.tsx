/**
 * LanternStreak — Phase 14.1 SPEC-REQ-3.
 *
 * SVG paper lantern with 3-tier flame intensity scaling. Replaces the 🔥 emoji
 * that previously lived in PathHud (now deleted per CONTEXT D-06). Lives in
 * <PathHeader> (Plan 05).
 *
 * Tiers (CONTEXT Specifics):
 *   count < 7   -> dim     (flame opacity 0.45)
 *   7 <= n < 30 -> warm    (flame opacity 0.70)
 *   count >= 30 -> blazing (flame opacity 1.0)
 *
 * The flame <ellipse> carries className="ka-flicker" so the global keyframe
 * authored in Plan 01 animates it; reduced-motion is suppressed by the global
 * @media override in globals.css (D-15).
 *
 * `streak_best` ("Best: N") is intentionally dropped per CONTEXT D-07.
 *
 * W-5 testid discipline:
 *   - data-testid="lantern-streak"        on the root <span role="img"> (whole component)
 *   - data-testid="lantern-streak-count"  on the inner count <span> ONLY
 * Plan 12 visual-diff masks `lantern-streak-count` so the SVG lantern stays
 * in the visual gate while dynamic count text is masked out.
 *
 * SVG geometry sourced verbatim from _temp/path-redesign/demo-CA-hybrid.html.
 * Raw fills replaced with design tokens per Phase 14 D-14 token discipline.
 * Token mappings:
 *   paper body fill: #f59e0b  -> var(--color-jlpt-n3)
 *   flame core fill: #dc2626  -> var(--color-accent)
 *   inner glow fill: #fef3c7  -> currentColor (near-white on dark, muted on light; opacity handles blend)
 *   ribs + cap:      currentColor (adapts to theme via text color)
 */

interface LanternStreakProps {
  count: number;
}

function flameOpacity(count: number): number {
  if (count >= 30) return 1;
  if (count >= 7) return 0.7;
  return 0.45;
}

export function LanternStreak({ count }: LanternStreakProps) {
  const opacity = flameOpacity(count);
  // Body glow mirrors demo: `0.18 + blaze * 0.5` — visual flourish only, not tested.
  const bodyOpacity = 0.18 + opacity * 0.5;

  return (
    <span
      role="img"
      aria-label={`${count}-day streak`}
      className="inline-flex items-center gap-2"
      data-testid="lantern-streak"
    >
      <svg
        width="22"
        height="26"
        viewBox="0 0 22 26"
        fill="none"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        {/* Lantern top cap — geometry from demo verbatim */}
        <rect
          x="6"
          y="2"
          width="10"
          height="2"
          rx="0.5"
          fill="currentColor"
          opacity="0.9"
        />
        <line
          x1="11"
          y1="0"
          x2="11"
          y2="2"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.5"
        />

        {/* Lantern body — paper warm fill. #f59e0b -> var(--color-jlpt-n3) */}
        <ellipse
          cx="11"
          cy="13"
          rx="7.5"
          ry="9"
          fill="var(--color-jlpt-n3)"
          opacity={bodyOpacity}
        />
        {/* Body outline */}
        <ellipse
          cx="11"
          cy="13"
          rx="7.5"
          ry="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.6"
        />

        {/* Bamboo ribs — geometry from demo verbatim */}
        <line
          x1="3.6"
          y1="13"
          x2="18.4"
          y2="13"
          stroke="currentColor"
          strokeWidth="0.6"
          opacity="0.45"
        />
        <line
          x1="4.2"
          y1="9"
          x2="17.8"
          y2="9"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.35"
        />
        <line
          x1="4.2"
          y1="17"
          x2="17.8"
          y2="17"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.35"
        />

        {/* Flame core — opacity-tier target. #dc2626 -> var(--color-accent).
         * className="ka-flicker" hooks the Plan 01 keyframe animation.
         * opacity={opacity} is a JSX number attribute (not className) so
         * Vitest can query via getAttribute("opacity"). */}
        <ellipse
          cx="11"
          cy="13"
          rx="3"
          ry="4.5"
          fill="var(--color-accent)"
          opacity={opacity}
          className="ka-flicker"
          data-testid="lantern-flame"
        />
        {/* Inner flame hotspot — #fef3c7 (cream) mapped to currentColor.
         * Uses relative opacity to remain subtle at all tiers. */}
        <ellipse
          cx="11"
          cy="13"
          rx="1.5"
          ry="2.5"
          fill="currentColor"
          opacity={opacity * 0.85}
        />

        {/* Lantern bottom cap */}
        <rect
          x="6"
          y="22"
          width="10"
          height="2"
          rx="0.5"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>

      {/* W-5: dedicated mask hook for Plan 12 visual diff.
       * The SVG lantern stays in the visual gate; only this dynamic count
       * text is masked by [data-testid="lantern-streak-count"]. */}
      <span
        className="text-sm font-semibold tabular-nums text-[var(--color-text)]"
        data-testid="lantern-streak-count"
      >
        {count}
      </span>
    </span>
  );
}
