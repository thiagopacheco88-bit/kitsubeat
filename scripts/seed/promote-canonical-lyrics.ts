/**
 * promote-canonical-lyrics.ts — Promote scraped canonical lyrics
 * (data/lyrics-canonical/{slug}.txt) into the runtime lyrics cache
 * (data/lyrics-cache/{slug}.json), re-tokenizing via kuroshiro.
 *
 * Strips the comment header (lines starting with `#`), then writes a
 * LyricsCacheEntry with source: "genius_canonical".
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/promote-canonical-lyrics.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/promote-canonical-lyrics.ts --slug kaikai-kitan-eve
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { initKuroshiro, tokenizeLyrics } from "../lib/kuroshiro-tokenizer.ts";

const PROJECT_ROOT = resolve(process.cwd());
const CANONICAL_DIR = join(PROJECT_ROOT, "data/lyrics-canonical");
const CACHE_DIR = join(PROJECT_ROOT, "data/lyrics-cache");

function stripHeader(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n")
    .trim();
}

async function main() {
  const args = process.argv.slice(2);
  const slugFlag = args.indexOf("--slug");
  const slugFilter = slugFlag !== -1 ? args[slugFlag + 1] : null;

  if (!existsSync(CANONICAL_DIR)) {
    console.error(`No canonical dir at ${CANONICAL_DIR}`);
    process.exit(1);
  }

  console.log("[promote] init kuroshiro...");
  await initKuroshiro();

  const files = readdirSync(CANONICAL_DIR).filter((f) => f.endsWith(".txt"));
  for (const file of files) {
    const slug = file.replace(/\.txt$/, "");
    if (slugFilter && slug !== slugFilter) continue;

    const canonicalPath = join(CANONICAL_DIR, file);
    const cachePath = join(CACHE_DIR, `${slug}.json`);

    const raw = stripHeader(readFileSync(canonicalPath, "utf-8"));
    if (!raw) {
      console.log(`  [skip] ${slug} — empty after strip`);
      continue;
    }

    // Read existing cache entry to preserve title/artist (and synced_lrc if present)
    let title = slug;
    let artist = "";
    let prevSyncedLrc: any = null;
    if (existsSync(cachePath)) {
      try {
        const prev = JSON.parse(readFileSync(cachePath, "utf-8"));
        title = prev.title || slug;
        artist = prev.artist || "";
        prevSyncedLrc = prev.synced_lrc ?? null;
      } catch {}
    }

    console.log(`[promote] ${slug} — tokenizing ${raw.replace(/\s/g, "").length} chars`);
    const tokens = await tokenizeLyrics(raw);

    const entry = {
      slug,
      title,
      artist,
      source: "genius_canonical",
      raw_lyrics: raw,
      synced_lrc: prevSyncedLrc, // preserve if it was set (it wasn't useful before, but harmless)
      tokens,
    };

    writeFileSync(cachePath, JSON.stringify(entry, null, 2), "utf-8");
    console.log(`  [save] ${cachePath} (${tokens.length} tokens)`);
  }

  console.log("\n[promote] done.");
}

main().catch((e) => { console.error("[promote] fatal:", e); process.exit(1); });
