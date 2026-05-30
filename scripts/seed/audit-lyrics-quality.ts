/**
 * audit-lyrics-quality.ts — Audits all songs in the manifest for lyrics quality issues.
 *
 * Checks:
 *   1. Thin lyrics   — synced_lrc has fewer than 10 entries
 *   2. YouTube junk  — raw_lyrics or any synced_lrc line contains junk phrases
 *   3. Missing cache — no file at data/lyrics-cache/{slug}.json
 *   4. lrclib 0 sync — source is lrclib but synced_lrc is empty
 *
 * Exits with code 0 if all songs clean, code 1 if any issues found.
 *
 * Flags:
 *   --json   Output raw JSON only (suppresses all other output)
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/audit-lyrics-quality.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/audit-lyrics-quality.ts --json
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  slug: string;
  title?: string;
  artist?: string;
  anime?: string;
}

interface SyncedLine {
  startMs?: number;
  text?: string;
}

interface LyricsCache {
  slug?: string;
  source?: string;
  raw_lyrics?: string;
  synced_lrc?: SyncedLine[];
}

type IssueType = "thin_lyrics" | "youtube_junk" | "missing_cache" | "lrclib_no_sync";

interface Issue {
  slug: string;
  title: string;
  issue: IssueType;
  detail: string;
}

interface AuditReport {
  total_songs: number;
  songs_with_issues: number;
  songs_clean: number;
  issues_by_type: Record<IssueType, number>;
  issues: Issue[];
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const JUNK_PHRASES_JP = ["ご視聴ありがとう"];
const JUNK_PHRASES_EN = ["thank you for watching"];

// Drama-CD / character songs where WhisperX timing is structurally unreliable
// (spoken-word over music, no sentence-level pauses). Content is correct via
// uta-net; only karaoke timing is limited. Exempt from thin_lyrics threshold.
const TIMING_EXEMPT_SLUGS = new Set([
  "rinne-rondo-on-off",
  "mr-sadistic-night-midorikawa-toriumi",
  "kindan-no-666-kimura-kishio",
]);

function containsJunk(text: string): boolean {
  const lower = text.toLowerCase();
  for (const phrase of JUNK_PHRASES_JP) {
    if (text.includes(phrase)) return true;
  }
  for (const phrase of JUNK_PHRASES_EN) {
    if (lower.includes(phrase)) return true;
  }
  return false;
}

function auditSong(
  entry: ManifestEntry,
  cache: LyricsCache | null,
): Issue[] {
  const issues: Issue[] = [];
  const slug = entry.slug;
  const title = entry.title ?? slug;

  // Check 3: missing cache — no file exists
  if (cache === null) {
    issues.push({
      slug,
      title,
      issue: "missing_cache",
      detail: `data/lyrics-cache/${slug}.json not found`,
    });
    return issues; // can't run further checks without the file
  }

  const syncedLrc = cache.synced_lrc ?? [];
  const rawLyrics = cache.raw_lyrics ?? "";
  const source = cache.source ?? "";

  // Check 1: thin lyrics — fewer than 5 synced entries
  // Skip for drama-CD songs where WhisperX timing is structurally unreliable.
  if (syncedLrc.length > 0 && syncedLrc.length < 5 && !TIMING_EXEMPT_SLUGS.has(slug)) {
    issues.push({
      slug,
      title,
      issue: "thin_lyrics",
      detail: `synced_lrc has ${syncedLrc.length} line(s) (threshold: 5)`,
    });
  }

  // Check 2: YouTube junk in raw_lyrics or any synced line
  if (containsJunk(rawLyrics)) {
    issues.push({
      slug,
      title,
      issue: "youtube_junk",
      detail: "junk phrase found in raw_lyrics",
    });
  } else {
    for (const line of syncedLrc) {
      if (line.text && containsJunk(line.text)) {
        issues.push({
          slug,
          title,
          issue: "youtube_junk",
          detail: `junk phrase found in synced_lrc line: "${line.text.slice(0, 60)}"`,
        });
        break;
      }
    }
  }

  // Check 4: lrclib with 0 synced lines (plain text only)
  if (source === "lrclib" && syncedLrc.length === 0) {
    issues.push({
      slug,
      title,
      issue: "lrclib_no_sync",
      detail: "source is lrclib but synced_lrc is empty (plain text only)",
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

const ISSUE_LABELS: Record<IssueType, string> = {
  thin_lyrics: "Thin lyrics (< 5 synced lines)",
  youtube_junk: "YouTube junk phrase detected",
  missing_cache: "Missing lyrics cache file",
  lrclib_no_sync: "lrclib — no synced lines",
};

const ISSUE_ORDER: IssueType[] = [
  "missing_cache",
  "youtube_junk",
  "lrclib_no_sync",
  "thin_lyrics",
];

function printReport(report: AuditReport): void {
  console.log("=== Lyrics Quality Audit ===\n");
  console.log(`  Manifest songs: ${report.total_songs}`);
  console.log(`  Songs with issues: ${report.songs_with_issues}`);
  console.log(`  Songs clean: ${report.songs_clean}`);
  console.log();

  if (report.songs_with_issues === 0) {
    console.log("  RESULT: All songs clean. Lyrics quality check passed.\n");
    return;
  }

  for (const issueType of ISSUE_ORDER) {
    const group = report.issues.filter((i) => i.issue === issueType);
    if (group.length === 0) continue;

    console.log(`--- ${ISSUE_LABELS[issueType]} (${group.length}) ---`);
    for (const issue of group) {
      console.log(`  [${issue.slug}]`);
      console.log(`    ${issue.detail}`);
    }
    console.log();
  }

  console.log(
    `RESULT: ${report.songs_with_issues} song(s) with issues, ${report.songs_clean} clean.`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const isJson = args.includes("--json");

  const manifestPath = resolve(ROOT, "data/songs-manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("data/songs-manifest.json not found");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
  const manifest: ManifestEntry[] = Array.isArray(raw)
    ? (raw as ManifestEntry[])
    : Array.isArray((raw as { songs?: ManifestEntry[] }).songs)
      ? (raw as { songs: ManifestEntry[] }).songs
      : [];

  if (manifest.length === 0) {
    console.error("Manifest is empty or unrecognised shape.");
    process.exit(1);
  }

  const allIssues: Issue[] = [];
  const slugsWithIssues = new Set<string>();

  for (const entry of manifest) {
    const cachePath = resolve(ROOT, `data/lyrics-cache/${entry.slug}.json`);
    let cache: LyricsCache | null = null;
    if (existsSync(cachePath)) {
      try {
        cache = JSON.parse(readFileSync(cachePath, "utf8")) as LyricsCache;
      } catch {
        cache = null;
      }
    }

    const issues = auditSong(entry, cache);
    if (issues.length > 0) {
      slugsWithIssues.add(entry.slug);
      allIssues.push(...issues);
    }
  }

  const issuesByType: Record<IssueType, number> = {
    thin_lyrics: 0,
    youtube_junk: 0,
    missing_cache: 0,
    lrclib_no_sync: 0,
  };
  for (const issue of allIssues) {
    issuesByType[issue.issue]++;
  }

  const report: AuditReport = {
    total_songs: manifest.length,
    songs_with_issues: slugsWithIssues.size,
    songs_clean: manifest.length - slugsWithIssues.size,
    issues_by_type: issuesByType,
    issues: allIssues,
  };

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  process.exit(report.songs_with_issues > 0 ? 1 : 0);
}

main();
