/**
 * 06-qa-uuid-integrity.ts — Vocabulary UUID Integrity Check (DATA-02)
 *
 * Validates that every `vocabulary[i].vocab_item_id` value present in a
 * song's lesson JSONB maps to a real `vocabulary_items.id` row, and that
 * every vocab entry on a non-null lesson actually has a vocab_item_id at all.
 *
 * Used in two places:
 *   1. Imported by 06-qa-agent.ts (called via `checkVocabIdentity`) — runs
 *      as part of the broader content QA sweep.
 *   2. Run standalone via `npm run test:qa:uuid` — useful as a fast, scoped
 *      regression guard after the vocab backfill script touches data.
 *
 * Exits with code 0 if no integrity gaps are found; code 1 otherwise.
 *
 * Usage:
 *   npm run test:qa:uuid
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/06-qa-uuid-integrity.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/06-qa-uuid-integrity.ts --json
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local FIRST — before any DB imports
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions, vocabularyItems } from "../../src/lib/db/schema.js";
import { inArray } from "drizzle-orm";
import type { Lesson } from "../types/lesson.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UuidGapType = "missing" | "invalid";

export interface UuidGap {
  slug: string;
  version: string;
  field: string;
  type: UuidGapType;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * RFC 4122 UUID regex. Matches v1–v5 (we generate v4 in defaultRandom but the
 * regex is permissive on version digit so manual rows aren't rejected).
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// ---------------------------------------------------------------------------
// Core check (importable)
// ---------------------------------------------------------------------------

/**
 * Validate every `vocabulary[i].vocab_item_id` for a single song version.
 *
 * - Emits `missing` gap when an entry has no vocab_item_id (lesson is non-null)
 * - Emits `invalid` gap when the value is not a syntactically valid UUID
 * - Emits `invalid` gap with detail "orphaned UUID" when the UUID does not
 *   exist in the vocabulary_items table
 *
 * Batch-queries vocabulary_items once per song (IN (...)) to avoid N+1.
 *
 * @param db drizzle handle (from getDb())
 * @param slug song slug — used for gap labelling
 * @param version version_type ("tv" | "full") — used for gap labelling
 * @param lesson the lesson JSONB blob (may be null)
 */
export async function checkVocabIdentity(
  db: ReturnType<typeof getDb>,
  slug: string,
  version: string,
  lesson: Lesson | null,
): Promise<UuidGap[]> {
  const gaps: UuidGap[] = [];
  if (!lesson || !Array.isArray(lesson.vocabulary)) return gaps;

  // First pass: collect candidate UUIDs and emit missing/invalid gaps.
  const candidateIds: string[] = [];
  const indexById: Map<string, number[]> = new Map();
  lesson.vocabulary.forEach((vocab, idx) => {
    const id = vocab.vocab_item_id;
    if (!id) {
      gaps.push({
        slug,
        version,
        field: `vocabulary[${idx}].vocab_item_id`,
        type: "missing",
        detail: `surface=${vocab.surface ?? "?"}`,
      });
      return;
    }
    if (!isValidUuid(id)) {
      gaps.push({
        slug,
        version,
        field: `vocabulary[${idx}].vocab_item_id`,
        type: "invalid",
        detail: `not a UUID: ${id}`,
      });
      return;
    }
    candidateIds.push(id);
    const list = indexById.get(id) ?? [];
    list.push(idx);
    indexById.set(id, list);
  });

  if (candidateIds.length === 0) return gaps;

  // Second pass: batch-resolve which UUIDs exist in vocabulary_items.
  const found = await db
    .select({ id: vocabularyItems.id })
    .from(vocabularyItems)
    .where(inArray(vocabularyItems.id, candidateIds));

  const foundSet = new Set(found.map((r) => r.id));

  for (const id of candidateIds) {
    if (foundSet.has(id)) continue;
    for (const idx of indexById.get(id) ?? []) {
      gaps.push({
        slug,
        version,
        field: `vocabulary[${idx}].vocab_item_id`,
        type: "invalid",
        detail: `orphaned UUID: ${id}`,
      });
    }
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// Standalone runner
// ---------------------------------------------------------------------------

interface UuidReport {
  total_versions: number;
  versions_checked: number;
  versions_skipped_no_lesson: number;
  gaps_count: number;
  gaps: UuidGap[];
}

export async function runStandalone(): Promise<void> {
  const args = process.argv.slice(2);
  const isJson = args.includes("--json");

  if (!isJson) {
    console.log("=== Vocabulary UUID Integrity Check ===\n");
  }

  const db = getDb();
  const allSongs = await db.select().from(songs);
  const allVersions = await db.select().from(songVersions);

  const songById = new Map(allSongs.map((s) => [s.id, s]));

  if (!isJson) {
    console.log(
      `  Loaded ${allSongs.length} songs, ${allVersions.length} versions.\n`,
    );
  }

  const allGaps: UuidGap[] = [];
  let skippedNoLesson = 0;
  let checked = 0;

  for (const ver of allVersions) {
    const song = songById.get(ver.song_id);
    if (!song) continue;
    const lesson = ver.lesson as Lesson | null;
    if (!lesson) {
      skippedNoLesson++;
      continue;
    }
    checked++;
    const versionGaps = await checkVocabIdentity(
      db,
      song.slug,
      ver.version_type,
      lesson,
    );
    if (versionGaps.length > 0) {
      allGaps.push(...versionGaps);
      if (!isJson) {
        console.log(
          `  [GAPS] ${song.slug}:${ver.version_type} — ${versionGaps.length} gap(s)`,
        );
        for (const gap of versionGaps) {
          const detail = gap.detail ? ` (${gap.detail})` : "";
          console.log(`    - [${gap.type}] ${gap.field}${detail}`);
        }
      }
    }
  }

  const report: UuidReport = {
    total_versions: allVersions.length,
    versions_checked: checked,
    versions_skipped_no_lesson: skippedNoLesson,
    gaps_count: allGaps.length,
    gaps: allGaps,
  };

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\n=== UUID Integrity Report ===");
    console.log(`  Total versions:           ${report.total_versions}`);
    console.log(`  Versions checked:         ${report.versions_checked}`);
    console.log(
      `  Versions skipped (lesson NULL): ${report.versions_skipped_no_lesson}`,
    );
    console.log(`  UUID gaps:                ${report.gaps_count}`);
    if (report.gaps_count === 0) {
      console.log("\n  RESULT: No UUID integrity issues.");
    } else {
      console.log(
        `\n  RESULT: ${report.gaps_count} integrity issue(s) across ${
          new Set(report.gaps.map((g) => `${g.slug}:${g.version}`)).size
        } version(s).`,
      );
    }
  }

  process.exit(report.gaps_count > 0 ? 1 : 0);
}

// Allow direct execution: `tsx scripts/seed/06-qa-uuid-integrity.ts`
const isMainModule =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("06-qa-uuid-integrity.ts");

if (isMainModule) {
  runStandalone().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
