export const dynamic = "force-dynamic";

import { getAllSongs } from "@/lib/db/queries";
import { getUserGamificationState } from "@/lib/db/queries";
import { getStarterSongs } from "@/lib/gamification/starter-songs";
import { getNextRewardPreview } from "@/lib/gamification/reward-slots";
import { db } from "@/lib/db";
import { rewardSlotDefinitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/user-prefs";
import { CosmeticsProvider } from "@/app/components/CosmeticsProvider";
import { PathHeader } from "./components/PathHeader";
import { HeroProgress } from "./components/HeroProgress";
import { PathMap } from "./components/PathMap";
import { StarterPick } from "./components/StarterPick";
import { ContinueAnchor } from "./components/ContinueAnchor";
import type { RewardSlotDefinition } from "@/lib/types/reward-slots";

export default async function PathPage() {
  const userId = await getCurrentUserId();

  // Parallel-fetch user state and songs
  const [state, songs] = await Promise.all([
    getUserGamificationState(userId),
    getAllSongs(userId),
  ]);

  // Fetch active reward slot definitions for next-reward preview
  const slotRows = await db
    .select()
    .from(rewardSlotDefinitions)
    .where(eq(rewardSlotDefinitions.active, true));

  const slotDefs: RewardSlotDefinition[] = slotRows.map((r) => ({
    id: r.id,
    slot_type: r.slot_type as RewardSlotDefinition["slot_type"],
    level_threshold: r.level_threshold,
    content: r.content as RewardSlotDefinition["content"],
    active: r.active ?? true,
  }));

  const nextReward = getNextRewardPreview(slotDefs, state.level);

  // Only fetch starter songs when user hasn't picked yet
  const starterCandidates =
    state.current_path_node_slug === null ? await getStarterSongs() : null;

  // Derive currentSongTitle from the songs list for HeroProgress + ContinueAnchor.
  const currentSong = state.current_path_node_slug
    ? songs.find((s) => s.slug === state.current_path_node_slug) ?? null
    : null;
  const currentSongTitle = currentSong?.title ?? null;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <CosmeticsProvider theme={state.equipped_theme}>
        <div className="mx-auto max-w-2xl px-4 py-8 pb-32">
          {/* W-7 preemptive a11y fix: keep an h1 in the DOM as `sr-only` so
            * axe-core's page-has-heading-one rule passes. PathHeader provides
            * the visible top chrome; this hidden h1 carries the page landmark
            * for screen readers + axe. */}
          <h1 className="sr-only">Your Learning Path</h1>
          <PathHeader streakCurrent={state.streak_current} />
          <HeroProgress
            state={state}
            currentSongTitle={currentSongTitle}
            nextReward={
              nextReward
                ? {
                    id: nextReward.id,
                    // Preserved verbatim from existing page.tsx (B-4 disposition):
                    // all 3 active v3.0 RewardSlotContent variants carry
                    // `label: string` per src/lib/types/reward-slots.ts.
                    // The slot_type fallback is unreachable on the happy path
                    // (active-only query) but kept for Phase 21 forward-compat.
                    label:
                      (nextReward.content as { label?: string }).label ??
                      nextReward.slot_type,
                    level_threshold: nextReward.level_threshold,
                  }
                : null
            }
          />
          {starterCandidates !== null ? (
            <StarterPick candidates={starterCandidates} userId={userId} />
          ) : (
            <PathMap
              songs={songs}
              currentNodeSlug={state.current_path_node_slug ?? ""}
            />
          )}
          <ContinueAnchor
            currentSongSlug={state.current_path_node_slug}
            currentSongTitle={currentSongTitle}
          />
        </div>
      </CosmeticsProvider>
    </main>
  );
}
