/**
 * 10a-trim-tv-intro.ts — Trim broadcast / non-vocal intros from TV WhisperX
 * timing caches.
 *
 * Problem:
 *   Anime TV cuts on YouTube often include a pre-roll — a broadcaster
 *   announcement ("大阪市..."), a channel jingle, a title card with speech,
 *   or credits scroll before the song actually starts. WhisperX transcribes
 *   that pre-roll as low-confidence word tokens at the very start of the
 *   timing cache, pushing the real song start 5–20s into the file.
 *
 *   Downstream (10b-derive-tv-lessons.ts) aligns full-version lesson tokens
 *   against the TV char stream. When the TV stream begins with pre-roll
 *   noise, the LCS alignment either aligns verse chars against that noise
 *   (bad timing) or fails the coverage threshold entirely (no_detected_verses).
 *
 * Detection:
 *   Scan the timing cache for the first window of CONSECUTIVE_SINGING_WORDS
 *   words where:
 *     - average confidence score >= MIN_SINGING_CONFIDENCE
 *     - average inter-word gap <= MAX_SINGING_GAP_S (real singing has tight
 *       word spacing; pre-roll speech has loose spacing and silence gaps)
 *   The window's first word's start time is declared the singing start.
 *
 *   Falls through to no-op when the first word already starts at ≤ 1.5s or
 *   when no qualifying window is found (avoids false trimming on short songs).
 *
 * Write:
 *   - Updates data/timing-cache-tv/{slug}.json in-place, with a .bak written
 *     alongside the first time a file is trimmed.
 *   - Writes data/tv-intro-offsets-report.json with a per-song summary.
 *
 * Usage:
 *   npx tsx scripts/seed/10a-trim-tv-intro.ts              # all TV songs
 *   npx tsx scripts/seed/10a-trim-tv-intro.ts --slug <s>   # one song
 *   npx tsx scripts/seed/10a-trim-tv-intro.ts --dry-run    # report only
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const TV_TIMING_DIR = "data/timing-cache-tv";
const REPORT_PATH = "data/tv-intro-offsets-report.json";

/** Skip trim entirely if the first word starts this early — no intro to trim. */
const SKIP_TRIM_IF_FIRST_WORD_BEFORE_S = 1.5;
/** Number of consecutive high-confidence words required to call it "singing". */
const CONSECUTIVE_SINGING_WORDS = 8;
/** Average WhisperX confidence across the window to qualify. */
const MIN_SINGING_CONFIDENCE = 0.5;
/** Max average inter-word gap (seconds) within the singing window. */
const MAX_SINGING_GAP_S = 0.8;

type Word = { word: string; start: number; end: number; score?: number };
type Timing = {
  song_slug: string;
  youtube_id?: string;
  words: Word[];
  [k: string]: unknown;
};

interface TrimDetail {
  slug: string;
  action: "trimmed" | "noop_early_start" | "noop_no_window" | "noop_empty";
  first_word_start_s: number;
  singing_start_s: number | null;
  words_dropped: number;
  words_kept: number;
}

// ─────────────────────────────────────────────────────────────────────────────

function detectSingingStart(words: Word[]): { startS: number; startIdx: number } | null {
  if (words.length < CONSECUTIVE_SINGING_WORDS) return null;
  for (let i = 0; i <= words.length - CONSECUTIVE_SINGING_WORDS; i++) {
    const window = words.slice(i, i + CONSECUTIVE_SINGING_WORDS);
    let confSum = 0;
    let gapSum = 0;
    for (let j = 0; j < window.length; j++) {
      confSum += window[j].score ?? 0;
      if (j > 0) gapSum += window[j].start - window[j - 1].end;
    }
    const avgConf = confSum / window.length;
    const avgGap = window.length > 1 ? gapSum / (window.length - 1) : 0;
    if (avgConf >= MIN_SINGING_CONFIDENCE && avgGap <= MAX_SINGING_GAP_S) {
      return { startS: window[0].start, startIdx: i };
    }
  }
  return null;
}

function trimOne(slug: string, dryRun: boolean): TrimDetail {
  const path = join(TV_TIMING_DIR, `${slug}.json`);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Timing;
  if (!Array.isArray(raw.words) || raw.words.length === 0) {
    return {
      slug,
      action: "noop_empty",
      first_word_start_s: 0,
      singing_start_s: null,
      words_dropped: 0,
      words_kept: 0,
    };
  }
  const firstWordStart = raw.words[0].start;
  if (firstWordStart <= SKIP_TRIM_IF_FIRST_WORD_BEFORE_S) {
    return {
      slug,
      action: "noop_early_start",
      first_word_start_s: Number(firstWordStart.toFixed(2)),
      singing_start_s: null,
      words_dropped: 0,
      words_kept: raw.words.length,
    };
  }
  const detect = detectSingingStart(raw.words);
  if (!detect || detect.startIdx === 0) {
    return {
      slug,
      action: "noop_no_window",
      first_word_start_s: Number(firstWordStart.toFixed(2)),
      singing_start_s: detect ? Number(detect.startS.toFixed(2)) : null,
      words_dropped: 0,
      words_kept: raw.words.length,
    };
  }
  const kept = raw.words.slice(detect.startIdx);
  if (!dryRun) {
    const bakPath = `${path}.bak`;
    if (!existsSync(bakPath)) {
      writeFileSync(bakPath, JSON.stringify(raw, null, 2), "utf-8");
    }
    const updated = { ...raw, words: kept };
    writeFileSync(path, JSON.stringify(updated, null, 2), "utf-8");
  }
  return {
    slug,
    action: "trimmed",
    first_word_start_s: Number(firstWordStart.toFixed(2)),
    singing_start_s: Number(detect.startS.toFixed(2)),
    words_dropped: detect.startIdx,
    words_kept: kept.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(): { slug: string | null; dryRun: boolean } {
  const argv = process.argv.slice(2);
  let slug: string | null = null;
  const dryRun = argv.includes("--dry-run");
  const slugIdx = argv.indexOf("--slug");
  if (slugIdx !== -1) slug = argv[slugIdx + 1] ?? null;
  return { slug, dryRun };
}

function main(): void {
  const { slug, dryRun } = parseArgs();
  if (!existsSync(TV_TIMING_DIR)) {
    console.error(`[error] ${TV_TIMING_DIR} does not exist`);
    process.exit(1);
  }
  const slugs = slug
    ? [slug]
    : readdirSync(TV_TIMING_DIR)
        .filter((f) => f.endsWith(".json") && !f.endsWith(".bak"))
        .map((f) => f.replace(/\.json$/, ""));

  console.log(`10a-trim-tv-intro: ${slugs.length} song(s)${dryRun ? " (DRY RUN)" : ""}`);

  const details: TrimDetail[] = [];
  for (const s of slugs) {
    try {
      details.push(trimOne(s, dryRun));
    } catch (err) {
      console.error(`  [error] ${s}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const counts = details.reduce<Record<string, number>>((acc, d) => {
    acc[d.action] = (acc[d.action] ?? 0) + 1;
    return acc;
  }, {});

  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dry_run: dryRun,
        summary: counts,
        songs: details.sort((a, b) => a.slug.localeCompare(b.slug)),
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log();
  console.log("summary:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`\nreport: ${REPORT_PATH}`);

  // Per-song log for the trimmed ones so user can eyeball results.
  const trimmed = details.filter((d) => d.action === "trimmed");
  if (trimmed.length > 0) {
    console.log("\ntrimmed songs (dropped words):");
    for (const t of trimmed) {
      console.log(
        `  ${t.slug.padEnd(60)} ${String(t.first_word_start_s).padStart(6)}s → ${String(
          t.singing_start_s
        ).padStart(6)}s  (dropped ${t.words_dropped})`
      );
    }
  }
}

main();
