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
 *
 * Phase 14 Plan 14-08 migration notes: token-driven surfaces; the active
 * pill uses --color-text (foreground) on --color-card (background-inverse-
 * style by virtue of a strong border + accent ring). Inactive uses muted
 * text + card-2 hover. Kept as bare <button> elements rather than the
 * Button primitive — segmented role="tab" semantics conflict with the
 * primitive's button-only api shape.
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
      className="grid w-full grid-cols-3 gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] p-1 sm:inline-grid sm:w-auto"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`min-h-11 rounded-[var(--radius-md)] px-3 text-sm font-semibold transition-colors sm:px-4 ${
              active
                ? "bg-[var(--color-accent)] [color:white] shadow-[var(--shadow-button-red)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
