/**
 * dump-grammar-rules.ts — list grammar rules for one or all songs so I can
 * author exercise JSON inline. Prints to stdout as pretty JSON.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/dump-grammar-rules.ts --slug vivid-vice
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/dump-grammar-rules.ts --all
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import {
  grammarRules,
  songs,
  songVersions,
  songVersionGrammarRules,
} from "../../src/lib/db/schema.js";
import { eq, inArray } from "drizzle-orm";

async function main() {
  const args = process.argv.slice(2);
  const slugIdx = args.indexOf("--slug");
  const slug = slugIdx >= 0 ? args[slugIdx + 1] : null;
  const all = args.includes("--all");

  if (!slug && !all) {
    console.error("provide --slug <slug> or --all");
    process.exit(1);
  }

  const db = getDb();

  let ruleIds: string[] = [];
  if (slug) {
    const [song] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.slug, slug))
      .limit(1);
    if (!song) {
      console.error(`song '${slug}' not found`);
      process.exit(1);
    }
    const versions = await db
      .select({ id: songVersions.id })
      .from(songVersions)
      .where(eq(songVersions.song_id, song.id));
    if (versions.length === 0) {
      console.error(`song '${slug}' has no versions`);
      process.exit(1);
    }
    const versionIds = versions.map((v) => v.id);
    const links = await db
      .select({ rid: songVersionGrammarRules.grammar_rule_id })
      .from(songVersionGrammarRules)
      .where(inArray(songVersionGrammarRules.song_version_id, versionIds));
    ruleIds = Array.from(new Set(links.map((l) => l.rid)));
  }

  const query = db.select().from(grammarRules);
  const rules = all
    ? await query
    : ruleIds.length
      ? await query.where(inArray(grammarRules.id, ruleIds))
      : [];

  process.stdout.write(JSON.stringify(rules, null, 2));
  process.stdout.write("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
