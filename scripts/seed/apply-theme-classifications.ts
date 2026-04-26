/**
 * apply-theme-classifications.ts — persist hand-classified (or LLM-classified)
 * song theme labels from data/theme-classifications.json into songs.season_info.
 *
 * Pairs with classify-song-themes.ts (LLM path) and the inline hand-classified
 * workflow: both produce the same JSON shape, this script is the single writer.
 *
 * Safety:
 *   - Dry-run by default. Prints the diff it would apply and exits.
 *   - --apply persists changes. Only rows with confidence="high" are written;
 *     medium/low are printed for manual review and skipped.
 *   - A row is skipped if new_season_info equals old_season_info or if
 *     new_season_info is empty.
 *   - Operates by song_id, not by slug — safe even if slugs change.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";

const IN_PATH = resolve(process.cwd(), "data/theme-classifications.json");

const ClassificationRecord = z.object({
  song_id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  anime: z.string(),
  old_season_info: z.string().nullable(),
  new_season_info: z.string().nullable(),
  theme_type: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string().optional(),
});

const ClassificationFile = z.object({
  results: z.array(ClassificationRecord),
});

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const includeMedium = args.has("--include-medium");

  const raw = JSON.parse(readFileSync(IN_PATH, "utf8"));
  const parsed = ClassificationFile.safeParse(raw);
  if (!parsed.success) {
    console.error("[apply-themes] JSON shape invalid:", parsed.error.issues);
    process.exit(1);
  }

  const results = parsed.data.results;
  const db = getDb();

  const minConfidence = includeMedium ? ["high", "medium"] : ["high"];

  const writable = results.filter(
    (r) =>
      minConfidence.includes(r.confidence) &&
      r.new_season_info &&
      r.new_season_info !== r.old_season_info
  );
  const skipped = results.filter((r) => !writable.includes(r));

  console.log(
    `[apply-themes] ${writable.length} writable / ${results.length} total. mode=${apply ? "APPLY" : "dry-run"}${includeMedium ? " +medium" : ""}`
  );
  console.log("");

  console.log("--- PLAN ---");
  for (const r of writable) {
    console.log(
      `[${r.confidence.padEnd(6)}] ${r.slug.padEnd(50)} "${r.old_season_info ?? "(null)"}" -> "${r.new_season_info}"`
    );
  }

  if (skipped.length > 0) {
    console.log("");
    console.log(`--- SKIPPED (${skipped.length}) ---`);
    for (const r of skipped) {
      const reason =
        !r.new_season_info
          ? "no new value"
          : r.new_season_info === r.old_season_info
            ? "no change"
            : `confidence=${r.confidence}`;
      console.log(
        `  ${r.slug.padEnd(50)} ${r.theme_type.padEnd(18)} [${reason}]`
      );
    }
  }

  if (!apply) {
    console.log("");
    console.log("[apply-themes] dry-run only. Re-run with --apply to persist.");
    return;
  }

  let written = 0;
  let failed = 0;

  for (const r of writable) {
    try {
      await db
        .update(songs)
        .set({
          season_info: r.new_season_info,
          updated_at: new Date(),
        })
        .where(eq(songs.id, r.song_id));
      written++;
    } catch (err) {
      console.warn(
        `[fail] ${r.slug}:`,
        err instanceof Error ? err.message : err
      );
      failed++;
    }
  }

  console.log("");
  console.log(`[apply-themes] done. written=${written} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
