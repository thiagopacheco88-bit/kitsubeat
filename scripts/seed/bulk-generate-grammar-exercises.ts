/**
 * bulk-generate-grammar-exercises.ts — Anthropic-API batch generation of
 * grammar_exercises rows for the catalog.
 *
 * Wraps src/lib/exercises/grammar-ai.ts::generateOneGrammarExercise (Haiku 4.5)
 * across the top-N most-frequent grammar_rules and the requested level set.
 *
 * Resume-safe: reads current count per (rule, level) before generating, only
 * tops up the gap to --target-per-level. Re-running the script is a no-op once
 * the target is met.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/bulk-generate-grammar-exercises.ts \
 *     --top 30 --levels beginner --target-per-level 3
 *
 *   # full coverage, all 3 levels, top 200 rules
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/bulk-generate-grammar-exercises.ts \
 *     --top 200 --levels beginner,intermediate,advanced --target-per-level 3
 *
 * Cost (Haiku 4.5 batch-equivalent): ~$0.0014 per exercise.
 *   - top 30 × 3 levels × 3 each = 270 exercises ≈ $0.40
 *   - top 200 × 3 levels × 3 each = 1800 exercises ≈ $2.50
 *   - all 1370 rules × 3 levels × 3 each = 12,330 exercises ≈ $17
 *
 * Throughput: synchronous Anthropic API → ~1-2 sec per exercise. ~270 exercises
 * = ~10 minutes; full catalog ~5-7 hours unattended.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import {
  generateOneGrammarExercise,
  countExercisesForRuleLevel,
} from "../../src/lib/exercises/grammar-ai.js";
import type { GrammarLevel } from "../../src/lib/types/lesson.js";

interface Args {
  top: number;
  /** Optional: scope to rules linked to this song slug. Overrides --top. */
  song: string | null;
  levels: GrammarLevel[];
  targetPerLevel: number;
  dryRun: boolean;
  retryAttempts: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback: string): string => {
    const idx = argv.indexOf(flag);
    return idx === -1 || idx === argv.length - 1 ? fallback : argv[idx + 1];
  };
  const levelsRaw = get("--levels", "beginner");
  const levels = levelsRaw.split(",").map((s) => s.trim()) as GrammarLevel[];
  for (const l of levels) {
    if (!["beginner", "intermediate", "advanced"].includes(l)) {
      throw new Error(`bad level: ${l}`);
    }
  }
  const songRaw = get("--song", "");
  return {
    top: Number(get("--top", "30")),
    song: songRaw ? songRaw : null,
    levels,
    targetPerLevel: Number(get("--target-per-level", "3")),
    dryRun: argv.includes("--dry-run"),
    retryAttempts: Number(get("--retries", "2")),
  };
}

async function main() {
  const args = parseArgs();
  const scope = args.song ? `song=${args.song}` : `top=${args.top}`;
  console.log(
    `\n[bulk-grammar] ${scope} levels=${args.levels.join(",")} target/level=${args.targetPerLevel} dryRun=${args.dryRun}`,
  );

  const db = getDb();

  // Two query shapes: --song scopes to rules linked to that slug; --top falls
  // back to global frequency ranking. Both return the same row shape.
  const rankRes = args.song
    ? await db.execute(sql`
        SELECT DISTINCT
          gr.id,
          gr.name,
          gr.jlpt_reference,
          1 AS song_count
        FROM songs s
        JOIN song_versions sv ON sv.song_id = s.id
        JOIN song_version_grammar_rules svgr ON svgr.song_version_id = sv.id
        JOIN grammar_rules gr ON gr.id = svgr.grammar_rule_id
        WHERE s.slug = ${args.song}
        ORDER BY gr.jlpt_reference ASC, gr.name ASC
      `)
    : await db.execute(sql`
        SELECT
          gr.id,
          gr.name,
          gr.jlpt_reference,
          COUNT(svgr.song_version_id)::int AS song_count
        FROM grammar_rules gr
        LEFT JOIN song_version_grammar_rules svgr ON svgr.grammar_rule_id = gr.id
        GROUP BY gr.id, gr.name, gr.jlpt_reference
        ORDER BY song_count DESC, gr.name ASC
        LIMIT ${args.top}
      `);
  const rules = (rankRes.rows ?? rankRes) as Array<{
    id: string;
    name: string;
    jlpt_reference: string;
    song_count: number;
  }>;

  // Plan the work: per (rule, level), how many to generate.
  type Job = { rule: typeof rules[number]; level: GrammarLevel; need: number };
  const jobs: Job[] = [];
  let totalNeed = 0;
  for (const rule of rules) {
    for (const level of args.levels) {
      const have = await countExercisesForRuleLevel(rule.id, level);
      const need = Math.max(0, args.targetPerLevel - have);
      if (need > 0) {
        jobs.push({ rule, level, need });
        totalNeed += need;
      }
    }
  }

  console.log(
    `[bulk-grammar] plan: ${jobs.length} (rule,level) pairs need top-up · ${totalNeed} exercises to generate`,
  );
  if (args.dryRun) {
    for (const j of jobs.slice(0, 20)) {
      console.log(`  ${j.rule.jlpt_reference} ${j.rule.name} :: ${j.level} → +${j.need}`);
    }
    if (jobs.length > 20) console.log(`  ... and ${jobs.length - 20} more`);
    console.log(`(dry-run — no API calls)`);
    return;
  }

  // Execute. Sequential to keep API rate-limit headroom; one retry per failure.
  let generated = 0;
  let failed = 0;
  let bankAtCap = 0;
  const startedAt = Date.now();

  for (let ji = 0; ji < jobs.length; ji++) {
    const job = jobs[ji];
    for (let i = 0; i < job.need; i++) {
      let lastErr: unknown = null;
      // Use a sentinel symbol to distinguish "never set" (every attempt threw)
      // from "explicitly null" (the SDK returned null, meaning the bank is at cap).
      const NEVER_SET = Symbol("never-set");
      let inserted: Awaited<ReturnType<typeof generateOneGrammarExercise>> | typeof NEVER_SET = NEVER_SET;
      for (let attempt = 0; attempt <= args.retryAttempts; attempt++) {
        try {
          inserted = await generateOneGrammarExercise(job.rule.id, job.level);
          break;
        } catch (err) {
          lastErr = err;
          // exponential-ish backoff on retry: 1s, 3s
          if (attempt < args.retryAttempts) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1) ** 2));
          }
        }
      }

      if (inserted === NEVER_SET) {
        // All retry attempts threw — most often: missing API key, no credits,
        // network error, or invalid model output that fails validation.
        failed++;
        console.error(
          `  [fail] ${job.rule.jlpt_reference} ${job.rule.name} :: ${job.level} — ${(lastErr as Error)?.message ?? "unknown"}`,
        );
        continue;
      }
      if (inserted === null) {
        // SDK returned null → bank is at GRAMMAR_EXERCISE_CAP_PER_LEVEL.
        // Stop trying for this (rule, level) — no point retrying.
        bankAtCap++;
        break;
      }
      generated++;
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      const pct = totalNeed === 0 ? 100 : Math.round((100 * generated) / totalNeed);
      if (generated % 5 === 0 || generated === 1) {
        console.log(
          `  [+${generated}/${totalNeed}, ${pct}%, ${elapsed}s] ${job.rule.jlpt_reference} ${job.rule.name} :: ${job.level}`,
        );
      }
    }
  }

  const elapsedTotal = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log(
    `\n[bulk-grammar] done · generated=${generated} failed=${failed} bank-at-cap=${bankAtCap} elapsed=${elapsedTotal}s`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
