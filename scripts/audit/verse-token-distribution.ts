/**
 * Verse-token distribution audit (Phase 10 Plan 05).
 *
 * Validates the 12-token CONTEXT-locked cap for Sentence Order questions
 * against the live catalog. For each song_version with a non-null lesson,
 * we count how many verses have tokens.length <= 12 (eligible) vs total,
 * and emit both a sorted table and a summary histogram.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/audit/verse-token-distribution.ts
 *
 * Writes results to:
 *   .planning/phases/10-advanced-exercises-full-mastery/verse-token-distribution.md
 *
 * Exit codes:
 *   0 — audit ran (not a pass/fail gate; 12-cap is LOCKED per CONTEXT for v1).
 *       If < 80% of songs have >= 3 eligible verses, we flag it in the
 *       artifact as a follow-up for the deferred clause-boundary tokenization
 *       idea. The audit is informational, not blocking.
 */

import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, "..", ".."), ".env.local") });

// Sentence Order 12-token cap (CONTEXT-locked, Phase 10 Plan 05).
const TOKEN_CAP = 12;

// Threshold below which we surface the clause-boundary follow-up.
const THREE_PLUS_MIN_PCT = 80;

interface VerseTokens {
  tokens?: Array<{ surface?: string }>;
}

interface LessonJson {
  verses?: VerseTokens[];
}

interface SongRow {
  song_id: string;
  slug: string;
  version_type: string;
  lesson: LessonJson | null;
}

interface SongStat {
  song_id: string;
  slug: string;
  version_type: string;
  total_verses: number;
  eligible_verses: number;
  eligible_pct: number;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local and retry.");
    process.exit(1);
  }

  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  const { rows } = await client.query<SongRow>(`
    SELECT s.id AS song_id, s.slug, sv.version_type, sv.lesson
    FROM songs s
    JOIN song_versions sv ON sv.song_id = s.id
    WHERE sv.lesson IS NOT NULL
    ORDER BY s.slug, sv.version_type
  `);

  await client.end();

  const stats: SongStat[] = rows.map((r) => {
    const verses = Array.isArray(r.lesson?.verses) ? r.lesson!.verses : [];
    const total = verses.length;
    const eligible = verses.filter(
      (v) => Array.isArray(v.tokens) && v.tokens.length <= TOKEN_CAP
    ).length;
    const pct = total > 0 ? Math.round((eligible / total) * 1000) / 10 : 0;
    return {
      song_id: r.song_id,
      slug: r.slug,
      version_type: r.version_type,
      total_verses: total,
      eligible_verses: eligible,
      eligible_pct: pct,
    };
  });

  // Sort by eligible_pct ascending (worst songs first so operator triages)
  stats.sort((a, b) => a.eligible_pct - b.eligible_pct);

  // Histogram buckets
  const threePlus = stats.filter((s) => s.eligible_verses >= 3).length;
  const oneTwo = stats.filter(
    (s) => s.eligible_verses >= 1 && s.eligible_verses <= 2
  ).length;
  const zero = stats.filter((s) => s.eligible_verses === 0).length;
  const totalSongs = stats.length;
  const threePlusPct = totalSongs > 0 ? (threePlus / totalSongs) * 100 : 0;

  const belowThreshold = threePlusPct < THREE_PLUS_MIN_PCT;

  // Build markdown artifact
  const lines: string[] = [];
  lines.push("# Verse-Token Distribution Audit (Phase 10 Plan 05)");
  lines.push("");
  lines.push(
    `> Generated: ${new Date().toISOString()} — run via \`tsx scripts/audit/verse-token-distribution.ts\``
  );
  lines.push("");
  lines.push(
    `**12-token cap** is CONTEXT-locked for Sentence Order v1. This audit is informational; the cap applies on a PER-VERSE basis (over-cap verses are excluded from Sentence Order for that song, not the whole song).`
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total song_versions with lesson content: **${totalSongs}**`);
  lines.push(
    `- Songs with **≥3 eligible verses** (≤12 tokens): **${threePlus}** (${threePlusPct.toFixed(1)}%)`
  );
  lines.push(`- Songs with **1-2 eligible verses**: **${oneTwo}**`);
  lines.push(`- Songs with **0 eligible verses** (skip Sentence Order): **${zero}**`);
  lines.push("");
  if (belowThreshold) {
    lines.push(
      `> **Follow-up flagged:** fewer than ${THREE_PLUS_MIN_PCT}% of songs hit the ≥3-verse bar. The deferred "clause-boundary tokenization" idea (split long verses at particles/clause boundaries so each clause becomes its own Sentence Order candidate) should move up the backlog. The 12-cap stays LOCKED for v1 per CONTEXT.`
    );
    lines.push("");
  } else {
    lines.push(
      `> **Healthy:** ≥${THREE_PLUS_MIN_PCT}% of songs clear the ≥3-verse bar. No follow-up required for Plan 05.`
    );
    lines.push("");
  }

  lines.push("## Per-song table");
  lines.push("");
  lines.push(
    "| # | slug | version | total_verses | eligible_verses (≤12 tok) | eligible_pct |"
  );
  lines.push("|---|------|---------|--------------|---------------------------|--------------|");
  stats.forEach((s, i) => {
    lines.push(
      `| ${i + 1} | ${s.slug} | ${s.version_type} | ${s.total_verses} | ${s.eligible_verses} | ${s.eligible_pct.toFixed(1)}% |`
    );
  });
  lines.push("");

  const artifactPath = join(
    resolve(__dirname, "..", ".."),
    ".planning/phases/10-advanced-exercises-full-mastery/verse-token-distribution.md"
  );
  mkdirSync(join(artifactPath, ".."), { recursive: true });
  writeFileSync(artifactPath, lines.join("\n"));

  // Console summary
  console.log(`\nVerse-token distribution audit (cap=${TOKEN_CAP}):`);
  console.log(`  Total songs: ${totalSongs}`);
  console.log(
    `  ≥3 eligible verses: ${threePlus} (${threePlusPct.toFixed(1)}%)`
  );
  console.log(`  1-2 eligible verses: ${oneTwo}`);
  console.log(`  0 eligible verses:   ${zero}`);
  console.log(`\nArtifact written: ${artifactPath}`);
  if (belowThreshold) {
    console.log(
      `\n[FLAGGED] <${THREE_PLUS_MIN_PCT}% of songs have ≥3 eligible verses. Clause-boundary follow-up noted in artifact.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
