/**
 * verify-starter-picks.ts — Verify viable basic-tier starter song candidates.
 *
 * Runs two queries:
 *   1. Top-10 basic-tier songs with non-null lessons (ranked by popularity)
 *   2. Checks the 3 researcher-recommended starters against criteria
 *
 * If any recommended candidate fails, prints a SUBSTITUTION NEEDED line.
 *
 * Run via: npm run audit:starter-picks
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Researcher's 3 recommended starter picks (from RESEARCH Section C)
const RESEARCHER_PICKS = [
  { slug: "wind-akeboshi", rationale: "Naruto — iconic, beginner-friendly N5 vocab" },
  { slug: "utakata-hanabi-supercell", rationale: "Naruto — emotional, high popularity" },
  { slug: "crossing-field-lisa", rationale: "SAO — most popular, gateway song" },
];

interface CandidateRow {
  slug: string;
  title: string;
  anime: string;
  difficulty_tier: string | null;
  jlpt_level: string | null;
  popularity_rank: number | null;
  has_lesson: boolean;
}

function padEnd(s: string, n: number) {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function formatRow(r: CandidateRow, rank: number): string {
  return [
    String(rank).padStart(2),
    padEnd(r.slug, 35),
    padEnd(r.anime, 30),
    padEnd(r.difficulty_tier ?? "—", 12),
    padEnd(r.jlpt_level ?? "—", 6),
    r.popularity_rank != null ? String(r.popularity_rank).padStart(5) : "  —  ",
  ].join("  ");
}

async function main() {
  // Query 1: top-10 basic-tier songs with non-null lessons
  const candidates = await sql`
    SELECT
      s.slug,
      s.title,
      s.anime,
      s.difficulty_tier,
      s.jlpt_level,
      s.popularity_rank,
      true AS has_lesson
    FROM songs s
    WHERE s.difficulty_tier = 'basic'
      AND EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = s.id
          AND sv.lesson IS NOT NULL
      )
    ORDER BY s.popularity_rank ASC NULLS LAST
    LIMIT 10
  ` as unknown as CandidateRow[];

  // Query 2: researcher picks — check criteria individually
  const slugs = RESEARCHER_PICKS.map((p) => p.slug);
  const picksResult = await sql`
    SELECT
      s.slug,
      s.title,
      s.anime,
      s.difficulty_tier,
      s.jlpt_level,
      s.popularity_rank,
      EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = s.id AND sv.lesson IS NOT NULL
      ) AS has_lesson
    FROM songs s
    WHERE s.slug = ANY(${slugs})
  ` as unknown as CandidateRow[];

  const picksMap = new Map(picksResult.map((r) => [r.slug, r]));

  // Print top-10 candidate table
  console.log("\n=== TOP-10 BASIC-TIER CANDIDATES (with lessons) ===\n");
  const header = [
    " #",
    padEnd("slug", 35),
    padEnd("anime", 30),
    padEnd("tier", 12),
    padEnd("JLPT", 6),
    " rank",
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  candidates.forEach((c, i) => {
    console.log(formatRow(c, i + 1));
  });

  if (candidates.length === 0) {
    console.log("  (no basic-tier songs with lessons found)");
  }

  // Print researcher-pick verdicts
  console.log("\n=== RESEARCHER PICKS VERIFICATION ===\n");
  let allPass = true;
  const failedPicks: string[] = [];

  for (const pick of RESEARCHER_PICKS) {
    const row = picksMap.get(pick.slug);
    const isBasic = row?.difficulty_tier === "basic";
    const hasLesson = row?.has_lesson === true;
    const pass = row != null && isBasic && hasLesson;
    const status = pass ? "✓ PASS" : "✗ FAIL";
    const details = row
      ? `tier=${row.difficulty_tier ?? "NULL"}, lesson=${hasLesson}`
      : "NOT FOUND IN DB";

    console.log(`  ${status}  ${pick.slug}`);
    console.log(`         Rationale: ${pick.rationale}`);
    console.log(`         Status: ${details}`);
    console.log();

    if (!pass) {
      allPass = false;
      failedPicks.push(pick.slug);
    }
  }

  // SUBSTITUTION NEEDED: if any pick fails, suggest next-best alternatives from top-10
  if (!allPass) {
    const failedAnimes = failedPicks
      .map((slug) => picksMap.get(slug)?.anime)
      .filter(Boolean) as string[];

    // Get the animes already covered by passing picks
    const passingAnimes = RESEARCHER_PICKS.filter((p) => !failedPicks.includes(p.slug))
      .map((p) => picksMap.get(p.slug)?.anime)
      .filter(Boolean) as string[];

    const usedAnimes = new Set([...failedAnimes, ...passingAnimes]);

    const substitutes = candidates.filter((c) => !usedAnimes.has(c.anime)).slice(0, 3);

    console.log("SUBSTITUTION NEEDED:");
    console.log(`  Failed picks: ${failedPicks.join(", ")}`);
    console.log("  Suggested alternatives (different anime franchise):");
    substitutes.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.slug} (${s.anime}, rank=${s.popularity_rank ?? "—"})`);
    });
    console.log();
  } else {
    console.log("All 3 researcher picks are viable. Ready for Plan 03 decision checkpoint.");
  }

  console.log(
    `\nNote: Final starter picks are confirmed in Plan 03 (checkpoint:decision).`
  );
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
