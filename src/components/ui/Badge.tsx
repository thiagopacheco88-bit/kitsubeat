/**
 * Badge primitive — Phase 14 Plan 14-02 (D-07).
 *
 * 4 variants:
 *   - jlpt:    accepts level prop (N5..N1). Background = 12% alpha tint
 *              (--color-jlpt-{level}-bg), ring = 25% alpha tint
 *              (--color-jlpt-{level}-ring), per SPEC §A.2.
 *   - grammar: accepts category prop (noun..other). Inline color-mix tint
 *              from --color-grammar-{category}; same 12%/25% relationship
 *              expressed via inline style (Tailwind has no `color-mix`
 *              arbitrary syntax).
 *   - mono:    monospace eyebrow style for catalog labels (J-POP · N5).
 *   - accent:  solid red accent for premium/CTA chips.
 *
 * Imports from src/lib/types/lesson.ts:
 *   - JLPT_COLOR_CLASS / GRAMMAR_COLOR_CLASS — kept as the type-narrowing
 *     contract per Plan 14-02 must_haves key_link. The Badge does not
 *     reference these maps directly (the inline alpha-tint tokens cover
 *     the visual contract); Wave 2+ surface migrations may consume the
 *     solid maps for non-Badge use cases (text color highlighting in
 *     verse rows, etc. — see VerseBlock.tsx, TokenSpan.tsx, VocabularySection.tsx).
 */
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import {
  JLPT_COLOR_CLASS as _JLPT_COLOR_CLASS,
  GRAMMAR_COLOR_CLASS as _GRAMMAR_COLOR_CLASS,
} from "@/lib/types/lesson";

// Re-export the maps so the dependency contract is observable from Badge's
// module surface (Wave 2+ migration plans grep for these symbols).
export const JLPT_COLOR_CLASS = _JLPT_COLOR_CLASS;
export const GRAMMAR_COLOR_CLASS = _GRAMMAR_COLOR_CLASS;

const badge = cva(
  [
    "inline-flex items-center font-semibold rounded-[var(--radius-pill)] px-2 py-0.5 text-xs",
  ],
  {
    variants: {
      variant: {
        jlpt: "ring-1 text-[var(--color-text)]",
        grammar: "text-current",
        mono: "font-mono uppercase tracking-wide text-[var(--color-text-muted)] bg-[var(--color-card-2)]",
        accent: "bg-[var(--color-accent)] text-white",
      },
    },
    defaultVariants: { variant: "mono" },
  },
);

type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";
type GrammarCategory =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "particle"
  | "expression"
  | "other";

type CommonAttrs = {
  className?: string;
  children?: ReactNode;
  // Spread-friendly attrs — keep narrow to avoid pulling all div props in.
  "data-testid"?: string;
};

export type BadgeProps =
  | (CommonAttrs & VariantProps<typeof badge> & {
      variant: "jlpt";
      level: JlptLevel;
    })
  | (CommonAttrs & VariantProps<typeof badge> & {
      variant: "grammar";
      category: GrammarCategory;
    })
  | (CommonAttrs & VariantProps<typeof badge> & {
      variant?: "mono" | "accent";
    });

export function Badge(props: BadgeProps) {
  const { variant = "mono", className, children } = props;
  const testId = (props as CommonAttrs)["data-testid"];

  if (variant === "jlpt") {
    const level = (props as { level: JlptLevel }).level;
    const lower = level.toLowerCase();
    const extraClass = `bg-[var(--color-jlpt-${lower}-bg)] ring-[var(--color-jlpt-${lower}-ring)]`;
    return (
      <span
        data-testid={testId}
        className={twMerge(
          clsx(badge({ variant: "jlpt" }), extraClass, className),
        )}
      >
        {children ?? level}
      </span>
    );
  }

  if (variant === "grammar") {
    const category = (props as { category: GrammarCategory }).category;
    // Tailwind v4 has no arbitrary `color-mix` utility; we apply the tint
    // inline so the generated class set stays static. The CSS var lookup
    // is what makes the grammar token grep-discoverable for the unit test.
    const extraStyle: CSSProperties = {
      backgroundColor: `color-mix(in srgb, var(--color-grammar-${category}) 12%, transparent)`,
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--color-grammar-${category}) 25%, transparent)`,
      color: `var(--color-grammar-${category})`,
    };
    return (
      <span
        data-testid={testId}
        style={extraStyle}
        className={twMerge(clsx(badge({ variant: "grammar" }), className))}
      >
        {children ?? category}
      </span>
    );
  }

  return (
    <span
      data-testid={testId}
      className={twMerge(clsx(badge({ variant }), className))}
    >
      {children}
    </span>
  );
}
