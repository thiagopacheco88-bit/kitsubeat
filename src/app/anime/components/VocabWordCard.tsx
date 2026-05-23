"use client";

import { Badge } from "@/components/ui/Badge";
import type { AnimeVocabItem } from "@/lib/db/queries";

interface VocabWordCardProps {
  word: AnimeVocabItem;
  locale: string;
}

// Mastery dot: grey=new(0), yellow=learning(1), green=mastered(2,3)
function MasteryDot({ state }: { state: number }) {
  const colors: Record<number, string> = {
    0: "bg-[var(--color-text-muted)] opacity-40", // grey — new
    1: "bg-yellow-400",                            // yellow — learning
    2: "bg-green-500",                             // green — review
    3: "bg-green-500",                             // green — relearning
  };
  const label: Record<number, string> = {
    0: "New",
    1: "Learning",
    2: "Mastered",
    3: "Relearning",
  };
  const colorClass = colors[state] ?? colors[0];
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colorClass}`}
      aria-label={`Mastery: ${label[state] ?? "New"}`}
      role="status"
    />
  );
}

type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

const VALID_JLPT_LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

function isJlptLevel(v: string | null): v is JlptLevel {
  return v !== null && (VALID_JLPT_LEVELS as string[]).includes(v);
}

export default function VocabWordCard({ word, locale }: VocabWordCardProps) {
  const meaning = word.meaning[locale] ?? word.meaning["en"] ?? "";

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2 hover:border-[var(--color-border-strong)] transition-colors">
      {/* Header: kanji large + mastery dot */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl font-bold text-[var(--color-text)] leading-tight">
          {word.surface}
        </span>
        <MasteryDot state={word.mastery_state} />
      </div>

      {/* Reading (hiragana) + romaji */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-[var(--color-text-muted)]">{word.reading}</span>
        <span className="text-sm text-[var(--color-text-muted)] italic">{word.romaji}</span>
      </div>

      {/* Localized meaning */}
      <p className="text-sm font-medium text-[var(--color-text)]">{meaning}</p>

      {/* Badges row: JLPT + category */}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {isJlptLevel(word.jlpt_level) ? (
          <Badge variant="jlpt" level={word.jlpt_level} />
        ) : (
          <Badge variant="mono" className="text-xs">Anime</Badge>
        )}
        <Badge variant="mono" className="text-xs capitalize">{word.category}</Badge>
      </div>

      {/* Context note (anime hook sentence) */}
      {word.context_note && (
        <p className="text-xs text-[var(--color-text-muted)] italic border-t border-[var(--color-border)] pt-2 mt-1 leading-relaxed">
          {word.context_note}
        </p>
      )}
    </div>
  );
}
