"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import {
  DEFAULT_NEW_CARD_CAP,
  PREMIUM_NEW_CARD_CAP_CEILING,
  type UserPrefs,
} from "@/lib/user-prefs";

/**
 * Fetches the user's prefs row, seeding defaults via upsert if no row exists.
 * Safe to call for any userId — unauthenticated/placeholder users get defaults.
 *
 * Does NOT apply the premium ceiling here — the raw stored value is returned.
 * Call getEffectiveCap() for the value that should actually drive filtering.
 */
export async function getUserPrefs(userId: string): Promise<UserPrefs> {
  if (!userId) {
    return { skipLearning: false, newCardCap: DEFAULT_NEW_CARD_CAP };
  }
  const rows = await db
    .select({
      skip_learning: users.skip_learning,
      new_card_cap: users.new_card_cap,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (rows.length === 0) {
    // Seed row with defaults on first access. ON CONFLICT DO NOTHING makes
    // this safe under concurrent requests for the same new user.
    await db
      .insert(users)
      .values({ id: userId })
      .onConflictDoNothing({ target: users.id });
    return { skipLearning: false, newCardCap: DEFAULT_NEW_CARD_CAP };
  }

  return {
    skipLearning: rows[0].skip_learning,
    newCardCap: rows[0].new_card_cap,
  };
}

/**
 * Persists partial preference updates. Validates numeric bounds server-side —
 * never trust the client. Upserts the row if it doesn't exist yet.
 *
 * Only premium users can actually raise the cap beyond DEFAULT_NEW_CARD_CAP;
 * getEffectiveCap() enforces that at read time regardless of what's stored
 * (pitfall 4 from research: downgrade reconciliation).
 */
export async function updateUserPrefs(
  userId: string,
  patch: Partial<UserPrefs>
): Promise<void> {
  if (!userId) throw new Error("userId is required");

  const normalized: Partial<{ skip_learning: boolean; new_card_cap: number }> = {};

  if (typeof patch.skipLearning === "boolean") {
    normalized.skip_learning = patch.skipLearning;
  }
  if (typeof patch.newCardCap === "number") {
    if (!Number.isInteger(patch.newCardCap) || patch.newCardCap < 1) {
      throw new Error("newCardCap must be a positive integer");
    }
    if (patch.newCardCap > PREMIUM_NEW_CARD_CAP_CEILING) {
      throw new Error(
        `newCardCap must be <= ${PREMIUM_NEW_CARD_CAP_CEILING}`
      );
    }
    normalized.new_card_cap = patch.newCardCap;
  }

  if (Object.keys(normalized).length === 0) return;

  // Upsert: seed defaults if row doesn't exist, otherwise merge patch.
  await db
    .insert(users)
    .values({
      id: userId,
      skip_learning: normalized.skip_learning ?? false,
      new_card_cap: normalized.new_card_cap ?? DEFAULT_NEW_CARD_CAP,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        ...normalized,
        updated_at: new Date(),
      },
    });
}

/**
 * Premium gate for the new-card cap — mirrors the checkExerciseAccess pattern
 * from src/lib/exercises/access.ts (Phase 08.1-01).
 *
 * Rules (CONTEXT-locked):
 *   Free user  -> DEFAULT_NEW_CARD_CAP (ignores any stored value — downgrade safety)
 *   Premium user -> min(stored cap, PREMIUM_NEW_CARD_CAP_CEILING)
 *
 * Premium detection: subscriptions.status='active' AND plan starts with 'premium_'.
 * Any other state (free, canceled, past_due, trialing with non-premium plan) = free.
 */
export async function getEffectiveCap(userId: string): Promise<number> {
  if (!userId) return DEFAULT_NEW_CARD_CAP;

  const premium = await isPremium(userId);
  if (!premium) return DEFAULT_NEW_CARD_CAP;

  // Premium path — read stored cap, clamp to ceiling, never below default.
  const prefs = await getUserPrefs(userId);
  return Math.min(
    Math.max(prefs.newCardCap, DEFAULT_NEW_CARD_CAP),
    PREMIUM_NEW_CARD_CAP_CEILING
  );
}

/**
 * Premium-status boolean — the single source of truth for "does this user have
 * an active premium subscription?" across the app. The profile page (Plan 05)
 * uses this to decide whether to disable the cap input; getEffectiveCap() uses
 * this to decide whether the stored cap applies.
 *
 * Keeping this colocated with userPrefs ensures there is ONE subscriptions query
 * shape (status='active' AND plan IN premium_*). Any future expansion of the
 * premium definition (new plan ids, grace periods, trial handling) lands here
 * and instantly propagates to every caller.
 */
export async function isPremium(userId: string): Promise<boolean> {
  if (!userId) return false;
  const rows = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, "active"),
        inArray(subscriptions.plan, ["premium_monthly", "premium_annual"])
      )
    )
    .limit(1);
  return rows.length > 0;
}
