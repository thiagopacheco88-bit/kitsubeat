export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getUserGamificationState } from "@/lib/db/queries";
import { getNextRewardPreview } from "@/lib/gamification/reward-slots";
import { db } from "@/lib/db";
import { rewardSlotDefinitions, songs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/user-prefs";
import { CosmeticsProvider } from "@/app/components/CosmeticsProvider";
import { HeroProgress } from "./components/HeroProgress";
import { ContinueAnchor } from "./components/ContinueAnchor";
import { PathBody } from "./components/PathBody";
import type { RewardSlotDefinition } from "@/lib/types/reward-slots";

export default async function PathPage() {
  const userId = await getCurrentUserId();

  const [state, slotRows] = await Promise.all([
    getUserGamificationState(userId),
    db.select().from(rewardSlotDefinitions).where(eq(rewardSlotDefinitions.active, true)),
  ]);

  const slotDefs: RewardSlotDefinition[] = slotRows.map((r) => ({
    id: r.id,
    slot_type: r.slot_type as RewardSlotDefinition["slot_type"],
    level_threshold: r.level_threshold,
    content: r.content as RewardSlotDefinition["content"],
    active: r.active ?? true,
  }));

  const nextReward = getNextRewardPreview(slotDefs, state.level);

  // Fast targeted lookup — avoids blocking HeroProgress on the full catalog fetch.
  const currentSongTitle = state.current_path_node_slug
    ? await db
        .select({ title: songs.title })
        .from(songs)
        .where(eq(songs.slug, state.current_path_node_slug))
        .limit(1)
        .then((r) => r[0]?.title ?? null)
    : null;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <CosmeticsProvider theme={state.equipped_theme}>
        <div className="mx-auto max-w-2xl px-4 py-8 pb-32">
          <h1 className="sr-only">Your Learning Path</h1>
          <HeroProgress
            state={state}
            currentSongTitle={currentSongTitle}
            nextReward={
              nextReward
                ? {
                    id: nextReward.id,
                    label:
                      (nextReward.content as { label?: string }).label ??
                      nextReward.slot_type,
                    level_threshold: nextReward.level_threshold,
                  }
                : null
            }
          />
          <Suspense fallback={
            <div className="flex flex-col gap-3 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 h-20" />
              ))}
            </div>
          }>
            <PathBody
              userId={userId}
              currentNodeSlug={state.current_path_node_slug}
            />
          </Suspense>
          <ContinueAnchor
            currentSongSlug={state.current_path_node_slug}
            currentSongTitle={currentSongTitle}
          />
        </div>
      </CosmeticsProvider>
    </main>
  );
}
