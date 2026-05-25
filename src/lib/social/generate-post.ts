/**
 * Claude Haiku–powered social post generator.
 * Produces tweet-length content for vocab words, quizzes, and journal articles.
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export const ANIME_LABELS: Record<string, string> = {
  "naruto": "Naruto",
  "one-piece": "One Piece",
  "bleach": "Bleach",
  "attack-on-titan": "Attack on Titan",
  "demon-slayer": "Demon Slayer",
  "death-note": "Death Note",
  "dragon-ball-z": "Dragon Ball Z",
  "hunter-x-hunter": "Hunter x Hunter",
  "tokyo-ghoul": "Tokyo Ghoul",
  "jujutsu-kaisen": "Jujutsu Kaisen",
  "my-hero-academia": "My Hero Academia",
  "chainsaw-man": "Chainsaw Man",
  "fairy-tail": "Fairy Tail",
  "sword-art-online": "Sword Art Online",
  "fullmetal-alchemist": "Fullmetal Alchemist",
  "code-geass": "Code Geass",
};

export type VocabInput = {
  dictionary_form: string;
  reading: string;
  romaji: string;
  meaning: { en: string };
  jlpt_level: string | null;
  context_note?: string | null;
  anime_slug?: string | null;
};

export type ArticleInput = {
  title: string;
  subtitle?: string;
  summary: string;
  slug: string;
};

async function callHaiku(prompt: string, maxTokens = 220): Promise<string> {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return (res.content[0] as { text: string }).text.trim();
}

/**
 * Generates a 3-tweet thread teaching vocab words from the same anime.
 * Returns an array of 3 tweet strings; hashtags are on the last tweet only.
 */
export async function generateVocabThread(
  words: VocabInput[],
  animeLabel: string
): Promise<string[]> {
  const wordLines = words.map((w, i) =>
    `Word ${i + 1}: ${w.dictionary_form} (${w.reading}) — ${w.romaji} = "${w.meaning.en}"${w.context_note ? `\nContext: ${w.context_note}` : ""}`
  ).join("\n\n");

  const raw = await callHaiku(
    `Generate a 3-tweet X/Twitter thread teaching Japanese vocabulary from the anime "${animeLabel}".

${wordLines}

Output EXACTLY 3 blocks separated by ---

Tweet 1 format:
Useful vocabulary from ${animeLabel} [1 relevant emoji]

[kanji] ([reading]) — [romaji]
"[meaning]"
[breakdown line — see rule below]

[one punchy sentence, max 12 words, anime-flavoured]

(1/3)

Tweet 2 format:
[kanji] ([reading]) — [romaji]
"[meaning]"
[breakdown line — see rule below]

[one punchy sentence, max 12 words, anime-flavoured]

(2/3)

Tweet 3 format:
[kanji] ([reading]) — [romaji]
"[meaning]"
[breakdown line — see rule below]

[one punchy sentence, max 12 words, anime-flavoured]

(3/3)

Rules:
- Each block under 260 characters
- Sentences in English, inspired by anime context
- No hashtags anywhere
- Breakdown line: ONLY for compound words (2+ kanji components). Format: 全 (zen) = all · 集中 (shūchū) = concentration. Skip entirely for simple words (single kanji or kana-only).
- Return ONLY the 3 blocks separated by ---`,
    500
  );

  const parts = raw.split(/\n?---\n?/).map((s) => s.trim()).filter(Boolean);

  while (parts.length < 3) parts.push("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitsubeat.com";
  parts[2] = `${parts[2]}\n\nPractice with anime on KitsuBeat 🎌 ${siteUrl}\n\n#LearnJapanese #KitsuBeat`;

  return parts.slice(0, 3);
}

export async function generateQuizPost(word: VocabInput): Promise<string> {
  const body = await callHaiku(
    `Write a Japanese vocab quiz post for X/Twitter for @kitsubeat, an anime learning app.

Word: ${word.dictionary_form} (${word.reading}) — ${word.romaji}
Correct meaning: ${word.meaning.en}

Format exactly like this (4 options, answer revealed at bottom):
🎌 What does ${word.dictionary_form} (${word.romaji}) mean?

A) [wrong]
B) [wrong]
C) [correct]
D) [wrong]

Answer: C ✅ ${word.romaji} = ${word.meaning.en}

Rules:
- Wrong options should be plausible Japanese vocabulary
- Under 260 characters total
- Return ONLY the quiz text, no hashtags`
  );

  return `${body}\n\n#LearnJapanese #KitsuBeat`;
}

/**
 * Generates a 4-tweet thread from a journal article.
 * Extracts 20-40% of the key content so the thread delivers real value.
 * Returns an array of 4 tweet strings; URL + hashtags on the last tweet only.
 */
export async function generateArticleThread(
  article: ArticleInput & { body: string }
): Promise<string[]> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitsubeat.com";
  const url = `${siteUrl}/journal/${article.slug}`;

  const raw = await callHaiku(
    `You are writing a Twitter/X thread for @kitsubeat, a Japanese learning app for anime fans.

Article title: ${article.title}
${article.subtitle ? `Subtitle: ${article.subtitle}` : ""}
Summary: ${article.summary}

Article content:
${article.body}

Write a 4-tweet thread that shares 20-40% of the real content — not a teaser, actual insights.

Output EXACTLY 4 blocks separated by ---

Tweet 1: Hook — one surprising fact or question pulled directly from the article. 1-2 emoji + 🧵 at the end of the first line to signal a thread. Under 240 chars.

Tweet 2: First key insight from the article. Specific, concrete. Under 260 chars.

Tweet 3: Second key insight. Make it feel like a reveal or a "wait, really?" moment. Under 260 chars.

Tweet 4: Brief wrap-up that teases what else is in the full article. No URL. No hashtags. Under 200 chars.

Rules:
- Use the actual article content — not generic statements
- Casual, curious tone
- No hashtags anywhere in the 4 blocks
- Return ONLY the 4 blocks separated by ---`,
    700
  );

  const parts = raw.split(/\n?---\n?/).map((s) => s.trim()).filter(Boolean);

  while (parts.length < 4) parts.push("");

  parts[3] = `${parts[3]}\n\n${url}\n\n#LearnJapanese #KitsuBeat`;

  return parts.slice(0, 4);
}
