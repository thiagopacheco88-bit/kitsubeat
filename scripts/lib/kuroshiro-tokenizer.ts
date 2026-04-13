/**
 * kuroshiro-tokenizer.ts — kuroshiro + @sglkc/kuromoji wrapper for furigana
 * and romaji generation.
 *
 * Uses kuroshiro-analyzer-kuromoji pointed at @sglkc/kuromoji dict to avoid
 * Node 18+ async dictionary loading failures from vanilla kuromoji.
 *
 * Usage:
 *   await initKuroshiro();          // call once at script start
 *   const tokens = await tokenizeLyrics("夢を見ていた");
 */

// These modules are CommonJS — use createRequire for ESM compatibility
import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Kuroshiro = require("kuroshiro").default as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji") as any;

export interface LyricsToken {
  /** The surface form (kanji/kana as written in lyrics) */
  surface: string;
  /** Hiragana reading of the surface form */
  reading: string;
  /** Hepburn romaji transliteration */
  romaji: string;
  /** Part-of-speech tag from kuromoji (Japanese) */
  pos: string;
}

let kuroshiroInstance: InstanceType<typeof Kuroshiro> | null = null;

/**
 * Initialize kuroshiro with @sglkc/kuromoji analyzer.
 * Must be called once before tokenizeLyrics(). Subsequent calls are no-ops.
 *
 * Dict path points to @sglkc/kuromoji dict folder which is pre-bundled
 * and loads synchronously, avoiding Node 18+ async file issues.
 */
export async function initKuroshiro(): Promise<void> {
  if (kuroshiroInstance !== null) return;

  // Resolve dict path relative to project root
  const dictPath = resolve(
    fileURLToPath(import.meta.url),
    "../../../node_modules/@sglkc/kuromoji/dict"
  );

  const kuroshiro = new Kuroshiro();
  const analyzer = new KuromojiAnalyzer({ dictPath });

  await kuroshiro.init(analyzer);
  kuroshiroInstance = kuroshiro;
}

/**
 * Tokenize Japanese lyrics text into an array of tokens with readings and romaji.
 *
 * Each non-whitespace token gets:
 * - surface: the original character(s)
 * - reading: hiragana reading (from kuromoji token.reading, katakana → hiragana)
 * - romaji: hepburn romaji via kuroshiro.convert()
 * - pos: Japanese POS tag (e.g., "名詞", "助詞", "動詞")
 *
 * Whitespace-only tokens are filtered out.
 * Non-Japanese ASCII/symbols use the surface as both reading and romaji.
 */
export async function tokenizeLyrics(lyrics: string): Promise<LyricsToken[]> {
  if (!kuroshiroInstance) {
    throw new Error("kuroshiro not initialized — call initKuroshiro() first");
  }

  // Access the underlying kuromoji tokenizer via the analyzer chain
  // kuroshiro._analyzer is the KuromojiAnalyzer instance
  // KuromojiAnalyzer._analyzer is the kuromoji tokenizer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kuromojiTokenizer = (kuroshiroInstance._analyzer as any)._analyzer;

  if (!kuromojiTokenizer) {
    throw new Error("kuromoji tokenizer not available on kuroshiro instance");
  }

  // Tokenize the full lyrics string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTokens: any[] = kuromojiTokenizer.tokenize(lyrics);

  const result: LyricsToken[] = [];

  for (const token of rawTokens) {
    const surface: string = token.surface_form ?? "";

    // Filter whitespace-only tokens
    if (!surface || /^\s+$/.test(surface)) continue;

    const pos: string = token.pos ?? "その他";

    // Determine reading: katakana → hiragana conversion
    let reading: string;
    if (token.reading && token.reading !== "*") {
      reading = katakanaToHiragana(token.reading);
    } else {
      // No reading available (ASCII, numbers, symbols) — use surface as reading
      reading = surface;
    }

    // Get romaji via kuroshiro.convert on the surface form
    let romaji: string;
    try {
      romaji = await kuroshiroInstance.convert(surface, {
        to: "romaji",
        mode: "normal",
        romajiSystem: "hepburn",
      });
    } catch {
      // Fallback: use surface as-is for non-Japanese tokens
      romaji = surface;
    }

    result.push({ surface, reading, romaji, pos });
  }

  return result;
}

/**
 * Convert katakana string to hiragana.
 * Katakana: U+30A1–U+30F6; Hiragana: U+3041–U+3096 (offset = 0x60)
 */
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}
