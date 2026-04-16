/**
 * GET /api/exercises/jlpt-pool?jlpt_level=N5
 *
 * Returns up to 50 vocabulary items at a given JLPT level from the
 * vocab_global materialized view. Used by the exercise generator as
 * a distractor pool for same-JLPT-level words not in the current song.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const jlptLevel = searchParams.get("jlpt_level");

  if (!jlptLevel) {
    return NextResponse.json(
      { error: "Missing required query parameter: jlpt_level" },
      { status: 400 }
    );
  }

  // Query vocab_global materialized view joined with vocabulary_items
  // Returns distractor candidates at the requested JLPT level
  const rows = await db.execute(sql`
    SELECT
      vi.id,
      vi.dictionary_form,
      vi.reading,
      vi.romaji,
      vi.part_of_speech,
      vi.meaning
    FROM vocab_global vg
    JOIN vocabulary_items vi ON vi.id = vg.vocab_item_id
    WHERE vg.jlpt_level = ${jlptLevel}
    GROUP BY vi.id, vi.dictionary_form, vi.reading, vi.romaji, vi.part_of_speech, vi.meaning
    LIMIT 50
  `);

  return NextResponse.json(rows.rows ?? rows);
}
