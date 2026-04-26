/**
 * 16-filter-live-versions.ts — Narrow data/_flagged-live-versions.json to
 * only entries whose live/cover keyword appears in the video TITLE, not the
 * description. The original detector matched descriptions too, which flags
 * every JAM Project / L'Arc song ("MUSIC VIDEO" + unrelated "live" in the
 * description) as live — ~half the 32 flags are false positives.
 *
 * Keywords considered strong evidence when present in title:
 *   live / ライブ / ライヴ, concert, コンサート, acoustic,
 *   cover (but NOT "cover" appearing in descriptions of the word "discover"),
 *   remix, orchestra-live, ワンマン / one-man, anisama / animelo
 *
 * Outputs:
 *   - data/live-versions-confirmed.json   (true positives — needs a swap)
 *   - data/live-versions-false-positives.json (flagged by old detector,
 *                                              actually fine)
 *
 * Non-destructive; no DB writes.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/16-filter-live-versions.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface FlaggedEntry {
  slug: string;
  title: string;
  keyword: string;
  description?: string;
}

// Tokens that must appear as whole words (or Japanese substrings) in the
// title to count as a real live/cover/remix signal. Case-insensitive for
// Latin letters; Japanese is already case-invariant.
const LIVE_PATTERNS: RegExp[] = [
  /\blive\b/i,                 // "LIVE", "live"
  /ライブ/,
  /ライヴ/,
  /\bconcert\b/i,
  /コンサート/,
  /\bacoustic\b/i,
  /\bcover\b/i,                // standalone "cover"
  /\bremix\b/i,
  /\bワンマン\b/,
  /one[- ]?man/i,
  /\banisama\b/i,
  /アニサマ/,
  /animelo/i,
  /武道館/,
  /tour\b/i,                   // "Tour 2019", "Live Tour"
  /\bunplugged\b/i,
  /\bfan[- ]meet/i,
  /\btouring?\b/i,
];

// Strong negative signals — presence in title almost always means studio
// recording, not live. Used to downgrade borderline keyword matches.
const STUDIO_PATTERNS: RegExp[] = [
  /music[- ]?video/i,
  /music[- ]?clip/i,
  /official[- ]?(video|audio|clip)/i,
  /\bMV\b/,
  /\bPV\b/,
  /official/i,
];

interface Decision {
  slug: string;
  title: string;
  originalKeyword: string;
  verdict: "LIVE" | "NOT_LIVE";
  matchedTitlePatterns: string[];
  studioMarkersInTitle: string[];
}

function classify(entry: FlaggedEntry): Decision {
  const matches = LIVE_PATTERNS.map((re) => (entry.title.match(re)?.[0] ?? "").trim())
    .filter((m) => m.length > 0);
  const studio = STUDIO_PATTERNS.map((re) => (entry.title.match(re)?.[0] ?? "").trim())
    .filter((m) => m.length > 0);

  // Decision rule: any title-level live pattern = LIVE, UNLESS the title also
  // contains an unambiguous studio marker AND the live token is the weak
  // "live" or "tour" on its own (i.e. could be incidental).
  //
  // Exception: phrases like "Official Live Video", "Official Live Audio",
  // "Live Video", or "ライブ映像" are explicit live releases — they get
  // promoted to LIVE even when a Music-Video-style marker is present.
  const explicitLivePhrase = /\b(official\s+)?live\s+(video|audio|clip|session|performance)\b/i.test(entry.title) ||
    /ライブ映像|ライブ版/.test(entry.title);
  let verdict: Decision["verdict"];
  if (matches.length === 0) {
    verdict = "NOT_LIVE";
  } else if (explicitLivePhrase) {
    verdict = "LIVE";
  } else if (studio.length > 0 && matches.every((m) => /^(live|tour)$/i.test(m))) {
    // e.g. "Music Video" with an unrelated "live" elsewhere — the "live"
    // is incidental. Mark NOT_LIVE.
    verdict = "NOT_LIVE";
  } else {
    verdict = "LIVE";
  }

  return {
    slug: entry.slug,
    title: entry.title,
    originalKeyword: entry.keyword,
    verdict,
    matchedTitlePatterns: matches,
    studioMarkersInTitle: studio,
  };
}

function main() {
  const root = resolve(process.cwd());
  const flaggedPath = resolve(root, "data/_flagged-live-versions.json");
  const flagged = JSON.parse(readFileSync(flaggedPath, "utf8")) as FlaggedEntry[];
  console.log(`input: ${flagged.length} flagged entries`);

  const decisions = flagged.map(classify);

  const confirmedLive = decisions.filter((d) => d.verdict === "LIVE");
  const falsePositives = decisions.filter((d) => d.verdict === "NOT_LIVE");

  console.log(`confirmed LIVE:      ${confirmedLive.length}`);
  console.log(`false positives:     ${falsePositives.length}`);
  console.log("");
  console.log("--- CONFIRMED LIVE (need replacement YouTube IDs) ---");
  confirmedLive.forEach((d, i) =>
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${d.slug.padEnd(55)} | ${d.matchedTitlePatterns.join(",").padEnd(14)} | ${d.title}`
    )
  );
  console.log("");
  console.log("--- FALSE POSITIVES (keep existing YouTube ID) ---");
  falsePositives.forEach((d, i) =>
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${d.slug.padEnd(55)} | (orig: ${d.originalKeyword.padEnd(8)}) | ${d.title}`
    )
  );

  writeFileSync(
    resolve(root, "data/live-versions-confirmed.json"),
    JSON.stringify(confirmedLive, null, 2)
  );
  writeFileSync(
    resolve(root, "data/live-versions-false-positives.json"),
    JSON.stringify(falsePositives, null, 2)
  );
  console.log("");
  console.log("wrote data/live-versions-confirmed.json");
  console.log("wrote data/live-versions-false-positives.json");
}

main();
