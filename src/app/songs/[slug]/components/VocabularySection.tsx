"use client";

import { useState } from "react";
import type { VocabEntry } from "@/lib/types/lesson";
import { GRAMMAR_COLOR_CLASS, JLPT_COLOR_CLASS } from "@/lib/types/lesson";

const TABS = [
  "all",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "expression",
] as const;

export default function VocabularySection({
  vocabulary,
}: {
  vocabulary: VocabEntry[];
}) {
  const [tab, setTab] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);

  const filtered =
    tab === "all"
      ? vocabulary
      : vocabulary.filter((v) => v.part_of_speech === tab);

  return (
    <div>
      <button
        onClick={() => setSectionOpen(!sectionOpen)}
        className="mb-3 flex items-center gap-2 text-lg font-semibold text-white hover:text-gray-300 transition-colors"
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
        <span className="text-sm font-normal text-gray-500">
          {vocabulary.length}
        </span>
      </button>
      {sectionOpen && <><div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => {
          const count =
            t === "all"
              ? vocabulary.length
              : vocabulary.filter((v) => v.part_of_speech === t).length;
          if (t !== "all" && count === 0) return null;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
                tab === t
                  ? "bg-white text-gray-900"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
  const colorClass =
    GRAMMAR_COLOR_CLASS[
      entry.part_of_speech as keyof typeof GRAMMAR_COLOR_CLASS
    ] ?? "text-gray-300";

  return (
    <div
      className="cursor-pointer rounded-lg border border-gray-800 bg-gray-900/50 p-3 transition-colors hover:border-gray-700"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span
          className={`text-lg font-bold font-[family-name:var(--font-noto-jp)] ${colorClass}`}
        >
          {entry.surface}
        </span>
        <span className="text-sm text-gray-400">
          {entry.reading} &middot; {entry.romaji}
        </span>
        <span className="ml-auto text-sm text-gray-300">{entry.meaning}</span>
        {entry.jlpt_level !== "unknown" && (
          <span
            className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold text-white ${JLPT_COLOR_CLASS[entry.jlpt_level] ?? "bg-gray-600"}`}
          >
            {entry.jlpt_level}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <p className="text-xs italic text-gray-400 font-[family-name:var(--font-noto-jp)]">
            &ldquo;{entry.example_from_song}&rdquo;
          </p>
          {entry.additional_examples.length > 0 && (
            <ul className="mt-2 space-y-1">
              {entry.additional_examples.map((ex, i) => (
                <li key={i} className="text-xs text-gray-500">
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
