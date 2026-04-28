/**
 * Inspect post-snap state for a slug: show DB lesson.verses + lyrics_source
 * + first WhisperX word, side-by-side with what the player would resolve.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npx tsx scripts/debug/inspect-snap-result.ts <slug>");
  process.exit(1);
}

const { getDb } = await import("../../src/lib/db/index.js");
const { songs, songVersions } = await import("../../src/lib/db/schema.js");
const { eq, and } = await import("drizzle-orm");

const db = getDb();
const rows = await db
  .select({
    slug: songs.slug,
    lesson: songVersions.lesson,
    synced_lrc: songVersions.synced_lrc,
    lyrics_offset_ms: songVersions.lyrics_offset_ms,
    lyrics_source: songVersions.lyrics_source,
  })
  .from(songVersions)
  .innerJoin(songs, eq(songs.id, songVersions.song_id))
  .where(and(eq(songs.slug, slug), eq(songVersions.version_type, "full")));

if (!rows.length) {
  console.error(`No row: ${slug}`);
  process.exit(1);
}

const r = rows[0];
const lesson = r.lesson as { verses: Array<{ verse_number: number; start_time_ms: number; end_time_ms: number; tokens?: Array<{ surface: string }> }> };

console.log(`# ${slug}`);
console.log(`lyrics_source: ${r.lyrics_source}`);
console.log(`lyrics_offset_ms: ${r.lyrics_offset_ms}`);
console.log(`synced_lrc: ${r.synced_lrc ? "present" : "NULL"}`);

const stemPath = join(ROOT, "data/timing-cache-stem", `${slug}.json`);
const rawPath = join(ROOT, "data/timing-cache", `${slug}.json`);
let firstWordMs: number | null = null;
let timingSrc: string = "missing";
if (existsSync(stemPath)) {
  const t = JSON.parse(readFileSync(stemPath, "utf-8")) as { words: Array<{ word: string; start: number }> };
  const w = t.words.find((x) => x.word && x.word.trim());
  firstWordMs = w ? Math.round(w.start * 1000) : null;
  timingSrc = "stem";
} else if (existsSync(rawPath)) {
  const t = JSON.parse(readFileSync(rawPath, "utf-8")) as { words: Array<{ word: string; start: number }> };
  const w = t.words.find((x) => x.word && x.word.trim());
  firstWordMs = w ? Math.round(w.start * 1000) : null;
  timingSrc = "raw";
}
console.log(`First WhisperX (${timingSrc}) word: ${firstWordMs ?? "—"}ms`);
console.log();

console.log(`| # | start_ms | end_ms | dur | tokens (first 30 chars) |`);
console.log(`|---|----------|--------|-----|-------------------------|`);
for (const v of lesson.verses) {
  const txt = (v.tokens ?? []).map((t) => t.surface).join("").slice(0, 30);
  const dur = v.end_time_ms - v.start_time_ms;
  console.log(`| ${v.verse_number} | ${v.start_time_ms} | ${v.end_time_ms} | ${dur} | ${txt} |`);
}
process.exit(0);
