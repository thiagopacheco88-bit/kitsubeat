"use client";

import { useState } from "react";
import type { GrammarPoint } from "@/lib/types/lesson";

export default function GrammarSection({
  points,
}: {
  points: GrammarPoint[];
}) {
  const [showRomaji, setShowRomaji] = useState(true);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Grammar Points
          <span className="ml-2 text-sm font-normal text-gray-500">
            {points.length}
          </span>
        </h2>
        <button
          onClick={() => setShowRomaji(!showRomaji)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            showRomaji
              ? "bg-red-500/20 text-red-400"
              : "bg-gray-800 text-gray-500 hover:bg-gray-700"
          }`}
        >
          Romaji {showRomaji ? "ON" : "OFF"}
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {points.map((point, i) => (
          <GrammarCard key={i} point={point} showRomaji={showRomaji} />
        ))}
      </div>
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
  const explanation = showRomaji
    ? point.explanation
    : stripRomaji(point.explanation);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-base font-semibold text-white font-[family-name:var(--font-noto-jp)]">
          {point.name}
        </span>
        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
          {point.jlpt_reference}
        </span>
      </div>

      <div className="text-sm leading-relaxed text-gray-300">
        {explanation.split("\n").map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-2" />;
          // Style "How it works:", "Example from this song:", "More examples:", "Note:" as headers
          if (/^(How it works|Example from this song|More examples|Note|Tip|Casual|In this song):?/i.test(line)) {
            const [label, ...rest] = line.split(":");
            return (
              <p key={i} className="mt-2 first:mt-0">
                <span className="font-medium text-gray-200">{label}:</span>
                <span className="text-gray-300">{rest.join(":")}</span>
              </p>
            );
          }
          // Bullet points
          if (line.startsWith("•") || line.startsWith("-")) {
            return (
              <p key={i} className="ml-4 text-gray-400 font-[family-name:var(--font-noto-jp)]">
                {line}
              </p>
            );
          }
          return <p key={i} className="font-[family-name:var(--font-noto-jp)]">{line}</p>;
        })}
      </div>

      {point.conjugation_path && (
        <div className="mt-3 rounded bg-gray-800/50 px-3 py-2">
          <div className="text-xs text-gray-500 mb-1">Conjugation Path</div>
          <p className="text-sm text-gray-300 font-[family-name:var(--font-noto-jp)]">
            {showRomaji ? point.conjugation_path : stripRomaji(point.conjugation_path)}
          </p>
        </div>
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
