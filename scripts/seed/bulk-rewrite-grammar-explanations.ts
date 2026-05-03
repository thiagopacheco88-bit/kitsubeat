/**
 * bulk-rewrite-grammar-explanations.ts — Anthropic-API rewrite of all
 * grammar_rules.explanation entries into the locked romaji-primary,
 * 15-example format.
 *
 * Format spec (memory:project_grammar_explanation_format):
 *  • Romaji is the primary teaching signal; JP form follows in parens with
 *    <ruby>kanji<rt>kana</rt></ruby> markup over the kanji portions only.
 *  • Three short paragraphs: how-it-works, song-specific usage, distinguishing
 *    notes / register cues.
 *  • Bulleted list of ≥15 examples. Each: "romaji_form (jp_with_furigana) — 'English'".
 *
 * Resume-safe: --rule-id <uuid> processes one specific rule (UAT mode).
 * Without it, processes all rules whose explanation does NOT yet contain
 * the romaji-primary marker (a sentinel string we insert; absent on legacy rows).
 *
 * v2 prompt: anchored on 3 few-shot examples curated from the 231 inline-
 * authored v2 rules. Locks ruby-tag conventions (kanji wrapped, kana bare),
 * Hepburn romaji, and 3-paragraph + 15-bullet structure.
 *
 * Recommended workflow:
 *   1. Dry-run plan (free):
 *      npx tsx --tsconfig tsconfig.scripts.json scripts/seed/bulk-rewrite-grammar-explanations.ts --dry-run
 *
 *   2. Single-rule UAT (~$0.01) — sanity-check format / ruby tags / examples:
 *      npx tsx --tsconfig tsconfig.scripts.json scripts/seed/bulk-rewrite-grammar-explanations.ts --rule-id <uuid>
 *
 *   3. Pilot batch (~$0.50 for 50 rules) — QA quality before full run:
 *      npx tsx --tsconfig tsconfig.scripts.json scripts/seed/bulk-rewrite-grammar-explanations.ts --limit 50
 *
 *   4. Full remaining catalog (~$5-15 depending on count):
 *      npx tsx --tsconfig tsconfig.scripts.json scripts/seed/bulk-rewrite-grammar-explanations.ts
 *
 *   5. After explanations are in grammar_rules, propagate to song_versions JSONB:
 *      npx tsx --tsconfig tsconfig.scripts.json scripts/seed/bulk-rewrite-grammar-explanations.ts --sync-jsonb
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import { localize, type Localizable } from "../../src/lib/types/lesson.js";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 3072; // 15 examples + 3 paragraphs ≈ 1800-2400 output tokens

// Sentinel embedded in every rewritten explanation so we can re-target legacy
// rows on resume without storing a separate "rewritten_at" column.
const FORMAT_MARKER = "<!-- v2-romaji-primary -->";

interface Args {
  ruleId: string | null;
  dryRun: boolean;
  syncJsonb: boolean;
  retryAttempts: number;
  concurrency: number;
  limit: number | null;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback: string): string => {
    const idx = argv.indexOf(flag);
    return idx === -1 || idx === argv.length - 1 ? fallback : argv[idx + 1];
  };
  const limitRaw = get("--limit", "");
  return {
    ruleId: get("--rule-id", "") || null,
    dryRun: argv.includes("--dry-run"),
    syncJsonb: argv.includes("--sync-jsonb"),
    retryAttempts: Number(get("--retries", "2")),
    concurrency: Number(get("--concurrency", "4")),
    limit: limitRaw ? Number(limitRaw) : null,
  };
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  }
  return _client;
}

// Few-shot anchors curated from the 231 inline-authored v2 rules.
// Three diverse formation patterns lock the model on format.
const FEW_SHOT = `=== EXAMPLE 1 (te-form auxiliary) ===
INPUT
- name: 〜te kureru (〜てくれる) — doing for me / us
- JLPT: JLPT N3
- current explanation: V-te-form + kureru. Someone does X as a favor for the speaker.

OUTPUT
Attach kureru (くれる) to a verb's te-form to express that someone does the action as a favour for the speaker (or the speaker's in-group). 〜te kureru carries gratitude — the speaker recognises the action as benevolent. Past form: 〜te kureta (〜てくれた). Polite form: 〜te kudasaru (〜てくださる) for higher-status givers; 〜te kudasai (〜てください) is the imperative request derived from it.

This is one of three giving-and-receiving verbs central to Japanese pragmatics: kureru (くれる, 'someone gives me / does for me'), ageru (<ruby>上<rt>あ</rt></ruby>げる, 'I give / do for someone'), and morau (もらう, 'I receive / have someone do'). Together they encode the directional flow of favours and the social position of the speaker.

Compare 〜te kureru with 〜te ageru (the speaker is the actor) and 〜te morau (the speaker is the receiver of the action). 〜te kureru positions the speaker as the GRATEFUL recipient. The pattern is essential for natural-sounding Japanese — omitting it where it should appear sounds cold or transactional.

• oshiete kureru (<ruby>教<rt>おし</rt></ruby>えてくれる) — 'teaches me'
• tsukutte kureru (<ruby>作<rt>つく</rt></ruby>ってくれる) — 'makes (it) for me'
• matte kureru (<ruby>待<rt>ま</rt></ruby>ってくれる) — 'waits for me'
• tasukete kureru (<ruby>助<rt>たす</rt></ruby>けてくれる) — 'helps me'
• kanaete kureru (<ruby>叶<rt>かな</rt></ruby>えてくれる) — 'grants (the wish) for me'
• yurushite kureta (<ruby>許<rt>ゆる</rt></ruby>してくれた) — 'forgave me'
• wakatte kureru (<ruby>分<rt>わ</rt></ruby>かってくれる) — 'understands me'
• shoukai shite kureta (<ruby>紹介<rt>しょうかい</rt></ruby>してくれた) — 'introduced (someone) to me'
• kashite kureru? (<ruby>貸<rt>か</rt></ruby>してくれる？) — 'will you lend me?'
• yonde kureta (<ruby>読<rt>よ</rt></ruby>んでくれた) — 'read it (out loud) for me'
• kiite kureru (<ruby>聞<rt>き</rt></ruby>いてくれる) — 'listens to me'
• mukae ni kite kureta (<ruby>迎<rt>むか</rt></ruby>えに<ruby>来<rt>き</rt></ruby>てくれた) — 'came to pick me up'
• shinjite kureru (<ruby>信<rt>しん</rt></ruby>じてくれる) — 'believes in me'
• mamotte kureru (<ruby>守<rt>まも</rt></ruby>ってくれる) — 'protects me'
• tetsudatte kureta (<ruby>手伝<rt>てつだ</rt></ruby>ってくれた) — 'helped me out'

${FORMAT_MARKER}

=== EXAMPLE 2 (particle-based) ===
INPUT
- name: 〜hodo (〜ほど) — to the extent of
- JLPT: JLPT N3
- current explanation: ほど marks degree or extent. Often used in extent comparisons or "to the point that".

OUTPUT
〜hodo (〜ほど) attaches to a noun, V-dictionary form, or quantifier to mark degree or extent — 'to the extent of / so much that'. Sankai hodo itta (<ruby>三回<rt>さんかい</rt></ruby>ほど<ruby>行<rt>い</rt></ruby>った) 'went about three times'. With negation, 〜hodo 〜nai means 'not as X as Y' — comparative inferiority.

Often paired with verbs of feeling for emphatic extent: ureshikute naku hodo (<ruby>嬉<rt>うれ</rt></ruby>しくて<ruby>泣<rt>な</rt></ruby>くほど) 'so happy I could cry'. Adding ない makes it 'not to that extent'.

Compare with 〜kurai / 〜gurai (everyday extent / approximation), 〜bakari (limited to / only — restrictive), 〜yaku (formal 'approximately'). 〜hodo is the formal / extent-emphasis member of the family — preferred in literary, comparative, and emphatic-extent contexts.

• sankai hodo itta (<ruby>三回<rt>さんかい</rt></ruby>ほど<ruby>行<rt>い</rt></ruby>った) — 'went about three times'
• naku hodo ureshii (<ruby>泣<rt>な</rt></ruby>くほど<ruby>嬉<rt>うれ</rt></ruby>しい) — 'so happy I could cry'
• shinu hodo aishite iru (<ruby>死<rt>し</rt></ruby>ぬほど<ruby>愛<rt>あい</rt></ruby>している) — 'loving (you) to death'
• kore hodo no koto (これほどのこと) — 'a thing of this magnitude'
• kanashii hodo (<ruby>悲<rt>かな</rt></ruby>しいほど) — 'to a sad extent'
• samui hodo (<ruby>寒<rt>さむ</rt></ruby>いほど) — 'cold enough to'
• ari-enai hodo (<ruby>有<rt>あ</rt></ruby>り<ruby>得<rt>え</rt></ruby>ないほど) — 'to an impossible extent'
• mukashi hodo wakaranai (<ruby>昔<rt>むかし</rt></ruby>ほど<ruby>分<rt>わ</rt></ruby>からない) — "doesn't understand as much as before"
• sukoshi hodo (<ruby>少<rt>すこ</rt></ruby>しほど) — 'about a little'
• boku hodo (<ruby>僕<rt>ぼく</rt></ruby>ほど) — 'as much as me'
• yume hodo (<ruby>夢<rt>ゆめ</rt></ruby>ほど) — 'to the extent of a dream'
• ai hodo tsuyoi mono nai (<ruby>愛<rt>あい</rt></ruby>ほど<ruby>強<rt>つよ</rt></ruby>いものない) — 'nothing as strong as love'
• kotoba hodo (<ruby>言葉<rt>ことば</rt></ruby>ほど) — 'to the extent of words'
• jikan ga sugu hodo (<ruby>時間<rt>じかん</rt></ruby>がすぐほど) — 'to the speed of time passing'
• ima ga ii hodo (<ruby>今<rt>いま</rt></ruby>がいいほど) — 'to the goodness of now'

${FORMAT_MARKER}

=== EXAMPLE 3 (kanji-form rule with verb conjugation) ===
INPUT
- name: meireikei (命令形) — imperative form
- JLPT: JLPT N4
- current explanation: 命令形 is the imperative form of verbs. Type 1 verbs change u to e; type 2 add ろ.

OUTPUT
The imperative form (<ruby>命令形<rt>めいれいけい</rt></ruby>, meireikei) expresses a direct command. Type 1 (godan) verbs change the final 〜u to 〜e: <ruby>書<rt>か</rt></ruby>く → kake (<ruby>書<rt>か</rt></ruby>け) "write!". Type 2 (ichidan) verbs drop 〜ru and add 〜ro: <ruby>食<rt>た</rt></ruby>べる → tabero (<ruby>食<rt>た</rt></ruby>べろ) "eat!". Irregular: suru → shiro (しろ), kuru → koi (<ruby>来<rt>こ</rt></ruby>い).

The bare imperative is direct and rough — common in male speech, military / sports commands, anime / manga dialogue, and song lyrics where assertive emotion is wanted. Politer alternatives: 〜te kudasai (please do), 〜nasai (gentler order, often parental), 〜tamae (literary / formal).

Compare with negative imperative 〜na (don't, batch4a), 〜nai de (please don't, batch4b), and the standalone 〜nasai (parental order). 命令形 is reserved for emphatic command — using it on equals or superiors sounds aggressive.

• kake (<ruby>書<rt>か</rt></ruby>け) — 'write!'
• tabero (<ruby>食<rt>た</rt></ruby>べろ) — 'eat!'
• ike (<ruby>行<rt>い</rt></ruby>け) — 'go!'
• miro (<ruby>見<rt>み</rt></ruby>ろ) — 'look!'
• yare (やれ) — 'do (it)!'
• shiro (しろ) — 'do (it)!' (suru imperative)
• koi (<ruby>来<rt>こ</rt></ruby>い) — 'come!'
• damare (<ruby>黙<rt>だま</rt></ruby>れ) — 'shut up!'
• mate (<ruby>待<rt>ま</rt></ruby>て) — 'wait!'
• tomare (<ruby>止<rt>と</rt></ruby>まれ) — 'stop!'
• ganbare (<ruby>頑張<rt>がんば</rt></ruby>れ) — 'go for it! / try hard!'
• mamore (<ruby>守<rt>まも</rt></ruby>れ) — 'protect!'
• shinjiro (<ruby>信<rt>しん</rt></ruby>じろ) — 'believe!'
• tatakae (<ruby>戦<rt>たたか</rt></ruby>え) — 'fight!'
• ai shiro (<ruby>愛<rt>あい</rt></ruby>しろ) — 'love (me)!'

${FORMAT_MARKER}`;

function buildPrompt(rule: { name: string; jlpt_reference: string; explanationEn: string }): string {
  return `You are rewriting a Japanese grammar rule explanation for a learning app where ROMAJI is the PRIMARY teaching signal and kanji+furigana is SECONDARY. Match the format of the three examples below exactly.

${FEW_SHOT}

=== NOW REWRITE THIS RULE ===
INPUT
- name: ${rule.name}
- JLPT: ${rule.jlpt_reference}
- current explanation:
${rule.explanationEn}

OUTPUT REQUIREMENTS (read carefully — these are non-negotiable):

STRUCTURE
- 3 short paragraphs (formation / nuance / comparison), each separated by a blank line.
- Followed by EXACTLY 15 bullet examples, each starting with "• ".
- Final line: literal sentinel "${FORMAT_MARKER}" on its own line.
- No JSON, no code fences, no preamble like "Here is...".

ROMAJI-PRIMARY RULE
- Every reference to a Japanese form: romaji first, JP form in parens. NEVER the reverse.
- ✅ "Attach kureru (くれる) to a verb's te-form"
- ❌ "Attach くれる (kureru) to a verb's te-form"
- ✅ "Past form: 〜te kureta (〜てくれた)"
- ❌ "〜てくれた (te kureta)"

RUBY TAG RULE — wrap KANJI ONLY, never kana
- ✅ <ruby>書<rt>か</rt></ruby>く → "kaku" (kanji wrapped, kana 〜く bare)
- ✅ <ruby>食<rt>た</rt></ruby>べる → "taberu" (only the 食 wrapped)
- ✅ <ruby>命令形<rt>めいれいけい</rt></ruby> → multi-kanji compound wrapped together, full reading inside
- ❌ <ruby>食べる<rt>たべる</rt></ruby> — DO NOT wrap the kana 〜べる
- ❌ <ruby>く<rt>ku</rt></ruby> — DO NOT wrap kana with romaji
- For mixed kanji+kana words: wrap the kanji block, then write the kana okurigana bare AFTER the closing </ruby> tag.

EXAMPLES (15 bullets)
- Format: \`• romaji_form (jp_with_furigana) — 'English meaning'\`
- Mix verb groups (godan, ichidan, irregular) where applicable.
- Mix registers (casual / polite / formal) where the rule has variants.
- Cover the rule's edge cases mentioned in input.
- 3+ distinct semantic frames (don't make all examples about food / weather / school).
- Romaji uses Hepburn ('ou' or 'ō' both fine; 'shi' not 'si'; 'tsu' not 'tu').

Begin output now.`;
}

async function rewriteOne(
  rule: { id: string; name: string; jlpt_reference: string; explanation: Localizable },
  retryAttempts: number,
): Promise<string | null> {
  const explanationEn = localize(rule.explanation, "en");
  const prompt = buildPrompt({
    name: rule.name,
    jlpt_reference: rule.jlpt_reference,
    explanationEn,
  });
  const client = getClient();

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") {
        throw new Error("response missing text block");
      }
      const text = block.text.trim();

      if (!text.includes(FORMAT_MARKER)) {
        throw new Error("output missing format sentinel — likely truncated or off-format");
      }
      // Validate: at least 15 bullet lines starting with "• "
      const bulletCount = (text.match(/^•\s/gm) ?? []).length;
      if (bulletCount < 15) {
        throw new Error(`expected ≥15 bullet examples, got ${bulletCount}`);
      }
      // Validate ruby tags wrap kanji only, not kana
      // Hiragana: ぀-ゟ, Katakana: ゠-ヿ
      const badRubyTags = text.match(/<ruby>[^<]*[぀-ヿ][^<]*<rt>/g);
      if (badRubyTags) {
        throw new Error(`ruby tag wraps kana (must be kanji-only): ${badRubyTags.slice(0, 3).join(", ")}`);
      }
      // Validate <rt> contains kana, not romaji
      const romajiInRt = text.match(/<rt>[a-zA-Z]+<\/rt>/g);
      if (romajiInRt) {
        throw new Error(`<rt> contains romaji (must be kana reading): ${romajiInRt.slice(0, 3).join(", ")}`);
      }
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < retryAttempts) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1) ** 2));
      }
    }
  }
  throw lastErr;
}

async function syncJsonb() {
  const db = getDb();
  console.log("\n[sync-jsonb] propagating grammar_rules.explanation → song_versions.lesson.grammar_points");

  const rulesRes = await db.execute(sql`
    SELECT id, name, jlpt_reference, explanation
    FROM grammar_rules
    WHERE explanation->>'en' LIKE ${"%" + FORMAT_MARKER + "%"}
  `);
  const rules = (rulesRes.rows ?? rulesRes) as Array<{
    id: string; name: string; jlpt_reference: string; explanation: { en: string };
  }>;
  console.log(`[sync-jsonb] ${rules.length} rules with v2 format ready to sync`);

  const ruleIndex = new Map<string, string>();
  for (const r of rules) {
    const key = `${r.name.trim()}::${r.jlpt_reference.trim()}`;
    ruleIndex.set(key, r.explanation.en);
  }

  const versionRes = await db.execute(sql`
    SELECT sv.id, sv.lesson FROM song_versions sv
    WHERE sv.lesson IS NOT NULL AND sv.lesson->'grammar_points' IS NOT NULL
  `);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;

  let updated = 0;
  let pointsUpdated = 0;
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;
    for (const gp of lesson.grammar_points) {
      const key = `${(gp.name ?? "").trim()}::${(gp.jlpt_reference ?? "").trim()}`;
      const newEn = ruleIndex.get(key);
      if (!newEn) continue;
      gp.explanation = { en: newEn };
      mutated = true;
      pointsUpdated++;
    }
    if (mutated) {
      await db.execute(sql`
        UPDATE song_versions
        SET lesson = ${JSON.stringify(lesson)}::jsonb, updated_at = NOW()
        WHERE id = ${v.id}::uuid
      `);
      updated++;
    }
  }
  console.log(`[sync-jsonb] updated ${pointsUpdated} grammar_points across ${updated} song_versions`);
}

async function main() {
  const args = parseArgs();

  if (args.syncJsonb) {
    await syncJsonb();
    return;
  }

  const db = getDb();

  // Select rules to rewrite. Skip ones already at v2 (sentinel present)
  // unless --rule-id explicitly targets one. With --limit, prioritise rules
  // attached to the most song_versions (highest-traffic first).
  const rulesRes = args.ruleId
    ? await db.execute(sql`
        SELECT id, name, jlpt_reference, explanation
        FROM grammar_rules WHERE id = ${args.ruleId}::uuid
      `)
    : args.limit
      ? await db.execute(sql`
          SELECT gr.id, gr.name, gr.jlpt_reference, gr.explanation,
                 COUNT(svgr.song_version_id)::int AS song_count
          FROM grammar_rules gr
          LEFT JOIN song_version_grammar_rules svgr ON svgr.grammar_rule_id = gr.id
          WHERE gr.explanation->>'en' NOT LIKE ${"%" + FORMAT_MARKER + "%"}
          GROUP BY gr.id, gr.name, gr.jlpt_reference, gr.explanation
          ORDER BY song_count DESC, gr.name ASC
          LIMIT ${args.limit}
        `)
      : await db.execute(sql`
          SELECT id, name, jlpt_reference, explanation FROM grammar_rules
          WHERE explanation->>'en' NOT LIKE ${"%" + FORMAT_MARKER + "%"}
          ORDER BY name ASC
        `);
  const rules = (rulesRes.rows ?? rulesRes) as Array<{
    id: string; name: string; jlpt_reference: string; explanation: Localizable;
  }>;

  const filterDesc = args.limit ? `pilot of ${args.limit} (highest song-count first)` : "all unmigrated";
  console.log(`\n[rewrite-grammar] ${rules.length} rules selected (${filterDesc}) · concurrency=${args.concurrency}`);
  if (args.dryRun) {
    console.log(`[rewrite-grammar] sample prompt for first rule:\n`);
    if (rules.length > 0) {
      console.log(buildPrompt({
        name: rules[0].name,
        jlpt_reference: rules[0].jlpt_reference,
        explanationEn: localize(rules[0].explanation, "en"),
      }).slice(0, 1200) + "\n... (truncated)\n");
    }
    const estCost = (rules.length * 0.011).toFixed(2);
    console.log(`[rewrite-grammar] estimated cost @ Haiku 4.5: ~$${estCost}`);
    return;
  }

  const startedAt = Date.now();
  let done = 0, failed = 0;

  // Bounded concurrency
  const queue = [...rules];
  async function worker(workerId: number) {
    while (queue.length > 0) {
      const r = queue.shift()!;
      try {
        const newExplanation = await rewriteOne(r, args.retryAttempts);
        if (!newExplanation) throw new Error("null result");
        await db.execute(sql`
          UPDATE grammar_rules
          SET explanation = ${JSON.stringify({ en: newExplanation })}::jsonb,
              updated_at = NOW()
          WHERE id = ${r.id}::uuid
        `);
        done++;
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
        const total = rules.length;
        const pct = Math.round((100 * done) / total);
        if (done % 10 === 0 || done === 1 || done === total) {
          console.log(`  [${pct}% · ${done}/${total} · ${elapsed}s · w${workerId}] ${r.jlpt_reference} ${r.name}`);
        }
      } catch (err) {
        failed++;
        console.error(`  [fail w${workerId}] ${r.jlpt_reference} ${r.name} — ${(err as Error)?.message ?? "unknown"}`);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, args.concurrency) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log(`\n[rewrite-grammar] done · success=${done} failed=${failed} elapsed=${elapsed}s`);
  if (failed === 0 && !args.ruleId) {
    console.log(`[rewrite-grammar] next: run with --sync-jsonb to propagate to song_versions JSONB`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
