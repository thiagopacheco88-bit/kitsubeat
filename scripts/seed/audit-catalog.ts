/**
 * audit-catalog.ts — joins manifest + DB + lyrics/lessons cache + validation
 * report to produce a per-song status table.
 *
 * Columns: slug, title, anime, tv_version, full_version, lyrics_verified,
 * lesson_generated.
 *
 * Output: Markdown table to data/catalog-audit.md + CSV to
 * data/catalog-audit.csv. Stdout summary with the counters only.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

interface ManifestEntry {
  slug: string;
  title?: string;
  anime?: string;
  song_title?: string;
  anime_title?: string;
}

async function main() {
  const root = resolve(process.cwd());
  const manifestPath = resolve(root, "data/songs-manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("data/songs-manifest.json missing");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
  const manifestRows: ManifestEntry[] = Array.isArray(manifest)
    ? (manifest as ManifestEntry[])
    : Array.isArray((manifest as { songs?: ManifestEntry[] }).songs)
      ? (manifest as { songs: ManifestEntry[] }).songs
      : [];

  if (manifestRows.length === 0) {
    console.error("manifest shape unrecognized — expected array or { songs: [] }");
    process.exit(1);
  }

  // Validation report — map slug → true when present in rows[]
  const validatedSlugs = new Set<string>();
  const validationReportPath = resolve(root, "data/lyrics-validation-report.json");
  if (existsSync(validationReportPath)) {
    const rep = JSON.parse(readFileSync(validationReportPath, "utf8")) as {
      rows?: Array<{ slug: string }>;
    };
    for (const r of rep.rows ?? []) validatedSlugs.add(r.slug);
  }

  // DB: load all song_versions joined to songs
  const db = getDb();
  const dbRows = await db
    .select({
      slug: songs.slug,
      title: songs.title,
      anime: songs.anime,
      version_type: songVersions.version_type,
      has_lesson: songVersions.lesson,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id));

  interface VersionState {
    tv: boolean;
    full: boolean;
    tvLesson: boolean;
    fullLesson: boolean;
    title: string;
    anime: string;
  }
  const dbBySlug = new Map<string, VersionState>();
  for (const r of dbRows) {
    const s = dbBySlug.get(r.slug) ?? {
      tv: false,
      full: false,
      tvLesson: false,
      fullLesson: false,
      title: r.title,
      anime: r.anime,
    };
    if (r.version_type === "tv") {
      s.tv = true;
      s.tvLesson = r.has_lesson !== null;
    } else if (r.version_type === "full") {
      s.full = true;
      s.fullLesson = r.has_lesson !== null;
    }
    dbBySlug.set(r.slug, s);
  }

  // Build canonical row list keyed on manifest slugs; fold in DB-only rows
  // (songs in DB that aren't in the manifest) so nothing is hidden.
  interface AuditRow {
    slug: string;
    title: string;
    anime: string;
    tvAvailable: boolean;
    fullAvailable: boolean;
    lyricsInCache: boolean;
    lyricsVerified: boolean;
    lessonGenerated: boolean;
  }
  const rows: AuditRow[] = [];
  const seen = new Set<string>();

  function lyricsExists(slug: string): boolean {
    return existsSync(resolve(root, `data/lyrics-cache/${slug}.json`));
  }

  for (const m of manifestRows) {
    const slug = m.slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const db = dbBySlug.get(slug);
    rows.push({
      slug,
      title: db?.title ?? m.title ?? m.song_title ?? "",
      anime: db?.anime ?? m.anime ?? m.anime_title ?? "",
      tvAvailable: db?.tv ?? false,
      fullAvailable: db?.full ?? false,
      lyricsInCache: lyricsExists(slug),
      lyricsVerified: validatedSlugs.has(slug),
      lessonGenerated: (db?.tvLesson ?? false) || (db?.fullLesson ?? false),
    });
  }
  // Fold in any DB rows not represented in the manifest.
  for (const [slug, db] of dbBySlug) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    rows.push({
      slug,
      title: db.title,
      anime: db.anime,
      tvAvailable: db.tv,
      fullAvailable: db.full,
      lyricsInCache: lyricsExists(slug),
      lyricsVerified: validatedSlugs.has(slug),
      lessonGenerated: db.tvLesson || db.fullLesson,
    });
  }

  rows.sort((a, b) => a.slug.localeCompare(b.slug));

  // Write CSV
  const csvLines: string[] = [
    ["slug", "title", "anime", "tv", "full", "lyrics_verified", "lesson"]
      .join(","),
  ];
  for (const r of rows) {
    csvLines.push(
      [
        r.slug,
        JSON.stringify(r.title),
        JSON.stringify(r.anime),
        r.tvAvailable ? "Y" : "N",
        r.fullAvailable ? "Y" : "N",
        r.lyricsVerified ? "Y" : "N",
        r.lessonGenerated ? "Y" : "N",
      ].join(",")
    );
  }
  writeFileSync(resolve(root, "data/catalog-audit.csv"), csvLines.join("\n"));

  // Write Markdown
  const mdLines: string[] = [
    "| # | Song | Anime | TV | Full | Lyrics verified | Lesson |",
    "|---|---|---|:---:|:---:|:---:|:---:|",
  ];
  rows.forEach((r, i) => {
    const esc = (s: string) => s.replace(/\|/g, "\\|");
    mdLines.push(
      `| ${i + 1} | ${esc(r.title || r.slug)} | ${esc(r.anime || "")} | ${r.tvAvailable ? "Y" : "N"} | ${r.fullAvailable ? "Y" : "N"} | ${r.lyricsVerified ? "Y" : "N"} | ${r.lessonGenerated ? "Y" : "N"} |`
    );
  });
  const counters = {
    total: rows.length,
    tv: rows.filter((r) => r.tvAvailable).length,
    full: rows.filter((r) => r.fullAvailable).length,
    lyricsVerified: rows.filter((r) => r.lyricsVerified).length,
    lessonGenerated: rows.filter((r) => r.lessonGenerated).length,
    lyricsInCache: rows.filter((r) => r.lyricsInCache).length,
  };
  mdLines.push(
    `| **TOTAL** | **${counters.total}** |  | **${counters.tv}** | **${counters.full}** | **${counters.lyricsVerified}** | **${counters.lessonGenerated}** |`
  );
  writeFileSync(resolve(root, "data/catalog-audit.md"), mdLines.join("\n"));

  console.log(`wrote data/catalog-audit.md and data/catalog-audit.csv`);
  console.log(`total songs:             ${counters.total}`);
  console.log(`with lyrics in cache:    ${counters.lyricsInCache}`);
  console.log(`TV version available:    ${counters.tv}`);
  console.log(`Full version available:  ${counters.full}`);
  console.log(`lyrics verified (step4): ${counters.lyricsVerified}`);
  console.log(`lesson generated:        ${counters.lessonGenerated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
