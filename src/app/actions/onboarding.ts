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
 *
 * Phase 18 RESEARCH Open Question 2:
 *   - Clerk publicMetadata.terms_version is updated so middleware can check
 *     re-acceptance gate from the JWT without a DB query (0ms latency)
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
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
            social_activity_enabled: false, // REQ-MINORS-DEFAULT-01 / REQ-MINORS-12
            marketing_email_opt_in: false, // REQ-MINORS-DEFAULT-03
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

  // Cache terms_version in Clerk publicMetadata — removes DB query from middleware
  // (RESEARCH Open Question 2: 0ms latency via JWT claim)
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { terms_version: CURRENT_TERMS_VERSION },
  });

  return {};
}
