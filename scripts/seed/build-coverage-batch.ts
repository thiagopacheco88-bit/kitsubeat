/**
 * build-coverage-batch.ts — Produce a TSV for auto-coverage-patch.ts from the
 * lesson-coverage audit.
 *
 * For every song with unmatched > 0:
 *   - Compute the unmatched Japanese lines (same algorithm as audit-lesson-coverage).
 *   - Emit one TSV row per unique unmatched line: <slug>\t<last_verse_number>\t<line>
 *
 * All new verses are appended after the last existing verse. Ordering is not
 * preserved relative to song flow — timing accuracy can drift but coverage is
 * guaranteed. Clean up order post-hoc if needed.
 *
 * Usage:
 *   npx tsx scripts/seed/build-coverage-batch.ts [--exclude=slug1,slug2,...]
 *   → writes .planning/verse-patches/_batch.tsv
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LYRICS_DIR = join(ROOT, "data/lyrics-cache");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const AUDIT_CSV = join(ROOT, "data/lesson-coverage-audit.csv");
const PATCHES_DIR = join(ROOT, ".planning/verse-patches");
const OUT_TSV = join(PATCHES_DIR, "_batch.tsv");

const normalize = (s: string) =>
  s.replace(/[\s\u3000、。！？・「」『』（）\-,.!?()"']/g, "").toLowerCase();

const JP_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

function shareOverlap(blob: string, line: string): boolean {
  if (line.length < 6) return blob.includes(line);
  for (let i = 0; i <= line.length - 6; i++) {
    if (blob.includes(line.slice(i, i + 6))) return true;
  }
  return false;
}

function parseCsv(path: string): string[] {
  if (!existsSync(path)) throw new Error(`audit CSV not found: ${path}`);
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean);
}

function main(): void {
  mkdirSync(PATCHES_DIR, { recursive: true });

  const excludeArg = process.argv.find((a) => a.startsWith("--exclude="));
  const exclude = new Set(
    excludeArg ? excludeArg.slice("--exclude=".length).split(",") : []
  );

  const csvRows = parseCsv(AUDIT_CSV);
  const slugs: string[] = [];
  for (const row of csvRows) {
    const [slug, , unmatchedRaw] = row.split(",");
    const unmatched = Number.parseInt(unmatchedRaw, 10);
    if (Number.isFinite(unmatched) && unmatched > 0 && !exclude.has(slug)) {
      slugs.push(slug);
    }
  }

  const out: string[] = [];
  let totalLines = 0;

  for (const slug of slugs) {
    const lyricsPath = join(LYRICS_DIR, `${slug}.json`);
    const lessonPath = join(LESSONS_DIR, `${slug}.json`);
    if (!existsSync(lyricsPath) || !existsSync(lessonPath)) continue;

    const lyrics = JSON.parse(readFileSync(lyricsPath, "utf-8"));
    const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
    const verses = lesson.verses ?? [];
    const blobs: string[] = verses.map((v: { tokens: { surface: string }[] }) =>
      normalize(v.tokens.map((t) => t.surface).join(""))
    );
    const lastVerseNumber = verses.length > 0 ? verses.length : 1;

    const raw = (lyrics.raw_lyrics ?? "")
      .split(/\r?\n/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    const jpLines = (raw as string[]).filter((l) => JP_RE.test(l));
    const seen = new Set<string>();
    for (const line of jpLines) {
      const n = normalize(line);
      if (!n) continue;
      const matched = blobs.some(
        (b: string) => b.includes(n) || n.includes(b) || shareOverlap(b, n)
      );
      if (matched) continue;
      // Dedupe by normalized form — repeats add no coverage
      if (seen.has(n)) continue;
      seen.add(n);
      out.push(`${slug}\t${lastVerseNumber}\t${line}`);
      totalLines++;
    }
  }

  writeFileSync(OUT_TSV, out.join("\n") + "\n", "utf-8");
  console.log(`[ok] wrote ${OUT_TSV}`);
  console.log(`  ${slugs.length} slug(s), ${totalLines} line(s) queued`);
}

main();
