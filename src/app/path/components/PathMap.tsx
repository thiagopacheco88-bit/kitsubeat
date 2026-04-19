"use client";

import { PathNode } from "./PathNode";
import type { SongListItem } from "@/lib/db/queries";

interface PathMapProps {
  songs: SongListItem[];
  currentNodeSlug: string;
}

const TIER_ORDER: Record<string, number> = {
  basic: 0,
  intermediate: 1,
  advanced: 2,
};

function tierLabel(tier: string | null | undefined): string {
  if (tier === "basic") return "Beginner";
  if (tier === "intermediate") return "Intermediate";
  if (tier === "advanced") return "Advanced";
  return tier ?? "Unknown";
}

/**
 * PathMap — stepped vertical learning-path map.
 *
 * Sorts songs by difficulty_tier (basic → intermediate → advanced),
 * then by popularity_rank ASC (null last). Renders tier-chip dividers
 * between groups. Alternates left/right offset for a winding visual effect.
 *
 * M1 guard: no disabled attrs / pointer-events:none on any node.
 */
export function PathMap({ songs, currentNodeSlug }: PathMapProps) {
  // Sort in JS: tier_order ASC, popularity_rank ASC (null → 999999)
  const sorted = [...songs].sort((a, b) => {
    const ta = TIER_ORDER[a.difficulty_tier ?? ""] ?? 3;
    const tb = TIER_ORDER[b.difficulty_tier ?? ""] ?? 3;
    if (ta !== tb) return ta - tb;
    const ra = (a as unknown as { popularity_rank?: number | null }).popularity_rank ?? 999999;
    const rb = (b as unknown as { popularity_rank?: number | null }).popularity_rank ?? 999999;
    return ra - rb;
  });

  let lastTier: string | null = null;
  let globalIndex = 0;

  const elements: React.ReactNode[] = [];

  for (const song of sorted) {
    const tier = song.difficulty_tier ?? "unknown";

    // Insert tier divider chip on tier change
    if (tier !== lastTier) {
      elements.push(
        <div
          key={`tier-${tier}`}
          className="flex items-center gap-3 my-4"
          aria-label={`Tier: ${tierLabel(tier)}`}
        >
          <div className="flex-1 border-t border-gray-700" />
          <span className="rounded-full border border-gray-600 bg-gray-800 px-3 py-0.5 text-xs font-semibold text-gray-300 uppercase tracking-wide">
            {tierLabel(tier)}
          </span>
          <div className="flex-1 border-t border-gray-700" />
        </div>
      );
      lastTier = tier;
    }

    // Alternate left/right alignment for winding path effect
    const alignClass =
      globalIndex % 2 === 0 ? "mr-auto" : "ml-auto";

    const isCurrent = song.slug === currentNodeSlug;
    // Completion: any exercise has been touched (ex1_2_3_best_accuracy > 0)
    const isCompleted = (song.ex1_2_3_best_accuracy ?? 0) > 0;

    elements.push(
      <div key={song.slug} className={`${alignClass} w-full max-w-xs`}>
        <PathNode song={song} isCurrent={isCurrent} isCompleted={isCompleted} />
      </div>
    );

    globalIndex++;
  }

  return (
    <div className="flex flex-col gap-2 space-y-1" role="list" aria-label="Learning path">
      {elements}
    </div>
  );
}
