/**
 * fetch-utanet-lyrics.ts — Scrape original Japanese lyrics from uta-net.com
 * when Genius (fetch-canonical-lyrics.ts) does not index the song.
 *
 * Uta-Net covers a broader set of small-artist / older anime OSTs than Genius
 * but has a less forgiving search — small bands sometimes aren't indexed at
 * all. For those, use --url with a direct song page (e.g. from a Google hit)
 * to bypass the search step.
 *
 * HTML structure is stable: #kashi_area holds the full lyrics as innerText
 * (ruby furigana markup included — we strip it and keep the surface kana/kanji).
 *
 * Output: data/lyrics-canonical/{slug}.txt — plain UTF-8 Japanese text with
 * a header comment for the source URL. Manual review expected before promoting
 * to data/lyrics-cache/{slug}.json via promote-canonical-lyrics.ts.
 *
 * Usage:
 *   # Run every TARGETS entry that doesn't already have a canonical file
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/fetch-utanet-lyrics.ts
 *
 *   # Force a single target (by slug)
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/fetch-utanet-lyrics.ts \
 *     --slug kaikai-kitan-eve --force
 *
 *   # Scrape a specific Uta-Net URL directly (bypasses search — use when search
 *   # misses the song but you have the URL from a Google hit)
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/fetch-utanet-lyrics.ts \
 *     --slug some-song --url https://www.uta-net.com/song/12345/
 */

import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const PROJECT_ROOT = resolve(process.cwd());
const OUT_DIR = join(PROJECT_ROOT, "data/lyrics-canonical");

interface Target {
  slug: string;
  title: string;
  artist: string;
  query: string;
}

// Known-available targets live here. Leave empty until we confirm a song
// exists on Uta-Net — a blind run does nothing, which is correct behavior.
//
// Songs confirmed NOT on Uta-Net (verified 2026-04-22):
//   mountain-a-go-go-too-captain-straydum
//     (Captain Straydum is absent from Uta-Net's artist directory — the kanji
//     lyrics for this Naruto Shippuden ED13 are not indexed on any lyrics
//     site we've checked, including Genius, J-Lyric, PetitLyrics, animelyrics,
//     Mojim. Needs manual paste from an alternative source if we want it.)
const TARGETS: Target[] = [
  { slug: "guren-no-yumiya-linked-horizon", title: "紅蓮の弓矢", artist: "Linked Horizon", query: "紅蓮の弓矢" },
  // 2026-04-26: re-fetch batch — Genius missed or returned wrong/romanized for these.
  { slug: "we-are-hiroshi-kitadani", title: "ウィーアー!", artist: "きただにひろし", query: "ウィーアー" },
  { slug: "we-go-hiroshi-kitadani", title: "ウィーゴー!", artist: "きただにひろし", query: "ウィーゴー" },
  { slug: "tonight-tonight-tonight-beat-crusaders", title: "TONIGHT,TONIGHT,TONIGHT", artist: "BEAT CRUSADERS", query: "TONIGHT TONIGHT TONIGHT" },
  { slug: "taidada-zutomayo", title: "タイダダ", artist: "ずっと真夜中でいいのに。", query: "タイダダ" },
  { slug: "yuugure-no-tori-shinsei-kamattechan", title: "夕暮れの鳥", artist: "神聖かまってちゃん", query: "夕暮れの鳥" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

function cjkPercent(text: string): number {
  const chars = text.replace(/\s/g, "");
  if (!chars.length) return 0;
  const cjk = (text.match(/[\u3040-\u30FF\u4E00-\u9FFF]/g) || []).length;
  return Math.round((cjk / chars.length) * 100);
}

interface SearchHit {
  url: string;
  title: string;
  artist: string;
}

async function searchUtaNet(
  page: Page,
  query: string,
  expectedArtist: string
): Promise<SearchHit | null> {
  const url =
    "https://www.uta-net.com/search/?target=song&type=in&keyword=" +
    encodeURIComponent(query);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Each result row is a tr with a song-title anchor and an artist anchor.
  // Uta-Net's markup is server-rendered so innerText is stable.
  const hits = await page.$$eval("table tr", (rows) => {
    const results: { url: string; title: string; artist: string }[] = [];
    for (const row of rows) {
      const songLink = row.querySelector<HTMLAnchorElement>('a[href^="/song/"]');
      const artistLink = row.querySelector<HTMLAnchorElement>('a[href^="/artist/"]');
      if (!songLink || !artistLink) continue;
      results.push({
        url: "https://www.uta-net.com" + songLink.getAttribute("href"),
        title: (songLink.textContent || "").trim(),
        artist: (artistLink.textContent || "").trim(),
      });
    }
    return results;
  });

  if (!hits.length) return null;

  const artistLower = expectedArtist.toLowerCase();
  const expectedTokens = artistLower.split(/\s+/).filter((t) => t.length > 1);
  const scored = hits.map((h) => {
    let score = 0;
    const haystack = h.artist.toLowerCase();
    const matched = expectedTokens.filter((t) => haystack.includes(t));
    if (expectedTokens.length && matched.length === expectedTokens.length) score += 80;
    else if (matched.length > 0) score += 20 * matched.length;
    return { h, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Require at least one artist-token match — otherwise we grab unrelated songs
  return scored[0]?.score ? scored[0].h : null;
}

async function extractLyrics(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  // #kashi_area has innerText preserved across <br> — the ruby markup
  // degrades gracefully because innerText skips <rt> content on most browsers.
  // If furigana leaks through, the promote step strips it via kuroshiro.
  const raw = await page.$eval("#kashi_area", (el) => (el as HTMLElement).innerText);
  return raw.replace(/\n{3,}/g, "\n\n").trim();
}

async function processTarget(
  browser: Browser,
  t: Target,
  force: boolean,
  directUrl: string | null
): Promise<void> {
  const outPath = join(OUT_DIR, `${t.slug}.txt`);
  if (existsSync(outPath) && !force) {
    console.log(`  [skip] ${t.slug} — already exists at ${outPath}`);
    return;
  }
  console.log(`\n[${t.slug}] ${directUrl ? `direct url: ${directUrl}` : `querying: "${t.query}"`}`);
  const ctx = await browser.newContext({ userAgent: UA, locale: "ja-JP" });
  const page = await ctx.newPage();
  try {
    let url = directUrl;
    if (!url) {
      const hit = await searchUtaNet(page, t.query, t.artist);
      if (!hit) {
        console.log(`  [fail] no Uta-Net hit for artist "${t.artist}"`);
        return;
      }
      console.log(`  [hit] ${hit.title} (${hit.artist}) → ${hit.url}`);
      url = hit.url;
    }
    const lyrics = await extractLyrics(page, url);
    if (!lyrics || lyrics.length < 100) {
      console.log(`  [fail] empty/short lyrics extracted`);
      return;
    }
    const cjk = cjkPercent(lyrics);
    const chars = lyrics.replace(/\s/g, "").length;
    console.log(`  [extract] ${chars} chars, ${cjk}% CJK`);
    if (cjk < 50) console.log(`  [warn] CJK < 50% — may be wrong song or all-romaji`);

    writeFileSync(
      outPath,
      `# source: ${url}\n# slug: ${t.slug}\n# cjk: ${cjk}%\n\n${lyrics}\n`,
      "utf-8"
    );
    console.log(`  [save] ${outPath}`);
  } finally {
    await page.close();
    await ctx.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const slugFlag = args.indexOf("--slug");
  const slugFilter = slugFlag !== -1 ? args[slugFlag + 1] : null;
  const urlFlag = args.indexOf("--url");
  const directUrl = urlFlag !== -1 ? args[urlFlag + 1] : null;
  const force = args.includes("--force");

  // --url requires --slug (we need a filename to save under)
  if (directUrl && !slugFilter) {
    console.error("[error] --url requires --slug");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[scraper] launching headless chromium`);
  const browser = await chromium.launch({ headless: true });
  try {
    if (directUrl && slugFilter) {
      // Synthetic target — caller provided the exact URL, metadata is filler
      await processTarget(
        browser,
        { slug: slugFilter, title: "", artist: "", query: "" },
        true,
        directUrl
      );
    } else {
      for (const t of TARGETS) {
        if (slugFilter && t.slug !== slugFilter) continue;
        await processTarget(browser, t, force, null);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  } finally {
    await browser.close();
  }
  console.log(
    `\n[scraper] done. Inspect data/lyrics-canonical/*.txt before promoting via promote-canonical-lyrics.ts.`
  );
}

main().catch((e) => {
  console.error("[scraper] fatal:", e);
  process.exit(1);
});
