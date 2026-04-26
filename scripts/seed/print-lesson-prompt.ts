/**
 * print-lesson-prompt.ts — Print the full lesson-generation prompt for a slug.
 *
 * Used by the inline-Claude-Code lesson workflow: print the prompt, paste into
 * a Claude session, save the resulting JSON to data/lessons-cache/{slug}.json.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/print-lesson-prompt.ts <slug>
 */

import { config } from "dotenv";
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

config({ path: ".env.local" });

import { SongManifestSchema } from "../types/manifest.js";
import { buildLessonPrompt } from "../lib/lesson-prompt.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const MANIFEST_PATH = join(PROJECT_ROOT, "data/songs-manifest.json");
const LYRICS_CACHE_DIR = join(PROJECT_ROOT, "data/lyrics-cache");

const slug = process.argv[2];
if (!slug) {
  console.error("usage: print-lesson-prompt.ts <slug>");
  process.exit(1);
}

const manifest = SongManifestSchema.parse(
  JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")),
);
const song = manifest.find((s) => s.slug === slug);
if (!song) {
  console.error(`slug not found in manifest: ${slug}`);
  process.exit(1);
}

const lyricsPath = join(LYRICS_CACHE_DIR, `${slug}.json`);
if (!existsSync(lyricsPath)) {
  console.error(`lyrics-cache missing: ${lyricsPath}`);
  process.exit(1);
}
const lc = JSON.parse(readFileSync(lyricsPath, "utf-8")) as {
  raw_lyrics: string;
  tokens: Array<{ surface: string; reading: string; romaji: string; pos: string }>;
};

const prompt = buildLessonPrompt(song, lc.raw_lyrics, lc.tokens);
console.log(prompt);
