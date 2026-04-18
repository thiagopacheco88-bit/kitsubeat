"use client";

import type { KanaMode } from "@/lib/kana/types";

interface Props {
  value: KanaMode;
  onChange: (mode: KanaMode) => void;
}

/**
 * Hiragana / Katakana / Mixed segmented control.
 *
 * `KanaMode` is imported (not redefined) from `@/lib/kana/types` so that
 * plan 09-05 (session route) does not indirectly depend on this UI module.
 * Both plans live in wave 3 and must stay parallel-safe.
 */
export function ModeToggle({ value, onChange }: Props) {
  const options: Array<{ id: KanaMode; label: string }> = [
    { id: "hiragana", label: "Hiragana" },
    { id: "katakana", label: "Katakana" },
    { id: "mixed", label: "Mixed" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Kana mode"
      className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-1 gap-1"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
