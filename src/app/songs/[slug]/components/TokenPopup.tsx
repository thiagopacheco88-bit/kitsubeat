"use client";

import { useEffect, useRef, useState } from "react";
import type { Token } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { Badge } from "@/components/ui/Badge";
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
      data-testid="token-popup"
      className={`absolute top-full z-50 mt-2 w-60 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring-strong)] ${
        alignRight ? "right-0" : "left-1/2 -translate-x-1/2"
      }`}
    >
      <div className="mb-2 text-center text-2xl font-bold text-[var(--color-text)] font-[family-name:var(--font-noto-jp)]">
        {token.surface}
      </div>
      <div className="mb-2 text-center text-sm text-[var(--color-text-muted)]">
        {token.reading} &middot; {token.romaji}
      </div>
      <div className="mb-2 text-center text-sm text-[var(--color-text)]">
        {localize(token.meaning, translationLang)}
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-card-2)] px-1.5 py-0.5 text-[var(--text-micro)] capitalize text-[var(--color-text-muted)]">
          {token.grammar}
        </span>
        {token.jlpt_level !== "unknown" && token.jlpt_level && (
          <Badge
            variant="jlpt"
            level={token.jlpt_level as "N5" | "N4" | "N3" | "N2" | "N1"}
          />
        )}
      </div>
    </div>
  );
}
