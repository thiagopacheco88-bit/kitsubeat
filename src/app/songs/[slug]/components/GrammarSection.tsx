"use client";

import { useState } from "react";
import type { GrammarPoint } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { parseRuleName } from "@/lib/grammar/rule-name";
import { usePlayer } from "./PlayerContext";

export default function GrammarSection({
  points,
}: {
  points: GrammarPoint[];
}) {
  const [showRomaji, setShowRomaji] = useState(true);
  const [sectionOpen, setSectionOpen] = useState(true);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setSectionOpen(!sectionOpen)}
          className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-text-muted)]"
        >
          <svg
            className={`h-4 w-4 shrink-0 transition-transform ${sectionOpen ? "rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          Grammar Points
          <span className="text-sm font-normal text-[var(--color-text-dim)]">
            {points.length}
          </span>
        </button>
        <button
          onClick={() => setShowRomaji(!showRomaji)}
          className={`min-h-11 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium transition-colors ${
            showRomaji
              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-readable)]"
              : "bg-[var(--color-card-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
          }`}
        >
          Romaji {showRomaji ? "ON" : "OFF"}
        </button>
      </div>
      {sectionOpen && (
        <div className="flex flex-col gap-3">
          {points.map((point, i) => (
            <GrammarCard key={i} point={point} showRomaji={showRomaji} />
          ))}
        </div>
      )}
    </div>
  );
}

function GrammarCard({
  point,
  showRomaji,
}: {
  point: GrammarPoint;
  showRomaji: boolean;
}) {
  const { translationLang } = usePlayer();
  const [open, setOpen] = useState(false);
  const rawExplanation = localize(point.explanation, translationLang);
  const explanation = showRomaji ? rawExplanation : stripRomaji(rawExplanation);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-2 text-left"
      >
        <svg
          className={`mt-1.5 h-3 w-3 shrink-0 text-[var(--color-text-dim)] transition-transform ${open ? "rotate-90" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
            {(() => {
              const parts = parseRuleName(point.name);
              return (
                <>
                  <span className="text-base font-semibold text-[var(--color-text)] font-[family-name:var(--font-noto-jp)]">
                    {parts.romaji}
                  </span>
                  {parts.kana && (
                    <span className="text-sm text-[var(--color-text-muted)] font-[family-name:var(--font-noto-jp)]">
                      {parts.kana}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          {(() => {
            const parts = parseRuleName(point.name);
            return parts.translation ? (
              <span className="text-xs text-[var(--color-text-muted)]">{parts.translation}</span>
            ) : null;
          })()}
        </div>
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-card-2)] px-1.5 py-0.5 text-[var(--text-micro)] text-[var(--color-text-muted)] shrink-0 mt-1.5">
          {point.jlpt_reference}
        </span>
      </button>

      {open && (
        <>
          <div className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {explanation.split("\n").map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-2" />;
              // Lines may contain <ruby> furigana markup — render as HTML.
              // Source is our own seed data (DB grammar_rules.explanation), not user input.
              if (/^(How it works|Example from this song|More examples|Note|Tip|Casual|In this song):?/i.test(line)) {
                const [label, ...rest] = line.split(":");
                return (
                  <p key={i} className="mt-2 first:mt-0">
                    <span className="font-medium text-[var(--color-text)]">{label}:</span>
                    <span
                      className="text-[var(--color-text-muted)]"
                      dangerouslySetInnerHTML={{ __html: rest.join(":") }}
                    />
                  </p>
                );
              }
              if (line.startsWith("•") || line.startsWith("-")) {
                return (
                  <p
                    key={i}
                    className="ml-4 text-[var(--color-text-muted)] font-[family-name:var(--font-noto-jp)]"
                    dangerouslySetInnerHTML={{ __html: line }}
                  />
                );
              }
              return (
                <p
                  key={i}
                  className="font-[family-name:var(--font-noto-jp)]"
                  dangerouslySetInnerHTML={{ __html: line }}
                />
              );
            })}
          </div>

          {point.conjugation_path && (
            <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-card-2)] px-3 py-2">
              <div className="text-xs text-[var(--color-text-dim)] mb-1">Conjugation Path</div>
              <p className="text-sm text-[var(--color-text-muted)] font-[family-name:var(--font-noto-jp)]">
                {showRomaji ? point.conjugation_path : stripRomaji(point.conjugation_path)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Remove romaji annotations in parentheses when romaji mode is off.
 * Matches patterns like (taberu), (taberu, "to eat"), (modoritai, 'want to return')
 */
function stripRomaji(text: string): string {
  // Remove (romaji) and (romaji, "meaning") patterns
  return text.replace(/\s*\([a-zA-Z][a-zA-Z\s\-']*(?:,\s*["'][^"']+["'])?\)/g, "");
}
