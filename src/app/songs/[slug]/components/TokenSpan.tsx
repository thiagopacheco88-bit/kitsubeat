"use client";

import { useState, useRef } from "react";
import type { Token } from "@/lib/types/lesson";
import { GRAMMAR_COLOR_CLASS } from "@/lib/types/lesson";
import { usePlayer } from "./PlayerContext";
import TokenPopup from "./TokenPopup";

function hasKanji(text: string): boolean {
  return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
}

export default function TokenSpan({ token }: { token: Token }) {
  const { showFurigana } = usePlayer();
  const [showPopup, setShowPopup] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const colorClass = GRAMMAR_COLOR_CLASS[token.grammar] ?? "text-gray-300";
  const needsFurigana =
    showFurigana && hasKanji(token.surface) && token.surface !== token.reading;

  return (
    <span ref={ref} className="relative inline-block">
      <span
        onClick={() => setShowPopup(!showPopup)}
        className={`cursor-pointer rounded px-0.5 transition-colors hover:bg-white/10 ${colorClass}`}
      >
        {needsFurigana ? (
          <ruby>
            {token.surface}
            <rp>(</rp>
            <rt className="text-[0.55em] font-normal text-gray-400">
              {token.reading}
            </rt>
            <rp>)</rp>
          </ruby>
        ) : (
          token.surface
        )}
      </span>
      {showPopup && (
        <TokenPopup token={token} onClose={() => setShowPopup(false)} />
      )}
    </span>
  );
}
