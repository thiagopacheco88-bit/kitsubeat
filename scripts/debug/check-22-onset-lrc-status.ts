/**
 * Check which of the 22 onset-fail slugs have synced_lrc that matches their
 * verses — those would be using LRC-driven timing at runtime regardless of
 * verse.start_time_ms drift, making the spot-check finding cosmetic for them.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq, and, inArray } from "drizzle-orm";

const SLUGS = [
  "memories-maki-otsuki",
  "hacking-to-the-gate-kanako-ito",
  "vogel-im-kafig-cyua",
  "hikari-hikaru-utada",
  "chikai-hikaru-utada",
  "its-gonna-rain-bonnie-pink",
  "tobira-no-mukou-e-yellow-generation",
  "harukaze-scandal",
  "hope-namie-amuro",
  "stars-w-o-d",
  "tk-0n-ttn-mika-kobayashi",
  "the-rumbling-sim",
  "under-the-tree-sim",
  "mephisto-queen-bee",
  "brand-new-world-d-51",
  "chasing-hearts-miwa",
  "pinocchio-ore-ska-band",
  "ray-of-light-shoko-nakagawa",
  "cha-la-head-cha-la-hironobu-kageyama",
  "phoenix-burnout-syndromes",
  "kura-kura-ado",
  "just-awake-fear-and-loathing-in-las-vegas",
];

const NORMALIZE_RE = /[\s　、。！？・「」『』（）\-,.!?()"']/g;
const normalize = (s: string) => s.replace(NORMALIZE_RE, "").toLowerCase();

const db = getDb();
const rows = await db
  .select({
    slug: songs.slug,
    synced_lrc: songVersions.synced_lrc,
    lyrics_offset_ms: songVersions.lyrics_offset_ms,
    lesson: songVersions.lesson,
  })
  .from(songVersions)
  .innerJoin(songs, eq(songs.id, songVersions.song_id))
  .where(and(eq(songVersions.version_type, "full"), inArray(songs.slug, SLUGS)));

console.log(`slug,has_lrc,offset_ms,lrc_lines,verses,matched,match_pct,player_path`);
for (const r of rows) {
  const hasLrc = !!r.synced_lrc;
  const lrcLines = Array.isArray(r.synced_lrc) ? r.synced_lrc : [];
  const lesson = r.lesson as { verses?: Array<{ tokens?: Array<{ surface: string }> }> } | null;
  const verses = lesson?.verses ?? [];

  let matched = 0;
  if (hasLrc && verses.length) {
    for (const v of verses) {
      const verseText = normalize((v.tokens ?? []).map((t) => t.surface).join(""));
      if (!verseText) continue;
      const hit = lrcLines.some((line: { text?: string }) => {
        const lt = normalize(line.text ?? "");
        if (!lt) return false;
        return lt.includes(verseText) || verseText.includes(lt);
      });
      if (hit) matched++;
    }
  }
  const pct = verses.length ? Math.round((matched / verses.length) * 100) : 0;
  // Player logic: if matched.size > 0 in the runtime map, LRC drives timing.
  // verse.start_time_ms is consulted only when matched===0 (full fallback).
  const playerPath = hasLrc && matched > 0 ? "LRC" : "verse.start_time_ms";

  console.log(`${r.slug},${hasLrc},${r.lyrics_offset_ms ?? 0},${lrcLines.length},${verses.length},${matched},${pct}%,${playerPath}`);
}

process.exit(0);
