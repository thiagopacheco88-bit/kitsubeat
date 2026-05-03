import path from "path";
import { initKuroshiro } from "../lib/kuroshiro-tokenizer.js";
import { extractVocabCandidates } from "../lib/vocab-extractor.js";

await initKuroshiro({ dictPath: path.resolve(process.cwd(), "node_modules/@sglkc/kuromoji/dict") });

const sample = `その夢を見た
僕は走った
でも空は暗くて
三人の友達がいた
それは終わった
しかし朝が来た`;

const cands = await extractVocabCandidates(sample);
console.log("count:", cands.length);
for (const c of cands) {
  console.log(`  ${c.dictionary_form} (${c.reading}) [${c.part_of_speech}]`);
}
