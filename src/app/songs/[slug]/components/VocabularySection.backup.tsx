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

  const filtered =
    tab === "all"
      ? vocabulary
      : vocabulary.filter((v) => v.part_of_speech === tab);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-white">Vocabulary</h2>
      <div className="mb-4 flex flex-wrap gap-1">
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
      </div>
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
