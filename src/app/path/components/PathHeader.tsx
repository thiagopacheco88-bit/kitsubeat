/**
 * PathHeader — Phase 14.1 SPEC-REQ-2.
 *
 * Top-of-page header on /path. Replaces the deleted PathHud (CONTEXT D-06).
 * Composes the KitsuBeat fox-mark wordmark on the left + <LanternStreak> on
 * the right. Lives in /path only this phase per CONTEXT scope; cross-surface
 * promotion to RootLayout is Phase 14.4 territory.
 *
 * Server component — no client interactivity.
 *
 * Fox-mark SVG sourced verbatim from demo-CA-hybrid.html PathHeader section.
 * Demo uses `var(--color-grammar-adverb)` for the fox body/ears and
 * `var(--color-accent)` for the nose ellipse — mapped to existing tokens, no
 * raw colors introduced.
 */
import { LanternStreak } from "./LanternStreak";

interface PathHeaderProps {
  /** state.streak_current passed from /path page.tsx. */
  streakCurrent: number;
}

export function PathHeader({ streakCurrent }: PathHeaderProps) {
  return (
    <header
      data-testid="path-header"
      className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5 text-[var(--color-text)]"
    >
      {/* Left: fox-mark SVG icon + KitsuBeat wordmark */}
      <div className="flex items-center gap-2">
        {/* Fox-mark icon — sourced verbatim from demo-CA-hybrid.html (lines 259-266).
         * Fills use existing semantic tokens. aria-hidden because the wordmark
         * text provides the accessible label. */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          {/* Fox body */}
          <ellipse
            cx="16"
            cy="20"
            rx="9"
            ry="7"
            fill="var(--color-grammar-adverb)"
          />
          {/* Left ear */}
          <polygon
            points="9,15 4,5 13,11"
            fill="var(--color-grammar-adverb)"
          />
          {/* Right ear */}
          <polygon
            points="23,15 28,5 19,11"
            fill="var(--color-grammar-adverb)"
          />
          {/* Left eye */}
          <ellipse
            cx="13"
            cy="20"
            rx="1.4"
            ry="1.8"
            fill="var(--color-text)"
          />
          {/* Right eye */}
          <ellipse
            cx="19"
            cy="20"
            rx="1.4"
            ry="1.8"
            fill="var(--color-text)"
          />
          {/* Nose */}
          <ellipse
            cx="16"
            cy="23.5"
            rx="1.4"
            ry="1"
            fill="var(--color-accent)"
          />
        </svg>

        {/* Wordmark: "Kitsu" in text color, "Beat" emphasized in accent.
         * font-weight 800 + tracking-tight mirrors demo (fontWeight:800,
         * letterSpacing:'-0.01em'). text-lg approximates fontSize:17. */}
        <span
          className="text-lg font-extrabold tracking-tight"
          aria-label="KitsuBeat"
        >
          <span className="text-[var(--color-text)]">Kitsu</span>
          <span
            className="text-[var(--color-accent)]"
            data-testid="wordmark-emphasis"
          >
            Beat
          </span>
        </span>
      </div>

      {/* Right: streak lantern */}
      <LanternStreak count={streakCurrent} />
    </header>
  );
}
