/**
 * Deletes all @kitsubeat tweets, then posts today's entry from the new queue.
 * Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/social/delete-and-repost.ts [date]
 *        date defaults to today (YYYY-MM-DD)
 */
import { readFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const BASE = "https://api.twitter.com";

function pct(s: string) { return encodeURIComponent(s); }

function buildOAuthHeader(method: string, baseUrl: string, queryParams: Record<string,string> = {}): string {
  const o: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };
  // For GET requests, query params must be included in the signature base string
  const allParams = { ...o, ...queryParams };
  const paramStr = Object.entries(allParams).sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${pct(k)}=${pct(v)}`).join("&");
  const sigBase = `${method}&${pct(baseUrl)}&${pct(paramStr)}`;
  const sigKey = `${pct(process.env.X_API_SECRET!)}&${pct(process.env.X_ACCESS_TOKEN_SECRET!)}`;
  const sig = crypto.createHmac("sha1", sigKey).update(sigBase).digest("base64");
  return "OAuth " + [...Object.entries(o), ["oauth_signature", sig]]
    .map(([k,v]) => `${pct(k)}="${pct(v)}"`).join(", ");
}

async function xGet(path: string, queryParams: Record<string,string> = {}): Promise<unknown> {
  const baseUrl = `${BASE}${path}`;
  const qs = new URLSearchParams(queryParams).toString();
  const fullUrl = qs ? `${baseUrl}?${qs}` : baseUrl;
  const res = await fetch(fullUrl, { headers: { Authorization: buildOAuthHeader("GET", baseUrl, queryParams) } });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function xDelete(path: string): Promise<void> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: buildOAuthHeader("DELETE", url) } });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}: ${await res.text()}`);
}

async function xPost(text: string, replyTo?: string): Promise<string> {
  const url = `${BASE}/2/tweets`;
  const body: Record<string, unknown> = { text };
  if (replyTo) body.reply = { in_reply_to_tweet_id: replyTo };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: buildOAuthHeader("POST", url, {}), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /2/tweets → ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: { id: string } };
  return json.data.id;
}

// ─── Step 1: get authenticated user ID ────────────────────────────────────────
console.log("Fetching user info…");
const meRes = await xGet("/2/users/me") as { data: { id: string; username: string } };
const userId = meRes.data.id;
console.log(`Authenticated as @${meRes.data.username} (id: ${userId})`);

// ─── Step 2: fetch all recent tweets (up to 100, paginate if needed) ──────────
console.log("\nFetching tweet timeline…");
let allIds: string[] = [];
let paginationToken: string | undefined;

do {
  const params: Record<string, string> = { max_results: "100", "tweet.fields": "id" };
  if (paginationToken) params.pagination_token = paginationToken;
  const res = await xGet(`/2/users/${userId}/tweets`, params) as { data?: { id: string }[]; meta?: { next_token?: string } };
  if (res.data?.length) {
    allIds.push(...res.data.map(t => t.id));
    console.log(`  Found ${res.data.length} tweets (total so far: ${allIds.length})`);
  }
  paginationToken = res.meta?.next_token;
} while (paginationToken);

if (allIds.length === 0) {
  console.log("No tweets to delete.");
} else {
  console.log(`\nDeleting ${allIds.length} tweets…`);
  let deleted = 0;
  for (const id of allIds) {
    try {
      await xDelete(`/2/tweets/${id}`);
      deleted++;
      process.stdout.write(`\r  Deleted ${deleted}/${allIds.length}`);
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`\n  ✗ Failed to delete ${id}:`, (e as Error).message);
    }
  }
  console.log(`\n✓ Deleted ${deleted} tweets`);
}

// ─── Step 3: post today's entry from the new queue ────────────────────────────
const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
console.log(`\nLooking for queue entry for ${today}…`);

type QueueEntry = { date: string; type: string; tweets: string[] };
const { queue } = JSON.parse(readFileSync(join(process.cwd(), "src/data/social-queue.json"), "utf8")) as { queue: QueueEntry[] };
const entry = queue.find(e => e.date === today);

if (!entry) {
  console.error(`No queue entry found for ${today}`);
  process.exit(1);
}

console.log(`\nPosting ${entry.type} thread for ${entry.date} (${entry.tweets.length} tweets)…`);
entry.tweets.forEach((t, i) => console.log(`\n[${i+1}/${entry.tweets.length}]\n${t}`));
console.log("\n---\nPosting now…");

let lastId: string | undefined;
for (let i = 0; i < entry.tweets.length; i++) {
  lastId = await xPost(entry.tweets[i], lastId);
  console.log(`  ✓ tweet ${i+1}/${entry.tweets.length} (id: ${lastId})`);
}

console.log(`\n✓ Done — https://x.com/i/web/status/${lastId}`);
