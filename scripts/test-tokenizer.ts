/**
 * test-tokenizer.ts — Quick verification script for kuroshiro-tokenizer.
 * Run: npx tsx scripts/test-tokenizer.ts
 */

import { initKuroshiro, tokenizeLyrics } from "./lib/kuroshiro-tokenizer.ts";

console.log("Initializing kuroshiro...");
await initKuroshiro();
console.log("kuroshiro initialized.\n");

const testText = "夢を見ていた";
console.log(`Tokenizing: "${testText}"\n`);

const tokens = await tokenizeLyrics(testText);

console.log("Tokens:");
for (const token of tokens) {
  console.log(
    `  surface="${token.surface}" reading="${token.reading}" romaji="${token.romaji}" pos="${token.pos}"`
  );
}

console.log(`\nTotal tokens: ${tokens.length}`);
console.log("\nDone.");
