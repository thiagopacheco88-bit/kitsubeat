/**
 * TierDivider — Phase 14.1 SPEC-REQ-7.
 *
 * Bilingual co-headed tier marker on /path. Replaces the inline tier-divider
 * <span> at PathMap.tsx:58-71. Renders a 1px-rule + chip layout with a
 * tier-specific SVG icon and a Japanese·English co-heading.
 *
 * Tier labels (CONTEXT Specifics):
 *   basic        -> Side A · 基礎 · Beginner    (bamboo icon)
 *   intermediate -> Side B · 中級 · Intermediate (torii icon)
 *   advanced     -> Side C · 上級 · Advanced     (mountain icon)
 *
 * Icons sourced verbatim from _temp/path-redesign/demo-CA-hybrid.html TierIcon
 * component (lines 168-193). SVG paths use stroke="currentColor" with
 * fill="none" so the icon inherits the chip's text color at any theme.
 *
 * Server component — no client interactivity.
 */

type Tier = "basic" | "intermediate" | "advanced";

interface TierDividerProps {
  tier: Tier | string;
}

interface TierMeta {
  sideLabel: string; // "Side A"
  jpLabel: string;   // "基礎"
  enLabel: string;   // "Beginner"
  iconKind: "bamboo" | "torii" | "mountain";
}

const TIER_META: Record<Tier, TierMeta> = {
  basic: {
    sideLabel: "Side A",
    jpLabel: "基礎",
    enLabel: "Beginner",
    iconKind: "bamboo",
  },
  intermediate: {
    sideLabel: "Side B",
    jpLabel: "中級",
    enLabel: "Intermediate",
    iconKind: "torii",
  },
  advanced: {
    sideLabel: "Side C",
    jpLabel: "上級",
    enLabel: "Advanced",
    iconKind: "mountain",
  },
};

/**
 * TierIcon — hand-authored 16×16 SVGs.
 *
 * Paths copied verbatim from demo-CA-hybrid.html TierIcon (lines 168-193),
 * adapted from viewBox="0 0 24 24" to 16×16 coordinate space by scaling
 * all coordinates by 16/24 = 0.6667. Strokes use currentColor so the
 * icon inherits the chip's text color in both light and dark themes.
 *
 * All fills/strokes use currentColor — no raw hex.
 */
function TierIcon({ kind }: { kind: TierMeta["iconKind"] }) {
  switch (kind) {
    case "bamboo":
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          data-testid="tier-icon-bamboo"
        >
          {/* Dual stalks with segment joints */}
          <path
            d="M9 2v4m0 4v4m0 4v4M15 2v3m0 5v3m0 5v3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Node ellipses (segment joints) */}
          <ellipse cx="9" cy="6" rx="2.4" ry="0.9" fill="currentColor" opacity="0.55" />
          <ellipse cx="9" cy="14" rx="2.4" ry="0.9" fill="currentColor" opacity="0.55" />
          <ellipse cx="15" cy="9" rx="2.4" ry="0.9" fill="currentColor" opacity="0.55" />
          <ellipse cx="15" cy="17" rx="2.4" ry="0.9" fill="currentColor" opacity="0.55" />
        </svg>
      );
    case "torii":
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          data-testid="tier-icon-torii"
        >
          {/* Kasagi (top curved crossbeam) + shimaki (lower crossbeam) */}
          <path d="M3 5h18M2 8h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          {/* Hashira (vertical pillars) */}
          <path d="M5 8v13M19 8v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          {/* Nuki (tie beam) */}
          <path d="M5 11h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "mountain":
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          data-testid="tier-icon-mountain"
        >
          {/* Main ridge line */}
          <path
            d="M2 20l6-10 4 6 3-4 7 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Snow-cap highlights at each peak */}
          <path
            d="M6 14l2-3 2 3M14 12l1.5-2 1.5 2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      );
  }
}

export function TierDivider({ tier }: TierDividerProps) {
  const meta = TIER_META[tier as Tier];

  // Defensive fallback: unknown tier -> render input as label, no icon
  if (!meta) {
    return (
      <div
        className="flex items-center gap-3 my-4"
        aria-label={`Tier: ${tier}`}
        data-testid={`tier-divider-${tier}`}
      >
        <div className="flex-1 border-t border-[var(--color-border)]" />
        <span className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-card-2)] px-3 py-0.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          {tier}
        </span>
        <div className="flex-1 border-t border-[var(--color-border)]" />
      </div>
    );
  }

  const fullLabel = `${meta.sideLabel} · ${meta.jpLabel} · ${meta.enLabel}`;

  return (
    <div
      className="flex items-center gap-3 my-4"
      aria-label={fullLabel}
      data-testid={`tier-divider-${tier}`}
    >
      <div className="flex-1 border-t border-[var(--color-border)]" />
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-card-2)] px-3 py-0.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
        <TierIcon kind={meta.iconKind} />
        <span>{meta.sideLabel}</span>
        <span
          style={{ fontFamily: "var(--font-jp)" }}
          className="normal-case"
        >
          {meta.jpLabel}
        </span>
        <span>{meta.enLabel}</span>
      </span>
      <div className="flex-1 border-t border-[var(--color-border)]" />
    </div>
  );
}
