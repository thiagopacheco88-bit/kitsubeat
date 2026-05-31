/**
 * Post today's social queue entry to Bluesky as a reply-chain thread.
 * Mirrors the X logic exactly — same content, same structure.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/post-bluesky.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/post-bluesky.ts 2026-06-03
 *
 * Requires BSKY_HANDLE and BSKY_APP_PASSWORD in .env.local
 */
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const HANDLE = process.env.BSKY_HANDLE!;
const PASSWORD = process.env.BSKY_APP_PASSWORD!;
const BASE = "https://bsky.social/xrpc";
const BSKY_MAX_CHARS = 300;

if (!HANDLE || !PASSWORD) {
  console.error("Missing BSKY_HANDLE or BSKY_APP_PASSWORD in .env.local");
  process.exit(1);
}

type QueueEntry = { date: string; type: string; tweets: string[] };

const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const { queue } = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/social-queue.json"), "utf8")
) as { queue: QueueEntry[] };

const entry = queue.find(e => e.date === today);
if (!entry) { console.error(`No queue entry for ${today}`); process.exit(1); }

// ─── Auth ─────────────────────────────────────────────────────────────────────

const authRes = await fetch(`${BASE}/com.atproto.server.createSession`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier: HANDLE, password: PASSWORD }),
});
if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
const { accessJwt, did } = await authRes.json() as { accessJwt: string; did: string };

// ─── Post helpers ─────────────────────────────────────────────────────────────

function truncatePost(text: string): string {
  if ([...text].length <= BSKY_MAX_CHARS) return text;
  // Trim at word boundary
  const chars = [...text].slice(0, BSKY_MAX_CHARS - 1).join("");
  return chars.replace(/\s+\S*$/, "") + "…";
}

async function post(text: string, replyRef?: { root: { uri: string; cid: string }; parent: { uri: string; cid: string } }): Promise<{ uri: string; cid: string }> {
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: truncatePost(text),
    createdAt: new Date().toISOString(),
  };
  if (replyRef) record.reply = replyRef;

  const res = await fetch(`${BASE}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({ repo: did, collection: "app.bsky.feed.post", record }),
  });
  if (!res.ok) throw new Error(`Post failed: ${await res.text()}`);
  const { uri, cid } = await res.json() as { uri: string; cid: string };
  return { uri, cid };
}

// ─── Post thread ──────────────────────────────────────────────────────────────

console.log(`\nPosting ${entry.type} thread for ${today} to Bluesky (${entry.tweets.length} posts)…\n`);
entry.tweets.forEach((t, i) => console.log(`[${i + 1}/${entry.tweets.length}]\n${t}\n`));

let rootRef: { uri: string; cid: string } | undefined;
let parentRef: { uri: string; cid: string } | undefined;

for (let i = 0; i < entry.tweets.length; i++) {
  const replyRef = rootRef && parentRef
    ? { root: rootRef, parent: parentRef }
    : undefined;

  const ref = await post(entry.tweets[i], replyRef);

  if (i === 0) rootRef = ref;
  parentRef = ref;

  console.log(`  ✓ post ${i + 1}/${entry.tweets.length} (${ref.uri.split("/").pop()})`);
  if (i < entry.tweets.length - 1) await new Promise(r => setTimeout(r, 500));
}

console.log(`\n✅ Done — https://bsky.app/profile/${HANDLE}`);
