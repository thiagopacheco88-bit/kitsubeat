/**
 * audit-yt-ids.ts — Cross-song youtube_id uniqueness audit. Flags any
 * youtube_id used by 2+ different slugs (same youtube_id on full+tv of the
 * SAME slug is allowed — single video can serve OP/ED). Writes
 * data/yt-id-audit.csv on every run; exits 1 + stderr summary on any
 * duplicate group, exits 0 + stdout "OK: N rows checked, 0 duplicates"
 * on clean run.
 *
 * Usage:
 *   npx tsx scripts/seed/audit-yt-ids.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { resolve } from "path";
import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq, isNotNull } from "drizzle-orm";

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      youtube_id: songVersions.youtube_id,
      slug: songs.slug,
      version_type: songVersions.version_type,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(isNotNull(songVersions.youtube_id));

  // Group by youtube_id; only flag groups whose distinct slugs > 1
  const byYtId = new Map<string, { slugs: Set<string>; versionTypes: string[] }>();
  for (const r of rows) {
    if (!r.youtube_id) continue;
    const g = byYtId.get(r.youtube_id) ?? { slugs: new Set(), versionTypes: [] };
    g.slugs.add(r.slug);
    g.versionTypes.push(`${r.slug}:${r.version_type}`);
    byYtId.set(r.youtube_id, g);
  }
  const dupes = [...byYtId.entries()]
    .filter(([, g]) => g.slugs.size > 1) // CROSS-SLUG ONLY (D-01)
    .map(([youtube_id, g]) => ({
      youtube_id,
      count: g.slugs.size,
      slugs: [...g.slugs].sort(),
      version_types: g.versionTypes.sort(),
    }));

  // Write CSV (header + pipe-separated multi-value cells per D-02)
  const csvLines: string[] = ["youtube_id,count,slugs,version_types"];
  for (const d of dupes) {
    csvLines.push(
      [
        d.youtube_id,
        String(d.count),
        d.slugs.join("|"),
        d.version_types.join("|"),
      ].join(","),
    );
  }
  writeFileSync(resolve(process.cwd(), "data/yt-id-audit.csv"), csvLines.join("\n"), "utf-8");

  if (dupes.length > 0) {
    console.error(`[audit-yt-ids] FAIL: ${dupes.length} duplicate youtube_id group(s)`);
    for (const d of dupes) {
      console.error(`  ${d.youtube_id} → ${d.slugs.join(", ")} (${d.count} slugs)`);
    }
    console.error(`See data/yt-id-audit.csv`);
    process.exit(1);
  }
  console.log(`OK: ${rows.length} rows checked, 0 duplicates`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
