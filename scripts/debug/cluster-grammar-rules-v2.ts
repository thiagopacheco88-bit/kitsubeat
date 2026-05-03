/**
 * Cluster grammar_rules — v2 stem extraction.
 *
 * The original cluster-grammar-rules.ts truncated stems to 8 chars and used
 * romaji prefix. After the v2 rewrite (names like "〜te mo (〜ても) — even if"),
 * this collides 〜te mo / 〜te iru / 〜te kureru / 〜te shimau into one fake
 * cluster — they're 4 different grammar patterns.
 *
 * v2 stem extraction algorithm:
 *   1. If name contains "(〜KANA)" or "(〜KANA / 〜KANA)" v2-style parens,
 *      extract the kana inside the parens as the stem (canonical hiragana
 *      form). This handles all v2-rewritten names cleanly.
 *   2. Otherwise extract the leading kana/kanji sequence from the name,
 *      stripping the "〜" mark.
 *   3. Group by (jlpt_normalized, full_kana_stem).
 *
 * Confidence:
 *   - high: kana stem from v2 parens, or pure kana stem ≥ 2 chars
 *   - review: kanji-only stem (often correct but worth eyeballing)
 *   - low: English-only stem ("Verb stem +", "Imperative", "Compound")
 *
 * Output: _temp/grammar-rule-clusters-v2.json
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
  members: Rule[];
  total_song_count: number;
  confidence: "high" | "review" | "low";
}

function normalizeJlpt(raw: string): string {
  const m = raw.match(/N[1-5](?:-N[1-5])?/);
  return m ? m[0] : raw.trim();
}

const HIRA_KATA = /[぀-ゟ゠-ヿ]/;
const KANJI = /[一-鿿]/;

function isKana(ch: string): boolean { return HIRA_KATA.test(ch); }
function isKanji(ch: string): boolean { return KANJI.test(ch); }

function extractStem(name: string): { stem: string; kind: "kana" | "kanji" | "english" } {
  const trimmed = name.trim();

  // Pattern 1: v2 format — "label (〜KANA) — gloss" or "label (〜KANA / 〜KANA) — gloss"
  // Capture the FIRST kana sequence inside the parens.
  const v2Match = trimmed.match(/\(〜?([぀-ゟ゠-ヿ一-鿿]+)/);
  if (v2Match) {
    return { stem: v2Match[1], kind: isKana(v2Match[1][0]) ? "kana" : "kanji" };
  }

  // Pattern 2: leading 〜 + kana — "〜たい (want to)"
  const tildeKanaMatch = trimmed.match(/^〜+([぀-ゟ゠-ヿ]+)/);
  if (tildeKanaMatch) {
    return { stem: tildeKanaMatch[1], kind: "kana" };
  }

  // Pattern 3: leading kanji — "命令形 (imperative form)"
  const kanjiMatch = trimmed.match(/^([一-鿿]+)/);
  if (kanjiMatch) {
    return { stem: kanjiMatch[1], kind: "kanji" };
  }

  // Pattern 4: anything starting with kana
  const anyKana = trimmed.match(/^([぀-ゟ゠-ヿ]+)/);
  if (anyKana) {
    return { stem: anyKana[1], kind: "kana" };
  }

  // Pattern 5: English prefix — take first 2-3 word tokens
  const englishMatch = trimmed.match(/^([A-Za-z\-]+(?:\s+[A-Za-z\-+]+){0,2})/);
  if (englishMatch) {
    return { stem: englishMatch[1].toLowerCase(), kind: "english" };
  }

  return { stem: trimmed.slice(0, 8), kind: "english" };
}

function classifyConfidence(stem: string, kind: "kana" | "kanji" | "english"): "high" | "review" | "low" {
  if (kind === "kana" && stem.length >= 2) return "high";
  if (kind === "kanji" && stem.length >= 2) return "review";
  return "low";
}

function main() {
  const rules = JSON.parse(readFileSync("_temp/all-grammar-rules.json", "utf8")) as Rule[];

  const buckets = new Map<string, { rules: Rule[]; kind: "kana" | "kanji" | "english" }>();
  for (const rule of rules) {
    const { stem, kind } = extractStem(rule.name);
    const jlpt = normalizeJlpt(rule.jlpt_reference);
    const key = `${jlpt}::${stem}`;
    const existing = buckets.get(key);
    if (existing) existing.rules.push(rule);
    else buckets.set(key, { rules: [rule], kind });
  }

  const clusters: Cluster[] = [];
  for (const [key, { rules: arr, kind }] of buckets.entries()) {
    if (arr.length === 1) continue;
    const sorted = [...arr].sort((a, b) => b.song_count - a.song_count);
    const [jlpt, stem] = key.split("::", 2);
    clusters.push({
      stem_key: stem,
      jlpt,
      canonical: sorted[0],
      members: sorted,
      total_song_count: arr.reduce((s, r) => s + r.song_count, 0),
      confidence: classifyConfidence(stem, kind),
    });
  }

  clusters.sort((a, b) => b.total_song_count - a.total_song_count);
  writeFileSync("_temp/grammar-rule-clusters-v2.json", JSON.stringify(clusters, null, 2));

  // Summary stats
  const totalRules = rules.length;
  const high = clusters.filter((c) => c.confidence === "high");
  const review = clusters.filter((c) => c.confidence === "review");
  const low = clusters.filter((c) => c.confidence === "low");

  const orphansHigh = high.reduce((s, c) => s + c.members.length - 1, 0);
  const orphansReview = review.reduce((s, c) => s + c.members.length - 1, 0);
  const orphansLow = low.reduce((s, c) => s + c.members.length - 1, 0);

  console.log(`\n[cluster-v2] total rules: ${totalRules}`);
  console.log(`[cluster-v2] high-conf (kana stem):    ${high.length} clusters, ${orphansHigh} orphans`);
  console.log(`[cluster-v2] review (kanji stem):      ${review.length} clusters, ${orphansReview} orphans`);
  console.log(`[cluster-v2] low (english/short stem): ${low.length} clusters, ${orphansLow} orphans`);
  console.log(`[cluster-v2] singletons (untouched):   ${totalRules - high.reduce((s,c)=>s+c.members.length,0) - review.reduce((s,c)=>s+c.members.length,0) - low.reduce((s,c)=>s+c.members.length,0)}`);
  console.log(`[cluster-v2] after high-conf merge:    ${totalRules - orphansHigh}`);
  console.log(`[cluster-v2] after high+review merge:  ${totalRules - orphansHigh - orphansReview}`);
  console.log(`[cluster-v2] after all-tier merge:     ${totalRules - orphansHigh - orphansReview - orphansLow}`);

  console.log(`\n[cluster-v2] HIGH-CONFIDENCE clusters (${high.length}):`);
  for (const c of high) {
    console.log(`  ${c.total_song_count.toString().padStart(3)}x  [${c.jlpt}::${c.stem_key}]  ${c.members.length} variants`);
    for (const m of c.members) {
      const marker = m.id === c.canonical.id ? " ★" : "  ";
      console.log(`   ${marker}  ${String(m.song_count).padStart(3)}x  ${m.id.slice(0,8)}  ${m.name}`);
    }
  }

  console.log(`\n[cluster-v2] REVIEW (kanji stem) clusters (${review.length}):`);
  for (const c of review) {
    console.log(`  ${c.total_song_count.toString().padStart(3)}x  [${c.jlpt}::${c.stem_key}]  ${c.members.length} variants`);
    for (const m of c.members) {
      const marker = m.id === c.canonical.id ? " ★" : "  ";
      console.log(`   ${marker}  ${String(m.song_count).padStart(3)}x  ${m.id.slice(0,8)}  ${m.name}`);
    }
  }
}

main();
