"use client";

interface CategoryTabBarProps {
  categories: string[];  // derived from distinct category values in word set
  selected: string;      // "All" or a category string
  onChange: (cat: string) => void;
}

export default function CategoryTabBar({ categories, selected, onChange }: CategoryTabBarProps) {
  if (categories.length === 0) return null;

  const allTabs = ["All", ...categories];

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      role="tablist"
      aria-label="Filter by category"
    >
      {allTabs.map((cat) => {
        const isActive = selected === cat;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat)}
            className={`
              whitespace-nowrap rounded-md px-3 py-1.5 text-sm capitalize transition-colors
              ${
                isActive
                  ? "bg-[var(--color-surface-elevated)] text-[var(--color-text)] font-medium"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }
            `}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
