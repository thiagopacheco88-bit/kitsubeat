"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

interface LanternStreakProps {
  count: number;
}

const STREAK_KEY = "kb_streak";

function lanternOpacity(count: number): number {
  if (count >= 30) return 1;
  if (count >= 7) return 0.8;
  return 0.55;
}

function streakLabel(count: number): string {
  if (count >= 30) return `🔥 ${count}-day streak — on fire!`;
  if (count >= 7) return `🏮 ${count}-day streak — keep it up!`;
  return `🏮 ${count}-day streak`;
}

export function LanternStreak({ count }: LanternStreakProps) {
  const opacity = lanternOpacity(count);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STREAK_KEY);
    const prev = stored !== null ? Number(stored) : null;
    if (prev !== null && count > prev && rootRef.current) {
      rootRef.current.dataset.lanternPulsing = "1";
      const t = setTimeout(() => {
        if (rootRef.current) delete rootRef.current.dataset.lanternPulsing;
      }, 700);
      localStorage.setItem(STREAK_KEY, String(count));
      return () => clearTimeout(t);
    }
    localStorage.setItem(STREAK_KEY, String(count));
  }, [count]);

  return (
    <span
      ref={rootRef}
      role="img"
      aria-label={`${count}-day streak`}
      className="relative inline-flex items-center gap-1.5 group cursor-default"
      data-testid="lantern-streak"
    >
      {/* Lantern icon */}
      <Image
        src="/streak-lantern.png"
        width={26}
        height={26}
        alt=""
        aria-hidden="true"
        className="flex-shrink-0 rounded-full"
        style={{ opacity }}
      />

      {/* Streak count */}
      <span
        className="text-sm font-semibold tabular-nums text-[var(--color-text)]"
        data-testid="lantern-streak-count"
      >
        {count}
      </span>

      {/* Tooltip — appears above on hover, CSS only */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          whitespace-nowrap rounded-md bg-[var(--color-card-2)] border border-[var(--color-border)]
          px-2.5 py-1 text-xs font-medium text-[var(--color-text)]
          shadow-[var(--shadow-md)]
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
        "
      >
        {streakLabel(count)}
      </span>
    </span>
  );
}
