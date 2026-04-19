/**
 * For songs where lyrics-cache is now canonical-Genius (text correct) but
 * synced_lrc was nulled out, re-fetch LRCLIB by title+artist to recover the
 * line-level startMs timestamps. Discard LRCLIB's romaji text — we only want
 * the timing track.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fetchFromLrclib } from "../lib/lrclib.ts";

const slug = process.argv[2];
if (!slug) { console.error("usage: refetch-lrclib-timestamps.ts <slug>"); process.exit(1); }
const path = resolve(`data/lyrics-cache/${slug}.json`);
const cache = JSON.parse(readFileSync(path, "utf-8"));
console.log(`fetching LRCLIB for "${cache.title}" by "${cache.artist}"...`);
const r = await fetchFromLrclib(cache.title, cache.artist);
console.log("LRCLIB result:", r ? `synced=${!!r.synced_lrc} (${r.synced_lrc?.length ?? 0} lines), plain=${!!r.plain_lyrics}` : "null");
if (r?.synced_lrc?.length) {
  cache.synced_lrc = r.synced_lrc;
  writeFileSync(path, JSON.stringify(cache, null, 2), "utf-8");
  console.log(`saved ${r.synced_lrc.length} synced lines to ${path}`);
  console.log("first 5:");
  r.synced_lrc.slice(0, 5).forEach((l: any) => console.log("  ", (l.startMs/1000).toFixed(2) + "s |", l.text));
} else {
  console.log("no synced_lrc available from LRCLIB");
}
