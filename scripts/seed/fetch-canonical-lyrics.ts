/**
 * fetch-canonical-lyrics.ts — Scrape original Japanese lyrics from genius.com
 * for songs where LRCLIB returned romaji (Failure #14) and we don't want to
 * fall back on WhisperX-rebuild (Failure #15: confident mishearings).
 *
 * Genius is preferred over LRCLIB for Japanese songs because:
 *   - Lyrics are stored in canonical Japanese (kana/kanji)
 *   - Search API is unauthenticated
 *   - HTML structure is stable: [data-lyrics-container=true]
 *
 * Output: data/lyrics-canonical/{slug}.txt — plain UTF-8 Japanese text with
 * a header comment for the source URL. Manual review expected before promoting
 * to data/lyrics-cache/{slug}.json.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/fetch-canonical-lyrics.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/fetch-canonical-lyrics.ts --slug kaikai-kitan-eve
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

const TARGETS: Target[] = [
  { slug: "kaikai-kitan-eve", title: "Kaikai Kitan", artist: "Eve", query: "Eve Kaikai Kitan" },
  { slug: "vivid-vice-who-ya-extended", title: "VIVID VICE", artist: "Who-ya Extended", query: "Who-ya Extended VIVID VICE" },
  { slug: "idol-yoasobi", title: "Idol", artist: "YOASOBI", query: "YOASOBI Idol" },
  { slug: "yuusha-yoasobi", title: "Yuusha", artist: "YOASOBI", query: "YOASOBI Yuusha 勇者" },
  { slug: "redo-konomi-suzuki", title: "Redo", artist: "Konomi Suzuki", query: "鈴木このみ Redo" },
  { slug: "adamas-lisa", title: "ADAMAS", artist: "LiSA", query: "LiSA ADAMAS SAO" },
  { slug: "heros-come-back-nobodyknows", title: "Hero's Come Back", artist: "Nobodyknows+", query: "nobodyknows Hero's Come Back" },
  { slug: "guren-no-yumiya-linked-horizon", title: "Guren no Yumiya", artist: "Linked Horizon", query: "Linked Horizon 紅蓮の弓矢 Guren no Yumiya" },
  // 2026-04-26: re-fetch batch — songs whose lrclib match returned Hepburn
  // romaji rather than canonical kana/kanji, blocking inline lesson generation.
  { slug: "we-are-hiroshi-kitadani", title: "We Are!", artist: "Hiroshi Kitadani", query: "ウィーアー We Are 北谷洋 ワンピース" },
  { slug: "we-go-hiroshi-kitadani", title: "We Go!", artist: "Hiroshi Kitadani", query: "ウィーゴー We Go 北谷洋 ワンピース" },
  { slug: "tonight-tonight-tonight-beat-crusaders", title: "TONIGHT, TONIGHT, TONIGHT", artist: "Beat Crusaders", query: "Beat Crusaders TONIGHT TONIGHT TONIGHT ブリーチ" },
  { slug: "face-my-fears-hikaru-utada-skrillex", title: "Face My Fears", artist: "Hikaru Utada & Skrillex", query: "宇多田ヒカル Face My Fears" },
  { slug: "taidada-zutomayo", title: "Taidada", artist: "Zutomayo", query: "ずっと真夜中でいいのに タイダダ" },
  { slug: "yuugure-no-tori-shinsei-kamattechan", title: "Yuugure no Tori (夕暮れの鳥)", artist: "Shinsei Kamattechan", query: "神聖かまってちゃん 夕暮れの鳥" },
  // mountain-a-go-go-too-captain-straydum: not indexed on Genius (Naruto ED by
  // a small band). Needs Uta-Net or J-Lyric fallback — tracked separately.
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

function cjkPercent(text: string): number {
  const chars = text.replace(/\s/g, "");
  if (!chars.length) return 0;
  const cjk = (text.match(/[\u3040-\u30FF\u4E00-\u9FFF]/g) || []).length;
  return Math.round((cjk / chars.length) * 100);
}

interface SearchHit {
  path: string;
  full_title: string;
  primary_artist: string;
}

async function searchGenius(page: Page, query: string, expectedArtist: string): Promise<SearchHit | null> {
  const url = "https://genius.com/api/search/multi?q=" + encodeURIComponent(query);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  const text = await page.$eval("body pre", (el) => el.textContent || "");
  let json: any;
  try { json = JSON.parse(text); } catch { return null; }
  const sections: any[] = json?.response?.sections ?? [];
  // Collect all song hits across sections, then rank: prefer Japanese original
  // over Romanized / English / Translation variants. Genius lists those as
  // separate "songs" with the original artist replaced by "Genius Romanizations"
  // or with "(Romanized)" / "(English Version)" in the title.
  const REJECT_TITLE = /\b(Romaniz(?:ed|ation)|English\s+Version|English\s+Translation|Karaoke|Instrumental|Cover|Calendar|Release|Annotated|Tracklist)\b/i;
  const REJECT_ARTIST = /^Genius\s+(Romanizations|English\s+Translations|Translations|Japan|English|Brasil|Italia|Deutschland|France|Romana|Polska)$/i;
  const expectedTokens = expectedArtist.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const candidates: SearchHit[] = [];
  for (const sec of sections) {
    for (const hit of sec.hits ?? []) {
      const r = hit?.result;
      if (r?._type !== "song" || !r.path) continue;
      candidates.push({
        path: r.path,
        full_title: r.full_title || "",
        primary_artist: r.primary_artist_names || r.artist_names || "",
      });
    }
  }
  // Score: penalize romanized / english / translation variants
  const scored = candidates.map((c) => {
    let score = 0;
    if (REJECT_TITLE.test(c.full_title)) score -= 100;
    if (REJECT_ARTIST.test(c.primary_artist)) score -= 100;
    if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(c.full_title)) score += 50;
    // Bonus when the result's primary artist matches the expected artist
    const artistLower = c.primary_artist.toLowerCase();
    const matchedTokens = expectedTokens.filter((t) => artistLower.includes(t));
    if (expectedTokens.length && matchedTokens.length === expectedTokens.length) score += 80;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.c ?? null;
}

async function extractLyrics(page: Page, path: string): Promise<string> {
  const url = "https://genius.com" + path;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Genius lyrics live in [data-lyrics-container=true] divs (multiple per song)
  // Use innerText to preserve line breaks; replace inline annotation links cleanly.
  const blocks = await page.$$eval('[data-lyrics-container="true"]', (els) =>
    els.map((el) => (el as HTMLElement).innerText)
  );
  // Strip Genius-injected preamble (first contributor count + "Translations" + "{title} Lyrics")
  // and section markers like [Verse 1], [Chorus] — Failure #4 in SOP.
  let raw = blocks.join("\n");
  raw = raw.replace(/^\d+\s+Contributors?.*$/gm, "");
  raw = raw.replace(/^Translations?\s*$/gm, "");
  raw = raw.replace(/^.*\bLyrics\s*$/gm, "");  // matches "Title Lyrics" header
  raw = raw.replace(/^Read More\s*$/gm, "");
  raw = raw.replace(/^You might also like\s*$/gm, "");
  raw = raw.replace(/^See .* Live$/gm, "");
  raw = raw.replace(/^\d+Embed\s*$/gm, "");
  raw = raw.replace(/^Embed\s*$/gm, "");
  raw = raw.replace(/^\[[^\]]+\]\s*$/gm, "");  // [Verse 1], [Chorus]
  raw = raw.replace(/\n{3,}/g, "\n\n").trim();
  return raw;
}

async function processTarget(browser: Browser, t: Target, force: boolean): Promise<void> {
  const outPath = join(OUT_DIR, `${t.slug}.txt`);
  if (existsSync(outPath) && !force) {
    console.log(`  [skip] ${t.slug} — already exists at ${outPath}`);
    return;
  }
  console.log(`\n[${t.slug}] querying: "${t.query}"`);
  const ctx = await browser.newContext({ userAgent: UA, locale: "ja-JP" });
  const page = await ctx.newPage();
  try {
    const hit = await searchGenius(page, t.query, t.artist);
    if (!hit) { console.log(`  [fail] no Genius hit`); return; }
    console.log(`  [hit] ${hit.full_title} (${hit.primary_artist}) → ${hit.path}`);
    const lyrics = await extractLyrics(page, hit.path);
    if (!lyrics || lyrics.length < 100) { console.log(`  [fail] empty/short lyrics extracted`); return; }
    const cjk = cjkPercent(lyrics);
    const chars = lyrics.replace(/\s/g, "").length;
    console.log(`  [extract] ${chars} chars, ${cjk}% CJK`);
    if (cjk < 50) {
      console.log(`  [warn] CJK < 50% — may be wrong song or all-romaji`);
    }
    writeFileSync(outPath,
      `# source: https://genius.com${hit.path}\n# slug: ${t.slug}\n# full_title: ${hit.full_title}\n# cjk: ${cjk}%\n\n${lyrics}\n`,
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
  const force = args.includes("--force");

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[scraper] launching headless chromium`);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const t of TARGETS) {
      if (slugFilter && t.slug !== slugFilter) continue;
      await processTarget(browser, t, force);
      await new Promise((r) => setTimeout(r, 1500));
    }
  } finally {
    await browser.close();
  }
  console.log(`\n[scraper] done. Inspect data/lyrics-canonical/*.txt before promoting.`);
}

main().catch((e) => { console.error("[scraper] fatal:", e); process.exit(1); });
