/**
 * Projects the impact of the loosened vocab-extractor on a 20-song sample.
 *
 * Runs the (now-updated) extractVocabCandidates against each song's raw lyrics,
 * compares the candidate set against the existing lesson cache's vocabulary[],
 * and reports per-song deltas + a projected JLPT coverage table assuming those
 * 20 lessons had the wider vocab.
 *
 * NO writes. NO LLM calls. Pure measurement on cached data.
 *
 * Usage:
 *   npx tsx scripts/debug/project-loosened-vocab-impact.ts          # 20-song sample
 *   npx tsx scripts/debug/project-loosened-vocab-impact.ts --all    # full catalog
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initKuroshiro } from "../lib/kuroshiro-tokenizer.js";
import { extractVocabCandidates, type VocabCandidate } from "../lib/vocab-extractor.js";

const ROOT = process.cwd();
const LYRICS_DIR = join(ROOT, "data", "lyrics-cache");
const LESSONS_DIR = join(ROOT, "data", "lessons-cache");
const REF_PATH = join(ROOT, "data", "jlpt-reference", "JLPT_vocab_ALL.json");
const FREQ_PATH = join(ROOT, "data", "jlpt-reference", "japanese-frequency.txt");

const SAMPLE_SLUG_PIN = "heart-of-sword-t-m-revolution";
const SAMPLE_SIZE = 20;
const ALL_MODE = process.argv.includes("--all");

type RefLevel = 1 | 2 | 3 | 4 | 5;
type JlptLabel = "N1" | "N2" | "N3" | "N4" | "N5";
const LEVEL_TO_LABEL = { 5: "N5", 4: "N4", 3: "N3", 2: "N2", 1: "N1" } as const;

const KANA_RE = /^[぀-ゟ゠-ヿーｦ-ﾟ]+$/;
const isKanaOnly = (s: string) => KANA_RE.test(s);

// JLPT lookup: (surface, reading) → lowest level (most-prominent classification).
function loadJlptLookup(): Map<string, JlptLabel> {
  const raw = JSON.parse(readFileSync(REF_PATH, "utf8")) as Record<
    string,
    { reading: string; level: RefLevel }[]
  >;
  const map = new Map<string, JlptLabel>();
  // For each surface+reading, keep the LOWEST level (= easiest test entry).
  for (const [surface, readings] of Object.entries(raw)) {
    for (const { reading, level } of readings) {
      const key = `${surface}|${reading}`;
      const label = LEVEL_TO_LABEL[level];
      const existing = map.get(key);
      if (!existing || labelRank(label) < labelRank(existing)) map.set(key, label);
    }
  }
  return map;
}
const labelRank = (l: JlptLabel) => ({ N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 })[l];

function lookupJlpt(lookup: Map<string, JlptLabel>, surface: string, reading: string): JlptLabel | "unknown" {
  return lookup.get(`${surface}|${reading}`) ?? lookup.get(`${reading}|${reading}`) ?? "unknown";
}

interface LessonCache {
  jlpt_level: string;
  vocabulary: { surface: string; reading: string; jlpt_level: string }[];
}

interface SongResult {
  slug: string;
  lessonLevel: string;
  origVocabCount: number;
  newVocabCount: number;
  added: { surface: string; reading: string; pos: string; jlpt: JlptLabel | "unknown" }[];
  droppedFromOrig: { surface: string; reading: string }[];
}

function pickSlugs(): string[] {
  const all = readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".bak"))
    .map((f) => f.replace(/\.json$/, ""));
  // Restrict to slugs that also have a lyrics-cache entry.
  const haveLyrics = new Set(
    readdirSync(LYRICS_DIR)
      .filter((f) => f.endsWith(".json") && !f.includes(".bak"))
      .map((f) => f.replace(/\.json$/, ""))
  );
  const available = all.filter((s) => haveLyrics.has(s)).sort();
  if (!available.includes(SAMPLE_SLUG_PIN)) {
    throw new Error(`Pinned slug ${SAMPLE_SLUG_PIN} not found in lessons+lyrics cache.`);
  }
  if (ALL_MODE) return available;
  const head = available.slice(0, SAMPLE_SIZE);
  if (!head.includes(SAMPLE_SLUG_PIN)) {
    head[head.length - 1] = SAMPLE_SLUG_PIN;
  }
  return head;
}

async function processSong(slug: string, jlptLookup: Map<string, JlptLabel>): Promise<SongResult> {
  const lyrics = JSON.parse(readFileSync(join(LYRICS_DIR, `${slug}.json`), "utf8")) as {
    raw_lyrics: string;
  };
  const lesson = JSON.parse(readFileSync(join(LESSONS_DIR, `${slug}.json`), "utf8")) as LessonCache;

  const candidates = await extractVocabCandidates(lyrics.raw_lyrics);

  const origPairs = new Set(lesson.vocabulary.map((v) => `${v.surface}|${v.reading}`));
  const candPairs = new Set(candidates.map((c) => `${c.dictionary_form}|${c.reading}`));

  const added: SongResult["added"] = [];
  for (const c of candidates) {
    const key = `${c.dictionary_form}|${c.reading}`;
    if (!origPairs.has(key)) {
      added.push({
        surface: c.dictionary_form,
        reading: c.reading,
        pos: c.part_of_speech,
        jlpt: lookupJlpt(jlptLookup, c.dictionary_form, c.reading),
      });
    }
  }

  const droppedFromOrig: SongResult["droppedFromOrig"] = [];
  for (const v of lesson.vocabulary) {
    const key = `${v.surface}|${v.reading}`;
    if (!candPairs.has(key)) droppedFromOrig.push({ surface: v.surface, reading: v.reading });
  }

  return {
    slug,
    lessonLevel: lesson.jlpt_level,
    origVocabCount: lesson.vocabulary.length,
    newVocabCount: candidates.length,
    added,
    droppedFromOrig,
  };
}

// Coverage audit projection: replace the 20 sample lessons' vocabulary
// with the (extractor-derived) candidate sets, then re-run the JLPT match.
function projectCoverage(
  sampleSlugs: Set<string>,
  results: Map<string, SongResult>,
  jlptLookup: Map<string, JlptLabel>
) {
  const allLessonFiles = readdirSync(LESSONS_DIR).filter(
    (f) => f.endsWith(".json") && !f.endsWith(".bak")
  );
  const surfacesBefore = new Set<string>();
  const readingsBefore = new Set<string>();
  const surfacesAfter = new Set<string>();
  const readingsAfter = new Set<string>();

  for (const f of allLessonFiles) {
    const slug = f.replace(/\.json$/, "");
    const lesson = JSON.parse(readFileSync(join(LESSONS_DIR, f), "utf8")) as LessonCache;
    for (const v of lesson.vocabulary) {
      if (!v.surface) continue;
      surfacesBefore.add(v.surface);
      if (v.reading) readingsBefore.add(v.reading);
    }
    if (sampleSlugs.has(slug) && results.has(slug)) {
      // After: include orig vocab + the projected additions
      const r = results.get(slug)!;
      for (const v of lesson.vocabulary) {
        if (!v.surface) continue;
        surfacesAfter.add(v.surface);
        if (v.reading) readingsAfter.add(v.reading);
      }
      for (const a of r.added) {
        surfacesAfter.add(a.surface);
        readingsAfter.add(a.reading);
      }
    } else {
      for (const v of lesson.vocabulary) {
        if (!v.surface) continue;
        surfacesAfter.add(v.surface);
        if (v.reading) readingsAfter.add(v.reading);
      }
    }
  }

  // Build reference list and partition before/after
  const ref = JSON.parse(readFileSync(REF_PATH, "utf8")) as Record<
    string,
    { reading: string; level: RefLevel }[]
  >;
  const refEntries: { surface: string; reading: string; label: JlptLabel }[] = [];
  for (const [surface, readings] of Object.entries(ref)) {
    for (const { reading, level } of readings) {
      refEntries.push({ surface, reading, label: LEVEL_TO_LABEL[level] });
    }
  }

  function tally(surfaces: Set<string>, readings: Set<string>) {
    const out: Record<JlptLabel, { covered: number; total: number }> = {
      N5: { covered: 0, total: 0 },
      N4: { covered: 0, total: 0 },
      N3: { covered: 0, total: 0 },
      N2: { covered: 0, total: 0 },
      N1: { covered: 0, total: 0 },
    };
    for (const e of refEntries) {
      out[e.label].total++;
      const covered =
        surfaces.has(e.surface) || (isKanaOnly(e.surface) && readings.has(e.surface));
      if (covered) out[e.label].covered++;
    }
    return out;
  }

  return { before: tally(surfacesBefore, readingsBefore), after: tally(surfacesAfter, readingsAfter) };
}

async function main() {
  const dictPath = join(ROOT, "node_modules", "@sglkc", "kuromoji", "dict");
  await initKuroshiro({ dictPath });

  const slugs = pickSlugs();
  if (ALL_MODE) {
    console.log(`Mode: --all  (${slugs.length} songs)`);
  } else {
    console.log(`Sample (${slugs.length}):`);
    slugs.forEach((s) => console.log("  -", s));
  }
  console.log("");

  const jlptLookup = loadJlptLookup();
  const results = new Map<string, SongResult>();
  let processed = 0;
  for (const slug of slugs) {
    if (!ALL_MODE) process.stdout.write(`Processing ${slug}... `);
    const r = await processSong(slug, jlptLookup);
    results.set(slug, r);
    processed++;
    if (!ALL_MODE) {
      console.log(`orig=${r.origVocabCount} new=${r.newVocabCount} added=${r.added.length}`);
    } else if (processed % 25 === 0 || processed === slugs.length) {
      console.log(`  ${processed}/${slugs.length} processed`);
    }
  }

  // Aggregate stats
  let totalOrig = 0;
  let totalNew = 0;
  let totalAdded = 0;
  let totalDropped = 0;
  const aggBuckets = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, unknown: 0 } as Record<string, number>;
  for (const r of results.values()) {
    totalOrig += r.origVocabCount;
    totalNew += r.newVocabCount;
    totalAdded += r.added.length;
    totalDropped += r.droppedFromOrig.length;
    for (const a of r.added) aggBuckets[a.jlpt as string]++;
  }
  console.log("\n## Aggregate\n");
  console.log(`  Songs processed:        ${results.size}`);
  console.log(`  Total orig vocab:       ${totalOrig}`);
  console.log(`  Total extracted:        ${totalNew}`);
  console.log(`  Total ADDED candidates: ${totalAdded}  (N5/N4/N3/N2/N1/unknown = ${aggBuckets.N5}/${aggBuckets.N4}/${aggBuckets.N3}/${aggBuckets.N2}/${aggBuckets.N1}/${aggBuckets.unknown})`);
  console.log(`  Total DROPPED (LLM-only entries that won't survive pure regen): ${totalDropped}`);

  if (!ALL_MODE) {
    console.log("\n## Per-song delta\n");
    console.log("| slug | lvl | orig | extracted | added | by JLPT (N5/N4/N3/N2/N1/?) |");
    console.log("| ---- | --- | ---- | --------- | ----- | -------------------------- |");
    for (const slug of slugs) {
      const r = results.get(slug)!;
      const buckets = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, unknown: 0 } as Record<string, number>;
      for (const a of r.added) buckets[a.jlpt as string]++;
      const dist = `${buckets.N5}/${buckets.N4}/${buckets.N3}/${buckets.N2}/${buckets.N1}/${buckets.unknown}`;
      console.log(
        `| ${slug} | ${r.lessonLevel} | ${r.origVocabCount} | ${r.newVocabCount} | ${r.added.length} | ${dist} |`
      );
    }
  } else {
    // Top 10 most-added in --all mode
    const sortedByAdd = [...results.values()].sort((a, b) => b.added.length - a.added.length);
    console.log("\n## Top 10 songs by added-vocab count (full-catalog mode)\n");
    console.log("| slug | lvl | orig | extracted | added |");
    console.log("| ---- | --- | ---- | --------- | ----- |");
    for (const r of sortedByAdd.slice(0, 10)) {
      console.log(`| ${r.slug} | ${r.lessonLevel} | ${r.origVocabCount} | ${r.newVocabCount} | ${r.added.length} |`);
    }
  }

  // Heart of Sword detailed breakdown
  const hos = results.get(SAMPLE_SLUG_PIN);
  if (hos) {
    console.log(`\n## Heart of Sword — ${hos.added.length} added candidates\n`);
    const sorted = [...hos.added].sort((a, b) => {
      const ra = a.jlpt === "unknown" ? 99 : labelRank(a.jlpt);
      const rb = b.jlpt === "unknown" ? 99 : labelRank(b.jlpt);
      return ra - rb;
    });
    for (const a of sorted) {
      console.log(`  ${a.jlpt.padEnd(7)} ${a.pos.padEnd(11)} ${a.surface} (${a.reading})`);
    }
    if (hos.droppedFromOrig.length) {
      console.log(
        `\n  Note: ${hos.droppedFromOrig.length} entries in current vocab not re-extracted (LLM-added or differently lemmatized): ${hos.droppedFromOrig
          .slice(0, 8)
          .map((d) => d.surface)
          .join(", ")}${hos.droppedFromOrig.length > 8 ? "…" : ""}`
      );
    }
  }

  // Projected JLPT coverage
  const projHeader = ALL_MODE
    ? `## Projected JLPT coverage (full ${slugs.length}-song catalog regenerated via loosened extractor)`
    : `## Projected JLPT coverage (full 274-lesson catalog with ${slugs.length}-song sample regenerated)`;
  console.log(`\n${projHeader}\n`);
  const sampleSet = new Set(slugs);
  const { before, after } = projectCoverage(sampleSet, results, jlptLookup);
  console.log("| Level | Before (covered/total, %) | After (covered/total, %) | Δ |");
  console.log("| ----- | ------------------------- | ------------------------ | -- |");
  for (const lbl of ["N5", "N4", "N3", "N2", "N1"] as const) {
    const b = before[lbl];
    const a = after[lbl];
    const bp = (b.covered / b.total) * 100;
    const ap = (a.covered / a.total) * 100;
    console.log(
      `| ${lbl} | ${b.covered}/${b.total} (${bp.toFixed(1)}%) | ${a.covered}/${a.total} (${ap.toFixed(1)}%) | +${(ap - bp).toFixed(2)}pp (+${a.covered - b.covered}) |`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
