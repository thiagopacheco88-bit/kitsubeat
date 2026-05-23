"use client";

export type JlptFilter = "All" | "N5" | "N4" | "N3" | "N2" | "N1" | "Anime-specific";

interface JlptFilterBarProps {
  selected: JlptFilter;
  onChange: (filter: JlptFilter) => void;
}

const FILTERS: JlptFilter[] = ["All", "N5", "N4", "N3", "N2", "N1", "Anime-specific"];

export default function JlptFilterBar({ selected, onChange }: JlptFilterBarProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      role="group"
      aria-label="Filter by JLPT level"
    >
      {FILTERS.map((filter) => {
        const isActive = selected === filter;
        return (
          <button
            key={filter}
            onClick={() => onChange(filter)}
            aria-pressed={isActive}
            className={`
              whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors
              ${
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
              }
            `}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
