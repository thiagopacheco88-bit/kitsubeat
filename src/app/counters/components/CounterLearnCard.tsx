"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { Counter } from "@/lib/counters/types";

interface Props {
  counter: Counter;
  onGotIt: () => void;
  label?: string;
}

const ALL_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function CounterLearnCard({ counter, onGotIt, label = "New counter" }: Props) {
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
      <div className="flex flex-col items-center gap-2">
        <span
          className="font-black leading-none text-[var(--color-text)]"
          style={{ fontSize: "64px", fontFamily: "var(--font-jp)" }}
        >
          {counter.kanji}
        </span>
        <span className="text-2xl text-[var(--color-text-muted)]">{counter.reading}</span>
      </div>
      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Counts{" "}
        <strong className="text-[var(--color-text)]">{counter.what}</strong>
        {counter.examples.length > 0 && (
          <> — {counter.examples.join(", ")}</>
        )}
      </p>
      <div className="grid w-full grid-cols-5 gap-1.5">
        {ALL_NUMS.map((n) => (
          <div
            key={n}
            className="flex flex-col items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-1.5 py-2"
          >
            <span className="text-xs text-[var(--color-text-dim)]">{n}</span>
            <span className="text-xs font-semibold text-[var(--color-text)] leading-tight text-center">
              {counter.formRomaji[n]}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] leading-tight">
              {counter.forms[n]}
            </span>
          </div>
        ))}
      </div>
      <Button type="button" variant="primary" size="lg" onClick={onGotIt}>
        Got it (Space)
      </Button>
    </div>
  );
}
