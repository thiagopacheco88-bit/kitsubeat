"use client";

import { useEffect, useState } from "react";
import { hasJapaneseVoice, onVoicesChanged, speakJapanese } from "@/lib/tts";

interface Props {
  kana: string;
  romaji: string;
  onGotIt: () => void; // caller awards 1 star (setStars to 1) and advances
  label?: string; // override the top heading (e.g. "Missed — review" for relearn)
}

export function KanaLearnCard({
  kana,
  romaji,
  onGotIt,
  label = "New character",
}: Props) {
  const [voiceReady, setVoiceReady] = useState(() => hasJapaneseVoice());
  useEffect(() => {
    const unsub = onVoicesChanged(() => setVoiceReady(hasJapaneseVoice()));
    return unsub;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onGotIt();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onGotIt]);

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <span className="text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-7xl font-semibold leading-none">{kana}</span>
        {voiceReady && (
          <button
            type="button"
            aria-label={`Play pronunciation of ${kana}`}
            onClick={() => speakJapanese(kana)}
            className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span aria-hidden="true">🔊</span>
          </button>
        )}
      </div>
      <div className="text-3xl text-zinc-700 dark:text-zinc-200">{romaji}</div>
      <button
        type="button"
        onClick={onGotIt}
        className="rounded-md bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700"
      >
        Got it (Space)
      </button>
    </div>
  );
}
