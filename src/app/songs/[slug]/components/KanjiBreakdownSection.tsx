"use client";

import type { KanjiBreakdown } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";

interface Props {
  breakdown: KanjiBreakdown;
  lang: string;
}

export default function KanjiBreakdownSection({ breakdown, lang }: Props) {
  if (!breakdown.characters || breakdown.characters.length === 0) return null;

  return (
    <div className="rounded-md border border-gray-700/40 bg-gray-800/40 p-3">
      <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Kanji breakdown</p>
      <div className="flex flex-col gap-1.5">
        {breakdown.characters.map((c) => (
          <div key={c.char} className="flex items-baseline gap-2 text-sm">
            <span className="w-6 shrink-0 text-lg font-semibold text-white">{c.char}</span>
            <span className="text-xs text-gray-400">
              {c.on_yomi}
              {c.kun_yomi ? ` / ${c.kun_yomi}` : ""}
            </span>
            <span className="text-gray-300">{localize(c.meaning, lang)}</span>
            <span className="ml-auto text-xs text-gray-600">{localize(c.radical_hint, lang)}</span>
          </div>
        ))}
      </div>
      {breakdown.compound_note && (
        <p className="mt-2 text-xs italic text-gray-500">{localize(breakdown.compound_note, lang)}</p>
      )}
    </div>
  );
}
