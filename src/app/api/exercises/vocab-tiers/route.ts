/**
 * GET /api/exercises/vocab-tiers?ids=<uuid1>,<uuid2>,...
 *
 * Batch tier loader — accepts up to 200 comma-separated vocab_item UUIDs,
 * returns { tiers: { [vocabItemId]: 1|2|3 } }.
 *
 * Cold-start: any ID without a user_vocab_mastery row defaults to Tier 1 (New).
 * Per CONTEXT decision: no backfill — missing row == new word.
 *
 * Cache-Control: private, no-store — ensures paused-tab reloads always re-fetch
 * after a background session has updated mastery state.
 *
 * Security (Phase 16 SC-2): userId is derived from Clerk auth() — not from the
 * query string. Returns 401 if the caller is not authenticated.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { exerciseRatelimit } from "@/lib/rate-limit";
import { UUID_RE } from "@/lib/uuid";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userVocabMastery } from "@/lib/db/schema";
import { tierFor } from "@/lib/fsrs/tier";
import type { Tier } from "@/lib/fsrs/tier";

const MAX_IDS = 200;

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 120/min per user (Phase 16 SC-4)
  const { success, limit, remaining, reset } = await exerciseRatelimit.limit(userId);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const { searchParams } = request.nextUrl;

  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { error: "Missing required query parameter: ids" },
      { status: 400 }
    );
  }

  const idArray = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (idArray.length === 0) {
    return NextResponse.json(
      { error: "ids must contain at least one UUID" },
      { status: 400 }
    );
  }

  if (idArray.length > MAX_IDS) {
    return NextResponse.json(
      { error: `ids must contain at most ${MAX_IDS} UUIDs; got ${idArray.length}` },
      { status: 400 }
    );
  }

  // Validate UUID format — Drizzle's parameterized queries prevent injection,
  // but non-UUID strings cause Postgres type-cast errors (unhandled 500).
  const invalidIds = idArray.filter((id) => !UUID_RE.test(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `${invalidIds.length} id(s) are not valid UUIDs` },
      { status: 400 }
    );
  }

  // Fetch mastery rows for the requested vocab IDs.
  // GROUP BY + MAX(state): a word can have multiple rows (one per card_kind —
  // romaji_meaning, kanji_kana). Without aggregation the loop below would
  // non-deterministically overwrite the stateMap with whichever row Postgres
  // returns last. MAX ensures the most-advanced state wins, so practicing a
  // word on either track suppresses the LearnCard intro on the other.
  const rows = await db
    .select({
      vocab_item_id: userVocabMastery.vocab_item_id,
      state: sql<number>`MAX(${userVocabMastery.state})`,
    })
    .from(userVocabMastery)
    .where(
      and(
        eq(userVocabMastery.user_id, userId),
        inArray(userVocabMastery.vocab_item_id, idArray)
      )
    )
    .groupBy(userVocabMastery.vocab_item_id);

  // Build tier map from DB rows
  const tierMap: Record<string, Tier> = {};
  for (const row of rows) {
    tierMap[row.vocab_item_id] = tierFor(row.state);
  }

  // Cold-start: default any unreturned IDs to Tier 1 (state=0 = New)
  for (const id of idArray) {
    if (!(id in tierMap)) {
      tierMap[id] = tierFor(0);
    }
  }

  // Build raw state map alongside tier map.
  // Needed by Phase 08.4 learn card: distinguishes state=0 (New) from state=3 (Relearning),
  // which both collapse to the same tier via tierFor() and are otherwise indistinguishable on the client.
  const stateMap: Record<string, 0 | 1 | 2 | 3> = {};
  for (const row of rows) {
    stateMap[row.vocab_item_id] = row.state as 0 | 1 | 2 | 3;
  }
  // Cold-start: any requested ID with no mastery row defaults to state=0 (New), mirroring tierMap.
  for (const id of idArray) {
    if (!(id in stateMap)) {
      stateMap[id] = 0;
    }
  }

  return NextResponse.json(
    { tiers: tierMap, states: stateMap },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
