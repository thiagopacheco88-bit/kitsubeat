/**
 * audit-lesson-coverage.ts — Count Japanese lyric lines that do NOT map to
 * any verse in the paired lesson. Uses the same normalize rule as
 * LyricsPanel.buildVerseTiming so the measurement reflects actual highlight
 * behaviour.
 *
 * Interpretation by version:
 *   --version full (default): every unmatched JP line is a real highlight gap
 *     (the player will not light any verse for that line). High unmatched
 *     percentage = render bug.
 *   --version tv: TV cuts are subsets of the full lyrics, so SOME unmatched
 *     lines are legitimate (lines absent from the cut). Only outlier songs
 *     with disproportionate gaps relative to the cohort merit attention.
 *
 * Usage:
 *   npx tsx scripts/seed/audit-lesson-coverage.ts                    # full (default)
 *   npx tsx scripts/seed/audit-lesson-coverage.ts --version tv       # TV cohort
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

const args = process.argv.slice(2);
const versionIdx = args.indexOf("--version");
const version: "full" | "tv" =
  versionIdx !== -1 && args[versionIdx + 1] === "tv" ? "tv" : "full";

const LYRICS_DIR = join(ROOT, "data/lyrics-cache");
const LESSONS_DIR =
  version === "tv" ? join(ROOT, "data/lessons-cache-tv") : join(ROOT, "data/lessons-cache");
const REPORT_FILENAME =
  version === "tv" ? "lesson-coverage-audit-tv.csv" : "lesson-coverage-audit.csv";

if (!existsSync(LESSONS_DIR)) {
  console.error(`[audit] lessons dir not found: ${LESSONS_DIR}`);
  process.exit(1);
}

// Matches LyricsPanel.buildVerseTiming normalize
const normalize = (s: string) =>
  s.replace(/[\s　、。！？・「」『』（）\-,.!?()"']/g, "").toLowerCase();

const JP_RE = /[぀-ゟ゠-ヿ一-鿿]/;
const isJapanese = (s: string) => JP_RE.test(s);

type Row = {
  slug: string;
  total_jp_lines: number;
  unmatched: number;
  unmatched_pct: number;
  samples: string[];
};

const rows: Row[] = [];

for (const f of readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".json"))) {
  const slug = f.replace(/\.json$/, "");
  const lessonPath = join(LESSONS_DIR, f);
  const lyricsPath = join(LYRICS_DIR, f);
  if (!existsSync(lyricsPath)) continue;

  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
  const lyrics = JSON.parse(readFileSync(lyricsPath, "utf-8"));

  const verseBlobs: string[] = (lesson.verses ?? []).map((v: any) =>
    normalize((v.tokens ?? []).map((t: any) => t.surface).join(""))
  );

  const rawLines: string[] = (lyrics.raw_lyrics ?? "")
    .split(/\r?\n/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  const jpLines = rawLines.filter(isJapanese);
  const unmatched: string[] = [];
  for (const line of jpLines) {
    const norm = normalize(line);
    if (!norm) continue;
    const hit = verseBlobs.some(
      (blob) => blob.includes(norm) || norm.includes(blob) || shareOverlap(blob, norm)
    );
    if (!hit) unmatched.push(line);
  }

  rows.push({
    slug,
    total_jp_lines: jpLines.length,
    unmatched: unmatched.length,
    unmatched_pct: jpLines.length ? Math.round((unmatched.length / jpLines.length) * 100) : 0,
    samples: unmatched.slice(0, 3),
  });
}

function shareOverlap(blob: string, line: string): boolean {
  if (line.length < 6) return blob.includes(line);
  for (let i = 0; i <= line.length - 6; i++) {
    if (blob.includes(line.slice(i, i + 6))) return true;
  }
  return false;
}

rows.sort((a, b) => b.unmatched - a.unmatched);

const affected = rows.filter((r) => r.unmatched > 0);
const total = rows.length;
const totalJp = rows.reduce((s, r) => s + r.total_jp_lines, 0);
const totalUnmatched = rows.reduce((s, r) => s + r.unmatched, 0);

console.log(`=== Lesson coverage audit (version=${version}) ===`);
console.log(`Songs audited:        ${total}`);
console.log(`Songs with gaps:      ${affected.length} (${Math.round((affected.length / total) * 100)}%)`);
console.log(`Total JP lines:       ${totalJp}`);
console.log(`Total unmatched:      ${totalUnmatched} (${Math.round((totalUnmatched / totalJp) * 100)}%)`);
if (version === "tv") {
  console.log(`Note: TV cuts subset full lyrics; some unmatched is expected.`);
  console.log(`      Outliers (top 15 below) are the candidates for review.`);
}
console.log();
console.log(`Top 15 worst offenders:`);
console.log(`  ${"slug".padEnd(44)} ${"unmatched/total".padEnd(18)} pct  sample`);
for (const r of affected.slice(0, 15)) {
  const sample = r.samples[0]?.slice(0, 40) ?? "";
  console.log(
    `  ${r.slug.padEnd(44)} ${`${r.unmatched}/${r.total_jp_lines}`.padEnd(18)} ${String(r.unmatched_pct).padStart(3)}% ${sample}`
  );
}

const csvPath = join(ROOT, "data", REPORT_FILENAME);
writeFileSync(
  csvPath,
  "slug,total_jp_lines,unmatched,unmatched_pct,sample_1,sample_2,sample_3\n" +
    rows
      .map((r) =>
        [
          r.slug,
          r.total_jp_lines,
          r.unmatched,
          r.unmatched_pct,
          `"${(r.samples[0] ?? "").replace(/"/g, '""')}"`,
          `"${(r.samples[1] ?? "").replace(/"/g, '""')}"`,
          `"${(r.samples[2] ?? "").replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n"),
  "utf-8"
);
console.log(`\nFull report: ${csvPath}`);
