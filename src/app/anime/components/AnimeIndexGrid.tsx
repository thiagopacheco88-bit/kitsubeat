"use client";

import Image from "next/image";
import { CardLink } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AnimeCatalogEntry } from "@/lib/db/queries";

// Friendly display names per slug (for fallback when title_english is null)
const SLUG_DISPLAY: Record<string, string> = {
  "one-piece": "One Piece",
  "naruto": "Naruto",
  "bleach": "Bleach",
  "fullmetal-alchemist": "Fullmetal Alchemist",
  "attack-on-titan": "Attack on Titan",
  "sword-art-online": "Sword Art Online",
};

interface AnimeIndexGridProps {
  animes: AnimeCatalogEntry[];
}

export default function AnimeIndexGrid({ animes }: AnimeIndexGridProps) {
  if (animes.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--color-text-muted)]">
        <p className="text-lg">No anime vocabulary available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {animes.map((entry) => {
        const displayTitle =
          entry.title_english ?? SLUG_DISPLAY[entry.anime_slug] ?? entry.anime_slug;

        return (
          <CardLink
            key={entry.anime_slug}
            href={`/anime/${entry.anime_slug}`}
            variant="flat"
            size="sm"
            className="relative overflow-hidden"
          >
            {/* Cover image */}
            <div className="relative h-48 w-full overflow-hidden bg-[var(--color-card-2)] -mx-3 -mt-3 mb-3">
              {entry.cover_image ? (
                <Image
                  src={entry.cover_image}
                  alt={`${displayTitle} cover`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105 duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-4xl opacity-20">🎌</span>
                </div>
              )}
              {/* Word count badge overlay */}
              <div className="absolute bottom-2 right-2">
                <Badge variant="mono">{entry.word_count} words</Badge>
              </div>
            </div>

            {/* Card body */}
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-[var(--color-text)] leading-tight group-hover:text-[var(--color-accent)] transition-colors">
                {displayTitle}
              </h2>

              {/* JLPT badge */}
              {entry.top_jlpt && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">Starts at</span>
                  <Badge
                    variant="jlpt"
                    level={entry.top_jlpt as "N5" | "N4" | "N3" | "N2" | "N1"}
                  />
                </div>
              )}

              {/* Description snippet */}
              {entry.description && (
                <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                  {entry.description}
                </p>
              )}
            </div>
          </CardLink>
        );
      })}
    </div>
  );
}
