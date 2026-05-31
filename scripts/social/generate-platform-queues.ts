/**
 * Generate threads-queue.json and tiktok-queue.json from social-queue.json.
 * Converts multi-tweet threads into single posts ≤500 chars for Threads/TikTok.
 *
 * Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/social/generate-platform-queues.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const queue = JSON.parse(readFileSync(join(ROOT, "src/data/social-queue.json"), "utf8")) as {
  queue: Array<{ date: string; type: string; tweets: string[] }>;
};

const SITE_URL = "https://kitsubeat.com";
const MAX_CHARS = 490; // leave 10 char buffer under 500

function truncate(s: string, max: number): string {
  if ([...s].length <= max) return s;
  const chars = [...s].slice(0, max - 1);
  // trim at last word boundary
  const str = chars.join("");
  return str.replace(/\s+\S*$/, "") + "…";
}

function buildVocabPost(tweets: string[]): string {
  // T1: hook\n\nword_block\ncontext\n\n(1/3)
  // T2: word_block\ncontext\n\n(2/3)
  // T3: word_block\ncontext\n\n(3/3)\n\nCTA...
  const stripCounter = (t: string) => t.replace(/\n\n\(\d\/\d\)[\s\S]*$/, "").trim();

  // Extract the hook line (first line of T1 before \n\n)
  const hookLine = tweets[0].split("\n\n")[0].trim();

  // Extract word blocks from each tweet (everything between hook and counter)
  const block1 = tweets[0]
    .replace(hookLine, "").replace(/^\n+/, "")
    .replace(/\n\n\(\d\/\d\)[\s\S]*$/, "").trim();
  const block2 = stripCounter(tweets[1]);
  const block3 = stripCounter(tweets[2]);

  // Build: hook + 3 word blocks + site link
  const post = `${hookLine}\n\n${block1}\n\n${block2}\n\n${block3}\n\n${SITE_URL}`;
  if ([...post].length <= MAX_CHARS) return post;

  // If still over, drop block3's context (keep just the word line)
  const wordLineOnly = (block: string) => block.split("\n").slice(0, 3).join("\n");
  const shorter = `${hookLine}\n\n${wordLineOnly(block1)}\n\n${wordLineOnly(block2)}\n\n${wordLineOnly(block3)}\n\n${SITE_URL}`;
  return truncate(shorter, MAX_CHARS);
}

function buildQuizPost(tweets: string[]): string {
  // T1 is self-contained (question + options), just strip the reply instruction
  const t1 = tweets[0].replace(/\n\nReply A, B, C, or D below 👇$/, "").trim();
  if ([...t1].length <= MAX_CHARS) return t1;
  return truncate(t1, MAX_CHARS);
}

function buildArticlePost(tweets: string[]): string {
  // Hook (T1) + narrative opener (T2, no reply prompt) + link (from last tweet)
  const hook = tweets[0].trim();
  const t2 = tweets[1].split("\n\nWhich")[0].split("\n\nDid")[0]
    .split("\n\nSave")[0].split("\n\nWhich")[0].trim();
  const link = tweets[tweets.length - 1].match(/https:\/\/kitsubeat\.com\/journal\/[^\s]+/)?.[0] ?? SITE_URL;

  const post = `${hook}\n\n${t2}\n\n${link}`;
  if ([...post].length <= MAX_CHARS) return post;

  // Truncate t2 to fit
  const fixed = `${hook}\n\n${link}`;
  const budget = MAX_CHARS - [...fixed].length - 2;
  return `${hook}\n\n${truncate(t2, budget)}\n\n${link}`;
}

function buildPost(entry: { type: string; tweets: string[] }): string {
  switch (entry.type) {
    case "vocab":   return buildVocabPost(entry.tweets);
    case "quiz":    return buildQuizPost(entry.tweets);
    case "article": return buildArticlePost(entry.tweets);
    default:        return entry.tweets[0];
  }
}

const posts = queue.queue.map(e => ({
  date: e.date,
  type: e.type,
  text: buildPost(e),
  chars: [...buildPost(e)].length,
}));

// Validate
const over = posts.filter(p => p.chars > 500);
console.log(`Generated ${posts.length} posts`);
console.log(`Over 500 chars: ${over.length}`);
if (over.length) over.forEach(p => console.log(`  ${p.date} [${p.type}] ${p.chars} chars`));

// Threads: all 365 days, skip May 31 (already posted via Metricool)
const threadsQueue = {
  generated: new Date().toISOString(),
  note: "Threads posts — condensed to ≤500 chars. May 31 2026 posted via Metricool.",
  count: posts.length,
  queue: posts,
};
writeFileSync(join(ROOT, "src/data/threads-queue.json"), JSON.stringify(threadsQueue, null, 2));
console.log("✓ src/data/threads-queue.json");

// TikTok: next 60 days from today
const today = new Date().toISOString().slice(0, 10);
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() + 60);
const cutoffStr = cutoff.toISOString().slice(0, 10);

const tiktokPosts = posts.filter(p => p.date >= today && p.date <= cutoffStr);
const tiktokQueue = {
  generated: new Date().toISOString(),
  note: `TikTok text posts — next 60 days (${today} → ${cutoffStr})`,
  count: tiktokPosts.length,
  queue: tiktokPosts,
};
writeFileSync(join(ROOT, "src/data/tiktok-queue.json"), JSON.stringify(tiktokQueue, null, 2));
console.log(`✓ src/data/tiktok-queue.json (${tiktokPosts.length} posts)`);
