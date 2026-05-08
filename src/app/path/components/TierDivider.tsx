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
          {/* Two parallel vertical stalks */}
          <line x1="8" y1="2" x2="8" y2="22"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="2" x2="16" y2="22"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Node bands — left stalk (rect, not ellipse — reads crisper at 16px) */}
          <rect x="5.5" y="7" width="5" height="1.5" rx="0.75"
            fill="currentColor" opacity="0.6" />
          <rect x="5.5" y="15" width="5" height="1.5" rx="0.75"
            fill="currentColor" opacity="0.6" />
          {/* Node bands — right stalk (offset vertically for natural bamboo rhythm) */}
          <rect x="13.5" y="10" width="5" height="1.5" rx="0.75"
            fill="currentColor" opacity="0.6" />
          <rect x="13.5" y="18" width="5" height="1.5" rx="0.75"
            fill="currentColor" opacity="0.6" />
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
          {/* Kasagi — gently curved top crossbeam (quadratic bezier, not flat line) */}
          <path d="M2 7 Q12 3 22 7"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          {/* Shimaki — lower straight crossbeam */}
          <path d="M3 10 L21 10"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" />
          {/* Hashira — two vertical pillars, ground to shimaki */}
          <path d="M5 10 L5 22 M19 10 L19 22"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" />
          {/* Nuki — horizontal tie beam between pillars */}
          <path d="M5 14 L19 14"
            stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" />
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
          {/* Main ridge — two peaks (tall left peak, shorter right peak) */}
          <path d="M2 20 L9 7 L16 15 L19 10 L22 20"
            stroke="currentColor" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />
          {/* Snow cap at main (left) peak */}
          <path d="M7 11 L9 7 L11 11"
            stroke="currentColor" strokeWidth="1.6"
            strokeLinejoin="round" strokeLinecap="round"
            opacity="0.55" />
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
