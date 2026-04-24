/**
 * find-geo-replacements.ts — Discover Crunchyroll TV-cut + artist-channel
 * full replacements for geo-blocked YouTube IDs, using yt-dlp search (no
 * YouTube API quota needed).
 *
 * Flow (per input slug):
 *   1. From the manifest entry, take (anime, season_info).
 *   2. Search yt-dlp for "{anime} {Opening|Ending} {N} Crunchyroll".
 *      Crunchyroll titles its Naruto/SAO/FMA uploads consistently as
 *      "{Anime} - Opening {N} | {English title}".
 *   3. Pick the first candidate on the Crunchyroll channel with duration
 *      80-150s (TV-cut band).
 *   4. Parse the "| {English title}" suffix from the TV-cut title, then
 *      re-search yt-dlp for "{artist} {title}" to find a full version. The
 *      artist's "- Topic" channel (YouTube's auto-managed music catalog) is
 *      preferred — licensed for worldwide playback.
 *   5. Probe each candidate with yt-dlp --simulate to confirm it's actually
 *      downloadable from our region (not itself geo-blocked).
 *
 * Output:
 *   data/geo-replacements.json — per-input summary with TV + full picks
 *                                (or null when nothing was found).
 *
 * Usage:
 *   npx tsx scripts/seed/find-geo-replacements.ts --slug-file data/geo-blocked-slugs.txt
 *   npx tsx scripts/seed/find-geo-replacements.ts --slug kaze-yamazaru
 */

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";

interface ManifestEntry {
  slug: string;
  title?: string;
  artist?: string;
  anime?: string;
  season_info?: string;
  youtube_id?: string | null;
}

interface Candidate {
  id: string;
  channel: string;
  duration: number;
  title: string;
}

const MANIFEST_PATH = "data/songs-manifest.json";
const OUTPUT_PATH = "data/geo-replacements.json";

// yt-dlp search → parse lines "id | channel | duration | title"
function ytSearch(query: string, n = 5): Candidate[] {
  const fmt = "%(id)s | %(channel)s | %(duration)s | %(title)s";
  try {
    const raw = execFileSync(
      "yt-dlp",
      [
        `ytsearch${n}:${query}`,
        "--simulate",
        "--quiet",
        "--no-warnings",
        "--print",
        fmt,
      ],
      { encoding: "utf-8", timeout: 60_000 }
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
  } catch (err) {
    return [];
  }
}

// Test a single ID for geo-accessibility via --simulate. Geo-blocked or
// otherwise unavailable IDs throw.
function probeAccessible(id: string): boolean {
  try {
    execFileSync(
      "yt-dlp",
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

interface CandidateMetadata {
  track: string | null;
  artist: string | null;
  album: string | null;
  release_year: number | null;
  description: string | null;
  categories: string[];
  tags: string[];
}

/** Fetch YouTube metadata via yt-dlp -j. Structured fields `track`/`artist`
 *  come from YouTube Music's matched catalog — they're present on artist
 *  'Topic' channels and some Official channels. Crunchyroll doesn't embed
 *  them but has consistent description format we can parse. */
function fetchMetadata(id: string): CandidateMetadata | null {
  try {
    const raw = execFileSync(
      "yt-dlp",
      ["-j", "--no-warnings", `https://www.youtube.com/watch?v=${id}`],
      { encoding: "utf-8", timeout: 30_000, maxBuffer: 8 * 1024 * 1024 }
    );
    const d = JSON.parse(raw);
    return {
      track: d.track ?? null,
      artist: d.artist ?? null,
      album: d.album ?? null,
      release_year: d.release_year ?? null,
      description: d.description ?? null,
      categories: Array.isArray(d.categories) ? d.categories : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
    };
  } catch {
    return null;
  }
}

/** Score candidate against manifest entry. 0-100, higher = more confident.
 *  Returns a score + human-readable reasons for the score. */
function verifyCandidate(
  cand: Candidate,
  entry: ManifestEntry,
  kind: "tv" | "full"
): { score: number; reasons: string[] } {
  const meta = fetchMetadata(cand.id);
  const reasons: string[] = [];
  if (!meta) {
    return { score: 20, reasons: ["metadata fetch failed"] };
  }
  let score = 40; // neutral start
  const artistLower = (entry.artist ?? "").toLowerCase();
  const animeLower = (entry.anime ?? "").toLowerCase();
  const titleTokens = extractSongTitle(entry.title ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  // Structured metadata (Topic / Official channels with YouTube Music match)
  if (meta.artist && artistLower) {
    if (meta.artist.toLowerCase().includes(artistLower) || artistLower.includes(meta.artist.toLowerCase())) {
      score += 30;
      reasons.push(`artist metadata matches: "${meta.artist}"`);
    } else {
      score -= 20;
      reasons.push(`artist metadata MISMATCH: got "${meta.artist}", expected "${entry.artist}"`);
    }
  }
  if (meta.track && titleTokens.length > 0) {
    const trackLower = meta.track.toLowerCase();
    const tokenHits = titleTokens.filter((t) => trackLower.includes(t)).length;
    if (tokenHits > 0) {
      score += 15;
      reasons.push(`track metadata matches: "${meta.track}"`);
    }
  }

  // Description-based verification (Crunchyroll has consistent format).
  // Also checks that the manifest title appears in description — prevents
  // matching the right anime+slot but wrong song when manifest has no
  // slot number (e.g. 'Naruto Shippuden ED' matches any ending).
  const desc = (meta.description ?? "").toLowerCase();
  const titleRomaji = extractSongTitle(entry.title ?? "").toLowerCase();
  if (desc) {
    if (animeLower && desc.includes(animeLower.split(":")[0].trim())) {
      score += 15;
      reasons.push("description mentions anime");
    }
    if (artistLower && desc.includes(artistLower)) {
      score += 10;
      reasons.push("description mentions artist");
    }
    // Require title-token match when slot lacks a specific number (otherwise
    // every Naruto ED matches every other Naruto ED).
    const titleTokensInDesc = titleTokens.filter((t) => desc.includes(t));
    if (titleTokensInDesc.length > 0) {
      score += 15;
      reasons.push(`description mentions title token(s): ${titleTokensInDesc.join(", ")}`);
    }
    const slot = parseSlot(entry.season_info);
    if (slot && slot.n) {
      // With a specific slot number, the description must match that number
      // explicitly. Allow "Opening 13" / "OP 13" / "#13" variants.
      const slotAbbr = slot.kind === "Opening" ? "op" : "ed";
      const slotRe = new RegExp(
        `(?:${slot.kind}|${slotAbbr})\\s*#?\\s*${slot.n}\\b`,
        "i"
      );
      if (slotRe.test(desc)) {
        score += 15;
        reasons.push(`description matches slot ${slot.kind} ${slot.n}`);
      } else {
        // Description mentions a DIFFERENT slot number — strong negative.
        const anyOtherSlot = new RegExp(
          `(?:${slot.kind}|${slotAbbr})\\s*#?\\s*(\\d+)`,
          "i"
        );
        const m = desc.match(anyOtherSlot);
        if (m && m[1] !== slot.n) {
          score -= 30;
          reasons.push(`description shows WRONG slot: ${slot.kind} ${m[1]} (expected ${slot.n})`);
        }
      }
    }
  }

  // Duration hard-gate: if clearly not the expected format, cap at 20.
  // Previous -15 penalty didn't stop a 249s Full from winning the TV pick.
  if (kind === "tv" && (cand.duration < 70 || cand.duration > 160)) {
    score = Math.min(score, 20);
    reasons.push(`HARD-CAP: TV duration out of range (${cand.duration}s)`);
  }
  if (kind === "full" && (cand.duration < 150 || cand.duration > 420)) {
    score = Math.min(score, 20);
    reasons.push(`HARD-CAP: Full duration out of range (${cand.duration}s)`);
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// Parse season_info like "Naruto Shippuden OP 13" or "OP 2" → { kind, n }
function parseSlot(seasonInfo: string | undefined): { kind: "Opening" | "Ending"; n: string } | null {
  if (!seasonInfo) return null;
  const m = seasonInfo.match(/\b(OP|ED|Opening|Ending)\s*(\d+)?/i);
  if (!m) return null;
  const kindRaw = m[1].toUpperCase();
  const kind = kindRaw.startsWith("OP") ? "Opening" : "Ending";
  return { kind, n: m[2] ?? "" };
}

/** Extract content-bearing tokens from an anime name (drop punctuation and
 *  common noise words). 'Fullmetal Alchemist: Brotherhood' -> ['fullmetal',
 *  'alchemist', 'brotherhood']. Used to sanity-check that a Crunchyroll
 *  search hit is actually for the requested anime — the previous script
 *  accepted 'Soul Eater OP 2' when asked for FMA:B OP 2 because the colon
 *  in the anime name degraded search relevance. */
function animeTokens(anime: string): string[] {
  return anime
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !["naruto", "shippuden", "the", "and"].includes(t));
  // Note: 'naruto'/'shippuden' are excluded because so many unrelated Naruto
  // tracks would match. Shippuden-era OPs/EDs naturally contain them and
  // the season_info slot (OP 13, ED 40) does the disambiguation.
}

/** TV pick: Crunchyroll (or Crunchyroll Store) channel candidate in the
 *  80–150s TV-cut band whose title contains at least one distinctive token
 *  from the anime name. For Naruto-era songs where tokens are all stripped,
 *  fall back to requiring 'naruto' in the title. */
function pickCrunchyrollTv(candidates: Candidate[], anime: string): Candidate | null {
  const tokens = animeTokens(anime);
  const naruto = anime.toLowerCase().includes("naruto");
  return (
    candidates.find((c) => {
      if (!c.channel.toLowerCase().includes("crunchyroll")) return false;
      if (c.duration < 80 || c.duration > 150) return false;
      const titleLower = c.title.toLowerCase();
      if (naruto && !titleLower.includes("naruto")) return false;
      if (tokens.length > 0 && !tokens.some((t) => titleLower.includes(t))) return false;
      return true;
    }) ?? null
  );
}

// Full pick: prefer artist's "- Topic" (YouTube Music auto-generated) channel,
// duration 120-480s. Topic channels are always worldwide-licensed.
function pickFullVersion(candidates: Candidate[], artist: string): Candidate | null {
  const topicName = `${artist.toLowerCase()} - topic`;
  const fromTopic = candidates.find(
    (c) =>
      c.channel.toLowerCase() === topicName &&
      c.duration >= 120 &&
      c.duration <= 480
  );
  if (fromTopic) return fromTopic;
  // Fallback: any candidate with "official" in channel name at full-song duration.
  return (
    candidates.find(
      (c) =>
        /official|music|records/i.test(c.channel) &&
        c.duration >= 120 &&
        c.duration <= 480
    ) ?? null
  );
}

/** Pull a clean song title out of manifest.title — manifest uses formats
 *  like 'Hologram (ホログラム)' or 'Sayonara Memory (さよならメモリー)'.
 *  We keep both the romaji/English chunk AND the Japanese chunk, joined
 *  with a space so either can match on full-version channels (some upload
 *  under English title, some under Japanese). */
function extractSongTitle(manifestTitle: string): string {
  const match = manifestTitle.match(/^([^(]+?)\s*(?:\(([^)]+)\))?\s*$/);
  if (!match) return manifestTitle.trim();
  const [, primary, parenthetical] = match;
  return [primary.trim(), parenthetical?.trim()].filter(Boolean).join(" ");
}

interface VerifiedCandidate extends Candidate {
  confidence: number;
  reasons: string[];
}

interface Result {
  slug: string;
  anime?: string;
  season_info?: string;
  artist?: string;
  current_youtube_id?: string | null;
  tv_pick: VerifiedCandidate | null;
  full_pick: VerifiedCandidate | null;
  /** Top 5 TV-search candidates for manual review when tv_pick is wrong/null. */
  tv_candidates: VerifiedCandidate[];
  /** Top 5 full-search candidates for manual review when full_pick is wrong/null. */
  full_candidates: VerifiedCandidate[];
  notes: string[];
}

function findForSlug(entry: ManifestEntry): Result {
  const notes: string[] = [];
  const result: Result = {
    slug: entry.slug,
    anime: entry.anime,
    season_info: entry.season_info,
    artist: entry.artist,
    current_youtube_id: entry.youtube_id,
    tv_pick: null,
    full_pick: null,
    tv_candidates: [],
    full_candidates: [],
    notes,
  };

  const slot = parseSlot(entry.season_info);

  // Step 1 — Crunchyroll TV search. If no slot info, fall back to artist+title
  // (e.g. for 'break-beat-bark-sayaka-kanda' the anime metadata has no OP/ED
  // pattern — anime-name tokens alone still constrain the match enough).
  if (entry.anime) {
    const tvQuery = slot
      ? `${entry.anime} ${slot.kind}${slot.n ? " " + slot.n : ""} Crunchyroll`
      : `${entry.anime} ${entry.artist ?? ""} ${entry.title ?? ""} Crunchyroll`;
    notes.push(`tv-query: ${tvQuery}`);
    const tvCandidatesRaw = ytSearch(tvQuery, 8);
    const tvCandidates = tvCandidatesRaw.slice(0, 5).map<VerifiedCandidate>((c) => {
      const v = verifyCandidate(c, entry, "tv");
      return { ...c, confidence: v.score, reasons: v.reasons };
    });
    result.tv_candidates = tvCandidates;
    // Pick highest-confidence candidate rather than rule-filter first hit.
    const tvPick =
      tvCandidates
        .filter((c) => c.confidence >= 50 && probeAccessible(c.id))
        .sort((a, b) => b.confidence - a.confidence)[0] ?? null;
    if (!tvPick) {
      notes.push("no TV candidate scored >=50 confidence");
    } else {
      result.tv_pick = tvPick;
    }
  } else {
    notes.push("no anime in manifest — skipping TV search");
  }

  // Step 2 — Full version: use manifest's own title (romaji + Japanese both)
  // rather than the Crunchyroll-extracted English title, which often
  // translates e.g. '青のララバイ' -> 'Blue Lullaby' and then fails to find
  // the artist-channel upload titled 'Ao no Lullaby'.
  if (entry.artist && entry.title) {
    const cleanTitle = extractSongTitle(entry.title);
    const fullQuery = `${entry.artist} ${cleanTitle}`;
    notes.push(`full-query: ${fullQuery}`);
    const fullCandidatesRaw = ytSearch(fullQuery, 5);
    const fullCandidates = fullCandidatesRaw.slice(0, 5).map<VerifiedCandidate>((c) => {
      const v = verifyCandidate(c, entry, "full");
      return { ...c, confidence: v.score, reasons: v.reasons };
    });
    result.full_candidates = fullCandidates;
    const fullPick =
      fullCandidates
        .filter((c) => c.confidence >= 50 && probeAccessible(c.id))
        .sort((a, b) => b.confidence - a.confidence)[0] ?? null;
    if (!fullPick) {
      notes.push("no Full candidate scored >=50 confidence");
    } else {
      result.full_pick = fullPick;
    }
  }

  return result;
}

function main(): void {
  const args = process.argv.slice(2);
  const slugFile = (() => {
    const i = args.indexOf("--slug-file");
    return i !== -1 ? args[i + 1] ?? null : null;
  })();
  const singleSlug = (() => {
    const i = args.indexOf("--slug");
    return i !== -1 ? args[i + 1] ?? null : null;
  })();

  let slugs: string[] = [];
  if (singleSlug) slugs = [singleSlug];
  else if (slugFile) {
    slugs = readFileSync(slugFile, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } else {
    console.error("usage: --slug <slug> OR --slug-file <path>");
    process.exit(1);
  }

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestEntry[];

  const results: Result[] = [];
  for (const slug of slugs) {
    const entry = manifest.find((m) => m.slug === slug);
    if (!entry) {
      console.error(`slug not in manifest: ${slug}`);
      continue;
    }
    console.log(`\n=== ${slug} ===`);
    const r = findForSlug(entry);
    results.push(r);
    const fmtPick = (p: VerifiedCandidate | null) =>
      p
        ? `${p.id}  ${p.channel}  ${p.duration}s  confidence=${p.confidence}  [${p.reasons.join("; ")}]`
        : "none";
    console.log(`  tv:   ${fmtPick(r.tv_pick)}`);
    console.log(`  full: ${fmtPick(r.full_pick)}`);
    for (const n of r.notes) console.log("  note: " + n);
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2),
    "utf-8"
  );
  console.log(`\nwrote ${results.length} result(s) → ${OUTPUT_PATH}`);

  const tvFound = results.filter((r) => r.tv_pick).length;
  const fullFound = results.filter((r) => r.full_pick).length;
  console.log(`summary: TV ${tvFound}/${results.length}  |  Full ${fullFound}/${results.length}`);
}

main();
