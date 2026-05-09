"use server";

// Security note (Phase 16): mutation functions (updateUserPrefs, setThemePreference,
// clearStreakSaverPending) derive userId from auth() and ignore the caller-supplied
// userId arg. Read-only helpers (isPremium, getUserPrefs, getEffectiveCap) retain
// their userId param as they are called from already-authenticated server action contexts.

import { auth } from "@clerk/nextjs/server";
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
    return { skipLearning: false, newCardCap: DEFAULT_NEW_CARD_CAP, soundEnabled: true, hapticsEnabled: true, socialActivityEnabled: false };
  }
  const rows = await db
    .select({
      skip_learning: users.skip_learning,
      new_card_cap: users.new_card_cap,
      soundEnabled: users.soundEnabled,
      hapticsEnabled: users.hapticsEnabled,
      social_activity_enabled: users.social_activity_enabled,
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
    return { skipLearning: false, newCardCap: DEFAULT_NEW_CARD_CAP, soundEnabled: true, hapticsEnabled: true, socialActivityEnabled: false };
  }

  return {
    skipLearning: rows[0].skip_learning,
    newCardCap: rows[0].new_card_cap,
    soundEnabled: rows[0].soundEnabled,
    hapticsEnabled: rows[0].hapticsEnabled,
    socialActivityEnabled: rows[0].social_activity_enabled,
  };
}

/**
 * Persists partial preference updates. Validates numeric bounds server-side —
 * never trust the client. Upserts the row if it doesn't exist yet.
 *
 * Only premium users can actually raise the cap beyond DEFAULT_NEW_CARD_CAP;
 * getEffectiveCap() enforces that at read time regardless of what's stored
 * (pitfall 4 from research: downgrade reconciliation).
 *
 * Security (Phase 16 SC-2): userId is derived from Clerk auth() — caller-supplied
 * userId is not accepted.
 */
export async function updateUserPrefs(
  patch: Partial<UserPrefs>
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const normalized: Partial<{
    skip_learning: boolean;
    new_card_cap: number;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    social_activity_enabled: boolean;
  }> = {};

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
  if (typeof patch.soundEnabled === "boolean") {
    normalized.soundEnabled = patch.soundEnabled;
  }
  if (typeof patch.hapticsEnabled === "boolean") {
    normalized.hapticsEnabled = patch.hapticsEnabled;
  }
  if (typeof patch.socialActivityEnabled === "boolean") {
    normalized.social_activity_enabled = patch.socialActivityEnabled;
  }

  if (Object.keys(normalized).length === 0) return;

  // Upsert: seed defaults if row doesn't exist, otherwise merge patch.
  await db
    .insert(users)
    .values({
      id: userId,
      skip_learning: normalized.skip_learning ?? false,
      new_card_cap: normalized.new_card_cap ?? DEFAULT_NEW_CARD_CAP,
      soundEnabled: normalized.soundEnabled ?? true,
      hapticsEnabled: normalized.hapticsEnabled ?? true,
      social_activity_enabled: normalized.social_activity_enabled ?? false,
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

/**
 * Phase 14 — Theme preference reads/writes (CONTEXT D-08, D-09, D-11).
 *
 * Persistence model: DB column + kb_theme cookie. The cookie is the SSR source
 * of truth on next request (layout.tsx reads it via next/headers cookies());
 * the DB column survives session expiry and replicates across devices for
 * authenticated users. localStorage is NOT used (cookie must be SSR-readable).
 *
 * Validation: server-side enum check + DB CHECK constraint (drizzle/0016).
 *
 * SECURITY (T-14-03-02): Three layers of defense against cookie tampering:
 *   (a) inline script in layout.tsx has regex match constrained to enum
 *   (b) this server action's VALID_THEMES check throws on invalid input
 *   (c) DB CHECK constraint enforces enum at the data layer
 */
const VALID_THEMES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof VALID_THEMES)[number];

export async function setThemePreference(
  value: ThemePreference
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!VALID_THEMES.includes(value)) {
    throw new Error(
      `themePreference must be one of: ${VALID_THEMES.join(", ")}`
    );
  }

  // DB write — upsert seeds row if absent. Mirrors updateUserPrefs idiom.
  await db
    .insert(users)
    .values({ id: userId, themePreference: value })
    .onConflictDoUpdate({
      target: users.id,
      set: { themePreference: value, updated_at: new Date() },
    });

  // Cookie write — D-08 specifics: kb_theme, 1-year expiry, SameSite=Lax, NOT HttpOnly
  // (client must read for instant toggle without server round-trip).
  // Pitfall 2: cookies() is async in Next 15; await it.
  // Dynamic import keeps next/headers out of the function's static dep graph so
  // unit tests that import this file in jsdom don't crash on the missing module.
  const { cookies } = await import("next/headers");
  const c = await cookies();
  c.set("kb_theme", value, {
    maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
    sameSite: "lax",
    httpOnly: false, // D-08 — client-readable for optimistic toggle
    path: "/",
  });
}

export async function getThemePreference(
  userId: string
): Promise<ThemePreference> {
  if (!userId) return "system";
  const rows = await db
    .select({ themePreference: users.themePreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return (rows[0]?.themePreference as ThemePreference) ?? "system";
}

/**
 * Phase 14.4 D-13 — Clear streak_saver_pending after toast is shown.
 * Called client-side from StreakSaverToast useEffect (RESEARCH Pitfall 7 pattern).
 * Sets pending flag to false so toast does not re-render on next session.
 *
 * Security (Phase 16 SC-2): userId derived from auth() — non-fatal if unauthenticated
 * (called from client on session end where user may have logged out).
 */
export async function clearStreakSaverPending(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return; // non-fatal — called from client on session end
  await db
    .update(users)
    .set({ streak_saver_pending: false, updated_at: new Date() })
    .where(eq(users.id, userId));
}
