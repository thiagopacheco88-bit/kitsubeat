/**
 * scripts/generate-schedule.ts
 *
 * Generates an interleaved posting schedule across all anime series.
 * Round-robins through every series so you never post the same show twice in a row.
 * Skips parts already marked as posted in catalog.json.
 * Writes videos/POSTING-SCHEDULE.md.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/generate-schedule.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, "..", "..");
const WORD_BANKS_DIR = join(ROOT, "videos", "word-banks");
const CATALOG_PATH   = join(ROOT, "videos", "catalog.json");
const OUT_PATH       = join(ROOT, "videos", "POSTING-SCHEDULE.md");

// ── Types ─────────────────────────────────────────────────────────────────────

interface WordBankWord { id: string; romaji: string; en: string; tier: string; }
interface WordBankPart { part: number; theme: string; words: WordBankWord[]; }
interface WordBank     { series: string; label: string; parts: WordBankPart[]; }

interface CatalogPart  { part: number; posted?: Record<string, { date?: string } | null>; }
interface CatalogSeries { label: string; parts: CatalogPart[]; }
interface Catalog       { [series: string]: CatalogSeries; }

// ── Load data ─────────────────────────────────────────────────────────────────

const catalog: Catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));

// Collect which (series, part) combos are already posted
const postedSet = new Set<string>();
for (const [slug, series] of Object.entries(catalog)) {
  for (const part of series.parts ?? []) {
    const posted = part.posted ?? {};
    const hasAnyPost = Object.values(posted).some(
      (p) => p !== null && typeof p === "object" && "date" in p && p.date
    );
    if (hasAnyPost) postedSet.add(`${slug}:${part.part}`);
  }
}

// Load word banks - preserve a consistent order.
// One Piece goes last — Parts 1+2 already posted, so it enters the rotation later.
const SERIES_ORDER = [
  "naruto",
  "anime-core",
  "bleach",
  "demon-slayer",
  "attack-on-titan",
  "dragon-ball",
  "fullmetal-alchemist",
  "my-hero-academia",
  "sword-art-online",
  "one-piece",
];

// How many consecutive parts to post from the same series before switching.
// 2 = "pair" mode: viewer sees Part N then Part N+1 the next day, then series changes.
const PAIR_SIZE = 2;

interface QueueEntry {
  series: string;
  label: string;
  part: number;
  theme: string;
  words: WordBankWord[];
}

// Build per-series queues of unposted parts
const queues: QueueEntry[][] = [];

for (const slug of SERIES_ORDER) {
  const filePath = join(WORD_BANKS_DIR, `${slug}.json`);
  let bank: WordBank;
  try {
    bank = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    continue; // word bank file missing — skip
  }

  const seriesLabel = catalog[slug]?.label ?? bank.label;
  const queue: QueueEntry[] = [];

  for (const p of bank.parts) {
    if (!postedSet.has(`${slug}:${p.part}`)) {
      queue.push({
        series: slug,
        label: seriesLabel,
        part: p.part,
        theme: p.theme,
        words: p.words,
      });
    }
  }

  if (queue.length > 0) queues.push(queue);
}

// ── Pair-based round-robin interleave ────────────────────────────────────────
// Each series contributes PAIR_SIZE consecutive parts before the next series takes over.

const schedule: QueueEntry[] = [];
const pointers = queues.map(() => 0);

let added = true;
while (added) {
  added = false;
  for (let i = 0; i < queues.length; i++) {
    // Take up to PAIR_SIZE entries from this series in one go
    let took = 0;
    while (took < PAIR_SIZE && pointers[i] < queues[i].length) {
      schedule.push(queues[i][pointers[i]]);
      pointers[i]++;
      took++;
      added = true;
    }
  }
}

// ── Render markdown ───────────────────────────────────────────────────────────

const SERIES_EMOJI: Record<string, string> = {
  "one-piece":           "🏴‍☠️",
  "naruto":              "🍃",
  "bleach":              "⚔️",
  "attack-on-titan":     "🧱",
  "fullmetal-alchemist": "⚗️",
  "sword-art-online":    "🎮",
  "demon-slayer":        "🌸",
  "dragon-ball":         "⭐",
  "my-hero-academia":    "🦸",
  "anime-core":          "🦊",
};

const lines: string[] = [
  "# KitsuBeat — Video Posting Schedule",
  "",
  `**${schedule.length} videos** across ${queues.length} series — round-robin interleaved so no two consecutive posts are from the same show.`,
  "",
  `Already posted: ${postedSet.size} video${postedSet.size !== 1 ? "s" : ""} (skipped).`,
  "",
  "---",
  "",
  "| # | Emoji | Series | Part | Theme | Key Words |",
  "|---|-------|--------|------|-------|-----------|",
];

for (let i = 0; i < schedule.length; i++) {
  const e = schedule[i];
  const emoji = SERIES_EMOJI[e.series] ?? "🎌";
  const keyWords = e.words.slice(0, 3).map((w) => `${w.romaji} (${w.en})`).join(" · ");
  lines.push(`| ${i + 1} | ${emoji} | ${e.label} | ${e.part} | ${e.theme} | ${keyWords}… |`);
}

lines.push("");
lines.push("---");
lines.push("");
lines.push(`_Generated ${new Date().toISOString().slice(0, 10)}. Re-run \`scripts/generate-schedule.ts\` after posting to refresh._`);

const md = lines.join("\n");
writeFileSync(OUT_PATH, md, "utf-8");

console.log(`✅ Schedule written to videos/POSTING-SCHEDULE.md`);
console.log(`   ${schedule.length} videos queued across ${queues.length} series`);
console.log(`   ${postedSet.size} already-posted parts skipped`);
console.log();

// Print first 20 as preview
console.log("First 20 in queue:");
for (let i = 0; i < Math.min(20, schedule.length); i++) {
  const e = schedule[i];
  const emoji = SERIES_EMOJI[e.series] ?? "🎌";
  console.log(`  ${String(i + 1).padStart(3)}. ${emoji} ${e.label.padEnd(24)} Part ${String(e.part).padStart(2)} — ${e.theme}`);
}
if (schedule.length > 20) {
  console.log(`  ... and ${schedule.length - 20} more`);
}
