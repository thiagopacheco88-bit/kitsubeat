/**
 * 13-dedup-grammar-rules.ts — collapse the 639 near-duplicate grammar_rules
 * into ~100-150 canonical entries.
 *
 * The backfill (script 12) dedupes by exact (name, jlpt_reference). The AI
 * who generated the lessons wrote rule names in inconsistent free-form
 * styles, so the same N5 "〜たい" concept ended up as 12 different rows with
 * minor formatting drift. This script:
 *
 *   1. Extracts the leading Japanese-character prefix as the canonical name
 *      ("〜たい (tai: want to)" → "〜たい").
 *   2. Normalizes jlpt_reference ("JLPT N5" / "N5" → "N5").
 *   3. Drops rules whose jlpt_reference doesn't match N1-N5 (English,
 *      Latin, German — leaked from non-Japanese song lessons).
 *   4. Groups by (normalized_jp, normalized_jlpt); within each group picks
 *      the row with the richest explanation as canonical.
 *   5. Re-points song_version_grammar_rules at the canonical ID. Handles
 *      the unique-constraint case where two dup links converge on the same
 *      (song_version, canonical) by deleting the redundant row instead of
 *      updating.
 *   6. Deletes orphaned rule rows.
 *
 * Idempotent after one full run — re-running normalises any future inserts
 * without touching already-canonical rows.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/13-dedup-grammar-rules.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/13-dedup-grammar-rules.ts --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import {
  grammarRules,
  songVersionGrammarRules,
  type GrammarRuleRow,
} from "../../src/lib/db/schema.js";
import { inArray, sql, and, eq } from "drizzle-orm";
import { localize, type Localizable } from "../../src/lib/types/lesson.js";

const APPLY = process.argv.includes("--apply");

// Japanese character ranges: hiragana, katakana, katakana-hiragana marks,
// CJK unified ideographs. Also include the "〜" rule placeholder.
const JP_RE = /[\u3040-\u309F\u30A0-\u30FF\u3005\u4E00-\u9FFF]/;

const NORMALIZE_JP_RE = /^[〜～]*([\u3040-\u309F\u30A0-\u30FF\u3005\u4E00-\u9FFF々\s〜～・/]+)/;

function canonicalJpName(rawName: string): string | null {
  const match = rawName.match(NORMALIZE_JP_RE);
  if (!match) return null;
  // Collapse whitespace, strip the leading/trailing tilde marker for a stable
  // key — but keep the original 〜 in the canonical row's display name.
  const trimmed = match[1].replace(/\s+/g, "").replace(/^[〜～]+|[〜～]+$/g, "");
  if (!trimmed) return null;
  return trimmed;
}

function canonicalJlpt(raw: string): string | null {
  const m = raw.match(/\bN([1-5])\b/);
  if (!m) return null;
  return `N${m[1]}`;
}

function explanationScore(rule: GrammarRuleRow): number {
  // Richest explanation wins — proxy by length of the English string. Tie-break
  // on whether the name contains a parenthetical gloss (more helpful), then
  // on created_at (older = earlier backfill, more likely the original).
  const text = localize(rule.explanation as Localizable, "en");
  const lengthScore = text.length;
  const hasGloss = /[\(（]/.test(rule.name) ? 10 : 0;
  return lengthScore + hasGloss;
}

async function main() {
  const db = getDb();
  const all = await db.select().from(grammarRules);

  console.log(`total grammar_rules rows: ${all.length}`);

  interface Plan {
    canonical: GrammarRuleRow;
    duplicates: GrammarRuleRow[];
    normJp: string;
    normJlpt: string;
  }

  const groups = new Map<string, GrammarRuleRow[]>();
  const nonJapanese: GrammarRuleRow[] = [];
  const unparseable: GrammarRuleRow[] = [];

  for (const rule of all) {
    const jp = canonicalJpName(rule.name);
    const jlpt = canonicalJlpt(rule.jlpt_reference);
    if (!jlpt) {
      nonJapanese.push(rule);
      continue;
    }
    if (!jp) {
      unparseable.push(rule);
      continue;
    }
    const key = `${jp}|${jlpt}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(rule);
    groups.set(key, bucket);
  }

  const plans: Plan[] = [];
  for (const [key, bucket] of groups) {
    if (bucket.length === 1) continue; // nothing to dedup
    bucket.sort((a, b) => explanationScore(b) - explanationScore(a));
    const [canonical, ...duplicates] = bucket;
    const [normJp, normJlpt] = key.split("|");
    plans.push({ canonical, duplicates, normJp, normJlpt });
  }

  // Also collapse rules where the only JP-normalization differ on the JLPT
  // level — e.g. "〜たい" tagged both N5 and N4. Prefer the lower number
  // (more elementary) as canonical.
  const byJpOnly = new Map<string, Plan[]>();
  for (const plan of plans) {
    const k = plan.normJp;
    const arr = byJpOnly.get(k) ?? [];
    arr.push(plan);
    byJpOnly.set(k, arr);
  }
  const crossLevelMerges: Array<{ from: Plan; into: Plan }> = [];
  for (const [, planGroup] of byJpOnly) {
    if (planGroup.length < 2) continue;
    planGroup.sort((a, b) => {
      const an = parseInt(a.normJlpt.slice(1), 10);
      const bn = parseInt(b.normJlpt.slice(1), 10);
      // N5 (lower number) wins as canonical level.
      return bn - an;
    });
    const keeper = planGroup[0];
    for (let i = 1; i < planGroup.length; i++) {
      crossLevelMerges.push({ from: planGroup[i], into: keeper });
    }
  }

  // Also collapse rules that were SINGLETONS but differ only on JLPT level.
  // Find normJp keys that appear in `groups` at multiple levels where at
  // least one of those is also a singleton.
  const singletonByJp = new Map<string, GrammarRuleRow[]>();
  for (const [key, bucket] of groups) {
    if (bucket.length !== 1) continue;
    const [normJp, normJlpt] = key.split("|");
    const arr = singletonByJp.get(normJp) ?? [];
    arr.push(bucket[0]);
    singletonByJp.set(normJp, arr);
    void normJlpt;
  }
  const singletonMerges: Array<{ canonical: GrammarRuleRow; extra: GrammarRuleRow[] }> = [];
  for (const [normJp, rows] of singletonByJp) {
    // Also consider the cross-level plan group for this normJp.
    const planGroup = byJpOnly.get(normJp) ?? [];
    const keeper = planGroup[0]?.canonical ?? rows.sort((a, b) => {
      const an = parseInt(canonicalJlpt(a.jlpt_reference)?.slice(1) ?? "9", 10);
      const bn = parseInt(canonicalJlpt(b.jlpt_reference)?.slice(1) ?? "9", 10);
      return an - bn;
    })[0];
    const extras = rows.filter((r) => r.id !== keeper.id);
    if (extras.length > 0) {
      singletonMerges.push({ canonical: keeper, extra: extras });
    }
  }

  // Summarise
  console.log(`
  groups by (normJp, normJlpt): ${groups.size}
  groups with dupes (same level): ${plans.length}
  cross-level merges (same JP, different JLPT): ${crossLevelMerges.length}
  singletons promoted into cross-level groups: ${singletonMerges.reduce((s, m) => s + m.extra.length, 0)}
  non-Japanese rules flagged: ${nonJapanese.length}
  unparseable rules flagged: ${unparseable.length}
`);

  // Project final count
  const duplicateIds = new Set<string>();
  for (const p of plans) p.duplicates.forEach((d) => duplicateIds.add(d.id));
  for (const m of crossLevelMerges) {
    duplicateIds.add(m.from.canonical.id);
    m.from.duplicates.forEach((d) => duplicateIds.add(d.id));
  }
  for (const m of singletonMerges) m.extra.forEach((e) => duplicateIds.add(e.id));
  for (const r of nonJapanese) duplicateIds.add(r.id);
  for (const r of unparseable) duplicateIds.add(r.id);

  const projectedFinal = all.length - duplicateIds.size;
  console.log(`projected canonical rule count after dedup: ${projectedFinal}`);

  if (!APPLY) {
    console.log("(dry-run — pass --apply to execute)");
    return;
  }

  // Execute in one pass.
  //
  // For each (duplicate_id → canonical_id) mapping:
  //   1. Find song_version_grammar_rules rows that would violate the unique
  //      (song_version_id, grammar_rule_id) constraint after the rewrite —
  //      delete them instead of updating.
  //   2. UPDATE the remaining links to point at canonical.
  //   3. DELETE the duplicate rule row.

  const mappings: Array<{ from: string; to: string }> = [];
  for (const p of plans) {
    for (const d of p.duplicates) mappings.push({ from: d.id, to: p.canonical.id });
  }
  for (const m of crossLevelMerges) {
    // Merge m.from.canonical + m.from.duplicates INTO m.into.canonical.
    mappings.push({ from: m.from.canonical.id, to: m.into.canonical.id });
    for (const d of m.from.duplicates) {
      mappings.push({ from: d.id, to: m.into.canonical.id });
    }
  }
  for (const m of singletonMerges) {
    for (const e of m.extra) mappings.push({ from: e.id, to: m.canonical.id });
  }

  console.log(`applying ${mappings.length} id remappings...`);

  for (const { from, to } of mappings) {
    // Delete conflicting links first (where the song already has the canonical).
    await db.execute(sql`
      DELETE FROM song_version_grammar_rules a
      USING song_version_grammar_rules b
      WHERE a.grammar_rule_id = ${from}::uuid
        AND b.grammar_rule_id = ${to}::uuid
        AND a.song_version_id = b.song_version_id
        AND a.id <> b.id
    `);
    // Update surviving links.
    await db
      .update(songVersionGrammarRules)
      .set({ grammar_rule_id: to })
      .where(eq(songVersionGrammarRules.grammar_rule_id, from));
    // Delete the duplicate rule row. Cascade on user_grammar_rule_mastery /
    // user_grammar_exercise_log is set up in the migration; any prior mastery
    // attached to the dup is lost (acceptable: the system is brand-new and
    // has zero user activity yet).
    await db.delete(grammarRules).where(eq(grammarRules.id, from));
  }

  // Drop non-JP and unparseable rules entirely — their links (if any) are
  // removed via the cascade.
  const purgeIds = [
    ...nonJapanese.map((r) => r.id),
    ...unparseable.map((r) => r.id),
  ];
  if (purgeIds.length) {
    // Remove links first (cascade handles it too, but explicit is fine).
    await db
      .delete(songVersionGrammarRules)
      .where(inArray(songVersionGrammarRules.grammar_rule_id, purgeIds));
    await db.delete(grammarRules).where(inArray(grammarRules.id, purgeIds));
  }

  const after = await db.select({ n: sql<number>`COUNT(*)::int` }).from(grammarRules);
  console.log(`done. grammar_rules now: ${after[0]?.n ?? "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
