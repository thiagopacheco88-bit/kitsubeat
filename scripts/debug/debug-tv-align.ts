/**
 * Debug 10b alignment for a slug — print per-verse match %, char-counts,
 * and the matched TV substring so we can see why verses are/aren't detected.
 */
import { readFileSync } from "fs";
import { initKuroshiro, toHepburnRomaji } from "../lib/kuroshiro-tokenizer.js";

const slug = process.argv[2] ?? "sign-flow";

function normRomaji(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function lcsMatchedIndices(verseChars: string[], tvChars: string[]): number[] {
  const N = verseChars.length;
  const M = tvChars.length;
  if (N === 0 || M === 0) return [];
  const dp: Uint16Array[] = [];
  for (let i = 0; i <= N; i++) dp.push(new Uint16Array(M + 1));
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      dp[i][j] = verseChars[i - 1] === tvChars[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matched: number[] = [];
  let i = N, j = M;
  while (i > 0 && j > 0) {
    if (verseChars[i - 1] === tvChars[j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1) {
      matched.push(j - 1); i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  matched.reverse();
  return matched;
}

await initKuroshiro();

const full = JSON.parse(readFileSync(`data/lessons-cache/${slug}.json`, "utf-8")) as {
  verses: Array<{ verse_number: number; tokens: Array<{ surface: string; reading?: string; romaji?: string }> }>;
};
const tv = JSON.parse(readFileSync(`data/timing-cache-tv/${slug}.json`, "utf-8")) as {
  words: Array<{ word: string; start: number; end: number }>;
};

const tvChars: string[] = [];
const tvCharToWordIdx: number[] = [];
for (let wi = 0; wi < tv.words.length; wi++) {
  const romaji = await toHepburnRomaji(tv.words[wi].word);
  for (const ch of normRomaji(romaji)) {
    tvChars.push(ch);
    tvCharToWordIdx.push(wi);
  }
}
console.log(`TV: ${tv.words.length} words → ${tvChars.length} romaji chars`);
console.log(`TV head: ${tvChars.slice(0, 200).join("")}`);
console.log(`TV tail: ${tvChars.slice(-200).join("")}`);
console.log("");

for (const v of full.verses) {
  const verseChars: string[] = [];
  for (const tok of v.tokens) {
    for (const ch of normRomaji(tok.romaji ?? tok.reading ?? tok.surface)) verseChars.push(ch);
  }
  const matched = lcsMatchedIndices(verseChars, tvChars);
  const pct = verseChars.length > 0 ? matched.length / verseChars.length : 0;
  const surface = v.tokens.map((t) => t.surface).join("").slice(0, 40);
  if (matched.length === 0) continue;
  const startIdx = matched[0];
  const endIdx = matched[matched.length - 1];
  const tvStart = tv.words[tvCharToWordIdx[startIdx]].start;
  const tvEnd = tv.words[tvCharToWordIdx[endIdx]].end;
  console.log(
    `v${String(v.verse_number).padStart(2, "0")} pct=${(pct * 100).toFixed(0)}% matched=${matched.length}/${verseChars.length} span=${(endIdx - startIdx + 1)} tvTime=${tvStart.toFixed(2)}-${tvEnd.toFixed(2)}s | ${surface}`
  );
}
process.exit(0);
