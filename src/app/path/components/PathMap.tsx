"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PathNode } from "./PathNode";
import { TierDivider } from "./TierDivider";
import { KanaCheckpointNode } from "./KanaCheckpointNode";
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
  const prefersReduced = useReducedMotion();

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

    // Delegate tier-divider rendering to <TierDivider> (SPEC-REQ-7).
    // At the start of the basic tier, also insert 2 KanaCheckpointNode rows
    // (SPEC-REQ-6 + CONTEXT D-19 beginner inclusivity).
    if (tier !== lastTier) {
      elements.push(<TierDivider key={`tier-${tier}`} tier={tier} />);
      lastTier = tier;

      // Phase 14.1 SPEC-REQ-6: insert kana-checkpoint row at the start of
      // the basic tier (CONTEXT Specifics — beginner inclusivity per D-19).
      if (tier === "basic") {
        elements.push(
          <div
            key="kana-checkpoint-row"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2"
            role="list"
            aria-label="Kana checkpoints"
          >
            <KanaCheckpointNode script="hiragana" />
            <KanaCheckpointNode script="katakana" />
          </div>
        );
      }
    }

    // Alternate left/right alignment for winding path effect
    const alignClass =
      globalIndex % 2 === 0 ? "mr-auto" : "ml-auto";

    const isCurrent = song.slug === currentNodeSlug;
    // Completion: any exercise has been touched (ex1_2_3_best_accuracy > 0)
    const isCompleted = (song.ex1_2_3_best_accuracy ?? 0) > 0;

    elements.push(
      <motion.div
        key={song.slug}
        className={`${alignClass} w-full max-w-xs`}
        initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <PathNode song={song} isCurrent={isCurrent} isCompleted={isCompleted} />
      </motion.div>
    );

    globalIndex++;
  }

  return (
    <div className="flex flex-col gap-2 space-y-1" role="list" aria-label="Learning path">
      {elements}
    </div>
  );
}
