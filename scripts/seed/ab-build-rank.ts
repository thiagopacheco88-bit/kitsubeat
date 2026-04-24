/**
 * ab-build-rank.ts — Rank every song that has an mp3 by current WhisperX
 * kCov (kanji coverage against canonical lyrics), worst-first.
 *
 * Used to drive the full-catalog Demucs repass so the biggest quality
 * wins land earliest. Songs without canonical lyrics (source=whisper
 * or pending_whisper) get tier="unknown" and sort to the very front
 * — they are the riskiest and should be separated first regardless.
 *
 * Output:
 *   data/ab-repass-rank.json  { slugs: [{ slug, tier, kcov, reason }, ...] }
 *
 * Tiers (sorted in this order within output):
 *   1. unknown    — no canonical lyrics available (source=whisper/pending_whisper
 *                   or lyrics file missing) — stem processing is pure upside
 *   2. low_kcov   — has lyrics, kCov < 0.40 — biggest expected lift
 *   3. mid_kcov   — 0.40 ≤ kCov < 0.70
 *   4. high_kcov  — kCov ≥ 0.70 — smallest expected lift, do last
 *   5. skip       — no mp3, or already promoted from pilot, or no timing-cache yet
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/ab-build-rank.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const AUDIO_DIR = "public/audio";
const LYRICS_DIR = "data/lyrics-cache";
const TIMING_DIR = "data/timing-cache";
const STEM_TIMING_DIR = "data/timing-cache-stem";
const OUT_PATH = "data/ab-repass-rank.json";

const PILOT_SLUGS = new Set([
  "whats-up-people-maximum-the-hormone",
  "speed-analogfish",
  "99-mob-choir",
  "mountain-a-go-go-too-captain-straydum",
  "vivid-vice-who-ya-extended",
  "change-the-world-v6",
  "kick-back-kenshi-yonezu",
  "specialz-king-gnu",
]);

type Tier = "unknown" | "low_kcov" | "mid_kcov" | "high_kcov" | "skip";

interface RankEntry {
  slug: string;
  tier: Tier;
  kcov: number | null;
  whisper_words: number | null;
  lyric_kanji: number | null;
  reason: string;
  already_has_stem: boolean;
}

function isKanji(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

function kanjiSet(text: string): Set<string> {
  const s = new Set<string>();
  for (const ch of text) if (isKanji(ch)) s.add(ch);
  return s;
}

function coverage(target: Set<string>, source: Set<string>): number | null {
  if (target.size === 0) return null;
  let hit = 0;
  for (const ch of target) if (source.has(ch)) hit++;
  return hit / target.size;
}

function tierOf(kcov: number | null, hasCanonicalLyrics: boolean): Tier {
  if (!hasCanonicalLyrics) return "unknown";
  if (kcov === null) return "unknown";
  if (kcov < 0.4) return "low_kcov";
  if (kcov < 0.7) return "mid_kcov";
  return "high_kcov";
}

function main() {
  const mp3Files = readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3"));
  const slugs = mp3Files.map((f) => f.replace(/\.mp3$/, ""));
  console.log(`[rank] ${slugs.length} mp3s in ${AUDIO_DIR}`);

  const entries: RankEntry[] = [];
  for (const slug of slugs) {
    const lyricsPath = join(LYRICS_DIR, `${slug}.json`);
    const timingPath = join(TIMING_DIR, `${slug}.json`);
    const stemTimingPath = join(STEM_TIMING_DIR, `${slug}.json`);
    const alreadyHasStem = existsSync(stemTimingPath);

    if (PILOT_SLUGS.has(slug)) {
      entries.push({
        slug,
        tier: "skip",
        kcov: null,
        whisper_words: null,
        lyric_kanji: null,
        reason: "pilot_already_promoted",
        already_has_stem: alreadyHasStem,
      });
      continue;
    }

    if (!existsSync(timingPath)) {
      // No original timing yet — the production pipeline hasn't processed it.
      // We can still run Demucs+WhisperX on it directly, tier=unknown.
      entries.push({
        slug,
        tier: "unknown",
        kcov: null,
        whisper_words: null,
        lyric_kanji: null,
        reason: "no_original_timing_cache",
        already_has_stem: alreadyHasStem,
      });
      continue;
    }

    // Load timing cache
    const timing = JSON.parse(readFileSync(timingPath, "utf-8"));
    const timingWords = (timing.words ?? []) as Array<{ word: string }>;
    const whisperText = timingWords.map((w) => w.word).join("");

    // Load lyrics (if any)
    let hasCanonical = false;
    let lyricK: Set<string> = new Set();
    if (existsSync(lyricsPath)) {
      const lyrics = JSON.parse(readFileSync(lyricsPath, "utf-8"));
      const src = (lyrics.source as string) ?? "";
      if (src && src !== "whisper" && src !== "pending_whisper") {
        hasCanonical = true;
        lyricK = kanjiSet(lyrics.raw_lyrics ?? "");
      }
    }

    const whisperK = kanjiSet(whisperText);
    const kcov = hasCanonical ? coverage(lyricK, whisperK) : null;
    const tier = tierOf(kcov, hasCanonical);

    const reason = hasCanonical
      ? `kcov=${kcov !== null ? kcov.toFixed(3) : "n/a"}`
      : "no_canonical_lyrics";

    entries.push({
      slug,
      tier,
      kcov: kcov !== null ? Math.round(kcov * 1000) / 1000 : null,
      whisper_words: timingWords.length,
      lyric_kanji: lyricK.size,
      reason,
      already_has_stem: alreadyHasStem,
    });
  }

  // Sort: unknown first (worst/riskiest), then low→mid→high_kcov, then skip
  const tierOrder: Record<Tier, number> = {
    unknown: 0,
    low_kcov: 1,
    mid_kcov: 2,
    high_kcov: 3,
    skip: 4,
  };
  entries.sort((a, b) => {
    const d = tierOrder[a.tier] - tierOrder[b.tier];
    if (d !== 0) return d;
    // Within a tier, sort by kcov asc (worst first)
    const ak = a.kcov ?? -1;
    const bk = b.kcov ?? -1;
    return ak - bk;
  });

  // Summary
  const counts: Record<Tier, number> = {
    unknown: 0,
    low_kcov: 0,
    mid_kcov: 0,
    high_kcov: 0,
    skip: 0,
  };
  for (const e of entries) counts[e.tier]++;

  const processable = entries.filter((e) => e.tier !== "skip");
  const already = processable.filter((e) => e.already_has_stem).length;
  const remaining = processable.length - already;

  console.log();
  console.log(
    `tiers: unknown=${counts.unknown}  low_kcov=${counts.low_kcov}  ` +
      `mid_kcov=${counts.mid_kcov}  high_kcov=${counts.high_kcov}  skip=${counts.skip}`,
  );
  console.log(
    `processable=${processable.length}  already_has_stem=${already}  remaining=${remaining}`,
  );
  console.log();
  console.log("top 15 worst-first:");
  for (const e of entries.slice(0, 15)) {
    console.log(
      `  ${e.tier.padEnd(10)} ${e.slug.padEnd(48)}  ${e.reason}${e.already_has_stem ? "  [has_stem]" : ""}`,
    );
  }

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        counts,
        processable,
        skipped: entries.filter((e) => e.tier === "skip"),
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`\nrank: ${OUT_PATH}`);
}

main();
