/**
 * One-off: replace sign-flow verse 8 (the bracketed Japanese thought
 * "「忘れてしまえばいいよ 感じなくなっちゃえばいい」") with proper tokens +
 * translations, modelled after verse 10 (also a bracketed inner-voice
 * line, properly tokenised). Brackets are dropped from token surfaces
 * and re-added in the translation, matching the verse-10 convention.
 *
 * Token shapes here are the exact ones already present elsewhere in
 * sign-flow's lesson cache so style stays consistent (kanji_breakdown,
 * jlpt_level, grammar_color, meaning keys all match neighbour verses).
 *
 * After writing the cache file, you must re-push to Neon:
 *   npx tsx scripts/seed/05-insert-db.ts --slug=sign-flow
 */
import { readFileSync, writeFileSync } from "fs";

const LESSON_PATH = "data/lessons-cache/sign-flow.json";

type Token = {
  surface: string;
  reading: string;
  romaji: string;
  grammar: string;
  grammar_color: string;
  meaning: { en: string; "pt-BR"?: string; es?: string };
  jlpt_level: string;
};

const tokens: Token[] = [
  { surface: "忘れ", reading: "わすれ", romaji: "wasure", grammar: "verb", grammar_color: "red",
    meaning: { en: "to forget (te-form stem)", "pt-BR": "esquecer (raiz)", es: "olvidar (raíz)" }, jlpt_level: "N5" },
  { surface: "て", reading: "て", romaji: "te", grammar: "particle", grammar_color: "grey",
    meaning: { en: "te-form", "pt-BR": "forma-te", es: "forma-te" }, jlpt_level: "N5" },
  { surface: "しまえ", reading: "しまえ", romaji: "shimae", grammar: "verb", grammar_color: "red",
    meaning: { en: "to end up (imperative)", "pt-BR": "acabar (imperativo)", es: "acabar (imperativo)" }, jlpt_level: "N4" },
  { surface: "ば", reading: "ば", romaji: "ba", grammar: "particle", grammar_color: "grey",
    meaning: { en: "if; when", "pt-BR": "se; quando", es: "si; cuando" }, jlpt_level: "N4" },
  { surface: "いい", reading: "いい", romaji: "ii", grammar: "adjective", grammar_color: "green",
    meaning: { en: "good; fine", "pt-BR": "bom; bem", es: "bueno; bien" }, jlpt_level: "N5" },
  { surface: "よ", reading: "よ", romaji: "yo", grammar: "particle", grammar_color: "grey",
    meaning: { en: "emphasis", "pt-BR": "ênfase", es: "énfasis" }, jlpt_level: "N5" },
  { surface: "感じ", reading: "かんじ", romaji: "kanji", grammar: "verb", grammar_color: "red",
    meaning: { en: "to feel", "pt-BR": "sentir", es: "sentir" }, jlpt_level: "N4" },
  { surface: "なく", reading: "なく", romaji: "naku", grammar: "adjective", grammar_color: "green",
    meaning: { en: "without (adv)", "pt-BR": "sem (adv)", es: "sin (adv)" }, jlpt_level: "N4" },
  { surface: "なっ", reading: "なっ", romaji: "na", grammar: "verb", grammar_color: "red",
    meaning: { en: "to become", "pt-BR": "tornar-se", es: "convertirse" }, jlpt_level: "N5" },
  { surface: "ちゃえ", reading: "ちゃえ", romaji: "chae", grammar: "verb", grammar_color: "red",
    meaning: { en: "end up doing (casual imperative)" }, jlpt_level: "N4" },
  { surface: "ば", reading: "ば", romaji: "ba", grammar: "particle", grammar_color: "grey",
    meaning: { en: "if; when", "pt-BR": "se; quando", es: "si; cuando" }, jlpt_level: "N4" },
  { surface: "いい", reading: "いい", romaji: "ii", grammar: "adjective", grammar_color: "green",
    meaning: { en: "good; fine", "pt-BR": "bom; bem", es: "bueno; bien" }, jlpt_level: "N5" },
];

const lesson = JSON.parse(readFileSync(LESSON_PATH, "utf-8"));
const v8 = lesson.verses.find((v: { verse_number: number }) => v.verse_number === 8);
if (!v8) throw new Error("verse 8 not found");

v8.tokens = tokens;
v8.translations = {
  en: "\"You should just forget about it; you should just stop feeling.\"",
  "pt-BR": "\"Você deveria simplesmente esquecer; deveria parar de sentir.\"",
  es: "\"Deberías simplemente olvidar; deberías dejar de sentir.\"",
};
v8.literal_meaning = {
  en: "forget + te-form + end-up + if + good + emphasis / feel + without + become + end-up + if + good",
};

writeFileSync(LESSON_PATH, JSON.stringify(lesson, null, 2), "utf-8");
console.log(`patched verse 8 — tokens: ${tokens.length}, translations: ${Object.keys(v8.translations).length}`);
