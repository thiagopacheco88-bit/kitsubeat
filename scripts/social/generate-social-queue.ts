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

// ─── Hooks cache (AI-generated hooks + word insights) ─────────────────────────
const HOOKS_CACHE_PATH = join(process.cwd(), ".planning/anime-vocab/hooks-cache.json");
const hooksCache: Record<string, Record<string, string | string[]>> = existsSync(HOOKS_CACHE_PATH)
  ? JSON.parse(readFileSync(HOOKS_CACHE_PATH, "utf8"))
  : {};
const animeCacheHookCursors: Record<string, number> = {};

function nextCachedHook(animeId: string): string | null {
  const entry = hooksCache[animeId];
  const hooks = entry?._hooks as string[] | undefined;
  if (!hooks?.length) return null;
  if (animeCacheHookCursors[animeId] === undefined) animeCacheHookCursors[animeId] = 0;
  const hook = hooks[animeCacheHookCursors[animeId] % hooks.length];
  animeCacheHookCursors[animeId]++;
  return hook;
}

function getCachedInsight(animeId: string, surface: string): string | null {
  const val = hooksCache[animeId]?.[surface];
  return typeof val === "string" ? val : null;
}

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

const START_DATE = "2026-05-26";
const MONTHS = 12;

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
  "#NihongoStudy #LearnJapanese #KitsuBeat",
  "#AnimeStudy #JapaneseWithAnime #KitsuBeat",
  "#Nihongo #AnimeLanguage #KitsuBeat",
  "#LearnJapaneseFast #AnimeJapanese #KitsuBeat",
  "#JapaneseVocab #Nihongo #KitsuBeat",
];

// ─── Load data ────────────────────────────────────────────────────────────────

const allAnimes: AnimeVocab[] = readdirSync(VOCAB_DIR)
  .filter(f => f.endsWith(".json") && f !== "anime-core.json")
  .map(f => JSON.parse(readFileSync(join(VOCAB_DIR, f), "utf8")) as AnimeVocab)
  .filter(a => a.vocab?.length >= 3);


type ArticleData = Record<string, string> & {
  body: string;
  faq?: Array<{ question: string; answer: string }>;
};

const articles: ArticleData[] = readdirSync(JOURNAL_DIR)
  .filter(f => f.endsWith(".mdx"))
  .map(f => {
    const raw = readFileSync(join(JOURNAL_DIR, f), "utf8");
    const { data, content } = matter(raw);
    const body = content
      .replace(/^import .+$/gm, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const faq = Array.isArray((data as any).faq) ? (data as any).faq : undefined;
    return { ...data as Record<string, string>, body, faq };
  })
  .filter(a => a.slug && a.title)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contentTypeForDay(dayOfWeek: number): "vocab" | "quiz" | "article" {
  if (dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6) return "article";
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
  const cut = first.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace <= maxChars * 0.6) return cut + "…";
  // Strip trailing connector chains ("core of the" → "core", "to move in" → "to move")
  // Loop because one pass may expose another connector (e.g. removes "the", then "of")
  const TRAILING_CONNECTOR = /\s+[-—–,;:]?\s*(a|an|the|but|and|or|in|on|at|to|of|for|with|from)\.?$/i;
  let trimmed = cut.slice(0, lastSpace);
  let prev = "";
  while (prev !== trimmed) { prev = trimmed; trimmed = trimmed.replace(TRAILING_CONNECTOR, "").trimEnd(); }
  return (trimmed.length > maxChars * 0.5 ? trimmed : cut.slice(0, lastSpace)) + "…";
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
  "How many did you get? Drop your score below 👇",
  "Which one did you already know? Reply below 👇",
  "KitsuBeat resurfaces these right before you'd forget them. That's FSRS in practice 🎌",
  "Got them all? KitsuBeat's FSRS means you'll still remember them in a month 🎌",
  "Save this thread. Come back next week and see what actually stuck 📸",
  "The answers are in the video. Come back to this thread once you've watched 🎌",
];

const VOCAB_ENGAGE = [
  "Which one did you already know? Reply below 👇",
  "KitsuBeat ties each word to the anime scene it came from. That's what makes them stick 📌",
  "Save this. These 3 words will come up on your next rewatch 📸",
  "KitsuBeat resurfaces these right before you'd forget them. That's how FSRS works 🎌",
  "Anime context does half the memory work. KitsuBeat handles the rest 🎌",
  "📸 Save this thread: 3 words, the scenes they came from, nothing to memorise",
  "You've already heard these words in the show. Now you know what they mean 🎌",
  "Which of these feels familiar from watching the anime? Reply below 👇",
  "Which word surprised you once you saw the meaning? 👇",
];

const ARTICLE_ENGAGE = [
  "KitsuBeat resurfaces each of these words right before you'd forget them. No grinding needed 🎌",
  "KitsuBeat ties each word to the anime scene it came from. That's what makes them stick 🎌",
  "You heard these words in anime before you knew what they meant. KitsuBeat makes that stick 🎌",
  "📌 Save this. Next time you hear one of these in anime, you'll actually know what it means",
  "KitsuBeat puts these words in your spaced-repetition schedule, tied to the scenes you know 🎌",
  "Anime does a lot of the vocabulary work passively. KitsuBeat just makes it intentional 🎌",
];

const JLPT_CTAS: Array<(label: string, jlpt: string | null) => string> = [
  (label) => `KitsuBeat's ${label} deck uses FSRS. You'll remember these in 3 sessions, not 30 🎌`,
  (label, jlpt) => jlpt
    ? `${jlpt} words, anime scene context, FSRS scheduling. That's KitsuBeat's ${label} deck 🎌`
    : `Anime context + FSRS scheduling. KitsuBeat's ${label} deck makes these stick without grinding 🎌`,
  (label) => `KitsuBeat's ${label} deck ties each word to the anime scene it came from. That's what makes them stick 📌`,
  (label, jlpt) => jlpt
    ? `KitsuBeat resurfaces these ${jlpt} ${label} words right before you'd forget them. That's FSRS 🎌`
    : `KitsuBeat resurfaces ${label} vocab right before you'd forget it. That's what FSRS does 🎌`,
  (label) => `📸 Screenshot this: 3 ${label} words you'll encounter in your next binge`,
  () => `Save this: 3 words, 3 anime scenes. Your offline vocab card 📸`,
  // Experience-loop closers: reader just experienced how KitsuBeat works
  () => `No flashcards. Anime words, the scenes they came from, FSRS timing. That's KitsuBeat 🎌`,
  (label, jlpt) => jlpt
    ? `${label} vocab → scene context → FSRS timing = words that stick without grinding. That's KitsuBeat 🎌`
    : `Anime vocab → scene context → FSRS timing = words that stick. That's KitsuBeat 🎌`,
  // Emotional resonance: reader already felt these words, now KitsuBeat makes them permanent
  (label) => `You've already felt these ${label} words in the show. KitsuBeat just makes them permanent 🎌`,
  () => `You heard it in anime. The emotion did half the work. KitsuBeat does the rest 🎌`,
  // Engagement-prompt CTAs — activate replies without sacrificing product signal
  (label) => `Which of these ${label} words did you already know? Drop it below 👇`,
  (label, jlpt) => jlpt
    ? `${jlpt} ${label} vocab: which one hits different once you know the meaning? Reply 👇`
    : `Which of these words surprised you most when you found out the meaning? 👇`,
];

// Guard: only embed romaji in hooks when it's short enough not to inflate tweet length
const short = (w: VocabWord) => w.romaji.length <= 12;
const VOCAB_HOOK_TEMPLATES: Array<(label: string, emoji: string, topWord: VocabWord) => string> = [
  // Recognition — you already know this word, now here's what it means
  (label, emoji, w) => short(w)
    ? `If you've watched ${label}, you already know ${w.romaji}. Here's what it actually means ${emoji}`
    : `If you've watched ${label}, you already know these words. Here's what they mean ${emoji}`,
  // Discovery — the word carries more than you thought
  (label, emoji, w) => short(w)
    ? `${label} uses ${w.romaji} in some of its most loaded moments. This is what it means ${emoji}`
    : `3 ${label} words that carry more meaning than they first appear to ${emoji}`,
  // Meaning-reveal — genuine "I didn't know that" moment
  (label, emoji, w) => short(w)
    ? `${w.romaji} in ${label} literally means "${w.meanings?.en ?? "something deeper"}". It changes how the scenes read ${emoji}`
    : `The ${label} vocabulary that changes how you read the show once you know it ${emoji}`,
  // Passive learning — watching is already studying
  (label, emoji) => `Watching ${label} is already Japanese study. You've just been doing it without subtitles ${emoji}`,
  (label, emoji, w) => short(w)
    ? `You've heard ${w.romaji} in ${label} enough times that your brain already knows it. Here's the meaning ${emoji}`
    : `You've absorbed these ${label} words from hundreds of hours of watching. Here's what they mean ${emoji}`,
  // Save-forward — useful next time
  (label, emoji, w) => short(w)
    ? `Save this for your next ${label} rewatch. ${w.romaji} is one of those words that keeps coming up ${emoji}`
    : `📌 Save this for your next ${label} rewatch. 3 words that keep coming up ${emoji}`,
  // Quiet observation — no pressure
  (label, emoji) => `3 ${label} words worth knowing. The ones that carry whole arcs ${emoji}`,
  (label, emoji, w) => short(w)
    ? `Learning Japanese through ${label} ${emoji}\n\n${w.romaji} is the one that comes up everywhere:`
    : `Learning Japanese through ${label} ${emoji}\n\n3 words from the show worth actually knowing:`,
];

/** Returns extra hook options tuned to the current anime season. 30% usage rate in main loop. */
function getSeasonalHooks(dateStr: string): Array<(label: string, emoji: string, topWord: VocabWord) => string> {
  const m = new Date(dateStr + "T00:00:00Z").getUTCMonth() + 1; // 1-12
  if (m <= 3) return [
    (label, emoji) => `New season, good time to actually know what ${label} characters are saying ${emoji}`,
    (label, emoji) => `Winter anime season. 3 ${label} words worth picking up while you're watching ${emoji}`,
  ];
  if (m <= 6) return [
    (label, emoji) => `Spring season. A good time to start learning the ${label} vocabulary you keep hearing 🌸`,
    (label, emoji) => `New anime season is a good excuse to learn the Japanese that keeps showing up in ${label} ${emoji}`,
  ];
  if (m <= 9) return [
    (label, emoji) => `Good season for a long ${label} rewatch. Here's some vocabulary to go with it ${emoji}`,
    (label, emoji) => `Summer is a good time to put meaning to the ${label} words you've been hearing for years ${emoji}`,
  ];
  return [
    (label, emoji) => `Autumn anime season. 3 ${label} words worth knowing for the rewatch ${emoji}`,
    (label, emoji) => `Good time of year to revisit ${label}. Here's vocabulary that makes it land differently ${emoji}`,
  ];
}

// ─── Tweet builders ───────────────────────────────────────────────────────────

function vocabTweet(
  word: VocabWord,
  counter: "1/3" | "2/3" | "3/3",
  anime: AnimeVocab,
  hookTemplate: (label: string, emoji: string, topWord: VocabWord) => string,
  topWord: VocabWord,
  setJlpt: string | null,
  cachedHook: string | null = null
): string {
  const emoji = ANIME_EMOJIS[anime.anime] ?? "🎌";
  const headerLine = counter === "1/3"
    ? (cachedHook ?? hookTemplate(
        setJlpt ? `${anime.label} (${setJlpt})` : anime.label,
        emoji,
        topWord
      ))
    : null;
  const header = headerLine ? `${headerLine}\n\n` : "";
  const animeTag = ANIME_HASHTAGS[anime.anime] ?? "";
  const hashtags = animeTag ? `${animeTag} ${pick(HASHTAG_POOLS)}` : pick(HASHTAG_POOLS);
  const wordBlock = `${word.surface} (${word.reading}) · ${word.romaji}\n"${word.meanings.en}"\n\n`;
  const counterStr = `\n\n(${counter})`;
  // Build CTA for tweet 3 only; use rotation functions to prevent back-to-back repetition
  let ctaStr = "";
  if (counter === "3/3") {
    const engage = setJlpt
      ? nextJlptCta()(anime.label, setJlpt)
      : nextVocabEngage();
    const fullCta = `\n\n${engage}\n\nKitsuBeat 🎌 ${SITE_URL}\n\n${hashtags}`;
    const shortCta = `\n\nKitsuBeat ties each word to the anime scene it came from 🎌\n${SITE_URL}`;
    const budgetWithFull = 276 - header.length - wordBlock.length - counterStr.length - fullCta.length;
    ctaStr = budgetWithFull >= 40 ? fullCta : shortCta;
  }
  // Dynamic context budget for ALL counters — prevents overflow on tweets 1+2 with long headers
  const maxCtxChars = Math.max(40, 276 - header.length - wordBlock.length - counterStr.length - ctaStr.length);
  // Prefer cached linguistic insight over raw context sentence
  const cachedInsight = getCachedInsight(anime.anime, word.surface);
  const bodyText = cachedInsight && cachedInsight.length <= maxCtxChars
    ? cachedInsight
    : contextSentence(word.context, maxCtxChars);

  return `${header}${wordBlock}${bodyText}${counterStr}${ctaStr}`;
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
  // Test the PRIMARY meaning (before any slash/semicolon) — a slash doesn't exempt title-case names
  const primary = m.split(/[/;]/)[0].trim();
  const base = primary.replace(/\s*\(.*\)\s*$/, "").replace(/\s*—.*$/, "").trim();
  // Single capitalised word (e.g. "Saiyan", "Hierro", "Kidō")
  if (/^[A-Z]\S*$/.test(base)) return true;
  // All words title-cased (e.g. "Shadow Clone Technique", "Kidō Corps")
  if (/^([A-Z]\S* )+[A-Z]\S*$/.test(base)) return true;
  // Title-case phrase with lowercase connectors (e.g. "Inverted Spear of Heaven", "Dance of the Fire God")
  return /^[A-Z]\S*( [A-Z]\S*| (of|the|a|an|in|at|for|from|with|by) [A-Z]\S*)+$/.test(base);
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

  // Deduplicate by normalized meaning text so "mission / duty" and "mission/duty" don't both appear
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[/;,]+/g, " ").replace(/\s+/g, " ");
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of shuffle(pool)) {
    const key = normalize(c.meanings.en);
    if (!seen.has(key)) { seen.add(key); unique.push(c.meanings.en); }
    if (unique.length === 3) break;
  }
  return unique;
}

function buildQuizOptions(word: VocabWord): { options: string[]; slot: number } {
  const slot = Math.floor(Math.random() * 4);
  const distractors = pickDistractors(word);
  const options = [...distractors];
  options.splice(slot, 0, word.meanings.en);
  return { options, slot };
}

// All quiz hook options in one flat pool — rotated with a cursor to prevent repeats
const QUIZ_HOOK_SINGLE_ANIME: Array<(label: string, emoji: string, level: string) => string> = [
  // Recognition-first — you've heard these, now here's a quiz to lock them in
  (l, e, v) => `3 ${v}${l} words you've definitely heard before. Short quiz ${e} 🧵`,
  (l, e, v) => `If you've watched ${l}, you've heard all three of these ${v}words. Do you know what they mean? ${e} 🧵`,
  // Discovery — words that carry more than expected
  (l, e, v) => `A short ${l} vocabulary quiz ${e}\n3 ${v}words that carry more than they first appear to 🧵`,
  (l, e, v) => `These ${v}${l} words come up in almost every arc. A quick quiz ${e} 🧵`,
  // Low-pressure, curious tone
  (l, e, v) => `${l} vocabulary quiz ${e}\n3 ${v}words from the show worth actually knowing 🧵`,
  (l, e, v) => `${l} teaches you Japanese whether you mean to study it or not ${e}\nA quick quiz on 3 ${v}words 🧵`,
];
const QUIZ_HOOK_MULTI_ANIME: Array<(level: string, jlpt: string | null) => string> = [
  // Recognition — anime already taught you these
  (v) => `Three ${v}anime words that carry more meaning than most fans realise. Quick quiz 🎌 🧵`,
  (v, j) => `A short Japanese quiz from anime${j ? ` (${j})` : ""}. 3 ${v}words you've probably heard before 🧵`,
  // Discovery tone — the meanings change how scenes read
  (_v, j) => `Words from anime that hit differently once you know the translation${j ? ` (${j})` : ""} 🎌 🧵`,
  (v) => `You've absorbed a lot of Japanese from watching anime. Here's a short quiz to see what stuck 🎌 🧵`,
  // Specific and calm
  (v, j) => `3 ${v}vocab words from anime${j ? ` (${j} level)` : ""}. The sounds you know, with meaning attached 🧵`,
  (v) => `These ${v}words keep appearing across different anime for a reason. Do you know them? 🎌 🧵`,
  // Gentle curiosity
  (v) => `A short ${v}anime Japanese quiz. Three words worth locking in 🎌 🧵`,
  (v) => `Sometimes the best vocabulary lesson is the one you've already sat through while watching 🎌 🧵`,
];
const shuffledQuizHooksSingle = shuffle([...QUIZ_HOOK_SINGLE_ANIME]);
const shuffledQuizHooksMulti = shuffle([...QUIZ_HOOK_MULTI_ANIME]);
let quizHookSingleCursor = 0;
let quizHookMultiCursor = 0;

function buildQuizHook(anime: AnimeVocab | null, quizJlpt: string | null): string {
  const level = quizJlpt ? `${quizJlpt} ` : "";
  if (anime) {
    const emoji = ANIME_EMOJIS[anime.anime] ?? "🎌";
    const fn = shuffledQuizHooksSingle[quizHookSingleCursor % shuffledQuizHooksSingle.length];
    quizHookSingleCursor++;
    return fn(anime.label, emoji, level);
  }
  const fn = shuffledQuizHooksMulti[quizHookMultiCursor % shuffledQuizHooksMulti.length];
  quizHookMultiCursor++;
  return fn(level, quizJlpt);
}

function animeSource(anime: AnimeVocab): string {
  const emoji = ANIME_EMOJIS[anime.anime] ?? "🎌";
  return `${anime.label} ${emoji}`;
}

function quizThread(entries: { anime: AnimeVocab; word: VocabWord }[]): string[] {
  const words = entries.map(e => e.word);
  const letters = ["A", "B", "C", "D"];
  const quizzes = words.map(w => ({ word: w, ...buildQuizOptions(w) }));

  const animeIds = new Set(entries.map(e => e.anime.anime));
  const singleAnime = animeIds.size === 1 ? entries[0].anime : null;
  const quizJlpt = majorityJlpt(words);
  const hook = buildQuizHook(singleAnime, quizJlpt);

  const src = (i: number) => singleAnime ? "" : ` · ${animeSource(entries[i].anime)}`;

  // Insight for intermediate tweets — prefer cached linguistic insight, fall back to context sentence
  const loreHint = (quiz: { word: VocabWord }, entryIndex: number) => {
    const animeId = entries[entryIndex].anime.anime;
    const cached = getCachedInsight(animeId, quiz.word.surface);
    const hint = cached
      ? (cached.length <= 120 ? cached : cached.slice(0, 119) + "…")
      : contextSentence(quiz.word.context, 120);
    return hint.length > 20 ? `💡 ${hint}` : "";
  };

  // T1 — Q1 with explicit reply instruction (suspense arc: reveals held until T4)
  const replyInstr = "\n\nReply A, B, C, or D below 👇";
  const truncOpt = (s: string) => s.length > 35 ? s.slice(0, 34) + "…" : s;
  const t1base = [
    hook,
    ``,
    `Q1: What does ${quizzes[0].word.romaji} (${quizzes[0].word.surface}) mean?${src(0)}`,
    ``,
    ...quizzes[0].options.map((o, i) => `${letters[i]}) ${truncOpt(o)}`),
  ].join("\n");
  const t1 = (t1base + replyInstr).length <= 280 ? t1base + replyInstr : t1base;

  // T2 — lore hint + Q2; fall back to no-hint if adding it overflows
  const q0hint = loreHint(quizzes[0], 0);
  const spoilerNote = "\n\nAll answers revealed in tweet 4. No peeking 👀";
  const t2q = [
    `Q2: What does ${quizzes[1].word.romaji} (${quizzes[1].word.surface}) mean?${src(1)}`,
    ``,
    ...quizzes[1].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");
  const t2withHint = q0hint ? `${q0hint}\n\n${t2q}` : t2q;
  const t2base = t2withHint.length <= 280 ? t2withHint : t2q;
  const t2 = (t2base + spoilerNote).length <= 280 ? t2base + spoilerNote : t2base;

  // T3 — lore hint + Q3; same overflow guard
  const q1hint = loreHint(quizzes[1], 1);
  const finalNudge = "\n\nLast question. All reveals in the next tweet 👇";
  const t3q = [
    `Q3: What does ${quizzes[2].word.romaji} (${quizzes[2].word.surface}) mean?${src(2)}`,
    ``,
    ...quizzes[2].options.map((o, i) => `${letters[i]}) ${o}`),
  ].join("\n");
  const t3withHint = q1hint ? `${q1hint}\n\n${t3q}` : t3q;
  const t3base = t3withHint.length <= 280 ? t3withHint : t3q;
  const t3 = (t3base + finalNudge).length <= 280 ? t3base + finalNudge : t3base;

  // T4 — ALL THREE reveals in one payoff tweet + score prompt + FSRS CTA
  const animeTag = singleAnime ? (ANIME_HASHTAGS[singleAnime.anime] ?? "") : "";
  const hashtags = animeTag ? `${animeTag} #LearnJapanese #KitsuBeat` : pick(HASHTAG_POOLS);
  // Rotate the quiz CTA for variety and freshness
  const QUIZ_CTAS = quizJlpt ? [
    `KitsuBeat shows you the scene each word came from. That's how ${quizJlpt} vocab sticks without grinding 🎌`,
    `You felt these ${quizJlpt} words in anime already. KitsuBeat just makes the meaning permanent 🎌`,
    `${quizJlpt} vocab via anime scenes + FSRS timing = words that stick in 3 sessions not 30 🎌`,
  ] : [
    `KitsuBeat ties each word to the anime scene it came from. That's how vocab sticks without grinding 🎌`,
    `You felt these words in anime already. KitsuBeat makes the meaning permanent 🎌`,
    `Anime scene context + FSRS scheduling = vocab that sticks without grinding 🎌`,
  ];
  const quizCta = QUIZ_CTAS[Math.floor(Math.random() * QUIZ_CTAS.length)];

  // Truncate meanings so T4 stays under 280
  const trunc = (s: string, max = 38) => s.length <= max ? s : s.slice(0, max - 1) + "…";
  const truncShort = (s: string) => trunc(s, 25);
  const t4full = [
    `✅ Answers:`,
    `Q1: ${letters[quizzes[0].slot]}) ${quizzes[0].word.meanings.en}`,
    `Q2: ${letters[quizzes[1].slot]}) ${quizzes[1].word.meanings.en}`,
    `Q3: ${letters[quizzes[2].slot]}) ${quizzes[2].word.meanings.en}`,
    ``,
    `How many did you get? Drop your score below 👇`,
    ``,
    quizCta,
    ``,
    SITE_URL,
    ``,
    hashtags,
  ].join("\n");
  const t4short = [
    `✅ Answers:`,
    `Q1: ${letters[quizzes[0].slot]}) ${trunc(quizzes[0].word.meanings.en)}`,
    `Q2: ${letters[quizzes[1].slot]}) ${trunc(quizzes[1].word.meanings.en)}`,
    `Q3: ${letters[quizzes[2].slot]}) ${trunc(quizzes[2].word.meanings.en)}`,
    ``,
    `How many did you get? Drop your score below 👇`,
    ``,
    `KitsuBeat ties each word to its anime scene 🎌`,
    SITE_URL,
    ``,
    hashtags,
  ].join("\n");
  const t4micro = [
    `✅ Answers:`,
    `Q1: ${letters[quizzes[0].slot]}) ${truncShort(quizzes[0].word.meanings.en)}`,
    `Q2: ${letters[quizzes[1].slot]}) ${truncShort(quizzes[1].word.meanings.en)}`,
    `Q3: ${letters[quizzes[2].slot]}) ${truncShort(quizzes[2].word.meanings.en)}`,
    ``,
    `How many did you get? 👇`,
    ``,
    SITE_URL,
  ].join("\n");
  const t4 = t4full.length <= 280 ? t4full : t4short.length <= 280 ? t4short : t4micro;

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
      !/^\d+[.)]\s/.test(p) &&                   // numbered list items ("2. Stipend abolition…")
      !/^(notes?|example|grammar|tip):/i.test(p) &&
      !/^(yes[.,!]|no[.,!—]|here'?s the thing|here'?s what|not exactly|not quite)/i.test(p)
    );

  // FAQ answers are self-contained by design — each explains one concept without
  // assuming prior context. Use them as content tweets when available.
  // Fall back to body paragraph scoring only for articles without FAQ entries.
  let contentTweetTexts: string[];

  if (article.faq && article.faq.length >= 2) {
    // T2 = first body paragraph (narrative hook — the "why this is interesting")
    const firstBodyPara = allParagraphs[0] ? truncateAtSentence(stripMarkdown(allParagraphs[0]), 260) : null;
    // T3–T7 = up to 5 FAQ answers, each self-contained
    // Strip Q&A openers that read oddly out of context ("Yes. X is...", "Because...")
    const stripFaqOpener = (a: string): string =>
      a.replace(/^(yes[.,!]\s+|no[.,!]\s+|because\s+|not exactly[.,]\s+|not quite[.,]\s+)/i, s =>
        s.replace(/^./, c => c.toUpperCase())
          .replace(/^(yes[.,!]\s+|no[.,!]\s+|because\s+|not exactly[.,]\s+|not quite[.,]\s+)/i, "")
      ).replace(/^(yes|no)[.,]?\s+/i, "").replace(/^./, c => c.toUpperCase());
    const faqTweets = article.faq
      .map(f => stripFaqOpener(stripMarkdown(f.answer)))
      .filter(a => a.length > 60)
      .slice(0, 5)
      .map(a => truncateAtSentence(a, 260));
    contentTweetTexts = [...(firstBodyPara ? [firstBodyPara] : []), ...faqTweets];
  } else {
    // No FAQ — fall back to scored body paragraphs
    const paragraphScore = (p: string): number => {
      const n = (p.match(/[぀-ヿ一-鿿]/g) ?? []).length;
      const jpScore = n === 0 ? 0 : n <= 3 ? 1 : 2;
      const defBonus = n > 0 && /[぀-ヿ一-鿿].{0,60}\bmeans?\b|\).{0,60}\bmeans?\b/.test(p) ? 1 : 0;
      return jpScore * 2 + defBonus;
    };
    const scored = allParagraphs.map((p, i) => ({ p, i, len: p.length, score: paragraphScore(p) }));
    const firstPara = scored[0];
    const bestFive = scored
      .filter(x => !firstPara || x.i !== firstPara.i)
      .sort((a, b) => (b.score - a.score) || (b.len - a.len))
      .slice(0, 5);
    contentTweetTexts = [...(firstPara ? [firstPara] : []), ...bestFive]
      .sort((a, b) => a.i - b.i)
      .map(({ p }) => truncateAtSentence(p, 260));
  }

  const sorted = contentTweetTexts;

  const hook = article.subtitle
    ? `${stripMarkdown(article.title)} 🧵\n\n${stripMarkdown(article.subtitle)}`
    : `${stripMarkdown(article.title)} 🧵`;

  // Derive anime hashtag from article slug when possible
  const slugAnime = Object.keys(ANIME_HASHTAGS).find(k =>
    article.slug?.toLowerCase().includes(k.replace(/-/g, "")) ||
    article.slug?.toLowerCase().includes(k)
  );
  const animeTag = slugAnime ? (ANIME_HASHTAGS[slugAnime] ?? "") : "";
  // Mix anime tag with a niche pool entry for better discoverability
  const poolEntry = pick(HASHTAG_POOLS);
  const hashtags = animeTag
    ? `${animeTag} ${poolEntry}`
    : poolEntry;

  const mention = `${nextArticleEngage()}\n\nFull write-up: ${url}\n\n${hashtags}`;

  // Add reply prompt to first content paragraph when space allows
  const T2_PROMPTS = [
    "\n\nWhich of these words have you caught in anime? Reply 👇",
    "\n\nDid you already know any of these? Reply 👇",
    "\n\nSave this for your next rewatch 📸",
    "\n\nWhich one surprised you most? Drop it below 👇",
  ];
  const t2prompt = T2_PROMPTS[Math.floor(Math.random() * T2_PROMPTS.length)];
  const t2 = sorted[0] && sorted[0].length + t2prompt.length <= 278 ? sorted[0] + t2prompt : sorted[0] ?? "";

  // Build content tweets from all available paragraphs (up to 6 total)
  const contentTweets = [t2, ...sorted.slice(1)].filter(Boolean);

  return [hook, ...contentTweets, mention];
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
  // context quality gate + no character names + no katakana-only transliterations + no proper nouns
  const pool = vocabByAnime.get(anime.anime)!.filter(
    w => !used.has(w.surface) &&
      hasRichContext(w.context) &&
      !QUIZ_BLOCKED.has(w.category) &&
      !/^[゠-ヿー・]+$/.test(w.surface) &&
      !isProperNounMeaning(w.meanings.en)
  );
  // Prefer non-N5 words so sets don't mix advanced/beginner levels
  const nonN5Pool = pool.filter(w => w.jlpt_level !== "N5");
  const qualityPool = nonN5Pool.length >= 3 ? nonN5Pool : pool;

  // If fewer than 3 with quality gate, fall back to ungated pool to avoid infinite loop
  const fallbackPool = vocabByAnime.get(anime.anime)!.filter(w => !used.has(w.surface));
  const activePool = qualityPool.length >= 3 ? qualityPool : fallbackPool;

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

// CTA rotation — round-robin prevents the same line repeating back-to-back
const shuffledVocabEngages = shuffle([...VOCAB_ENGAGE]);
let vocabEngageCursor = 0;
function nextVocabEngage(): string {
  const e = shuffledVocabEngages[vocabEngageCursor % shuffledVocabEngages.length];
  vocabEngageCursor++;
  return e;
}
const shuffledJlptCtas = shuffle([...JLPT_CTAS]);
let jlptCtaCursor = 0;
function nextJlptCta(): (label: string, jlpt: string | null) => string {
  const fn = shuffledJlptCtas[jlptCtaCursor % shuffledJlptCtas.length];
  jlptCtaCursor++;
  return fn;
}
const shuffledArticleEngages = shuffle([...ARTICLE_ENGAGE]);
let articleEngageCursor = 0;
function nextArticleEngage(): string {
  const e = shuffledArticleEngages[articleEngageCursor % shuffledArticleEngages.length];
  articleEngageCursor++;
  return e;
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
    // 30% chance to use a seasonal hook when in an active anime season
    const seasonalOptions = getSeasonalHooks(dateStr);
    const hookTemplate = seasonalOptions.length > 0 && Math.random() < 0.3
      ? pick(seasonalOptions)
      : nextHookTemplate();
    const topWord = pickTopWord(words);
    const setJlpt = majorityJlpt(words);
    // Put topWord first so the hook's challenge word matches what tweet 1 teaches
    const orderedWords = [topWord, ...words.filter(w => w.surface !== topWord.surface)];
    // Prefer AI-crafted cached hook; fall back to template
    const cachedHook = nextCachedHook(anime.anime);
    queue.push({
      date: dateStr,
      type,
      tweets: [
        vocabTweet(orderedWords[0], "1/3", anime, hookTemplate, topWord, setJlpt, cachedHook),
        vocabTweet(orderedWords[1], "2/3", anime, hookTemplate, topWord, setJlpt, cachedHook),
        vocabTweet(orderedWords[2], "3/3", anime, hookTemplate, topWord, setJlpt, cachedHook),
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
