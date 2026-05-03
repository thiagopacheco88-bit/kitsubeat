/**
 * Cluster grammar_rules by canonical kana stem to identify duplicate-name
 * variants of the same underlying grammar pattern.
 *
 * Heuristic per name:
 *   1. Strip leading 〜 mark.
 *   2. Take the kana/kanji prefix until the first ASCII / space / paren / slash.
 *   3. Normalize JLPT level (e.g., "JLPT N4" → "N4").
 *   4. Group by (kana_stem, jlpt_normalized).
 *
 * For names that don't start with kana (e.g., "命令形 (imperative form)" or
 * "Verb stem + 合う (do mutually)"), we use the leading kanji or English token
 * as the stem.
 *
 * Within each group, the rule with the highest song_count is the canonical
 * survivor; the rest are flagged as duplicates to be merged into it.
 *
 * Output: _temp/grammar-rule-clusters.json
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/cluster-grammar-rules.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

interface Rule {
  id: string;
  name: string;
  jlpt_reference: string;
  song_count: number;
}

interface Cluster {
  stem_key: string;
  jlpt: string;
  canonical: Rule;
  members: Rule[]; // includes the canonical
  total_song_count: number;
}

const STOP_CHARS = /[\s(（［\[/／,，:：—–\-]/;

function normalizeJlpt(raw: string): string {
  // "JLPT N4" / "N4" → "N4"; "JLPT N3-N4" → "N3-N4"; misc preserved
  const m = raw.match(/N[1-5](?:-N[1-5])?/);
  return m ? m[0] : raw.trim();
}

function extractStem(name: string): string {
  // Strip leading tilde
  let s = name.trim().replace(/^〜+/, "");
  // Take prefix until first stop char
  const stopMatch = s.match(STOP_CHARS);
  if (stopMatch && stopMatch.index !== undefined) {
    s = s.slice(0, stopMatch.index);
  }
  // Limit to 8 chars to avoid over-fitting (e.g., "〜たまま" vs "〜まま" should
  // still be candidates for cross-cluster review, but distinct enough to keep)
  return s.slice(0, 8);
}

function main() {
  const rules = JSON.parse(
    readFileSync("_temp/all-grammar-rules.json", "utf8"),
  ) as Rule[];

  const buckets = new Map<string, Rule[]>();
  for (const rule of rules) {
    const stem = extractStem(rule.name);
    const jlpt = normalizeJlpt(rule.jlpt_reference);
    const key = `${jlpt}::${stem}`;
    const arr = buckets.get(key) ?? [];
    arr.push(rule);
    buckets.set(key, arr);
  }

  // Confidence gate: only auto-merge clusters whose stem starts with kana
  // (Hiragana / Katakana). English-prefix clusters ("Verb", "Compound",
  // "Sentence-final", "Imperative") often lump genuinely-different patterns
  // together — flag them for manual review instead of auto-merge.
  const isHighConfidence = (stem: string): boolean => {
    if (!stem || stem.length === 0) return false;
    const first = stem.codePointAt(0)!;
    // Hiragana: U+3040–U+309F. Katakana: U+30A0–U+30FF.
    return (first >= 0x3040 && first <= 0x30FF);
  };

  const clusters: (Cluster & { confidence: "high" | "review" })[] = [];
  for (const [key, arr] of buckets.entries()) {
    if (arr.length === 1) continue; // skip singletons — no consolidation needed
    const sorted = [...arr].sort((a, b) => b.song_count - a.song_count);
    const canonical = sorted[0];
    const total = arr.reduce((s, r) => s + r.song_count, 0);
    const [jlpt, stem] = key.split("::");
    clusters.push({
      stem_key: stem,
      jlpt,
      canonical,
      members: sorted,
      total_song_count: total,
      confidence: isHighConfidence(stem) ? "high" : "review",
    });
  }

  clusters.sort((a, b) => b.total_song_count - a.total_song_count);

  writeFileSync(
    "_temp/grammar-rule-clusters.json",
    JSON.stringify(clusters, null, 2),
  );

  // Summary stats
  const totalRules = rules.length;
  const highConf = clusters.filter((c) => c.confidence === "high");
  const reviewClusters = clusters.filter((c) => c.confidence === "review");
  const rulesInHighConf = highConf.reduce((s, c) => s + c.members.length, 0);
  const orphansHighConf = rulesInHighConf - highConf.length;
  const rulesInReview = reviewClusters.reduce((s, c) => s + c.members.length, 0);

  console.log(`\n[cluster] total rules: ${totalRules}`);
  console.log(`[cluster] high-confidence clusters (kana stem): ${highConf.length} (${rulesInHighConf} rules → ${highConf.length} canonical, merging ${orphansHighConf} orphans)`);
  console.log(`[cluster] review-needed clusters (English/kanji prefix): ${reviewClusters.length} (${rulesInReview} rules)`);
  console.log(`[cluster] singletons (untouched): ${totalRules - rulesInHighConf - rulesInReview}`);
  console.log(`[cluster] after high-conf merge only: ${totalRules - orphansHighConf} canonical rules`);
  console.log(`\n[cluster] top 30 clusters by total_song_count:`);
  for (const c of clusters.slice(0, 30)) {
    console.log(`  ${c.total_song_count}x  [${c.jlpt}::${c.stem_key}]  ${c.members.length} variants`);
    for (const m of c.members) {
      const marker = m.id === c.canonical.id ? " ★" : "  ";
      console.log(`   ${marker}  ${String(m.song_count).padStart(3)}x  ${m.name}`);
    }
  }
}

main();
