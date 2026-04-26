/**
 * 17-find-live-replacements.ts — For each song in
 * data/live-versions-confirmed.json, search yt-dlp for a non-live studio
 * recording (Music Video, Official Audio, Topic-channel master) and propose
 * it as a replacement for the current live-recording YouTube ID.
 *
 * Flow (per input slug):
 *   1. Join the confirmed-live entry with data/songs-manifest.json to get
 *      (artist, song title, anime).
 *   2. yt-dlp search for "{artist} {song title} official" preferring artist's
 *      Topic channel + Official uploads. Also search "{artist} {title} MV" and
 *      "{artist} {song_title} Music Video".
 *   3. Reject candidates whose titles contain live/concert/acoustic/cover
 *      keywords (reuses the classifier from script 16).
 *   4. Reject candidates with duration < 120s (probably TV-cut, we want full).
 *   5. Score remaining candidates: Topic channel > Official upload > other.
 *      Presence of "Music Video" / "Official Audio" strongly boosts.
 *   6. Probe accessibility from this region (yt-dlp --simulate).
 *
 * Output:
 *   data/live-versions-replacements.json — per-slug proposal with top pick +
 *   reasons. NULL pick when nothing usable was found.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/17-find-live-replacements.ts
 */

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface ManifestEntry {
  slug: string;
  title?: string;
  artist?: string;
  anime?: string;
  season_info?: string;
  youtube_id?: string | null;
}

interface ConfirmedLive {
  slug: string;
  title: string;
  originalKeyword: string;
  verdict: "LIVE";
}

interface Candidate {
  id: string;
  channel: string;
  duration: number;
  title: string;
}

const MIN_FULL_SEC = 120;
const MAX_FULL_SEC = 420; // reject extended / nightcore cuts

// Keyword regexes reused from script 16 — titles that indicate live/cover
// content are rejected.
const LIVE_REJECT_RE =
  /\b(live|concert|acoustic|cover|remix|unplugged|anisama|animelo|tour|ワンマン|ライブ|ライヴ|ライブ映像|武道館)\b/i;

const STUDIO_PREFER_RE =
  /\b(music\s*video|official\s*(video|audio|clip)|MV|PV|music\s*clip)\b/i;

// yt-dlp binary — prefer .venv/Scripts on Windows, fall back to PATH.
const YT_DLP = (() => {
  const local = resolve(process.cwd(), ".venv/Scripts/yt-dlp.exe");
  try {
    execFileSync(local, ["--version"], { timeout: 5_000, stdio: "pipe" });
    return local;
  } catch {
    return "yt-dlp";
  }
})();

function ytSearch(query: string, n = 8): Candidate[] {
  const fmt = "%(id)s | %(channel)s | %(duration)s | %(title)s";
  try {
    const raw = execFileSync(
      YT_DLP,
      [
        `ytsearch${n}:${query}`,
        "--simulate",
        "--quiet",
        "--no-warnings",
        "--print",
        fmt,
      ],
      { encoding: "utf-8", timeout: 90_000 }
    );
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, channel, dur, ...rest] = line.split(" | ");
        return {
          id: id ?? "",
          channel: channel ?? "",
          duration: Number(dur) || 0,
          title: rest.join(" | "),
        };
      })
      .filter((c) => c.id.length === 11);
  } catch {
    return [];
  }
}

function probeAccessible(id: string): boolean {
  try {
    execFileSync(
      YT_DLP,
      [
        `https://www.youtube.com/watch?v=${id}`,
        "--simulate",
        "--quiet",
        "--no-warnings",
      ],
      { timeout: 30_000, stdio: "pipe" }
    );
    return true;
  } catch {
    return false;
  }
}

function extractSongTitle(rawTitle: string): string {
  // Strip parenthetical furigana "(...)", quote-delimited kanji forms, and
  // trailing annotations. Keeps the romaji head which is what YouTube tends
  // to use in studio uploads.
  return rawTitle
    .replace(/\([^)]*\)/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/[『「][^」』]*[』」]/g, "")
    .trim();
}

interface Score {
  score: number;
  reasons: string[];
}

function scoreCandidate(
  cand: Candidate,
  entry: ManifestEntry
): Score {
  const reasons: string[] = [];
  let score = 40;

  if (LIVE_REJECT_RE.test(cand.title)) {
    return { score: 0, reasons: ["title still matches live/cover pattern — skip"] };
  }

  if (cand.duration < MIN_FULL_SEC) {
    return { score: 0, reasons: [`duration ${cand.duration}s < ${MIN_FULL_SEC}s (TV-cut)`] };
  }
  if (cand.duration > MAX_FULL_SEC) {
    return { score: 0, reasons: [`duration ${cand.duration}s > ${MAX_FULL_SEC}s (extended/nightcore)`] };
  }

  const artistLower = (entry.artist ?? "").toLowerCase();
  const title = cand.title.toLowerCase();
  const channel = cand.channel.toLowerCase();

  if (artistLower && (title.includes(artistLower) || channel.includes(artistLower))) {
    score += 25;
    reasons.push("artist name appears in title or channel");
  }

  if (channel.endsWith(" - topic") || channel.endsWith("- topic")) {
    score += 25;
    reasons.push("YouTube Topic channel (official catalog)");
  } else if (/official|vevo|records/i.test(cand.channel)) {
    score += 15;
    reasons.push("official-looking channel");
  }

  if (STUDIO_PREFER_RE.test(cand.title)) {
    score += 15;
    reasons.push(`title contains studio marker`);
  }

  // Match song title tokens.
  const songTitle = extractSongTitle(entry.title ?? "").toLowerCase();
  const tokens = songTitle.split(/\s+/).filter((t) => t.length >= 3);
  const hits = tokens.filter((t) => title.includes(t)).length;
  if (hits > 0) {
    score += Math.min(15, hits * 5);
    reasons.push(`title-token hits: ${hits}/${tokens.length}`);
  }

  return { score, reasons };
}

interface Proposal {
  slug: string;
  current_youtube_id: string | null;
  current_live_title: string;
  artist: string;
  title: string;
  anime: string;
  pick: { id: string; channel: string; duration: number; title: string; score: number; reasons: string[] } | null;
  runners_up: Array<{ id: string; channel: string; title: string; score: number; reasons: string[] }>;
}

async function main() {
  const root = resolve(process.cwd());
  const confirmed = JSON.parse(
    readFileSync(resolve(root, "data/live-versions-confirmed.json"), "utf8")
  ) as ConfirmedLive[];
  const manifest = JSON.parse(
    readFileSync(resolve(root, "data/songs-manifest.json"), "utf8")
  ) as ManifestEntry[];
  const bySlug = new Map(manifest.map((m) => [m.slug, m]));

  const proposals: Proposal[] = [];

  for (const c of confirmed) {
    const entry = bySlug.get(c.slug);
    if (!entry) {
      console.log(`! ${c.slug}: not in manifest, skipping`);
      continue;
    }
    const artist = entry.artist ?? "";
    const title = extractSongTitle(entry.title ?? "") || c.slug;
    console.log(`\n→ ${c.slug}  (${artist} — ${title})`);

    const queries = [
      `${artist} ${title} official`,
      `${artist} ${title} music video`,
      `${artist} ${title} MV`,
    ];
    const seen = new Map<string, Candidate>();
    for (const q of queries) {
      const hits = ytSearch(q, 6);
      for (const h of hits) if (!seen.has(h.id)) seen.set(h.id, h);
    }
    const candidates = [...seen.values()];
    console.log(`  ${candidates.length} unique candidates`);

    const scored = candidates
      .map((cand) => {
        const s = scoreCandidate(cand, entry);
        return { cand, score: s.score, reasons: s.reasons };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    // Top pick must also be accessible from our region.
    let pick: Proposal["pick"] = null;
    for (const x of scored) {
      if (probeAccessible(x.cand.id)) {
        pick = {
          id: x.cand.id,
          channel: x.cand.channel,
          duration: x.cand.duration,
          title: x.cand.title,
          score: x.score,
          reasons: x.reasons,
        };
        break;
      }
      console.log(`    skip ${x.cand.id}: not accessible from region`);
    }

    proposals.push({
      slug: c.slug,
      current_youtube_id: entry.youtube_id ?? null,
      current_live_title: c.title,
      artist,
      title,
      anime: entry.anime ?? "",
      pick,
      runners_up: scored.slice(1, 4).map((x) => ({
        id: x.cand.id,
        channel: x.cand.channel,
        title: x.cand.title,
        score: x.score,
        reasons: x.reasons,
      })),
    });

    if (pick) {
      console.log(`  ✓ pick: ${pick.id} (${pick.channel}, ${pick.duration}s, score ${pick.score})`);
      console.log(`    title: ${pick.title}`);
    } else {
      console.log(`  ✗ no valid replacement found`);
    }
  }

  writeFileSync(
    resolve(root, "data/live-versions-replacements.json"),
    JSON.stringify(proposals, null, 2)
  );

  const withPick = proposals.filter((p) => p.pick).length;
  console.log(`\nwrote data/live-versions-replacements.json (${withPick}/${proposals.length} with picks)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
