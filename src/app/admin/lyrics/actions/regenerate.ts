"use server";

/**
 * Phase 11.5 SPEC #23 + D-07: regenerate lesson content for edited verses.
 *
 * Loops the AI fill subprocess per dirty verse, then writes ONE source='regen'
 * lyrics_versions row via the publish-tx atomic batch. Updates active pointer
 * + lesson blob (same atomicity contract as Plan 07's publish, just source='regen').
 *
 * Per D-07: "writes one lyrics_versions row at the end with source = 'regen'".
 * Per SPEC #23 acceptance: "the public song page reflects regenerated content"
 *   → active pointer must move; reuse publishLyricsVersion(source='regen').
 *
 * Failure of a single verse does NOT abort the whole regen. Errors are collected
 * and surfaced to admin. Verses that failed retain their pre-regen content (the
 * input draft verse is kept verbatim).
 */

export const runtime = "nodejs";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { runClaudePrintParseJson, ClaudePrintError } from "@/lib/admin/claude-cli";
import { VerseFillResponseSchema, type VerseFillResponse } from "@/lib/admin/verse-fill-zod";
import { buildVerseFillPrompt, type FillableField } from "@/lib/admin/verse-fill-prompt";
import { publishLyricsVersion, StalePublishError } from "@/lib/admin/publish-tx";
import { revalidateSongCache } from "@/app/actions/cache";
import type { Verse } from "@/lib/types/lesson";

export interface RegenerateInput {
  songVersionId: string;
  slug: string;
  songTitle: string;
  songArtist: string | null;
  songAnime: string | null;
  baseVersionId: string;
  verses: Verse[];                 // current draft verses (full set)
  verseNumbersToRegen: number[];   // subset to regenerate
}

export interface RegenerateOutput {
  ok: boolean;
  regenVersionId?: string;
  regenVersionNumber?: number;
  perVerseResults: Array<
    | { verseNumber: number; status: "regenerated" }
    | { verseNumber: number; status: "failed"; error: string }
    | { verseNumber: number; status: "skipped"; reason: string }
  >;
  globalError?: string;
}

const REGEN_FIELDS: FillableField[] = ["translations", "literal_meaning", "cultural_context", "tokens"];

/**
 * Compute "verses changed since last regen/auto" — for v1 we accept the
 * caller-provided verseNumbersToRegen which IS the editor's draft.dirty_verse_numbers.
 * Future: query lyrics_versions for the most recent source IN ('regen','auto')
 * and diff vs current active.
 */
export async function computeDirtyVersesSinceLastRegen(songVersionId: string): Promise<number[]> {
  const r = await db.execute<{ verse_numbers: number[] | null }>(sql`
    SELECT dirty_verse_numbers AS verse_numbers
    FROM lyrics_drafts
    WHERE song_version_id = ${songVersionId}::uuid
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  return rows[0]?.verse_numbers ?? [];
}

export async function regenerateLessons(input: RegenerateInput): Promise<RegenerateOutput> {
  const admin = await requireAdminUser();
  const perVerseResults: RegenerateOutput["perVerseResults"] = [];

  // Build a working copy of verses; failed verses are kept verbatim
  let workingVerses = [...input.verses];

  for (const vn of input.verseNumbersToRegen) {
    const target = workingVerses.find((v) => v.verse_number === vn);
    if (!target) {
      perVerseResults.push({ verseNumber: vn, status: "skipped", reason: "verse_not_in_draft" });
      continue;
    }

    const neighbours = workingVerses
      .filter((v) => v.verse_number !== vn)
      .filter((v) => Math.abs(v.verse_number - vn) <= 2)
      .sort((a, b) => a.verse_number - b.verse_number);

    const prompt = buildVerseFillPrompt({
      songTitle: input.songTitle,
      songArtist: input.songArtist,
      songAnime: input.songAnime,
      target,
      neighbours,
      fieldsToFill: REGEN_FIELDS,
    });

    try {
      const ai: VerseFillResponse = await runClaudePrintParseJson(prompt, VerseFillResponseSchema, {
        timeoutMs: 120_000,
      });
      // Merge AI result into working copy
      workingVerses = workingVerses.map((v) =>
        v.verse_number === vn
          ? {
              ...v,
              ...(ai.tokens ? { tokens: ai.tokens as unknown as typeof v.tokens } : {}),
              ...(ai.translations ? { translations: { ...v.translations, ...ai.translations } } : {}),
              ...(ai.literal_meaning !== undefined ? { literal_meaning: ai.literal_meaning } : {}),
              ...(ai.cultural_context !== undefined ? { cultural_context: ai.cultural_context } : {}),
            }
          : v
      );
      perVerseResults.push({ verseNumber: vn, status: "regenerated" });
    } catch (err) {
      const code = err instanceof ClaudePrintError ? err.code : "validation";
      const msg = err instanceof Error ? err.message.slice(0, 120) : "unknown";
      perVerseResults.push({ verseNumber: vn, status: "failed", error: `${code}: ${msg}` });
      // Keep the verse as-is; do not abort the loop
    }
  }

  // After all verses processed, write a single source='regen' lyrics_versions row
  // via the publish-tx atomic batch (also updates active pointer + lesson blob)
  try {
    const result = await publishLyricsVersion({
      songVersionId: input.songVersionId,
      editorId: admin.id,
      baseVersionId: input.baseVersionId,
      verses: workingVerses,
      source: "regen",
    });
    await revalidateSongCache(input.slug);
    return {
      ok: true,
      regenVersionId: result.newVersionId,
      regenVersionNumber: result.newVersionNumber,
      perVerseResults,
    };
  } catch (err) {
    if (err instanceof StalePublishError) {
      return {
        ok: false,
        perVerseResults,
        globalError: `stale_publish: active is now ${err.currentActiveId}. Reload and retry.`,
      };
    }
    const msg = err instanceof Error ? err.message : "unknown";
    return { ok: false, perVerseResults, globalError: msg.slice(0, 200) };
  }
}
