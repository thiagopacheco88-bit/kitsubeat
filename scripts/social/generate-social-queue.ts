/**
 * Generates 6 months of social posts from local data — no API calls.
 * Quiz distractors are picked algorithmically: same JLPT level, different category,
 * filtered for quality (no character names, no self-referential answers).
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

const ANIME_HASHTAGS: Record<string, string> = {
  "naruto": "#Naruto",
  "one-piece": "#OnePiece",
  "bleach": "#Bleach",
  "attack-on-titan": "#AttackOnTitan",
  "demon-slayer": "#DemonSlayer",
  "death-note": "#DeathNote",
  "dragon-ball-z": "#DragonBall",
  "hunter-x-hunter": "#HxH",
  "tokyo-ghoul": "#TokyoGhoul",
  "jujutsu-kaisen": "#JujutsuKaisen",
  "my-hero-academia": "#MyHeroAcademia",
  "chainsaw-man": "#ChainsawMan",
  "fairy-tail": "#FairyTail",
  "sword-art-online": "#SAO",
  "fullmetal-alchemist": "#FMA",
  "code-geass": "#CodeGeass",

};

const HASHTAG_POOLS = [
  "#LearnJapanese #KitsuBeat",
  "#LearnJapanese #AnimeJapanese #KitsuBeat",
  "#JLPT #LearnJapanese #KitsuBeat",
  "#StudyJapanese #KitsuBeat",
  "#AnimeJapanese #KitsuBeat",
  "#JapaneseStudy #LearnJapanese #KitsuBeat",
];

// ─── Load data ────────────────────────────────────────────────────────────────

const allAnimes: AnimeVocab[] = readdirSync(VOCAB_DIR)
  .filter(f => f.endsWith(".json") && f !== "anime-core.json")
  .map(f => JSON.parse(readFileSync(join(VOCAB_DIR, f), "utf8")) as AnimeVocab)
  .filter(a => a.vocab?.length >= 3);


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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** First sentence of context, capped at maxChars with word-boundary truncation */
function contextSentence(context: string, maxChars = 200): string {
  const first = context.split(/(?<=[.!?])\s/)[0]?.trim() ?? context;
  if (first.length <= maxChars) return first;
  // Truncate at last word boundary within limit
  const cut = first.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
}

/**
 * Context quality gate — returns true if the context is rich enough to publish.
 * Rejects: too short, or no named entity (capital word not at sentence start).
 * This prevents "Offensive action in SAO combat." from slipping through.
 */
function hasRichContext(context: string): boolean {
  const t = context?.trim() ?? "";
  if (t.length < 80) return false;
  // Reject "in [ACRONYM]." sign-off sentences — no scene detail
  if (/\bin [A-Z]{2,5}[.!?]?\s*$/.test(t)) return false;
  // Must have a mid-sentence proper noun (capitalised word of 2+ chars after lowercase/comma)
  return /(?<=[a-z,])\s[A-Z][a-z]{1,}/.test(t);
}

// ─── Engagement question pools ─────────────────────────────────────────────────

const QUIZ_ENGAGE = [
  "How many did you get? Quote with your score 👇",
  "Score? Quote this thread with it 👇",
  "All 3? Quote with ✅✅✅ 👇",
  "KitsuBeat uses FSRS — you'll remember these in 3 sessions, not 30 🎌",
];

const VOCAB_ENGAGE = [
  "Which one surprised you? Quote with it 👇",
  "Unlike Anki, KitsuBeat ties each word to the anime scene — context is the memory 📌",
  "Which word did you already know? 👇",
  "Quote with the one you're learning first 👇",
  "KitsuBeat's FSRS resurfaces these right before you'd forget — try it free 🎌",
  "Spaced repetition + anime context = the only way these actually stick 🎌",
];

const ARTICLE_ENGAGE = [
  "What other anime should we break down? Quote this 👇",
  "Which detail surprised you most? Reply below 👇",
  "KitsuBeat turns this vocab into FSRS drills — 3 sessions to remember, not 30 🎌",
  "What should we cover next?",
  "Practice these words with anime context on KitsuBeat 🎌",
];

const JLPT_CTAS: Array<(label: string, jlpt: string | null) => string> = [
  (label) => `KitsuBeat's ${label} deck uses FSRS — you'll remember these in 3 sessions, not 30 🎌`,
  (label, jlpt) => jlpt
    ? `${jlpt} words, anime scene context, FSRS scheduling — that's KitsuBeat's ${label} deck 🎌`
    : `Anime context + FSRS scheduling — KitsuBeat's ${label} deck makes these stick without grinding 🎌`,
  (label) => `Unlike Anki, KitsuBeat's ${label} deck ties each word to the scene it came from — context is the memory 📌`,
  (label, jlpt) => jlpt
    ? `KitsuBeat resurfaces these ${jlpt} ${label} words right before you'd forget them — that's FSRS 🎌`
    : `KitsuBeat resurfaces ${label} vocab right before you'd forget it — that's what FSRS does 🎌`,
];

// Guard: only embed romaji in hooks when it's short enough not to inflate tweet length
const short = (w: VocabWord) => w.romaji.length <= 12;
const VOCAB_HOOK_TEMPLATES: Array<(label: string, emoji: string, topWord: VocabWord) => string> = [
  (label, emoji, w) => short(w)
    ? `You've heard ${w.romaji} in ${label}. But do you know what it means? ${emoji}`
    : `You've watched ${label} — but do you know these 3 words? ${emoji}`,
  (label, emoji, w) => short(w)
    ? `${label} uses ${w.romaji} in a key scene — do you know what it means? ${emoji}`
    : `${label} fans — 3 words from the show you might not actually know ${emoji}`,
  (label, emoji) => `You've watched ${label}. How many of these 3 words can you actually define? ${emoji}`,
  (label, emoji, w) => short(w)
    ? `${label} fans: can you translate ${w.romaji}? ${emoji}`
    : `${label} fans — 3 vocab words. How many can you actually translate? ${emoji}`,
  (label, emoji) => `3 words from ${label} you've heard hundreds of times — do you actually know them? ${emoji}`,
  (label, emoji) => `${label} vocabulary — do you know all 3? ${emoji}`,
  (label, emoji, w) => short(w)
    ? `Learning Japanese through ${label} ${emoji}\n\nStart with ${w.romaji} — the hardest one:`
    : `Learning Japanese through ${label} ${emoji}`,
  (label, emoji, w) => short(w)
    ? `Most ${label} fans hear ${w.romaji} constantly but can't translate it ${emoji}`
    : `You've watched ${label} dozens of times — but how much Japanese did you actually absorb? ${emoji}`,
];

// ─── Tweet builders ───────────────────────────────────────────────────────────

function vocabTweet(
  word: VocabWord,
  counter: "1/3" | "2/3" | "3/3",
  anime: AnimeVocab,
  hookTemplate: (label: string, emoji: string, topWord: VocabWord) => string,
  topWord: VocabWord,
  // Change 3: JLPT label for the set (derived from topWord or word — use word's own level inline)
  setJlpt: string | null
): string {
  const emoji = ANIME_EMOJIS[anime.anime] ?? "🎌";
  const headerLine = counter === "1/3"
    ? hookTemplate(
        setJlpt ? `${anime.label} (${setJlpt})` : anime.label,
        emoji,
        topWord
      )
    : null;
  const header = headerLine ? `${headerLine}\n\n` : "";
  const animeTag = ANIME_HASHTAGS[anime.anime] ?? "";
  const hashtags = animeTag ? `${animeTag} ${pick(HASHTAG_POOLS)}` : pick(HASHTAG_POOLS);
  const engage = setJlpt
    ? pick(JLPT_CTAS)(anime.label, setJlpt)
    : pick(VOCAB_ENGAGE);
  const wordBlock = `${word.surface} (${word.reading}) — ${word.romaji}\n"${word.meanings.en}"\n\n`;
  const counterStr = `\n\n(${counter})`;
  // Build CTA for tweet 3; fall back to compact version when space is tight
  let ctaStr = "";
  if (counter === "3/3") {
    const fullCta = `\n\n${engage}\n\nKitsuBeat 🎌 ${SITE_URL}\n\n${hashtags}`;
    const shortCta = `\n\nUnlike Anki, KitsuBeat ties each word to the scene — try it free 🎌\n${SITE_URL}`;
    const budgetWithFull = 276 - header.length - wordBlock.length - counterStr.length - fullCta.length;
    ctaStr = budgetWithFull >= 80 ? fullCta : shortCta;
  }
  // Dynamic context budget for ALL counters — prevents overflow on tweets 1+2 with long headers
  const maxCtxChars = Math.max(40, 276 - header.length - wordBlock.length - counterStr.length - ctaStr.length);
  const sentence = contextSentence(word.context, maxCtxChars);

  return `${header}${wordBlock}${sentence}${counterStr}${ctaStr}`;
}

/** Pick the "most interesting" word from a set to feature in the hook.
 *  Heuristic: fewest vocab results = rarest; break ties by longest meaning string. */
function pickTopWord(words: VocabWord[]): VocabWord {
  return words.reduce((best, w) => {
    if (w.meanings.en.length > best.meanings.en.length) return w;
    return best;
  }, words[0]);
}

/** Majority JLPT level from a word set, or null if ambiguous / unavailable. */
function majorityJlpt(words: VocabWord[]): string | null {
  const counts = new Map<string, number>();
  for (const w of words) {
    if (w.jlpt_level) counts.set(w.jlpt_level, (counts.get(w.jlpt_level) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return top[0];
}

// Proper-noun categories that make bad distractors (confuse vocab with lore)
const DISTRACTOR_BLOCKED = new Set(["character", "characters", "factions", "places", "lore"]);
// Categories that make bad quiz words (institution names, faction names, locations)
const QUIZ_BLOCKED = new Set(["character", "characters", "factions", "places"]);

const distractorPool: VocabWord[] = []; // populated after allAnimes loads

// Proper noun meanings: single word ("Happy") or all-title-case phrase ("Shadow Clone Technique")
// Excludes slash-separated translations like "lie / falsehood" or "defense; protection"
// Strips parenthetical context ("Saiyan (alien warrior race)" → "Saiyan") and
// em-dash descriptions ("Sakuradite mine — strategic resource site" → "Sakuradite mine")
// before checking, to catch proper nouns that slip through with added context.
// Uses \S* instead of [a-zA-Z]* to handle romanised Japanese with macrons (Kidō, Ōtsutsuki).
function isProperNounMeaning(meaning: string): boolean {
  const m = meaning.trim();
  // Allow anything with slash/semicolon separators — those are real vocab definitions
  if (/[/;]/.test(m)) return false;
  const base = m.replace(/\s*\(.*\)\s*$/, "").replace(/\s*—.*$/, "").trim();
  // Single capitalised word (e.g. "Saiyan", "Hierro", "Kidō")
  if (/^[A-Z]\S*$/.test(base)) return true;
  // All words title-cased (e.g. "Shadow Clone Technique", "Kidō Corps")
  return /^([A-Z]\S* )+[A-Z]\S*$/.test(base);
}

function isValidDistractor(candidate: VocabWord, quizWord: VocabWord): boolean {
  if (candidate.surface === quizWord.surface) return false;
  if (candidate.meanings.en === quizWord.meanings.en) return false;
  if (DISTRACTOR_BLOCKED.has(candidate.category)) return false;
  if (isProperNounMeaning(candidate.meanings.en)) return false;
  if (candidate.romaji && candidate.meanings.en.toLowerCase().includes(candidate.romaji.toLowerCase())) return false;
  // Filter lore-referencing patterns: "the Rumbling", "a Titan", "an Espada"
  if (/^(the|a|an) [A-Z]/.test(candidate.meanings.en)) return false;
  // Filter overly long compound descriptions that read as obviously wrong answers
  const wordCount = candidate.meanings.en.split(/[\s/;]+/).filter(Boolean).length;
  if (wordCount > 6) return false;
  return true;
}

function pickDistractors(word: VocabWord): string[] {
  // Prefer same JLPT level, different category — then widen if needed
  const sameLevelDiffCat = distractorPool.filter(
    c => isValidDistractor(c, word) && c.jlpt_level === word.jlpt_level && c.category !== word.category
  );
  const sameLevel = distractorPool.filter(
    c => isValidDistractor(c, word) && c.jlpt_level === word.jlpt_level
  );
  const fallback = distractorPool.filter(c => isValidDistractor(c, word));

  const pool = sameLevelDiffCat.length >= 3 ? sameLevelDiffCat
    : sameLevel.length >= 3 ? sameLevel
    : fallback;

  return shuffle(pool).slice(0, 3).map(c => c.meanings.en);
}

function buildQuizOptions(word: VocabWord): { options: string[]; slot: number } {
  const slot = Math.floor(Math.random() * 4);
  const distractors = pickDistractors(word);
  const options = [...distractors];
  options.splice(slot, 0, word.meanings.en);
  return { options, slot };
}

// Change 5: Quiz hook improvement — include JLPT level and specificity
function buildQuizHook(anime: AnimeVocab | null, quizJlpt: string | null): string {
  const level = quizJlpt ? `${quizJlpt} ` : "";
  if (anime) {
    const emoji = ANIME_EMOJIS[anime.anime] ?? "🎌";
    return pick([
      `3 ${level}words from ${anime.label} — how many can you translate? ${emoji} 🧵`,
      `${anime.label} ${level}vocab quiz ${emoji}\nHow many can you get right? 🧵`,
      `Think you know ${anime.label}'s Japanese? ${emoji}\n3 ${level}words. Prove it 🧵`,
      `${level}vocab from ${anime.label} ${emoji}\nCan you get all 3 before scrolling? 🧵`,
    ]);
  }
  return pick([
    `${level}Japanese vocab from anime — can you get all 3? 🎌 🧵`,
    `3 ${level}Japanese words from anime\nHow many can you translate? 🧵`,
    `Anime vocabulary test${quizJlpt ? ` (${quizJlpt} level)` : ""} 🧵\nLet's see how much you've picked up`,
    "Quick Japanese quiz — no looking it up 👀\n3 words. Go. 🧵",
    `You've heard these ${level}words in anime.\nBut do you know what they mean? 🧵`,
    `Think you know your anime Japanese?\n3 ${level}words. Prove it 🧵`,
    `3 ${level}vocab words straight from anime\nGuess them all 🧵`,
    "How much anime Japanese have you actually absorbed?\nLet's find out 🧵",
  ]);
}

function animeSource(anime: AnimeVocab): string {
  const emoji = ANIME_EMOJIS[anime.anime] ?? "🎌";
  return `${anime.label} ${emoji}`;
}

function quizThread(entries: { anime: AnimeVocab; word: VocabWord }[]): string[] {
  const words = entries.map(e => e.word);
  const letters = ["A", "B", "C", "D"];
  const quizzes = words.map(w => ({ word: w, ...buildQuizOptions(w) }));

  // Use anime-specific hook when all 3 words come from the same series
  const animeIds = new Set(entries.map(e => e.anime.anime));
  const singleAnime = animeIds.size === 1 ? entries[0].anime : null;
  const quizJlpt = majorityJlpt(words);
  const hook = buildQuizHook(singleAnime, quizJlpt);

  // Per-question source attribution — omit when all from same anime (hook already says it)
  const src = (i: number) => singleAnime ? "" : ` · ${animeSource(entries[i].anime)}`;

  // Tweet 1 — Q1 only, no answer
  const t1 = [
    hook,
    ``,
    `Q1: What does ${quizzes[0].word.romaji} (${quizzes[0].word.surface}) mean?${src(0)}`,
    ``,
    ...quizzes[0].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");

  // Brief lore callback for answer reveals — makes the reveal feel meaningful, not mechanical
  const loreHint = (quiz: { word: VocabWord }) => {
    const hint = contextSentence(quiz.word.context, 50);
    return hint.length > 20 ? hint : "";
  };

  // Tweet 2 — A1 reveal + lore note + Q2
  const q0hint = loreHint(quizzes[0]);
  const t2 = [
    `✅ Q1 answer: ${letters[quizzes[0].slot]}) ${quizzes[0].word.meanings.en}`,
    ...(q0hint ? [q0hint, ``] : [``]),
    `Q2: What does ${quizzes[1].word.romaji} (${quizzes[1].word.surface}) mean?${src(1)}`,
    ``,
    ...quizzes[1].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");

  // Tweet 3 — A2 reveal + lore note + Q3
  const q1hint = loreHint(quizzes[1]);
  const t3 = [
    `✅ Q2 answer: ${letters[quizzes[1].slot]}) ${quizzes[1].word.meanings.en}`,
    ...(q1hint ? [q1hint, ``] : [``]),
    `Q3: What does ${quizzes[2].word.romaji} (${quizzes[2].word.surface}) mean?${src(2)}`,
    ``,
    ...quizzes[2].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");

  // Tweet 4 — A3 reveal + engagement + CTA
  const animeTag = singleAnime ? (ANIME_HASHTAGS[singleAnime.anime] ?? "") : "";
  const hashtags = animeTag
    ? `${animeTag} #LearnJapanese #KitsuBeat`
    : pick(HASHTAG_POOLS);
  const quizCta = quizJlpt
    ? `Want to make these ${quizJlpt} words stick? KitsuBeat uses spaced repetition (FSRS) to drill anime vocab until you own it 🎌`
    : pick(QUIZ_ENGAGE);
  const t4 = [
    `✅ Q3 answer: ${letters[quizzes[2].slot]}) ${quizzes[2].word.meanings.en}`,
    ``,
    quizCta,
    ``,
    `${SITE_URL}`,
    ``,
    hashtags,
  ].join("\n");

  return [t1, t2, t3, t4];
}

function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSentence = cut.search(/[.!?][^.!?]*$/);
  return lastSentence > 0 ? cut.slice(0, lastSentence + 1) : cut;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

function articleThread(article: Record<string, string>): string[] {
  const url = `${SITE_URL}/journal/${article.slug}`;

  // Extract substantive paragraphs — strip blog-format structural labels and Q&A-style openers
  // that read as non-sequiturs without the implied question context
  const allParagraphs = article.body
    .split(/\n+/)
    .map(p => stripMarkdown(p.trim()))
    .filter(p =>
      p.length > 120 &&
      !p.startsWith("#") &&
      !p.startsWith(">") &&
      !p.startsWith("-") &&
      !/^(notes?|example|grammar|tip):/i.test(p) &&
      !/^(yes[.,!]|no[.,!—]|here'?s the thing|here'?s what|not exactly|not quite)/i.test(p)
    );

  // Pick the 3 meatiest paragraphs, preserving article order
  const sorted = [...allParagraphs]
    .map((p, i) => ({ p, i, len: p.length }))
    .sort((a, b) => b.len - a.len)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map(({ p }) => truncateAtSentence(p, 260));

  const hook = article.subtitle
    ? `${article.title} 🧵\n\n${article.subtitle}`
    : `${article.title} 🧵`;

  // Derive anime hashtag from article slug when possible
  const slugAnime = Object.keys(ANIME_HASHTAGS).find(k =>
    article.slug?.toLowerCase().includes(k.replace(/-/g, "")) ||
    article.slug?.toLowerCase().includes(k)
  );
  const animeTag = slugAnime ? (ANIME_HASHTAGS[slugAnime] ?? "") : "";
  const hashtags = animeTag
    ? `${animeTag} #LearnJapanese #KitsuBeat`
    : pick(HASHTAG_POOLS);

  const mention = `${pick(ARTICLE_ENGAGE)}\n\nFull write-up: ${url}\n\n${hashtags}`;

  return [hook, ...sorted, mention];
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
  // context quality gate + no character names in vocab threads (names aren't learnable words)
  const pool = vocabByAnime.get(anime.anime)!.filter(
    w => !used.has(w.surface) && hasRichContext(w.context) && !QUIZ_BLOCKED.has(w.category)
  );

  // If fewer than 3 with rich context, fall back to ungated pool to avoid infinite loop
  const fallbackPool = vocabByAnime.get(anime.anime)!.filter(w => !used.has(w.surface));
  const activePool = pool.length >= 3 ? pool : fallbackPool;

  // If still fewer than 3 remaining, reset used set and retry
  if (activePool.length < 3) {
    usedWords.set(anime.anime, new Set());
    return pickThreeWords(anime);
  }

  const picked = activePool.slice(0, 3);
  picked.forEach(w => used.add(w.surface));
  return picked;
}

// Populate distractor pool now that allAnimes is loaded
distractorPool.push(...allAnimes.flatMap(a => a.vocab));

// Quiz pool: exclude self-referential, blocked categories, long compounds, single proper nouns,
// and purely-katakana surfaces (almost always proper nouns/loanword transliterations)
const quizPool = shuffle(
  allAnimes.flatMap(a => a.vocab.map(w => ({ anime: a, word: w })))
    .filter(({ word: w }) =>
      w.surface.length <= 8 &&
      !QUIZ_BLOCKED.has(w.category) &&
      !isProperNounMeaning(w.meanings.en) &&
      !w.meanings.en.toLowerCase().includes(w.romaji.toLowerCase()) &&
      !/^[゠-ヿー・]+$/.test(w.surface)
    )
);
let quizCursor = 0;

// Article cursor
let articleCursor = 0;
const shuffledArticles = shuffle([...articles]);

// Hook template rotation — round-robin so each template is used before any repeats
const shuffledHooks = shuffle([...VOCAB_HOOK_TEMPLATES]);
let hookCursor = 0;
function nextHookTemplate(): (label: string, emoji: string, topWord: VocabWord) => string {
  const fn = shuffledHooks[hookCursor % shuffledHooks.length];
  hookCursor++;
  return fn;
}

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
    const hookTemplate = nextHookTemplate();
    const topWord = pickTopWord(words);
    const setJlpt = majorityJlpt(words);
    // Put topWord first so the hook's challenge word matches what tweet 1 teaches
    const orderedWords = [topWord, ...words.filter(w => w.surface !== topWord.surface)];
    queue.push({
      date: dateStr,
      type,
      tweets: [
        vocabTweet(orderedWords[0], "1/3", anime, hookTemplate, topWord, setJlpt),
        vocabTweet(orderedWords[1], "2/3", anime, hookTemplate, topWord, setJlpt),
        vocabTweet(orderedWords[2], "3/3", anime, hookTemplate, topWord, setJlpt),
      ],
    });

  } else if (type === "quiz") {
    // Re-shuffle on cycle to avoid repeating the same order in the second pass
    if (quizCursor + 3 > quizPool.length) {
      quizCursor = 0;
      for (let i = quizPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizPool[i], quizPool[j]] = [quizPool[j], quizPool[i]];
      }
    }
    const entries = [0, 1, 2].map(i => quizPool[quizCursor + i]);
    quizCursor += 3;
    queue.push({ date: dateStr, type, tweets: quizThread(entries) });

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
