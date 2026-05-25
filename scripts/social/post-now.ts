/**
 * One-off: post a queue entry immediately.
 * Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/post-now.ts [date]
 *        defaults to the first upcoming entry in the queue
 *
 * Requires env vars: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 * Load from .env.local automatically via dotenv.
 */
import { readFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const TWEET_URL = "https://api.twitter.com/2/tweets";

// ─── Minimal X client (no module aliasing needed) ─────────────────────────────

function pct(s: string) { return encodeURIComponent(s); }

function buildOAuthHeader(method: string, url: string): string {
  const o: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };
  const paramStr = Object.entries(o).sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${pct(k)}=${pct(v)}`).join("&");
  const sigBase = `${method}&${pct(url)}&${pct(paramStr)}`;
  const sigKey = `${pct(process.env.X_API_SECRET!)}&${pct(process.env.X_ACCESS_TOKEN_SECRET!)}`;
  const sig = crypto.createHmac("sha1", sigKey).update(sigBase).digest("base64");
  return "OAuth " + [...Object.entries(o), ["oauth_signature", sig]]
    .map(([k,v]) => `${pct(k)}="${pct(v)}"`).join(", ");
}

async function postThread(tweets: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const text of tweets) {
    const body: Record<string, unknown> = { text };
    if (ids.length > 0) body.reply = { in_reply_to_tweet_id: ids[ids.length - 1] };
    const res = await fetch(TWEET_URL, {
      method: "POST",
      headers: { Authorization: buildOAuthHeader("POST", TWEET_URL), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`X API ${res.status} (tweet ${ids.length + 1}): ${await res.text()}`);
    const json = await res.json() as { data: { id: string } };
    ids.push(json.data.id);
    console.log(`  ✓ tweet ${ids.length}/${tweets.length} posted (id: ${json.data.id})`);
  }
  return ids;
}

// ─── Load queue ───────────────────────────────────────────────────────────────

type QueueEntry = { date: string; type: string; tweets: string[] };
const queuePath = join(process.cwd(), "src/data/social-queue.json");
const { queue } = JSON.parse(readFileSync(queuePath, "utf8")) as { queue: QueueEntry[] };

const targetDate = process.argv[2] ?? queue[0]?.date;
const entry = queue.find(e => e.date === targetDate);

if (!entry) {
  console.error(`No queue entry for ${targetDate}`);
  process.exit(1);
}

// ─── Post ─────────────────────────────────────────────────────────────────────

console.log(`\nPosting ${entry.type} post for ${entry.date} (${entry.tweets.length} tweet(s))…\n`);
console.log("Preview:");
entry.tweets.forEach((t, i) => console.log(`\n[${i+1}] ${t}`));
console.log("\n---");

const ids = await postThread(entry.tweets);
console.log(`\n✓ Done — first tweet: https://x.com/i/web/status/${ids[0]}`);
