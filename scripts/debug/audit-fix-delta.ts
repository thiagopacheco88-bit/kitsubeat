/**
 * Compares legacy vs fixed buildVerseTiming output on the 30 worst offenders
 * from the full audit. Reports per-slug recovery: was-broken / now-broken / delta.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { buildVerseTiming, type SyncedLine, normalizeForMatch } from "../../src/lib/verse-timing.js";
import type { Verse } from "../../src/lib/types/lesson.js";

interface Lesson { verses: Verse[] }

function buildLegacy(verses: Verse[], synced: SyncedLine[]) {
  const result = new Map<number, { startMs: number; endMs: number }>();
  if (!synced.length || !verses.length) return result;
  let lrcIdx = 0;
  for (const verse of verses) {
    const verseText = normalizeForMatch(verse.tokens.map((t) => t.surface).join(""));
    if (!verseText) continue;
    let verseStartMs = -1, verseEndMs = -1, accumulated = "";
    const searchStart = Math.max(0, lrcIdx - 1);
    for (let i = searchStart; i < synced.length; i++) {
      const lineText = normalizeForMatch(synced[i].text);
      if (!lineText) continue;
      const test = accumulated + lineText;
      if (verseText.startsWith(test) || test.startsWith(verseText.slice(0, test.length))) {
        if (verseStartMs === -1) verseStartMs = synced[i].startMs;
        accumulated = test;
        lrcIdx = i + 1;
        if (accumulated.length >= verseText.length * 0.7) {
          verseEndMs = i + 1 < synced.length ? synced[i + 1].startMs : synced[i].startMs + 5000;
          break;
        }
      }
    }
    if (verseStartMs >= 0) {
      if (verseEndMs < 0) verseEndMs = verseStartMs + 10000;
      result.set(verse.verse_number, { startMs: verseStartMs, endMs: verseEndMs });
    }
  }
  return result;
}

const SLUGS = [
  "harmonia-rythem", "otonoke-creepy-nuts", "we-are-hiroshi-kitadani",
  "adamas-lisa", "one-last-kiss-hikaru-utada", "whats-up-people-maximum-the-hormone",
  "kisetsu-wa-tsugitsugi-shindeiku-amazarashi", "limit-break-x-survivor-kiyoshi-hikawa",
  "the-hero-jam-project", "velonica-aqua-timez", "distance-long-shot-party",
  "kick-back-kenshi-yonezu", "just-awake-fear-and-loathing-in-las-vegas",
  "mixed-nuts-official-hige-dandism", "freedom-home-made-kazoku", "shirushi-lisa",
  "bling-bang-bang-born-creepy-nuts", "jiyuu-no-daishou-linked-horizon",
  "tk-0n-ttn-mika-kobayashi", "i-will-sowelu", "mezamero-yasei-matchy-with-question",
  "saigo-no-kyojin-linked-horizon", "kura-kura-ado", "again-yui",
  "niji-no-kanata-ni-reona", "under-the-tree-sim", "i-can-hear-dish",
  "99-mob-choir", "guren-no-zahyou-linked-horizon", "change-miwa",
];

const db = getDb();
const rows = await db.select({ song: songs, ver: songVersions })
  .from(songVersions)
  .innerJoin(songs, eq(songVersions.song_id, songs.id))
  .where(inArray(songs.slug, SLUGS));

console.log("slug                                                wasDrop  nowDrop  delta  recovered_verses");
let totalWas = 0, totalNow = 0;
for (const r of rows) {
  const lesson = r.ver.lesson as Lesson;
  const synced = r.ver.synced_lrc as SyncedLine[] | null;
  if (!lesson?.verses?.length || !synced?.length) continue;
  const legacy = buildLegacy(lesson.verses, synced);
  const fixed = buildVerseTiming(lesson.verses, synced);
  const was = lesson.verses.filter((v) => !legacy.has(v.verse_number)).map((v) => v.verse_number);
  const now = lesson.verses.filter((v) => !fixed.has(v.verse_number)).map((v) => v.verse_number);
  const recovered = was.filter((n) => !now.includes(n));
  totalWas += was.length;
  totalNow += now.length;
  console.log(
    r.song.slug.padEnd(50),
    String(was.length).padStart(7),
    String(now.length).padStart(8),
    String(was.length - now.length).padStart(6),
    " ", recovered.join(",") || "—"
  );
}
console.log("---");
console.log(`totals: was=${totalWas} dropped, now=${totalNow} dropped, recovered=${totalWas - totalNow}`);
process.exit(0);
