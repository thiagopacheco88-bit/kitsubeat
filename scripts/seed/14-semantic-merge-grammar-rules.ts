/**
 * 14-semantic-merge-grammar-rules.ts — second dedup pass with hand-curated
 * merge groups for cases the regex normalization (script 13) couldn't catch.
 *
 * Example: the progressive ている family was split across ている, てる, てん
 * because the JP prefixes differ. Same meaning, same drill target — collapse
 * them here.
 *
 * Each group lists equivalent rule NAMES (as stored in grammar_rules.name).
 * First entry is the canonical — all others are merged into it via the same
 * link-rewrite + row-delete path as script 13.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/14-semantic-merge-grammar-rules.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/14-semantic-merge-grammar-rules.ts --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import {
  grammarRules,
  songVersionGrammarRules,
} from "../../src/lib/db/schema.js";
import { eq, inArray, sql } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

interface MergeGroup {
  /** First entry = canonical. All others are merged into it. */
  names: string[];
  reason: string;
}

const GROUPS: MergeGroup[] = [
  {
    reason: "ている / てる / てん — progressive contractions of ている",
    names: [
      "〜ている / 〜てる (te iru / teru) — progressive / state",
      "〜てる (teru: progressive contraction)",
      "〜てん (casual contraction of ている)",
      "〜ていく / 〜てる (contracted continuous/progressive)",
      "〜ている (ongoing state / progressive)",
    ],
  },
  {
    reason: "ていく / てゆく — same form, spelling variants",
    names: [
      "〜ていく (te iku: keep doing; gradually)",
      "〜ていく / 〜てゆく (te-iku: going on)",
      "〜てゆく (te-yuku: literary progressive)",
      "〜てゆく / 〜ていく (gradual progression)",
      "〜てく (contracting ていく — moving away/continuing)",
      "〜て行く (te-iku directional)",
    ],
  },
  {
    reason: "けど / けれど — same concept, casual vs formal",
    names: [
      "〜けれど (although; but)",
      "〜けれど / 〜けど (keredo / kedo) — but / although",
      "〜けど (but; although)",
    ],
  },
  {
    reason: "なら / ならば / のなら / のならば — all conditional",
    names: [
      "〜なら (nara conditional)",
      "〜ならば (naraba: if)",
      "〜のなら (no nara: if it's the case that)",
      "〜のならば (if)",
    ],
  },
  {
    reason: "Passive forms — all 〜れる/〜られる",
    names: [
      "〜られる (passive voice)",
      "受身形 (ukemi-kei) — passive form 〜れる/〜られる",
      "〜れる/〜られる (passive voice)",
    ],
  },
  {
    reason: "Volitional / 意向形 — all the same form",
    names: [
      "〜おう / 〜よう (volitional — let's)",
      "〜よう (you: volitional / let's)",
      "意向形 (volitional)",
      "意志形 〜よう (volitional)",
      "意志形 + よ (volitional + yo: let's)",
    ],
  },
  {
    reason: "Imperative — 命令形 covers 〜ろ",
    names: [
      "命令形 (meireikei - imperative)",
      "命令形 〜ろ (ro) — imperative for ru-verbs",
    ],
  },
  {
    reason: "みたい — conjectural seems-like",
    names: [
      "〜みたい (it seems like)",
      "〜みたいだ (it seems like; it's like)",
      "〜みたいに (like; similar to)",
    ],
  },
  {
    reason: "たり family — all the same listing pattern",
    names: [
      "〜たり〜たり (tari tari: doing things like)",
      "〜たり partial listing",
      "〜たり〜たりする (tari - actions like)",
      "〜たりする (tari suru) — sometimes / among other things",
    ],
  },
  {
    reason: "きる / 切る — kana vs kanji spelling",
    names: [
      "〜きる (completely)",
      "〜切る (kiru) — to do completely / to the limit",
    ],
  },
  {
    reason: "だす / 出す — kana vs kanji; て-form too",
    names: [
      "〜だす (sudden start)",
      "〜だして (start doing)",
      "〜出す (to start doing; to burst out)",
    ],
  },
  {
    reason: "ちゃう / じゃう — casual てしまう",
    names: [
      "〜ちゃう / 〜じゃう (casual てしまう)",
      "〜じまう (jimau: end up doing)",
      "〜ちゃう (chau: end up doing)",
    ],
  },
  {
    reason: "あう / 合う — kana vs kanji mutual action",
    names: [
      "〜合う (au: mutual action)",
      "〜あう (mutual / reciprocal action)",
    ],
  },
  {
    reason: "さえ / すら — emphatic 'even', interchangeable",
    names: [
      "〜さえ (sae) — even (emphasis)",
      "〜さえ / 〜すら (sae / sura: even)",
      "〜すら (sura) — even (emphatic)",
      "〜でさえ (even)",
    ],
  },
  {
    reason: "まま — as-it-is",
    names: [
      "〜まま (mama: as it is; unchanged)",
      "このまま (kono mama) — as things are",
      "〜のまま (no mama: as one is)",
    ],
  },
  {
    reason: "なきゃ / なくちゃ — casual 'must'",
    names: [
      "〜なきゃ (nakya: gotta; must)",
      "〜なくちゃ (nakucha: must; have to)",
    ],
  },
  {
    reason: "ようだ / ような / のよう — conjectural 'seems like'",
    names: [
      "〜ようだ (you da) — it seems like / appears to be",
      "〜ような (you na) — like / as if",
      "〜のよう (like)",
      "〜のようで (no you de) — it seems like / is like",
    ],
  },
  {
    reason: "のように / まるで〜のように — similarity",
    names: [
      "〜のように (no you ni: like; as if)",
      "〜まるで...のように (marude... no you ni: just like)",
      "まるで〜みたいに (just like; as if)",
    ],
  },
  {
    reason: "かける / かけた / かけて — 'about to'",
    names: [
      "〜かける (kakeru - about to; on the verge of)",
      "〜かけた (kaketa) — on the verge of / half-done",
      "〜かけて (on the verge of)",
    ],
  },
  {
    reason: "ず(に) / ずに — same form",
    names: [
      "〜ず(に) (without doing)",
      "〜ずに (without doing)",
    ],
  },
  {
    reason: "という / と言う — kana vs kanji quotation",
    names: [
      "〜という (to iu) — called / that says / the fact that",
      "〜と言う (quoting with to)",
    ],
  },
  {
    reason: "くらい / ぐらい — same particle, voiced variant",
    names: [
      "〜くらい / ぐらい (to the extent)",
      "〜くらい (kurai - to the extent)",
    ],
  },
  {
    reason: "くらいなら / ぐらいなら — rather than",
    names: [
      "〜ぐらいなら (gurai nara - rather than)",
      "〜くらいなら (kurai nara: rather than)",
    ],
  },
  {
    reason: "たら / なら — conditional general",
    names: [
      "〜たら/なら (conditional)",
      "〜たら (tara: if; when)",
    ],
  },
  {
    reason: "たらいい / たらいいのに — wish",
    names: [
      "〜たらいい (tara ii: it would be nice if; should)",
      "〜たらいいのに (tara ii noni - if only)",
    ],
  },
  {
    reason: "てくれる / てくれ — do for me",
    names: [
      "〜てくれる (doing for me/us)",
      "〜てくれ (te-kure request)",
    ],
  },
  {
    reason: "たって / としても / たとしても — even if variants",
    names: [
      "〜たって (tatte: even if)",
      "〜たとしても (ta to shitemo: even if)",
      "〜としても (to shite mo) — even if",
    ],
  },
  {
    reason: "たとえ〜でも / たとえ〜ても — even if",
    names: [
      "〜たとえ〜でも (tatoe ~ demo: even if)",
      "たとえ〜ても (even if)",
    ],
  },
  {
    reason: "ことない / ことは...ない — absence",
    names: [
      "〜ことない (koto nai) — absence of experience or action",
      "〜ことは...ない (never/won't)",
    ],
  },
  {
    reason: "けして / 二度と — absolute never",
    names: [
      "けして〜ない (never)",
      "二度と〜ない (nidoto~nai: never again)",
    ],
  },
  {
    reason: "わけがない — impossibility",
    names: [
      "〜わけがない (wake ga nai) — there's no way / impossible",
      "〜はずのない (hazu no nai) — should not have / impossible that",
    ],
  },
  {
    reason: "たび / たびに — every time",
    names: [
      "〜たびに (tabi ni) — each time / every time",
      "〜たび (tabi) — every time",
    ],
  },
];

async function main() {
  const db = getDb();
  const all = await db.select().from(grammarRules);
  const byName = new Map<string, typeof all[number]>();
  for (const r of all) byName.set(r.name, r);

  interface Resolution {
    canonicalId: string;
    canonicalName: string;
    dupIds: string[];
    missing: string[];
    reason: string;
  }
  const resolutions: Resolution[] = [];

  for (const group of GROUPS) {
    const [canonicalName, ...rest] = group.names;
    const canonical = byName.get(canonicalName);
    if (!canonical) {
      resolutions.push({
        canonicalId: "",
        canonicalName,
        dupIds: [],
        missing: [canonicalName],
        reason: group.reason,
      });
      continue;
    }
    const dupIds: string[] = [];
    const missing: string[] = [];
    for (const name of rest) {
      const r = byName.get(name);
      if (!r) {
        missing.push(name);
        continue;
      }
      if (r.id === canonical.id) continue;
      dupIds.push(r.id);
    }
    resolutions.push({
      canonicalId: canonical.id,
      canonicalName,
      dupIds,
      missing,
      reason: group.reason,
    });
  }

  let totalDupes = 0;
  let totalMissing = 0;
  console.log("-- merge plan --");
  for (const r of resolutions) {
    const marker = r.canonicalId ? " " : "!";
    console.log(
      `${marker} [${r.dupIds.length} → 1]  ${r.canonicalName}   ` +
        (r.missing.length ? `(missing: ${r.missing.length})` : "")
    );
    totalDupes += r.dupIds.length;
    totalMissing += r.missing.length;
  }
  console.log(
    `\nrule rows to delete: ${totalDupes}\nnames not found in DB: ${totalMissing}`
  );

  if (!APPLY) {
    console.log("(dry-run — pass --apply to execute)");
    return;
  }

  let remappings = 0;
  for (const r of resolutions) {
    if (!r.canonicalId || r.dupIds.length === 0) continue;
    for (const dupId of r.dupIds) {
      // Remove (song_version, canonical) conflicts before re-pointing.
      await db.execute(sql`
        DELETE FROM song_version_grammar_rules a
        USING song_version_grammar_rules b
        WHERE a.grammar_rule_id = ${dupId}::uuid
          AND b.grammar_rule_id = ${r.canonicalId}::uuid
          AND a.song_version_id = b.song_version_id
          AND a.id <> b.id
      `);
      await db
        .update(songVersionGrammarRules)
        .set({ grammar_rule_id: r.canonicalId })
        .where(eq(songVersionGrammarRules.grammar_rule_id, dupId));
      await db.delete(grammarRules).where(eq(grammarRules.id, dupId));
      remappings++;
    }
  }

  const [after] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(grammarRules);
  console.log(`applied ${remappings} remappings. grammar_rules now: ${after?.n}`);

  // Silence unused
  void inArray;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
