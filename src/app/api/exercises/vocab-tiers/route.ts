/**
 * GET /api/exercises/vocab-tiers?ids=<uuid1>,<uuid2>,...&userId=<userId>
 *
 * Batch tier loader — accepts up to 200 comma-separated vocab_item UUIDs and
 * a userId, returns { tiers: { [vocabItemId]: 1|2|3 } }.
 *
 * Cold-start: any ID without a user_vocab_mastery row defaults to Tier 1 (New).
 * Per CONTEXT decision: no backfill — missing row == new word.
 *
 * Cache-Control: private, no-store — ensures paused-tab reloads always re-fetch
 * after a background session has updated mastery state.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { userVocabMastery } from "@/lib/db/schema";
import { tierFor } from "@/lib/fsrs/tier";
import type { Tier } from "@/lib/fsrs/tier";

const MAX_IDS = 200;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const idsParam = searchParams.get("ids");
  const userId = searchParams.get("userId");

  if (!idsParam || !userId) {
    return NextResponse.json(
      { error: "Missing required query parameters: ids, userId" },
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

  // Fetch mastery rows for the requested vocab IDs
  const rows = await db
    .select({
      vocab_item_id: userVocabMastery.vocab_item_id,
      state: userVocabMastery.state,
    })
    .from(userVocabMastery)
    .where(
      and(
        eq(userVocabMastery.user_id, userId),
        inArray(userVocabMastery.vocab_item_id, idArray)
      )
    );

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
