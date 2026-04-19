export const dynamic = "force-dynamic";

import { getAllSongs } from "@/lib/db/queries";
import { getUserGamificationState } from "@/lib/db/queries";
import { getStarterSongs } from "@/lib/gamification/starter-songs";
import { getNextRewardPreview } from "@/lib/gamification/reward-slots";
import { db } from "@/lib/db";
import { rewardSlotDefinitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import { CosmeticsProvider } from "@/app/components/CosmeticsProvider";
import { PathHud } from "./components/PathHud";
import { PathMap } from "./components/PathMap";
import { StarterPick } from "./components/StarterPick";
import type { RewardSlotDefinition } from "@/lib/types/reward-slots";

export default async function PathPage() {
  const userId = PLACEHOLDER_USER_ID;

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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <CosmeticsProvider theme={state.equipped_theme}>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="mb-6 text-2xl font-bold text-white">Your Learning Path</h1>
          <PathHud
            userId={userId}
            state={state}
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
          {starterCandidates !== null ? (
            <StarterPick candidates={starterCandidates} userId={userId} />
          ) : (
            <PathMap
              songs={songs}
              currentNodeSlug={state.current_path_node_slug ?? ""}
            />
          )}
        </div>
      </CosmeticsProvider>
    </main>
  );
}
