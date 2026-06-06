/**
 * One-off: post a queue entry to Bluesky immediately.
 * Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/social/bluesky-post.ts [date]
 *        defaults to today's date
 *
 * Requires env vars: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
 */
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const HANDLE = process.env.BLUESKY_HANDLE!;
const PASSWORD = process.env.BLUESKY_APP_PASSWORD!;
const BASE = "https://bsky.social/xrpc";

if (!HANDLE || !PASSWORD) {
  console.error("Missing BLUESKY_HANDLE or BLUESKY_APP_PASSWORD in .env.local");
  process.exit(1);
}

type PostRef = { uri: string; cid: string };

async function createSession(): Promise<{ accessJwt: string; did: string }> {
  const res = await fetch(`${BASE}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: HANDLE, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Bluesky auth ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ accessJwt: string; did: string }>;
}

async function createPost(
  accessJwt: string,
  did: string,
  text: string,
  reply?: { root: PostRef; parent: PostRef }
): Promise<PostRef> {
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
  };
  if (reply) record.reply = reply;
  const res = await fetch(`${BASE}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({ repo: did, collection: "app.bsky.feed.post", record }),
  });
  if (!res.ok) throw new Error(`Bluesky post ${res.status}: ${await res.text()}`);
  const json = await res.json() as { uri: string; cid: string };
  return { uri: json.uri, cid: json.cid };
}

type QueueEntry = { date: string; type: string; tweets: string[] };
const { queue } = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/social-queue.json"), "utf8")
) as { queue: QueueEntry[] };

const targetDate = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const entry = queue.find(e => e.date === targetDate);

if (!entry) {
  console.error(`No queue entry for ${targetDate}`);
  process.exit(1);
}

console.log(`\nPosting ${entry.type} thread for ${entry.date} (${entry.tweets.length} skeet(s)) to Bluesky...\n`);
entry.tweets.forEach((t, i) => console.log(`[${i + 1}/${entry.tweets.length}]\n${t}\n`));
console.log("---");

const { accessJwt, did } = await createSession();
const refs: PostRef[] = [];

for (let i = 0; i < entry.tweets.length; i++) {
  const reply = refs.length > 0 ? { root: refs[0], parent: refs[refs.length - 1] } : undefined;
  const ref = await createPost(accessJwt, did, entry.tweets[i], reply);
  refs.push(ref);
  console.log(`  ✓ skeet ${i + 1}/${entry.tweets.length} posted (uri: ${ref.uri})`);
}

console.log(`\n✅ Done — https://bsky.app/profile/${HANDLE}`);
