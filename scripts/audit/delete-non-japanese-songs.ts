import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, "..", ".."), ".env.local") });

const SLUGS = [
  // First pass — N5 non-Japanese
  "bauklotze-mika-kobayashi",
  "the-reluctant-heroes-mpi",
  "the-rumbling-sim",
  "thedogs-mpi",
  "tk-0n-ttn-mika-kobayashi",
  "trishas-lullaby-warsaw-philharmonic-orchestra-choir",
  // Second pass — N3/N4 non-Japanese (English / German)
  "wind-akeboshi",
  "call-of-silence-gemie",
  "call-your-name-gv-gemie",
  "call-your-name-mpi-casg",
  "doa-aimee-blackschleger",
  "vogel-im-kafig-cyua",
  "zero-eclipse-laco",
  "yamanaiame-mica-caldito-mpi-mika-kobayashi",
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    const { rows: songRows } = await client.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM songs WHERE slug = ANY($1)`,
      [SLUGS]
    );
    console.log(`Matched ${songRows.length}/${SLUGS.length} songs`);
    const songIds = songRows.map((r) => r.id);
    if (songIds.length === 0) {
      await client.query("ROLLBACK");
      return;
    }

    const { rows: versionRows } = await client.query<{ id: string }>(
      `SELECT id FROM song_versions WHERE song_id = ANY($1)`,
      [songIds]
    );
    const versionIds = versionRows.map((r) => r.id);
    console.log(`Found ${versionIds.length} song_versions for those songs`);

    const exLog = await client.query(
      `DELETE FROM user_exercise_log WHERE song_version_id = ANY($1)`,
      [versionIds]
    );
    console.log(`  user_exercise_log deleted: ${exLog.rowCount}`);

    const progress = await client.query(
      `DELETE FROM user_song_progress WHERE song_version_id = ANY($1)`,
      [versionIds]
    );
    console.log(`  user_song_progress deleted: ${progress.rowCount}`);

    const counters = await client.query(
      `DELETE FROM user_exercise_song_counters WHERE song_version_id = ANY($1)`,
      [versionIds]
    );
    console.log(`  user_exercise_song_counters deleted: ${counters.rowCount}`);

    // songs cascade-deletes song_versions via FK onDelete: cascade
    const songsDel = await client.query(
      `DELETE FROM songs WHERE id = ANY($1)`,
      [songIds]
    );
    console.log(`  songs deleted: ${songsDel.rowCount} (cascades to song_versions)`);

    await client.query("COMMIT");
    console.log("\nCommitted.");

    // Refresh materialized view if present (song_vocab_links).
    try {
      await client.query("REFRESH MATERIALIZED VIEW CONCURRENTLY song_vocab_links");
      console.log("Refreshed song_vocab_links materialized view.");
    } catch (e) {
      console.log(`(skipped song_vocab_links refresh: ${(e as Error).message})`);
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
