/**
 * conjugation-form-coverage.ts — Phase 10-03 Grammar Conjugation form audit.
 *
 * One-shot audit that enumerates every structured conjugation_path across all
 * song_versions.lesson JSONB blobs, groups them by conjugation_type, and
 * emits a markdown histogram used to drive V1_CONJUGATION_FORMS selection.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/audit/conjugation-form-coverage.ts
 *
 * Output:
 *   - Markdown histogram to stdout
 *   - Written to .planning/phases/10-advanced-exercises-full-mastery/conjugation-coverage.md
 *
 * See: .planning/phases/10-advanced-exercises-full-mastery/10-03-PLAN.md Task 1.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync } from "fs";

// Load .env.local FIRST — before any DB imports
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import { getDb } from "../../src/lib/db/index.js";
import { songVersions } from "../../src/lib/db/schema.js";
import { isNotNull } from "drizzle-orm";
import type { Lesson, GrammarPoint } from "../../src/lib/types/lesson.js";
import {
  parseConjugationPath,
  type StructuredConjugation,
} from "../lib/conjugation-audit.js";

// ---------------------------------------------------------------------------
// Coarse form classifier
// ---------------------------------------------------------------------------
//
// The raw `conjugation_type` returned by parseConjugationPath is a free-text
// annotation from the lesson JSON (e.g. "past tense", "te-form", or a full
// Japanese gloss). Raw grouping produces ~one bucket per exemplar because the
// annotations are song-specific.
//
// To pick a top-N set for V1_CONJUGATION_FORMS, we need canonical families.
// Classification uses the conjugated-form SUFFIX over kana + ASCII markers in
// the free-text label. Order matters: more specific suffixes must be tested
// before their subsuming patterns (past_negative before past; te_form before
// negative when the form ends in て).
//
// Returns a stable short identifier. "other" catches complex compounds and
// lesson-specific patterns that don't fit a single family.

/**
 * Extract the Japanese-only portion of a conjugated field that may be followed
 * by an ASCII gloss like "(kanadete, 'was playing')". We strip everything from
 * the first ASCII left-paren or slash.
 */
export function stripGloss(conjugated: string): string {
  return conjugated.split(/\s*[(（/]/)[0].trim();
}

export function classifyConjugationForm(
  parsed: StructuredConjugation,
): string {
  const conj = stripGloss(parsed.conjugated);
  const label = parsed.conjugation_type.toLowerCase();

  // Must / obligation compounds (nakucha ikenai, nakereba naranai, etc.)
  if (
    /なくちゃ|なきゃ|なければ|なくてはいけない|なくてはならない/.test(conj) ||
    label.includes("must") ||
    label.includes("obligation")
  )
    return "obligation";

  // "want to" — ~tai form
  if (/たい$/.test(conj)) return "tai_form";

  // Hope / wish — ~you ni
  if (/ように$|ようになる|ようになった$|ように$/.test(conj))
    return "you_ni_hope";

  // shimau compounds (regret / completion)
  if (/てしまう$|でしまう$|てしまった$|でしまった$|ちゃう$|ちゃった$/.test(conj))
    return "shimau";

  // kureru / kudasai (favor / request) compounds
  if (/てくれる$|でくれる$|てください$|でください$|てくれた$/.test(conj))
    return "kureru_kudasai";

  // Conditional with past antecedent — ~tara / ~dara (place BEFORE past_affirmative)
  if (/たら$|だら$/.test(conj)) return "conditional_tara";

  // Conditional — ~(r)eba, ~nara
  if (/れば$|けれど$|けれども$|けど$/.test(conj)) return "conditional_eba";
  if (/なら$/.test(conj)) return "conditional_nara";

  // Past negative — なかった suffix OR explicit past+negative in label
  if (/なかった$/.test(conj) || /なくて$/.test(conj)) return "past_negative";

  // Past polite / copula past
  if (/ました$/.test(conj)) return "past_polite";
  if (/でした$/.test(conj)) return "past_copula";

  // Negative (non-past)
  if (/ません$/.test(conj)) return "negative_polite";
  if (/ない$/.test(conj)) return "negative";

  // Progressive compounds — ~te iru / ~te ita + casual ~teru / ~teta
  if (/ていた$|でいた$|ていました$|でいました$/.test(conj))
    return "past_progressive";
  if (/てた$|でた$/.test(conj)) return "past_progressive_casual";
  if (/ている$|でいる$/.test(conj)) return "progressive";
  if (/てる$|でる$|てく$/.test(conj)) return "progressive_casual";

  // Volitional (plain + polite)
  if (/ましょう$|おう$|よう$/.test(conj)) return "volitional";

  // Causative / Passive — prefer explicit label
  if (label.includes("causative") || /させる$|せる$|させて$|せて$/.test(conj))
    return "causative";
  if (label.includes("passive") || /られる$|される$/.test(conj))
    return "passive_potential";

  // Imperative
  if (label.includes("imperative") || /ろ$/.test(conj)) return "imperative";

  // te-form (raw) — place LATE; compounds handled above
  if (/て$|で$/.test(conj)) return "te_form";

  // Past affirmative (simple) — last to avoid catching more specific suffixes
  if (/た$|だ$/.test(conj)) return "past_affirmative";

  // Plain / dictionary form used as compound (e.g. with particles tame ni, made)
  if (/ために$|まで$|たびに$|からこそ$/.test(conj)) return "clause_marker";

  if (label.includes("masu-stem") || label.includes("stem")) return "stem";

  return "other";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormStat {
  form: string;
  exemplarCount: number;
  songsCovered: Set<string>;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const db = getDb();

  console.log("Loading song_versions with lesson data...");
  const rows = await db
    .select({
      id: songVersions.id,
      song_id: songVersions.song_id,
      version_type: songVersions.version_type,
      lesson: songVersions.lesson,
    })
    .from(songVersions)
    .where(isNotNull(songVersions.lesson));

  console.log(`Found ${rows.length} song_versions with lesson data.\n`);

  const stats: Map<string, FormStat> = new Map();
  let totalGrammarPoints = 0;
  let totalStructured = 0;
  let totalUnstructured = 0;
  let totalNoPath = 0;

  for (const row of rows) {
    const lesson = row.lesson as Lesson | null;
    if (!lesson) continue;
    const gps: GrammarPoint[] = lesson.grammar_points ?? [];
    totalGrammarPoints += gps.length;

    for (const gp of gps) {
      const parsed: StructuredConjugation | null = parseConjugationPath(
        gp.conjugation_path,
      );
      if (parsed === null) {
        totalNoPath += 1;
        continue;
      }
      if (!parsed.is_structured) {
        totalUnstructured += 1;
        continue;
      }
      totalStructured += 1;
      const form = classifyConjugationForm(parsed);
      let stat = stats.get(form);
      if (!stat) {
        stat = { form, exemplarCount: 0, songsCovered: new Set<string>() };
        stats.set(form, stat);
      }
      stat.exemplarCount += 1;
      stat.songsCovered.add(row.id);
    }
  }

  const sorted = Array.from(stats.values()).sort(
    (a, b) => b.exemplarCount - a.exemplarCount,
  );

  // Build markdown output
  const lines: string[] = [];
  lines.push("# Phase 10-03 Grammar Conjugation Form Coverage");
  lines.push("");
  lines.push(
    `Generated by scripts/audit/conjugation-form-coverage.ts on ${new Date().toISOString()}`,
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total song_versions scanned:** ${rows.length}`);
  lines.push(`- **Total grammar points:** ${totalGrammarPoints}`);
  lines.push(`- **Structured conjugation paths:** ${totalStructured}`);
  lines.push(`- **Unstructured (pattern-label) paths:** ${totalUnstructured}`);
  lines.push(`- **Grammar points with no conjugation_path:** ${totalNoPath}`);
  lines.push(
    `- **Structured share of paths with data:** ${
      totalStructured + totalUnstructured > 0
        ? (
            (totalStructured / (totalStructured + totalUnstructured)) *
            100
          ).toFixed(1)
        : "0.0"
    }%`,
  );
  lines.push(`- **Distinct structured forms:** ${sorted.length}`);
  lines.push("");

  lines.push("## Histogram (descending by exemplar count)");
  lines.push("");
  lines.push("| # | Form | Exemplars | Songs Covered |");
  lines.push("| - | ---- | --------- | ------------- |");

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    lines.push(
      `| ${i + 1} | ${s.form} | ${s.exemplarCount} | ${s.songsCovered.size} |`,
    );
  }
  lines.push("");

  // V1 selection — exclude "other" and "stem" buckets (catch-alls, not
  // drillable conjugation families with a clean mini-rule). Pick the next top
  // forms that sum to >=80% of the DRILLABLE exemplar total.
  const EXCLUDE = new Set<string>(["other", "stem", "clause_marker"]);
  const drillable = sorted.filter((s) => !EXCLUDE.has(s.form));
  const drillableTotal = drillable.reduce((a, b) => a + b.exemplarCount, 0);
  let v1Cutoff = -1;
  let v1Cumulative = 0;
  for (let i = 0; i < drillable.length; i++) {
    v1Cumulative += drillable[i].exemplarCount;
    if (
      v1Cutoff === -1 &&
      drillableTotal > 0 &&
      v1Cumulative / drillableTotal >= 0.8
    ) {
      v1Cutoff = i + 1;
      break;
    }
  }

  lines.push("## V1 Form Selection");
  lines.push("");
  lines.push(
    `Exclusion list (catch-all buckets without a clean mini-conjugator rule): ${
      Array.from(EXCLUDE).map((x) => `\`${x}\``).join(", ")
    }`,
  );
  lines.push(`Drillable exemplar total (after exclusions): ${drillableTotal}`);
  lines.push("");
  if (v1Cutoff === -1) {
    lines.push(
      "_No drillable data available to pick v1 forms. Check that song_versions.lesson is populated._",
    );
  } else {
    lines.push(
      `Top **${v1Cutoff}** drillable forms cover >=80% of drillable exemplars (${v1Cumulative} / ${drillableTotal}).`,
    );
    lines.push("");
    lines.push("Proposed `V1_CONJUGATION_FORMS`:");
    lines.push("");
    lines.push("```ts");
    lines.push("export const V1_CONJUGATION_FORMS: string[] = [");
    for (let i = 0; i < v1Cutoff; i++) {
      lines.push(`  "${drillable[i].form}",`);
    }
    lines.push("];");
    lines.push("```");
  }
  lines.push("");

  const output = lines.join("\n");
  console.log(output);

  const outPath = resolve(
    __dirname,
    "../../.planning/phases/10-advanced-exercises-full-mastery/conjugation-coverage.md",
  );
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, output, "utf8");
    console.log(`\nWrote: ${outPath}`);
  } catch (err) {
    console.error("Failed to write artifact:", err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
