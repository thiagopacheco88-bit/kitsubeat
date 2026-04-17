"use client";

import { useEffect, useRef, useState } from "react";
import type { Token } from "@/lib/types/lesson";
import { JLPT_COLOR_CLASS, localize } from "@/lib/types/lesson";
import { usePlayer } from "./PlayerContext";

export default function TokenPopup({
  token,
  onClose,
}: {
  token: Token;
  onClose: () => void;
}) {
  const { translationLang } = usePlayer();
  const ref = useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    // Check if popup overflows right edge
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.right > window.innerWidth - 16) {
        setAlignRight(true);
      }
      if (rect.left < 16) {
        setAlignRight(false);
      }
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute top-full z-50 mt-2 w-60 rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl ${
        alignRight ? "right-0" : "left-1/2 -translate-x-1/2"
      }`}
    >
      <div className="mb-2 text-center text-2xl font-bold text-white font-[family-name:var(--font-noto-jp)]">
        {token.surface}
      </div>
      <div className="mb-2 text-center text-sm text-gray-400">
        {token.reading} &middot; {token.romaji}
      </div>
      <div className="mb-2 text-center text-sm text-white">
        {localize(token.meaning, translationLang)}
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] capitalize text-gray-400">
          {token.grammar}
        </span>
        {token.jlpt_level !== "unknown" && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${JLPT_COLOR_CLASS[token.jlpt_level] ?? "bg-gray-600"}`}
          >
            {token.jlpt_level}
          </span>
        )}
      </div>
    </div>
  );
}
