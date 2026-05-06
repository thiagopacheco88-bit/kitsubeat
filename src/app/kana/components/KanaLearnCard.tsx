"use client";

import { useEffect, useState } from "react";
import { hasJapaneseVoice, onVoicesChanged, speakJapanese } from "@/lib/tts";
import { Button } from "@/components/ui/Button";

interface Props {
  kana: string;
  romaji: string;
  onGotIt: () => void; // caller awards 1 star (setStars to 1) and advances
  label?: string; // override the top heading (e.g. "Missed — review" for relearn)
}

/**
 * Pre-revealed answer for 0-star kana — "learn card" variant of the drill UI.
 *
 * Phase 14 Plan 14-08 migration notes:
 * - All palette utilities (text-zinc-N00, bg-zinc-N00, bg-emerald-N00) replaced
 *   with token references; tokens auto-flip across themes via :root[data-theme=
 *   "light"] in globals.css (no `dark:` Tailwind variant needed).
 * - "Got it" CTA uses Button primitive variant=primary so the celebratory red
 *   accent matches every other primary CTA on /kana surfaces.
 */
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
      <span className="text-xs uppercase tracking-wide text-[var(--color-text-dim)]">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-7xl font-semibold leading-none text-[var(--color-text)]">
          {kana}
        </span>
        {voiceReady && (
          <button
            type="button"
            aria-label={`Play pronunciation of ${kana}`}
            onClick={() => speakJapanese(kana)}
            className="min-h-11 min-w-11 rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
          >
            <span aria-hidden="true">🔊</span>
          </button>
        )}
      </div>
      <div className="text-3xl text-[var(--color-text-muted)]">{romaji}</div>
      <Button type="button" variant="primary" size="lg" onClick={onGotIt}>
        Got it (Space)
      </Button>
    </div>
  );
}
