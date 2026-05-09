"use server";

/**
 * completeOnboarding() — post-signup age gate + terms acceptance server action.
 *
 * Phase 18 REQ-MINORS-GATE-03, REQ-MINORS-GATE-06, REQ-MINORS-12:
 *   - Server MUST re-validate DOB regardless of what the client sends
 *   - Under-13 users are rejected with error: "under_13"
 *   - Minor defaults (social_activity_enabled=false, marketing_email_opt_in=false)
 *     are applied in a SINGLE atomic db.insert().onConflictDoUpdate() call
 *     (NOT a separate UPDATE — Pitfall 7)
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/versions";

export async function completeOnboarding(
  dateOfBirth: string
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  // Server re-validates DOB regardless of client (REQ-MINORS-GATE-06)
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return { error: "invalid_date" };

  const now = new Date();
  const ageYears =
    (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  // REQ-MINORS-GATE-03: block under-13 users at the server level
  if (ageYears < 13) return { error: "under_13" };

  const isMinor = ageYears < 18;

  // CRITICAL (Pitfall 7): all fields written in ONE atomic upsert — never two DB calls.
  // Minor defaults spread into values + set so they apply at creation AND on re-onboarding.
  try {
    await db
      .insert(users)
      .values({
        id: userId,
        date_of_birth: dateOfBirth,
        is_minor: isMinor,
        terms_accepted_at: now,
        terms_version: CURRENT_TERMS_VERSION,
        minor_defaults_applied: isMinor,
        ...(isMinor
          ? {
              social_activity_enabled: false,
              marketing_email_opt_in: false,
            }
          : {}),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          date_of_birth: dateOfBirth,
          is_minor: isMinor,
          terms_accepted_at: now,
          terms_version: CURRENT_TERMS_VERSION,
          minor_defaults_applied: isMinor,
          ...(isMinor
            ? {
                social_activity_enabled: false,
                marketing_email_opt_in: false,
              }
            : {}),
        },
      });
  } catch (dbErr) {
    console.error("[completeOnboarding] DB upsert failed:", dbErr);
    return { error: "db_error" };
  }

  // Cache terms_version in Clerk publicMetadata so middleware can check
  // re-acceptance gate from the JWT without a DB query (0ms latency).
  // Non-fatal: if Clerk update fails, user still has DB record — they can proceed.
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { terms_version: CURRENT_TERMS_VERSION },
    });
  } catch (clerkErr) {
    console.error("[completeOnboarding] Clerk metadata update failed:", clerkErr);
    // Don't block the user — DB is the source of truth. Middleware will fall back
    // to DB check on next load once we add that fallback (see cookie approach below).
  }

  // Set a short-lived server cookie so middleware can immediately pass the user
  // through on the next request — Clerk JWT claims lag up to 60s after updateUserMetadata.
  // The cookie is the bridge until the JWT refresh cycle catches up.
  try {
    const cookieStore = await cookies();
    cookieStore.set("kb_terms_done", CURRENT_TERMS_VERSION, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 min TTL — enough for the JWT to refresh
      path: "/",
    });
  } catch {
    // Non-fatal — worst case the user hits the redirect loop once and the JWT refreshes
  }

  return {};
}
