/**
 * Claude Haiku–powered social post generator.
 * Produces tweet-length content for vocab words, quizzes, and journal articles.
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const ANIME_LABELS: Record<string, string> = {
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

async function callHaiku(prompt: string): Promise<string> {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 220,
    messages: [{ role: "user", content: prompt }],
  });
  return (res.content[0] as { text: string }).text.trim();
}

export async function generateVocabPost(word: VocabInput): Promise<string> {
  const anime = word.anime_slug ? (ANIME_LABELS[word.anime_slug] ?? word.anime_slug) : null;
  const context = word.context_note ?? (anime ? `Appears in ${anime}` : null);

  const body = await callHaiku(
    `Write a short X/Twitter post teaching one Japanese word. KitsuBeat is a Japanese learning app for anime fans.

Word: ${word.dictionary_form} (${word.reading}) — ${word.romaji}
Meaning: ${word.meaning.en}
JLPT: ${word.jlpt_level ?? "unrated"}
${context ? `Context: ${context}` : ""}

Rules:
- Under 220 characters (hashtags added after)
- Include kanji/kana, romaji, and English meaning
- 1-2 emoji, casual tone
- Return ONLY the post body, no hashtags`
  );

  return `${body}\n\n#LearnJapanese #KitsuBeat`;
}

export async function generateQuizPost(word: VocabInput): Promise<string> {
  const body = await callHaiku(
    `Write a Japanese vocab quiz post for X/Twitter for @kitsubeat, an anime learning app.

Word: ${word.dictionary_form} (${word.reading}) — ${word.romaji}
Correct meaning: ${word.meaning.en}

Format exactly like this (4 options, answer revealed at bottom):
🎌 What does "${word.dictionary_form}" mean?

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

export async function generateArticlePost(article: ArticleInput): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitsubeat.com";
  const url = `${siteUrl}/journal/${article.slug}`;

  const body = await callHaiku(
    `Write an X/Twitter post promoting this KitsuBeat blog article about Japanese / anime.

Title: ${article.title}
${article.subtitle ? `Subtitle: ${article.subtitle}` : ""}
Summary: ${article.summary}

Rules:
- Under 180 characters (URL + hashtags added after)
- Strong hook on the first line — make it intriguing
- 1-2 emoji, casual curious tone
- Do NOT include the URL
- Return ONLY the post body`
  );

  return `${body}\n\n${url}\n\n#LearnJapanese #KitsuBeat`;
}
