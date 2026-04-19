"use server";

/**
 * src/app/actions/gamification.ts
 *
 * Phase 12 Plan 04 — Gamification server actions.
 *
 * Separated from exercises.ts for clean module boundaries (M6: single write boundary
 * for XP/streak/level stays in exercises.ts; this file covers one-off gamification
 * setup actions that don't touch the XP engine).
 */

import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { STARTER_SONG_SLUGS } from "@/lib/gamification/starter-songs";
import { trackGamification } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// setStarterSong
// ---------------------------------------------------------------------------

/**
 * Sets the user's current_path_node_slug to the selected starter song BEFORE
 * their first session, so the path-order XP bonus is captured on the first play
 * (PLAN M8).
 *
 * Validates that `slug` is a member of STARTER_SONG_SLUGS — rejects unknown slugs
 * to prevent arbitrary slug injection.
 *
 * Called by Plan 06's StarterPick.tsx on user selection.
 */
export async function setStarterSong(
  userId: string,
  slug: string
): Promise<{ ok: true }> {
  if (!userId) {
    throw new Error("setStarterSong: userId is required");
  }

  // Type-safe membership check against the const tuple
  const validSlug = (STARTER_SONG_SLUGS as readonly string[]).includes(slug);
  if (!validSlug) {
    throw new Error(
      `setStarterSong: '${slug}' is not a valid starter song slug. ` +
        `Valid options: ${STARTER_SONG_SLUGS.join(", ")}`
    );
  }

  // Upsert user row (creates it if this is their very first action)
  await db
    .insert(users)
    .values({ id: userId, currentPathNodeSlug: slug })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        currentPathNodeSlug: slug,
        updated_at: sql`NOW()`,
      },
    });

  trackGamification({ event: "starter_pick_selected", slug });

  return { ok: true };
}
