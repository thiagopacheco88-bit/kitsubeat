"use server";

/**
 * Phase 11.5 SPEC #10/#11 + D-05/D-06/D-08/D-20: AI fill server action.
 *
 * D-05: spawns `claude --print --output-format=json` (NOT @anthropic-ai/sdk).
 * D-06: per-verse prompt at src/lib/admin/verse-fill-prompt.ts (relocated from scripts/lib/ per ISSUE-06).
 * D-20: snapshot row written to lyrics_versions BEFORE returning to admin.
 * D-08: caller renders inline blocking spinner per verse.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { runClaudePrintParseJson, ClaudePrintError } from "@/lib/admin/claude-cli";
import { VerseFillResponseSchema, type VerseFillResponse } from "@/lib/admin/verse-fill-zod";
import { buildVerseFillPrompt, type FillableField } from "@/lib/admin/verse-fill-prompt";
import type { Verse } from "@/lib/types/lesson";

export interface AiFillInput {
  songVersionId: string;
  songTitle: string;
  songArtist: string | null;
  songAnime: string | null;
  baseVersionId: string;
  verseNumber: number;
  draftVerses: Verse[];
  fieldsToFill: FillableField[];
}

export type AiFillOutput =
  | { ok: true; verse: VerseFillResponse; snapshotVersionId: string }
  | { ok: false; error: string };

const NEIGHBOUR_RANGE = 2;

function pickNeighbours(verses: Verse[], targetVerseNumber: number, range: number): Verse[] {
  return verses
    .filter((v) => v.verse_number !== targetVerseNumber)
    .filter((v) => Math.abs(v.verse_number - targetVerseNumber) <= range)
    .sort((a, b) => a.verse_number - b.verse_number);
}

export async function aiFillVerse(input: AiFillInput): Promise<AiFillOutput> {
  const admin = await requireAdminUser();
  const target = input.draftVerses.find((v) => v.verse_number === input.verseNumber);
  if (!target) return { ok: false, error: "verse_not_found" };

  const prompt = buildVerseFillPrompt({
    songTitle: input.songTitle,
    songArtist: input.songArtist,
    songAnime: input.songAnime,
    target,
    neighbours: pickNeighbours(input.draftVerses, input.verseNumber, NEIGHBOUR_RANGE),
    fieldsToFill: input.fieldsToFill,
  });

  let aiVerse: VerseFillResponse;
  try {
    aiVerse = await runClaudePrintParseJson(prompt, VerseFillResponseSchema, { timeoutMs: 120_000 });
  } catch (err) {
    if (err instanceof ClaudePrintError) {
      return { ok: false, error: err.code + ": " + err.message.slice(0, 200) };
    }
    const msg = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: "validation: " + msg.slice(0, 200) };
  }

  // D-20: write ai-assist snapshot BEFORE returning
  const fullSnapshot = input.draftVerses.map((v) =>
    v.verse_number === input.verseNumber ? mergeVerse(v, aiVerse) : v
  );
  const snapshotVersionId = await writeAiAssistSnapshot({
    songVersionId: input.songVersionId,
    editorId: admin.id,
    verses: fullSnapshot,
    baseVersionId: input.baseVersionId,
  });

  return { ok: true, verse: aiVerse, snapshotVersionId };
}

function mergeVerse(target: Verse, ai: VerseFillResponse): Verse {
  return {
    ...target,
    ...(ai.tokens ? { tokens: ai.tokens as unknown as typeof target.tokens } : {}),
    ...(ai.translations ? { translations: { ...target.translations, ...ai.translations } } : {}),
    ...(ai.literal_meaning !== undefined ? { literal_meaning: ai.literal_meaning } : {}),
    ...(ai.cultural_context !== undefined ? { cultural_context: ai.cultural_context } : {}),
  };
}

interface SnapshotInput {
  songVersionId: string;
  editorId: string;
  verses: Verse[];
  baseVersionId: string;
}

async function writeAiAssistSnapshot(input: SnapshotInput): Promise<string> {
  const next = await db.execute<{ next_n: number }>(sql`
    SELECT COALESCE(MAX(version_number), 0) + 1 AS next_n
    FROM lyrics_versions
    WHERE song_version_id = ${input.songVersionId}::uuid
  `);
  const rows = Array.isArray(next) ? next : ((next as { rows?: { next_n: number }[] }).rows ?? []);
  const nextN = Number(rows[0]?.next_n ?? 1);

  const id = crypto.randomUUID();
  await db.execute(sql`
    INSERT INTO lyrics_versions
      (id, song_version_id, version_number, source, editor_id, verses, parent_version_id, created_at)
    VALUES
      (${id}::uuid, ${input.songVersionId}::uuid, ${nextN}, 'ai-assist',
       ${input.editorId}, ${JSON.stringify(input.verses)}::jsonb,
       ${input.baseVersionId}::uuid, now())
  `);

  return id;
}
