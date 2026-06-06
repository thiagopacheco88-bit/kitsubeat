"use client";

import Link from "next/link";
import { useState } from "react";
import { localize, type Localizable } from "@/lib/types/lesson";
import { parseRuleName } from "@/lib/grammar/rule-name";
import { Button } from "@/components/ui/Button";

interface Props {
  rule: {
    id: string;
    name: string;
    jlpt_reference: string;
    explanation: Localizable;
  };
  /** UI language for the explanation. Defaults to English. */
  lang?: string;
  /** Fires when the learner taps "Got it" / Continue → session moves to first MCQ. */
  onContinue: () => void;
}

/**
 * Phase-13 Grammar Session — first-time rule intro card.
 *
 * Shown once per session before the first exercise of a rule the learner
 * hasn't seen this session. Mirrors the LearnCard pattern from vocabulary
 * (intro before recall) but at the rule grain instead of vocab grain.
 *
 * Per-session scoping is intentional — even if the learner has seen the rule
 * before, a brief refresher at the start of each session lowers the cognitive
 * load when the rule re-surfaces in mid-session question rotation.
 */
export default function GrammarRuleIntroCard({ rule, lang = "en", onContinue }: Props) {
  const explanation = localize(rule.explanation, lang);

  // Split into summary (first paragraph) + detail (rest). Catalog explanations
  // can run 15+ examples + multiple paragraphs — showing all of it forces a
  // long scroll on first sight. Default-collapsed detail keeps the intro tight
  // while letting curious learners drill in. The 15-examples spec landed in
  // memory:project_grammar_explanation_format and assumes this collapse.
  const paragraphs = explanation.split(/\n\n+/);
  const summary = paragraphs[0] ?? explanation;
  const detail = paragraphs.slice(1).join("\n\n");
  const hasDetail = detail.trim().length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-jlpt-n4-ring)] bg-[var(--color-jlpt-n4-bg)] p-5">
      <div className="flex items-center justify-between">
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--color-jlpt-n4)" }}
        >
          New rule
        </span>
        <span className="rounded-full bg-[var(--color-card-2)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
          {rule.jlpt_reference}
        </span>
      </div>

      {/* Two-row title: romaji (bold, primary) + kana (secondary) on row 1;
          English gloss on row 2. Falls back to single-line render if the
          rule's name doesn't match the locked v2 format. */}
      {(() => {
        const parts = parseRuleName(rule.name);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
              <span className="text-xl font-semibold text-[var(--color-text)]">
                {parts.romaji}
              </span>
              {parts.kana && (
                <span className="text-base text-[var(--color-text-muted)]">
                  {parts.kana}
                </span>
              )}
            </div>
            {parts.translation && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {parts.translation}
              </span>
            )}
          </div>
        );
      })()}

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {/* Summary always visible — the rule's how-it-works paragraph. */}
        <div
          className="whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
        {hasDetail && expanded && (
          <div
            className="mt-3 border-t border-[var(--color-border)] pt-3 whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: detail }}
          />
        )}
        {hasDetail && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-3 text-xs font-medium text-[var(--color-jlpt-n4)] hover:underline"
          >
            {expanded ? "Show less" : "Show more examples"}
          </button>
        )}
      </div>

      {/* Verb drills nudge — grammar rules always involve verb forms */}
      <Link
        href="/verbs"
        className="self-start rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-dim)] no-underline transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
      >
        💡 Practice verb forms →
      </Link>

      <Button type="button" variant="primary" size="sm" onClick={onContinue} className="self-end">
        Got it — start practice
      </Button>
    </div>
  );
}
