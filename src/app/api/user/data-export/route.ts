/**
 * GET /api/user/data-export — Subject Access Request (DSAR) data export.
 *
 * Phase 18 REQ-PRIV-UK-DSAR-04:
 *   Returns a complete JSON bundle of all data KitsuBeat holds for the
 *   authenticated user. Data is filtered by auth().userId — never by a
 *   client-supplied parameter (T-18-02-02 information disclosure mitigation).
 *
 * Response headers:
 *   Content-Disposition: attachment; filename="kitsubeat-data-{userId}.json"
 *   Cache-Control: private, no-store
 *
 * Side effect: inserts a sar_log row for ICO/DPA accountability (REQ-PRIV-UK-DSAR-06).
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures
 * in "use server" route files per Phase 14 anti-pattern.
 */

export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  userVocabMastery,
  userExerciseLog,
  userSongProgress,
  cookieConsentRecord,
  sarLog,
} from "@/lib/db/schema";

export async function GET() {
  const { userId } = await auth();

  // T-18-02-02: authenticated users only — no client-supplied userId
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parallel query over all tables keyed to the authenticated userId
  // (RESEARCH Pattern 4 — never a sequential query chain)
  const [
    userRows,
    vocabMastery,
    exerciseLog,
    songProgress,
    cookieConsent,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(userVocabMastery).where(eq(userVocabMastery.user_id, userId)),
    db.select().from(userExerciseLog).where(eq(userExerciseLog.user_id, userId)),
    db.select().from(userSongProgress).where(eq(userSongProgress.user_id, userId)),
    db.select().from(cookieConsentRecord).where(eq(cookieConsentRecord.user_id, userId)),
  ]);

  // REQ-PRIV-UK-DSAR-06: log SAR for accountability — insert after successful query
  await db.insert(sarLog).values({
    user_id_or_email: userId,
    request_date: new Date(),
    outcome: "completed",
  });

  const bundle = {
    exported_at: new Date().toISOString(),
    user: userRows[0] ?? null,
    vocab_mastery: vocabMastery,
    exercise_log: exerciseLog,
    song_progress: songProgress,
    cookie_consent: cookieConsent,
  };

  return Response.json(bundle, {
    headers: {
      "Content-Disposition": `attachment; filename="kitsubeat-data-${userId}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
