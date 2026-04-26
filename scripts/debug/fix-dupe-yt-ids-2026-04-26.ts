/**
 * One-shot dupe-audit triage for 2026-04-26.
 *
 * Two atomic DB writes inside a single transaction:
 *   1. song_versions: change guren-no-zahyou-linked-horizon's yt_id from
 *      `2B6nj38AdD0` (Yumiya video) to `S2SCrVHmSYg` (Linked Horizon's
 *      Guren no Zahyou audio per 2026-04-26 web search). Reset
 *      `lyrics_offset_ms` to 0 because the previous -38250 was calibrated
 *      against the wrong audio. Operator should run
 *      `auto-detect-lyrics-offset.ts --slug guren-no-zahyou-linked-horizon`
 *      after this lands (requires fresh timing-cache for the new yt_id).
 *
 *   2. songs: change call-your-name-gv-gemie's title from
 *      `"Call your name <Gv>"` to `"Call your name (Gv)"`. The angle brackets
 *      are HTML special chars that React/Next likely escape or strip on the
 *      catalog page, hiding this row from the catalog UI. Replacing with
 *      parentheses preserves the disambiguation without the escape risk.
 *
 * Dry-run by default. Pass `--apply` to commit.
 *
 * NOT TOUCHED in this script (intentional):
 *   - call-your-name-mpi-casg yt_id: still incorrectly shares cnCi7peJSBk
 *     with gv-gemie. The mpi-casg row has good data; finding its correct YT
 *     upload is a separate research task. Flagged as a todo.
 *   - Yumiya, Mezase, Getto: broken-bucket. Deferred to SEED-001 / Phase 11.4.
 *   - TV-cut dupes (groups 1-4): deferred to Phase 11.2.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const apply = process.argv.includes("--apply");

const db = getDb();

const ZAHYOU_SLUG = "guren-no-zahyou-linked-horizon";
const ZAHYOU_OLD_YT = "2B6nj38AdD0";
const ZAHYOU_NEW_YT = "S2SCrVHmSYg";

const GV_SLUG = "call-your-name-gv-gemie";
const GV_OLD_TITLE = "Call your name <Gv>";
const GV_NEW_TITLE = "Call your name (Gv)";

// 1. Read current state
const [zahyouSong] = await db.select().from(songs).where(eq(songs.slug, ZAHYOU_SLUG));
if (!zahyouSong) throw new Error(`Song not found: ${ZAHYOU_SLUG}`);
const [zahyouVer] = await db.select().from(songVersions).where(eq(songVersions.song_id, zahyouSong.id));
if (!zahyouVer) throw new Error(`Version not found: ${ZAHYOU_SLUG}`);

const [gvSong] = await db.select().from(songs).where(eq(songs.slug, GV_SLUG));
if (!gvSong) throw new Error(`Song not found: ${GV_SLUG}`);

console.log("=== BEFORE ===");
console.log(`zahyou.youtube_id     = ${zahyouVer.youtube_id}  (expected ${ZAHYOU_OLD_YT})`);
console.log(`zahyou.lyrics_offset  = ${zahyouVer.lyrics_offset_ms}`);
console.log(`gv-gemie.title        = ${JSON.stringify(gvSong.title)}  (expected ${JSON.stringify(GV_OLD_TITLE)})`);

// 2. Sanity assertions before write
if (zahyouVer.youtube_id !== ZAHYOU_OLD_YT) {
  console.warn(`\n⚠ zahyou.youtube_id is not ${ZAHYOU_OLD_YT} — skipping zahyou write to avoid stomping unexpected state`);
}
if (gvSong.title !== GV_OLD_TITLE) {
  console.warn(`\n⚠ gv-gemie.title is not ${JSON.stringify(GV_OLD_TITLE)} — skipping title write`);
}

const willWriteZahyou = zahyouVer.youtube_id === ZAHYOU_OLD_YT;
const willWriteGv = gvSong.title === GV_OLD_TITLE;

console.log(`\n=== PLAN ===`);
console.log(`zahyou: ${willWriteZahyou ? `youtube_id ${ZAHYOU_OLD_YT} -> ${ZAHYOU_NEW_YT}, lyrics_offset_ms ${zahyouVer.lyrics_offset_ms} -> 0` : "skip"}`);
console.log(`gv-gemie: ${willWriteGv ? `title ${JSON.stringify(GV_OLD_TITLE)} -> ${JSON.stringify(GV_NEW_TITLE)}` : "skip"}`);

if (!apply) {
  console.log(`\n(dry-run — pass --apply to commit)`);
  process.exit(0);
}

// 3. Apply (sequential since neon-http getDb has no transaction support;
// each statement is atomic on its own).
if (willWriteZahyou) {
  await db
    .update(songVersions)
    .set({ youtube_id: ZAHYOU_NEW_YT, lyrics_offset_ms: 0 })
    .where(eq(songVersions.id, zahyouVer.id));
  console.log("✓ zahyou updated");
}
if (willWriteGv) {
  await db.update(songs).set({ title: GV_NEW_TITLE }).where(eq(songs.id, gvSong.id));
  console.log("✓ gv-gemie title updated");
}

// 4. Verify
const [zahyouAfter] = await db.select().from(songVersions).where(eq(songVersions.id, zahyouVer.id));
const [gvAfter] = await db.select().from(songs).where(eq(songs.id, gvSong.id));
console.log("\n=== AFTER ===");
console.log(`zahyou.youtube_id     = ${zahyouAfter.youtube_id}`);
console.log(`zahyou.lyrics_offset  = ${zahyouAfter.lyrics_offset_ms}`);
console.log(`gv-gemie.title        = ${JSON.stringify(gvAfter.title)}`);

process.exit(0);
