/**
 * find-youtube-replacements.ts — Discover replacement YouTube IDs for
 * geo-restricted songs, preferring Crunchyroll Collection uploads.
 *
 * What it does (per input slug):
 *   1. Look up the song's current youtube_id + tier from data/geo-audit-report.csv.
 *   2. Search YouTube with 3 query strategies (in order):
 *        a. "{title} {artist} Crunchyroll"
 *        b. "{title} {artist} {anime} Crunchyroll"
 *        c. "{title} {artist} official"
 *      Collect up to 5 candidate video IDs per query.
 *   3. For each unique candidate, fetch metadata (snippet.channelTitle,
 *      status.embeddable, contentDetails.regionRestriction). Rank:
 *        +30 if channel title contains "Crunchyroll"
 *        +10 if channel title contains "Aniplex" / "Toei" / "Sony Music Japan"
 *        +5  if title contains anime name
 *        -100 if !embeddable
 *        -50 if regionRestriction.blocked or allowed excludes target markets
 *   4. Pick the highest-scoring candidate whose tier != "restricted" AND
 *      differs from the current youtube_id.
 *   5. Emit CSV to data/crunchyroll-replacements.csv with one row per input slug.
 *
 * No DB writes. No audio downloads. No WhisperX. This script produces a
 * candidate list that the user reviews before kicking off re-ingestion
 * (which requires re-running WhisperX per approved swap).
 *
 * Usage:
 *   npx tsx scripts/seed/find-youtube-replacements.ts                 # run for every restricted song
 *   npx tsx scripts/seed/find-youtube-replacements.ts --tier=americas # include americas-tier too
 *   npx tsx scripts/seed/find-youtube-replacements.ts --limit=5       # cap for quota safety
 *   npx tsx scripts/seed/find-youtube-replacements.ts --slug=foo-bar  # single slug
 *
 * Quota: ~3 search calls × 100 units + ~1 videos.list (effectively free for
 * up to 50 IDs) per slug ≈ 300 units per slug. 21 restricted = ~6,300 units
 * (63% of daily 10k quota).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const GEO_CSV = join(ROOT, "data/geo-audit-report.csv");
const OUT_CSV = join(ROOT, "data/crunchyroll-replacements.csv");

const API_BASE = "https://www.googleapis.com/youtube/v3";
const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("Missing YOUTUBE_API_KEY in .env.local");
  process.exit(1);
}

// Target markets: match AMERICAS_REGIONS in the existing geo-check pipeline.
const TARGET_REGIONS = ["US", "BR", "MX", "AR", "CL", "CO"];

interface AuditRow {
  slug: string;
  title: string;
  artist: string;
  version_type: "tv" | "full";
  youtube_id: string;
  tier: "global" | "americas" | "restricted";
  blocked: string;
  allowed: string;
  embeddable: string;
}

interface VideoMeta {
  id: string;
  channelTitle: string;
  title: string;
  embeddable: boolean;
  blocked: string[];
  allowed: string[];
}

function parseCSV(text: string): AuditRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    // Naive splitter: the audit CSV has no embedded quoted commas in its data.
    const cells = splitCsvLine(line);
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = cells[i] ?? ""));
    return o as unknown as AuditRow;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function csvEscape(v: unknown): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n"))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------------------------------------------------------------------------

async function searchIds(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    q: query,
    type: "video",
    maxResults: "5",
    key: API_KEY!,
    part: "id",
    regionCode: "JP",
  });
  const url = `${API_BASE}/search?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    items?: { id: { kind: string; videoId?: string } }[];
    error?: { code: number; message: string; errors: { reason: string }[] };
  };
  if (data.error) {
    if (data.error.errors.some((e) => e.reason === "quotaExceeded")) {
      throw new Error("YouTube quota exceeded");
    }
    console.warn(`[search] error for "${query}": ${data.error.message}`);
    return [];
  }
  return (data.items ?? [])
    .filter((it) => it.id.kind === "youtube#video" && it.id.videoId)
    .map((it) => it.id.videoId!);
}

async function fetchMetas(ids: string[]): Promise<Map<string, VideoMeta>> {
  const out = new Map<string, VideoMeta>();
  if (!ids.length) return out;
  const unique = [...new Set(ids)];
  // videos.list accepts up to 50 IDs per call; our inputs are smaller.
  const params = new URLSearchParams({
    id: unique.join(","),
    part: "snippet,status,contentDetails",
    key: API_KEY!,
  });
  const res = await fetch(`${API_BASE}/videos?${params}`);
  const data = (await res.json()) as {
    items?: {
      id: string;
      snippet: { channelTitle: string; title: string };
      status: { embeddable: boolean; privacyStatus: string };
      contentDetails: { regionRestriction?: { blocked?: string[]; allowed?: string[] } };
    }[];
  };
  for (const item of data.items ?? []) {
    out.set(item.id, {
      id: item.id,
      channelTitle: item.snippet.channelTitle,
      title: item.snippet.title,
      embeddable: item.status.embeddable,
      blocked: item.contentDetails.regionRestriction?.blocked ?? [],
      allowed: item.contentDetails.regionRestriction?.allowed ?? [],
    });
  }
  return out;
}

function tierOf(meta: VideoMeta): "global" | "americas" | "restricted" {
  if (!meta.embeddable) return "restricted";
  if (meta.blocked.length === 0 && meta.allowed.length === 0) return "global";
  if (meta.allowed.length > 0) {
    const inAll = TARGET_REGIONS.every((r) => meta.allowed.includes(r));
    return inAll ? "americas" : "restricted";
  }
  // blocked list
  const blocksAnyTarget = TARGET_REGIONS.some((r) => meta.blocked.includes(r));
  return blocksAnyTarget ? "restricted" : "americas";
}

function scoreCandidate(
  meta: VideoMeta,
  tier: "global" | "americas" | "restricted",
  animeHint: string | null
): number {
  let score = 0;
  const ch = meta.channelTitle.toLowerCase();
  if (ch.includes("crunchyroll")) score += 30;
  if (ch.includes("aniplex")) score += 10;
  if (ch.includes("toei animation")) score += 10;
  if (ch.includes("sony music")) score += 8;
  if (ch.includes(" - topic")) score += 6; // auto-generated artist channels
  if (meta.title.toLowerCase().includes("official")) score += 2;
  if (animeHint) {
    const t = meta.title.toLowerCase();
    const parts = animeHint
      .toLowerCase()
      .split(/[\s:\-]+/)
      .filter((p) => p.length >= 3);
    if (parts.some((p) => t.includes(p))) score += 5;
  }
  if (!meta.embeddable) score -= 100;
  if (tier === "restricted") score -= 50;
  if (tier === "global") score += 10;
  return score;
}

// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith("--tier="))?.split("=")[1];
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

  const rows = parseCSV(readFileSync(GEO_CSV, "utf-8"));
  // Deduplicate by (slug, version_type) — the CSV has one row per version.
  const targets = rows.filter((r) => {
    if (slugArg) return r.slug === slugArg;
    if (tierArg === "americas") return r.tier === "americas" || r.tier === "restricted";
    return r.tier === "restricted";
  });
  const limit = limitArg ? parseInt(limitArg, 10) : targets.length;

  // Pick one version per slug, preferring 'full'
  const uniqBySlug = new Map<string, AuditRow>();
  for (const r of targets) {
    const existing = uniqBySlug.get(r.slug);
    if (!existing || (existing.version_type !== "full" && r.version_type === "full")) {
      uniqBySlug.set(r.slug, r);
    }
  }
  const queue = [...uniqBySlug.values()].slice(0, limit);

  console.log(`=== find-youtube-replacements ===`);
  console.log(`Target tier: ${tierArg ?? "restricted"} | Target slugs: ${queue.length}`);
  console.log(`Estimated quota: ${queue.length * 300} units (of 10,000/day)\n`);

  // Load anime hint from manifest
  const manifest = JSON.parse(
    readFileSync(join(ROOT, "data/songs-manifest.json"), "utf-8")
  ) as { slug: string; anime?: string }[];
  const animeBySlug = new Map(manifest.map((s) => [s.slug, s.anime ?? null]));

  const outRows: Record<string, string>[] = [];
  let processed = 0;
  let replacementsFound = 0;

  for (const row of queue) {
    processed++;
    const animeHint = animeBySlug.get(row.slug) ?? null;
    const queries = [
      `${row.title} ${row.artist} Crunchyroll`,
      animeHint ? `${row.title} ${animeHint} Crunchyroll` : null,
      `${row.title} ${row.artist} official`,
    ].filter(Boolean) as string[];

    const ids = new Set<string>();
    try {
      for (const q of queries) {
        const found = await searchIds(q);
        for (const id of found) ids.add(id);
      }
    } catch (err) {
      console.error(`[quota] ${(err as Error).message} — stopping at ${processed}/${queue.length}`);
      break;
    }
    ids.delete(row.youtube_id); // don't consider the current video

    const metas = await fetchMetas([...ids]);

    let best: { meta: VideoMeta; tier: string; score: number } | null = null;
    for (const meta of metas.values()) {
      const tier = tierOf(meta);
      const score = scoreCandidate(meta, tier, animeHint);
      if (!best || score > best.score) best = { meta, tier, score };
    }

    const better =
      best &&
      best.meta.id !== row.youtube_id &&
      best.tier !== "restricted" &&
      // Require strict improvement: globally replace restricted; americas OK only if current is restricted
      (row.tier === "restricted" || best.tier === "global");

    if (better) replacementsFound++;

    console.log(
      `  [${processed}/${queue.length}] ${row.slug} (${row.tier}) ` +
        (better
          ? `→ ${best!.meta.id} [${best!.tier}] "${best!.meta.channelTitle}" (score=${best!.score})`
          : best
            ? `no better candidate (best: ${best.tier}, score=${best.score})`
            : `no candidates`)
    );

    outRows.push({
      slug: row.slug,
      title: row.title,
      artist: row.artist,
      current_youtube_id: row.youtube_id,
      current_tier: row.tier,
      current_version: row.version_type,
      candidate_id: better ? best!.meta.id : "",
      candidate_tier: better ? best!.tier : "",
      candidate_channel: better ? best!.meta.channelTitle : "",
      candidate_title: better ? best!.meta.title : "",
      candidate_score: better ? String(best!.score) : "",
      notes: better
        ? best!.meta.channelTitle.toLowerCase().includes("crunchyroll")
          ? "crunchyroll-preferred"
          : "fallback-non-restricted"
        : best
          ? `best_candidate_tier=${best.tier}`
          : "no_search_results",
    });
  }

  // Write CSV
  const header = Object.keys(outRows[0] ?? {});
  const lines = [header.join(",")];
  for (const r of outRows) lines.push(header.map((k) => csvEscape(r[k])).join(","));
  writeFileSync(OUT_CSV, lines.join("\n") + "\n", "utf-8");

  console.log(
    `\n=== Summary ===\n` +
      `  Processed: ${processed}/${queue.length}\n` +
      `  Replacements found: ${replacementsFound}\n` +
      `  Output: ${OUT_CSV}\n`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
