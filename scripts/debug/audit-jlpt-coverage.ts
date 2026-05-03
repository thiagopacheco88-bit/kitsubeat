/**
 * Audits which JLPT-tagged words are covered by lesson vocabulary vs missing.
 *
 * Reference: data/jlpt-reference/JLPT_vocab_ALL.json
 *   Source: Bluskyo/JLPT_Vocabulary (derived from Tanos.co.uk — the de facto
 *   canonical 2009 official list, also the upstream of JMdict's JLPT tags).
 *   Format: { "<surface>": [ { "reading": "...", "level": 1..5 } ] }
 *   level 5 = N5 (easiest), level 1 = N1 (hardest).
 *
 * Frequency: data/jlpt-reference/japanese-frequency.txt
 *   Source: hingston/japanese (44492-japanese-words-latin-lines-removed.txt,
 *   University of Leeds Corpus). One word per line; line N = rank N. Words
 *   not in the list get rank=null and sort to the bottom.
 *
 * Lessons: data/lessons-cache/<slug>.json (skips .bak / .json.bak)
 *   Each file matches the Lesson type — .vocabulary[] has VocabEntry rows.
 *
 * Match rules per reference entry (refSurface, refReading, level):
 *   1. lessonSurfaces.has(refSurface)                        → COVERED
 *   2. refSurface is kana-only AND lessonReadings.has(refSurface)
 *                                                            → COVERED
 *   3. else                                                  → MISSING
 *
 * Outputs (data/jlpt-coverage/):
 *   - summary.md                    coverage table per level
 *   - missing-{N5..N1}.csv          per-(surface, reading) rows, freq-sorted
 *   - missing-{N5..N1}-deduped.csv  per-surface (best reading + lowest rank)
 *   - covered-{N5..N1}.csv          sanity-check list of covered words
 *   - unknown-vocab.csv             lesson vocab tagged jlpt_level="unknown"
 *
 * Usage:
 *   npx tsx scripts/debug/audit-jlpt-coverage.ts
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

type RefLevel = 1 | 2 | 3 | 4 | 5;
type JlptLabel = "N1" | "N2" | "N3" | "N4" | "N5";

interface RefEntry {
  surface: string;
  reading: string;
  level: RefLevel;
  label: JlptLabel;
  rank: number | null;
}

interface LessonVocab {
  surface: string;
  reading: string;
  jlpt_level: JlptLabel | "unknown";
  meaning?: unknown;
}

interface LessonFile {
  jlpt_level?: string;
  vocabulary?: LessonVocab[];
}

const ROOT = join(process.cwd());
const REF_PATH = join(ROOT, "data", "jlpt-reference", "JLPT_vocab_ALL.json");
const FREQ_PATH = join(ROOT, "data", "jlpt-reference", "japanese-frequency.txt");
const LESSONS_DIR = join(ROOT, "data", "lessons-cache");
const OUT_DIR = join(ROOT, "data", "jlpt-coverage");

const KANA_RE = /^[぀-ゟ゠-ヿーｦ-ﾟ]+$/;
const isKanaOnly = (s: string) => KANA_RE.test(s);

const LEVEL_TO_LABEL = { 5: "N5", 4: "N4", 3: "N3", 2: "N2", 1: "N1" } as const;
const levelToLabel = (lvl: RefLevel): JlptLabel => LEVEL_TO_LABEL[lvl];

function loadFrequencyMap(): Map<string, number> {
  const map = new Map<string, number>();
  if (!existsSync(FREQ_PATH)) return map;
  const lines = readFileSync(FREQ_PATH, "utf8").split(/\r?\n/);
  lines.forEach((word, i) => {
    const w = word.trim();
    if (w && !map.has(w)) map.set(w, i + 1);
  });
  return map;
}

function loadReference(freq: Map<string, number>): RefEntry[] {
  if (!existsSync(REF_PATH)) {
    throw new Error(`Reference list not found at ${REF_PATH}. See script header for source URL.`);
  }
  const raw = JSON.parse(readFileSync(REF_PATH, "utf8")) as Record<string, { reading: string; level: RefLevel }[]>;
  const out: RefEntry[] = [];
  for (const [surface, readings] of Object.entries(raw)) {
    for (const { reading, level } of readings) {
      // Best rank: surface lookup first, then reading fallback for kana variants.
      const rank = freq.get(surface) ?? freq.get(reading) ?? null;
      out.push({ surface, reading, level, label: levelToLabel(level), rank });
    }
  }
  return out;
}

function loadLessons(): { surfaces: Set<string>; readings: Set<string>; unknownVocab: LessonVocab[]; lessonCount: number } {
  const surfaces = new Set<string>();
  const readings = new Set<string>();
  const unknownVocab: LessonVocab[] = [];
  const seenUnknown = new Set<string>();
  let lessonCount = 0;
  const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".json") && !f.endsWith(".bak"));
  for (const file of files) {
    const lesson = JSON.parse(readFileSync(join(LESSONS_DIR, file), "utf8")) as LessonFile;
    if (!Array.isArray(lesson.vocabulary)) continue;
    lessonCount++;
    for (const v of lesson.vocabulary) {
      if (!v.surface) continue;
      surfaces.add(v.surface);
      if (v.reading) readings.add(v.reading);
      if (v.jlpt_level === "unknown") {
        const key = `${v.surface}|${v.reading ?? ""}`;
        if (!seenUnknown.has(key)) {
          seenUnknown.add(key);
          unknownVocab.push(v);
        }
      }
    }
  }
  return { surfaces, readings, unknownVocab, lessonCount };
}

// Sort: words with a rank come first, ascending (most-common at top); unranked last.
function byFrequency(a: RefEntry, b: RefEntry): number {
  const ra = a.rank ?? Number.POSITIVE_INFINITY;
  const rb = b.rank ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra - rb;
  return a.surface.localeCompare(b.surface);
}

// Dedup multiple reading entries at the same level into one row per surface,
// keeping the best (lowest) rank and joining readings with "; ".
function dedupBySurface(entries: RefEntry[]): { surface: string; readings: string; rank: number | null }[] {
  const bySurface = new Map<string, { readings: Set<string>; rank: number | null }>();
  for (const e of entries) {
    const cur = bySurface.get(e.surface);
    if (!cur) {
      bySurface.set(e.surface, { readings: new Set([e.reading]), rank: e.rank });
    } else {
      cur.readings.add(e.reading);
      if (e.rank !== null && (cur.rank === null || e.rank < cur.rank)) cur.rank = e.rank;
    }
  }
  const out: { surface: string; readings: string; rank: number | null }[] = [];
  for (const [surface, { readings, rank }] of bySurface) {
    out.push({ surface, readings: [...readings].join("; "), rank });
  }
  out.sort((a, b) => {
    const ra = a.rank ?? Number.POSITIVE_INFINITY;
    const rb = b.rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.surface.localeCompare(b.surface);
  });
  return out;
}

function audit() {
  const freq = loadFrequencyMap();
  const ref = loadReference(freq);
  const { surfaces, readings, unknownVocab, lessonCount } = loadLessons();

  const buckets: Record<JlptLabel, { covered: RefEntry[]; missing: RefEntry[] }> = {
    N5: { covered: [], missing: [] },
    N4: { covered: [], missing: [] },
    N3: { covered: [], missing: [] },
    N2: { covered: [], missing: [] },
    N1: { covered: [], missing: [] },
  };

  for (const entry of ref) {
    const isCovered =
      surfaces.has(entry.surface) ||
      (isKanaOnly(entry.surface) && readings.has(entry.surface));
    (isCovered ? buckets[entry.label].covered : buckets[entry.label].missing).push(entry);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const order: JlptLabel[] = ["N5", "N4", "N3", "N2", "N1"];
  const rows = order.map((lbl) => {
    const all = buckets[lbl].covered.concat(buckets[lbl].missing);
    const dedupedTotal = new Set(all.map((e) => e.surface)).size;
    const dedupedCovered = new Set(buckets[lbl].covered.map((e) => e.surface)).size;
    const dedupedMissing = new Set(buckets[lbl].missing.map((e) => e.surface)).size;
    const total = all.length;
    const cov = buckets[lbl].covered.length;
    const pct = total === 0 ? 0 : (cov / total) * 100;
    const dedPct = dedupedTotal === 0 ? 0 : (dedupedCovered / dedupedTotal) * 100;
    return { lbl, total, cov, miss: buckets[lbl].missing.length, pct, dedupedTotal, dedupedCovered, dedupedMissing, dedPct };
  });

  const summaryLines = [
    "# JLPT Coverage Audit",
    "",
    `- Reference: \`data/jlpt-reference/JLPT_vocab_ALL.json\` (${ref.length} entries / ${new Set(ref.map((r) => r.surface)).size} unique surfaces)`,
    `- Frequency list: \`data/jlpt-reference/japanese-frequency.txt\` (${freq.size} ranked words)`,
    `- Lessons scanned: ${lessonCount}`,
    `- Unique lesson surfaces: ${surfaces.size}`,
    `- Lesson vocab tagged \`unknown\`: ${unknownVocab.length}`,
    "",
    "## Coverage per level (raw entries)",
    "",
    "| Level | Total | Covered | Missing | Coverage |",
    "| ----- | ----- | ------- | ------- | -------- |",
    ...rows.map((r) => `| ${r.lbl} | ${r.total} | ${r.cov} | ${r.miss} | ${r.pct.toFixed(1)}% |`),
    "",
    "## Coverage per level (deduped by surface)",
    "",
    "| Level | Total | Covered | Missing | Coverage |",
    "| ----- | ----- | ------- | ------- | -------- |",
    ...rows.map((r) => `| ${r.lbl} | ${r.dedupedTotal} | ${r.dedupedCovered} | ${r.dedupedMissing} | ${r.dedPct.toFixed(1)}% |`),
    "",
    "Missing CSVs are sorted by frequency rank (most common first). `rank=` blank means the word is outside the top-44K Leeds Corpus list (rare).",
    "",
  ];
  writeFileSync(join(OUT_DIR, "summary.md"), summaryLines.join("\n"), "utf8");

  const csvEscape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

  for (const lbl of order) {
    for (const kind of ["missing", "covered"] as const) {
      const list = [...buckets[lbl][kind]].sort(byFrequency);
      const lines = ["surface,reading,rank"];
      for (const e of list) lines.push(`${csvEscape(e.surface)},${csvEscape(e.reading)},${e.rank ?? ""}`);
      writeFileSync(join(OUT_DIR, `${kind}-${lbl}.csv`), lines.join("\n"), "utf8");
    }
    // Deduped missing — one row per surface, frequency-sorted.
    const deduped = dedupBySurface(buckets[lbl].missing);
    const dedupLines = ["surface,readings,rank"];
    for (const e of deduped) dedupLines.push(`${csvEscape(e.surface)},${csvEscape(e.readings)},${e.rank ?? ""}`);
    writeFileSync(join(OUT_DIR, `missing-${lbl}-deduped.csv`), dedupLines.join("\n"), "utf8");
  }

  const unknownLines = ["surface,reading"];
  for (const v of unknownVocab) unknownLines.push(`${csvEscape(v.surface)},${csvEscape(v.reading ?? "")}`);
  writeFileSync(join(OUT_DIR, "unknown-vocab.csv"), unknownLines.join("\n"), "utf8");

  console.log(summaryLines.join("\n"));
  console.log(`\nWrote ${OUT_DIR}/{summary.md, missing-*.csv, missing-*-deduped.csv, covered-*.csv, unknown-vocab.csv}`);
}

audit();
