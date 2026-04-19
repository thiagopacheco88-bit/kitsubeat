/**
 * Repair lesson tokens whose `surface` field was clobbered with romaji while
 * `reading` still holds the correct kana. Scans every song_version with a
 * lesson; rewrites `tokens[].surface` (and vocabulary[].surface when present)
 * to the kana from `reading`.
 *
 * Detection rule — applied per-token:
 *   1. reading must contain kana or kanji
 *   2. surface must contain no kana/kanji
 *   3. normalized(surface) must match normalized(hepburn(reading))
 *
 * Rule 3 is what distinguishes genuine English loanwords ("Trickster" /
 * "トリックスター") from the romaji-clobbered bug ("Sumimasen" / "すみません"):
 * romanizing トリックスター gives "torikkusutaa", which does NOT normalize to
 * "trickster"; romanizing すみません gives "sumimasen", which DOES normalize to
 * "sumimasen".
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/audit/fix-romaji-surfaces.ts           # dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/audit/fix-romaji-surfaces.ts --apply   # persist
 */

import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, "..", ".."), ".env.local") });

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

const JP_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

// ─── Minimal Hepburn kana→romaji (hiragana + katakana; handles yōon, sokuon,
// long vowels). Pragmatic — covers everything that can appear in a `reading`
// field, which is normalized hiragana/katakana only (no kanji). ───────────────

const BASE: Record<string, string> = {
  あ:"a",い:"i",う:"u",え:"e",お:"o",
  か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",
  さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",
  た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",
  な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",
  は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",
  ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",
  や:"ya",ゆ:"yu",よ:"yo",
  ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",
  わ:"wa",ゐ:"i",ゑ:"e",を:"wo",ん:"n",
  が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",
  ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",
  だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",
  ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",
  ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",
};

// Yōon composites (consonant + small y-kana).
const YOON: Record<string, string> = {
  きゃ:"kya",きゅ:"kyu",きょ:"kyo",
  しゃ:"sha",しゅ:"shu",しょ:"sho",
  ちゃ:"cha",ちゅ:"chu",ちょ:"cho",
  にゃ:"nya",にゅ:"nyu",にょ:"nyo",
  ひゃ:"hya",ひゅ:"hyu",ひょ:"hyo",
  みゃ:"mya",みゅ:"myu",みょ:"myo",
  りゃ:"rya",りゅ:"ryu",りょ:"ryo",
  ぎゃ:"gya",ぎゅ:"gyu",ぎょ:"gyo",
  じゃ:"ja", じゅ:"ju", じょ:"jo",
  びゃ:"bya",びゅ:"byu",びょ:"byo",
  ぴゃ:"pya",ぴゅ:"pyu",ぴょ:"pyo",
  // Extended katakana yōon used for foreign sounds
  ふぁ:"fa",ふぃ:"fi",ふぇ:"fe",ふぉ:"fo",
  てぃ:"ti",でぃ:"di",とぅ:"tu",どぅ:"du",
  うぃ:"wi",うぇ:"we",うぉ:"wo",
  ゔぁ:"va",ゔぃ:"vi",ゔ:"vu",ゔぇ:"ve",ゔぉ:"vo",
  しぇ:"she",じぇ:"je",ちぇ:"che",
};

function katakanaToHiragana(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function kanaToRomaji(raw: string): string {
  // Normalize katakana → hiragana so one table covers both.
  const s = katakanaToHiragana(raw);
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    // Sokuon — double next consonant (or 't' when next starts with ch).
    if (ch === "っ") {
      const nextRoma = YOON[s.slice(i + 1, i + 3)] ?? BASE[s[i + 1] ?? ""] ?? "";
      if (nextRoma.length > 0) out += nextRoma[0] === "c" ? "t" : nextRoma[0];
      i++;
      continue;
    }
    // Long vowel mark — duplicate previous vowel.
    if (ch === "ー") {
      const last = out.at(-1);
      if (last && /[aeiou]/.test(last)) out += last;
      i++;
      continue;
    }
    // Yōon two-kana composites.
    const two = s.slice(i, i + 2);
    if (YOON[two]) {
      out += YOON[two];
      i += 2;
      continue;
    }
    // Base single kana.
    if (BASE[ch]) {
      out += BASE[ch];
      i++;
      continue;
    }
    // Unknown / small kana standalone / punctuation — pass through.
    out += ch;
    i++;
  }
  return out;
}

/** Aggressive normalization for fuzzy comparison. Applied symmetrically to
 *  both sides (surface and hepburn(reading)) so that:
 *    - macrons and long-vowel digraphs collapse to one vowel
 *      ("Tōku" ≈ "tooku" ≈ "touku" ≈ "toku")
 *    - casing, spacing, punctuation are irrelevant
 *  Consonant doublets (sokuon: "tt", "kk", "pp") are preserved. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[ōŌ]/g, "o")
    .replace(/[ūŪ]/g, "u")
    .replace(/[āĀ]/g, "a")
    .replace(/[īĪ]/g, "i")
    .replace(/[ēĒ]/g, "e")
    .replace(/[^a-z]/g, "")
    // Long-vowel forms. Hepburn writes long o as "ō" (→ "o"), but the
    // underlying kana is "おう" or "おお" which my table emits as "ou"/"oo".
    // Collapse both on both sides so the fuzzy match covers every style.
    .replace(/ou/g, "o")
    .replace(/ei/g, "e")
    .replace(/aa/g, "a")
    .replace(/ii/g, "i")
    .replace(/uu/g, "u")
    .replace(/ee/g, "e")
    .replace(/oo/g, "o");
}

// ─── Core logic ─────────────────────────────────────────────────────────────

interface Token { surface?: string; reading?: string; [k: string]: unknown }
interface Verse { verse_number?: number; tokens?: Token[]; [k: string]: unknown }
interface Lesson { verses?: Verse[]; vocabulary?: Token[]; [k: string]: unknown }

interface FixDecision {
  fix: boolean;
  reason: "no-kana-in-reading" | "surface-has-kana" | "romaji-mismatch" | "identical" | "fix";
  romajiOfReading?: string;
}

function decide(t: Token): FixDecision {
  const surface = t.surface ?? "";
  const reading = t.reading ?? "";
  if (!surface || !reading) return { fix: false, reason: "identical" };
  if (surface === reading) return { fix: false, reason: "identical" };
  if (!JP_RE.test(reading)) return { fix: false, reason: "no-kana-in-reading" };
  if (JP_RE.test(surface)) return { fix: false, reason: "surface-has-kana" };

  const hep = kanaToRomaji(reading);
  const normSurface = normalize(surface);
  // Mojibake / replacement-char surfaces normalize to the empty string — treat
  // as corrupted data and fix from reading.
  if (normSurface === "") {
    return { fix: true, reason: "fix", romajiOfReading: hep };
  }
  if (normSurface === normalize(hep)) {
    return { fix: true, reason: "fix", romajiOfReading: hep };
  }
  return { fix: false, reason: "romaji-mismatch", romajiOfReading: hep };
}

function patchTokens(tokens: Token[], trace: (t: Token, d: FixDecision) => void): number {
  let fixed = 0;
  for (const t of tokens) {
    const d = decide(t);
    trace(t, d);
    if (d.fix) {
      t.surface = t.reading!;
      fixed++;
    }
  }
  return fixed;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query<{
    sv_id: string;
    slug: string;
    title: string;
    version_type: string;
    lesson: Lesson | null;
  }>(`
    SELECT sv.id AS sv_id, s.slug, s.title, sv.version_type, sv.lesson
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE sv.lesson IS NOT NULL
    ORDER BY s.slug, sv.version_type
  `);

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} mode — scanning ${rows.length} song_versions\n`);

  let affectedVersions = 0;
  let totalTokensFixed = 0;
  let totalVocabFixed = 0;
  let skippedMismatch = 0;
  const toUpdate: Array<{ sv_id: string; lesson: Lesson }> = [];

  for (const r of rows) {
    const lesson = r.lesson;
    if (!lesson) continue;

    const mismatchExamples: Array<{ surface: string; reading: string; hep: string }> = [];
    const trace = (t: Token, d: FixDecision) => {
      if (d.reason === "romaji-mismatch" && mismatchExamples.length < 3) {
        mismatchExamples.push({ surface: t.surface ?? "", reading: t.reading ?? "", hep: d.romajiOfReading ?? "" });
      }
      if (d.reason === "romaji-mismatch") skippedMismatch++;
    };

    let versionTokenFixes = 0;
    for (const v of lesson.verses ?? []) {
      if (v.tokens) versionTokenFixes += patchTokens(v.tokens, trace);
    }
    let versionVocabFixes = 0;
    if (lesson.vocabulary) versionVocabFixes = patchTokens(lesson.vocabulary, trace);

    if (versionTokenFixes + versionVocabFixes > 0) {
      affectedVersions++;
      totalTokensFixed += versionTokenFixes;
      totalVocabFixed += versionVocabFixes;
      console.log(
        `  ${r.slug} [${r.version_type}] — ${r.title}: ${versionTokenFixes} verse-tokens, ${versionVocabFixes} vocab`
      );
      toUpdate.push({ sv_id: r.sv_id, lesson });
    }

    if (VERBOSE && mismatchExamples.length > 0) {
      for (const ex of mismatchExamples) {
        console.log(`    skipped (romaji-mismatch): surface="${ex.surface}" reading="${ex.reading}" hepburn="${ex.hep}"`);
      }
    }
  }

  console.log(
    `\nSummary: ${affectedVersions} versions, ${totalTokensFixed} verse-tokens fixed, ${totalVocabFixed} vocab entries fixed.`
  );
  console.log(`(skipped ${skippedMismatch} tokens with romaji-mismatch — kept as English loanwords)`);

  if (!APPLY) {
    console.log("\n(dry-run — no writes performed; re-run with --apply to persist)");
    await client.end();
    return;
  }

  if (toUpdate.length === 0) {
    console.log("\nNothing to update.");
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    for (const u of toUpdate) {
      await client.query(`UPDATE song_versions SET lesson = $1, updated_at = NOW() WHERE id = $2`, [
        u.lesson,
        u.sv_id,
      ]);
    }
    await client.query("COMMIT");
    console.log(`\nCommitted ${toUpdate.length} updates.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
