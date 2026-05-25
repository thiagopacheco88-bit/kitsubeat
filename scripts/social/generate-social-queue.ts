/**
 * Generates 6 months of social posts from local data — no API calls.
 * Output: src/data/social-queue.json
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/generate-social-queue.ts
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";

// ─── Types ────────────────────────────────────────────────────────────────────

type VocabWord = {
  surface: string;
  reading: string;
  romaji: string;
  meanings: { en: string };
  jlpt_level: string | null;
  category: string;
  context: string;
};

type AnimeVocab = {
  anime: string;
  label: string;
  vocab: VocabWord[];
};

type QueueEntry = {
  date: string;
  type: "vocab" | "quiz" | "article";
  tweets: string[];
};

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT = join(process.cwd());
const VOCAB_DIR = join(ROOT, ".planning/anime-vocab");
const JOURNAL_DIR = join(ROOT, "src/content/journal");
const OUTPUT_DIR = join(ROOT, "src/data");
const OUTPUT = join(OUTPUT_DIR, "social-queue.json");
const SITE_URL = "https://kitsubeat.com";

const START_DATE = "2026-05-26"; // tomorrow — today already missed
const MONTHS = 6;

const ANIME_EMOJIS: Record<string, string> = {
  "naruto": "🍃",
  "one-piece": "⚓",
  "bleach": "⚔️",
  "attack-on-titan": "🏔️",
  "demon-slayer": "🔥",
  "death-note": "📓",
  "dragon-ball-z": "⚡",
  "hunter-x-hunter": "🎯",
  "tokyo-ghoul": "👁️",
  "jujutsu-kaisen": "💜",
  "my-hero-academia": "💥",
  "chainsaw-man": "🔪",
  "fairy-tail": "✨",
  "sword-art-online": "🗡️",
  "fullmetal-alchemist": "⚗️",
  "code-geass": "♟️",
};

// ─── Load data ────────────────────────────────────────────────────────────────

const allAnimes: AnimeVocab[] = readdirSync(VOCAB_DIR)
  .filter(f => f.endsWith(".json") && f !== "anime-core.json")
  .map(f => JSON.parse(readFileSync(join(VOCAB_DIR, f), "utf8")) as AnimeVocab)
  .filter(a => a.vocab?.length >= 3);

const allMeanings: string[] = allAnimes.flatMap(a => a.vocab.map(w => w.meanings.en));

const articles = readdirSync(JOURNAL_DIR)
  .filter(f => f.endsWith(".mdx"))
  .map(f => {
    const raw = readFileSync(join(JOURNAL_DIR, f), "utf8");
    const { data, content } = matter(raw);
    const body = content
      .replace(/^import .+$/gm, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { ...data as Record<string, string>, body };
  })
  .filter(a => a.slug && a.title)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contentTypeForDay(dayOfWeek: number): "vocab" | "quiz" | "article" {
  if (dayOfWeek === 0 || dayOfWeek === 6) return "article";
  if (dayOfWeek === 2 || dayOfWeek === 4) return "quiz";
  return "vocab";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** First sentence of context, capped at maxChars */
function contextSentence(context: string, maxChars = 100): string {
  const first = context.split(/(?<=[.!?])\s/)[0]?.trim() ?? context;
  return first.length > maxChars ? first.slice(0, maxChars - 1) + "…" : first;
}

// ─── Tweet builders ───────────────────────────────────────────────────────────

function vocabTweet(
  word: VocabWord,
  counter: "1/3" | "2/3" | "3/3",
  anime: AnimeVocab
): string {
  const emoji = ANIME_EMOJIS[anime.anime] ?? "🎌";
  const header = counter === "1/3"
    ? `Useful vocabulary from ${anime.label} ${emoji}\n\n`
    : "";
  const sentence = contextSentence(word.context);
  const cta = counter === "3/3"
    ? `\n\nPractice with anime on KitsuBeat 🎌 ${SITE_URL}\n\n#LearnJapanese #KitsuBeat`
    : "";

  return `${header}${word.surface} (${word.reading}) — ${word.romaji}\n"${word.meanings.en}"\n\n${sentence}\n\n(${counter})${cta}`;
}

function buildQuizOptions(word: VocabWord, allMeanings: string[]): { options: string[]; slot: number } {
  const slot = Math.floor(Math.random() * 4);
  const distractors = shuffle(allMeanings.filter(m => m !== word.meanings.en)).slice(0, 3);
  const options = [...distractors];
  options.splice(slot, 0, word.meanings.en);
  return { options, slot };
}

function quizThread(words: VocabWord[], allMeanings: string[]): string[] {
  const letters = ["A", "B", "C", "D"];
  const quizzes = words.map(w => ({ word: w, ...buildQuizOptions(w, allMeanings) }));

  // Tweet 1 — Q1 only, no answer
  const t1 = [
    `Common Japanese vocab from anime`,
    `Can you get all 3? 🧵`,
    ``,
    `Q1: What does ${quizzes[0].word.surface} (${quizzes[0].word.romaji}) mean?`,
    ``,
    ...quizzes[0].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");

  // Tweet 2 — A1 reveal + Q2
  const t2 = [
    `✅ Q1 answer: ${letters[quizzes[0].slot]}) ${quizzes[0].word.meanings.en}`,
    ``,
    `Q2: What does ${quizzes[1].word.surface} (${quizzes[1].word.romaji}) mean?`,
    ``,
    ...quizzes[1].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");

  // Tweet 3 — A2 reveal + Q3
  const t3 = [
    `✅ Q2 answer: ${letters[quizzes[1].slot]}) ${quizzes[1].word.meanings.en}`,
    ``,
    `Q3: What does ${quizzes[2].word.surface} (${quizzes[2].word.romaji}) mean?`,
    ``,
    ...quizzes[2].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");

  // Tweet 4 — A3 reveal + CTA
  const t4 = [
    `✅ Q3 answer: ${letters[quizzes[2].slot]}) ${quizzes[2].word.meanings.en}`,
    ``,
    `Practice more vocab with anime on KitsuBeat 🎌`,
    `${SITE_URL}`,
    ``,
    `#LearnJapanese #KitsuBeat`,
  ].join("\n");

  return [t1, t2, t3, t4];
}

function articleThread(article: Record<string, string>): string[] {
  const url = `${SITE_URL}/journal/${article.slug}`;

  // Extract substantive paragraphs from body
  const paragraphs = article.body
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 60 && !p.startsWith("#") && !p.startsWith(">") && !p.startsWith("-"));

  const hook = article.subtitle
    ? `${article.title} 🧵\n\n${article.subtitle}`
    : `${article.title} 🧵`;

  const insight1 = (paragraphs[0] ?? article.summary).slice(0, 260);
  const insight2 = (paragraphs[2] ?? paragraphs[1] ?? article.summary).slice(0, 260);

  const cta = `More in the full article 👇\n\n${url}\n\n#LearnJapanese #KitsuBeat`;

  return [hook, insight1, insight2, cta];
}

// ─── Generate schedule ────────────────────────────────────────────────────────

const start = new Date(START_DATE + "T00:00:00Z");
const end = new Date(start);
end.setUTCMonth(end.getUTCMonth() + MONTHS);

// Build vocab pool grouped by anime
const vocabByAnime = new Map<string, VocabWord[]>();
for (const anime of allAnimes) {
  vocabByAnime.set(anime.anime, shuffle([...anime.vocab]));
}
const animeList = shuffle([...allAnimes]);
const usedWords = new Map<string, Set<string>>(); // anime → set of used surfaces

function pickThreeWords(anime: AnimeVocab): VocabWord[] {
  if (!usedWords.has(anime.anime)) usedWords.set(anime.anime, new Set());
  const used = usedWords.get(anime.anime)!;
  const pool = vocabByAnime.get(anime.anime)!.filter(w => !used.has(w.surface));

  // If fewer than 3 remaining, reset
  if (pool.length < 3) {
    usedWords.set(anime.anime, new Set());
    return pickThreeWords(anime);
  }

  const picked = pool.slice(0, 3);
  picked.forEach(w => used.add(w.surface));
  return picked;
}

// Rotating quiz word pool
const quizPool = shuffle(allAnimes.flatMap(a => a.vocab.map(w => ({ anime: a, word: w }))));
let quizCursor = 0;

// Article cursor
let articleCursor = 0;
const shuffledArticles = shuffle([...articles]);

// Anime rotation for vocab
let animeCursor = 0;

const queue: QueueEntry[] = [];
const current = new Date(start);

while (current < end) {
  const dateStr = current.toISOString().slice(0, 10);
  const type = contentTypeForDay(current.getUTCDay());

  if (type === "vocab") {
    const anime = animeList[animeCursor % animeList.length];
    animeCursor++;
    const words = pickThreeWords(anime);
    queue.push({
      date: dateStr,
      type,
      tweets: [
        vocabTweet(words[0], "1/3", anime),
        vocabTweet(words[1], "2/3", anime),
        vocabTweet(words[2], "3/3", anime),
      ],
    });

  } else if (type === "quiz") {
    const words = [0, 1, 2].map(i => quizPool[(quizCursor + i) % quizPool.length].word);
    quizCursor += 3;
    queue.push({ date: dateStr, type, tweets: quizThread(words, allMeanings) });

  } else {
    const article = shuffledArticles[articleCursor % shuffledArticles.length];
    articleCursor++;
    queue.push({ date: dateStr, type, tweets: articleThread(article) });
  }

  current.setUTCDate(current.getUTCDate() + 1);
}

// ─── Save ──────────────────────────────────────────────────────────────────────

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT, JSON.stringify({ generated: new Date().toISOString(), count: queue.length, queue }, null, 2));

console.log(`\n✓ Generated ${queue.length} posts`);
console.log(`  • ${queue.filter(e => e.type === "vocab").length} vocab threads`);
console.log(`  • ${queue.filter(e => e.type === "quiz").length} quiz posts`);
console.log(`  • ${queue.filter(e => e.type === "article").length} article threads`);
console.log(`\n  Saved to src/data/social-queue.json`);
