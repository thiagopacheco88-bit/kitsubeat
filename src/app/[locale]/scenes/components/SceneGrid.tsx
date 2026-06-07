"use client";

import { useMemo, useState } from "react";
import type { SceneListItem } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import SongCard from "@/app/songs/components/SongCard";

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export default function SceneGrid({
  scenes,
  initialSearch = "",
}: {
  scenes: SceneListItem[];
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [jlptFilter, setJlptFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = scenes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.anime.toLowerCase().includes(q) ||
          (s.artist ?? "").toLowerCase().includes(q)
      );
    }
    if (jlptFilter) {
      result = result.filter((s) => s.jlpt_level === jlptFilter);
    }
    return result;
  }, [scenes, search, jlptFilter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring)] sm:p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search scenes, anime..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-border-strong)] lg:w-72"
            suppressHydrationWarning
          />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {JLPT_LEVELS.map((level) => (
              <button
                suppressHydrationWarning
                key={level}
                onClick={() => setJlptFilter(jlptFilter === level ? null : level)}
                className={`rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-bold transition-colors ${
                  jlptFilter === level
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          heading="No scenes found"
          body="Try adjusting your search or filters."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((scene) => (
            <SongCard
              key={scene.slug}
              song={scene as Parameters<typeof SongCard>[0]["song"]}
              basePath="/scenes"
            />
          ))}
        </div>
      )}
    </div>
  );
}
