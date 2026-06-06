"use client";

import { useState } from "react";
import type { VocabEntry } from "@/lib/types/lesson";
import { GRAMMAR_COLOR_CLASS, localize } from "@/lib/types/lesson";
import { Badge } from "@/components/ui/Badge";
import { usePlayer } from "./PlayerContext";

const POS_TABS = [
  "all",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "expression",
] as const;

const JLPT_TABS = ["all", "N5", "N4", "N3", "N2", "N1", "unknown"] as const;
const jlptLevels = new Set(["N5", "N4", "N3", "N2", "N1"]);

type ViewMode = "pos" | "jlpt";

export default function VocabularySection({
  vocabulary,
}: {
  vocabulary: VocabEntry[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("pos");
  const [tab, setTab] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);

  const TABS = viewMode === "pos" ? POS_TABS : JLPT_TABS;

  const matchTab = (v: VocabEntry) =>
    viewMode === "pos" ? v.part_of_speech === tab : v.jlpt_level === tab;

  const filtered = tab === "all" ? vocabulary : vocabulary.filter(matchTab);

  const switchMode = (next: ViewMode) => {
    setViewMode(next);
    setTab("all");
    setExpanded(null);
  };

  return (
    <div>
      <button
        onClick={() => setSectionOpen(!sectionOpen)}
        className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-text-muted)]"
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
        Vocabulary
        <span className="text-sm font-normal text-[var(--color-text-dim)]">
          {vocabulary.length}
        </span>
      </button>
      {sectionOpen && <>
      <div className="mb-3 inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 text-xs">
        <button
          onClick={() => switchMode("pos")}
          className={`min-h-11 rounded-[var(--radius-sm)] px-2 py-1 transition-colors ${
            viewMode === "pos"
              ? "bg-[var(--color-text)] text-[var(--color-bg)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          By type
        </button>
        <button
          onClick={() => switchMode("jlpt")}
          className={`min-h-11 rounded-[var(--radius-sm)] px-2 py-1 transition-colors ${
            viewMode === "jlpt"
              ? "bg-[var(--color-text)] text-[var(--color-bg)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          By JLPT
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => {
          const count =
            t === "all"
              ? vocabulary.length
              : vocabulary.filter((v) =>
                  viewMode === "pos"
                    ? v.part_of_speech === t
                    : v.jlpt_level === t
                ).length;
          if (t !== "all" && count === 0) return null;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`min-h-11 rounded-[var(--radius-sm)] px-2 py-1 text-xs capitalize transition-colors ${
                tab === t
                  ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                  : "bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {t === "all" ? `All (${count})` : `${t} (${count})`}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        {filtered.map((entry, i) => (
          <VocabRow
            key={i}
            entry={entry}
            isExpanded={expanded === i}
            onToggle={() => setExpanded(expanded === i ? null : i)}
          />
        ))}
      </div></>}
    </div>
  );
}

function VocabRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: VocabEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { translationLang } = usePlayer();
  const colorClass =
    GRAMMAR_COLOR_CLASS[
      entry.part_of_speech as keyof typeof GRAMMAR_COLOR_CLASS
    ] ?? "text-[var(--color-text-muted)]";

  return (
    <div
      data-testid="vocab-row"
      className="cursor-pointer rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 transition-colors hover:border-[var(--color-border-strong)]"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span
          className={`text-lg font-bold font-[family-name:var(--font-noto-jp)] ${colorClass}`}
        >
          {entry.surface}
        </span>
        <span className="text-sm text-[var(--color-text-muted)]">
          {entry.reading} &middot; {entry.romaji}
        </span>
        <span className="ml-auto text-sm text-[var(--color-text)]">
          {localize(entry.meaning, translationLang)}
        </span>
        {jlptLevels.has(entry.jlpt_level) && (
          <Badge
            variant="jlpt"
            level={entry.jlpt_level as "N5" | "N4" | "N3" | "N2" | "N1"}
            className="shrink-0"
          />
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs italic text-[var(--color-text-muted)] font-[family-name:var(--font-noto-jp)]">
            &ldquo;{entry.example_from_song}&rdquo;
          </p>
          {entry.additional_examples.length > 0 && (
            <ul className="mt-2 space-y-1">
              {entry.additional_examples.map((ex, i) => (
                <li key={i} className="text-xs text-[var(--color-text-dim)]">
                  {ex}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
