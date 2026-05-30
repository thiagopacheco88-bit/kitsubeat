/**
 * Post a date's social queue entry as a Threads thread + schedule upcoming posts.
 *
 * Usage:
 *   # Post today's entry now:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/threads-post.ts
 *
 *   # Post a specific date:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/threads-post.ts 2026-05-30
 *
 *   # Schedule next N days of posts:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/threads-post.ts --schedule [days=180]
 *
 * Requires THREADS_ACCESS_TOKEN and THREADS_USER_ID in .env.local
 */
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const TOKEN = process.env.THREADS_ACCESS_TOKEN!;
const USER_ID = process.env.THREADS_USER_ID!;
const BASE = "https://graph.threads.net/v1.0";

if (!TOKEN || !USER_ID) {
  console.error("Missing THREADS_ACCESS_TOKEN or THREADS_USER_ID in .env.local");
  console.error("Run: npx tsx --tsconfig tsconfig.scripts.json scripts/social/threads-auth.ts");
  process.exit(1);
}

type QueueEntry = { date: string; type: string; tweets: string[] };
const { queue } = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/social-queue.json"), "utf8")
) as { queue: QueueEntry[] };

// ─── Threads API helpers ───────────────────────────────────────────────────────

async function createContainer(text: string, replyToId?: string, scheduledAt?: number): Promise<string> {
  const body: Record<string, string | number> = {
    media_type: "TEXT",
    text,
    access_token: TOKEN,
  };
  if (replyToId) body.reply_to_id = replyToId;
  if (scheduledAt) {
    body.published = 0;
    body.scheduled_publish_time = scheduledAt;
  }

  const res = await fetch(`${BASE}/${USER_ID}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create container failed: ${await res.text()}`);
  const { id } = await res.json() as { id: string };
  return id;
}

async function publishContainer(containerId: string): Promise<string> {
  const res = await fetch(`${BASE}/${USER_ID}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: TOKEN }),
  });
  if (!res.ok) throw new Error(`Publish failed: ${await res.text()}`);
  const { id } = await res.json() as { id: string };
  return id;
}

async function postThread(tweets: string[], scheduledAt?: number): Promise<string> {
  // On Threads, threads are reply chains: post T1, then reply T2 to T1, etc.
  // For scheduled posts, only the root tweet can be scheduled (Threads limitation)
  const THREADS_MAX_CHARS = 500;
  const truncated = tweets.map(t => t.length > THREADS_MAX_CHARS ? t.slice(0, 499) + "…" : t);

  if (scheduledAt) {
    // Schedule only the first tweet (Threads API limitation for scheduled replies)
    const containerId = await createContainer(truncated[0], undefined, scheduledAt);
    console.log(`  ↳ scheduled container: ${containerId} at ${new Date(scheduledAt * 1000).toISOString()}`);
    return containerId;
  }

  // Immediate posting: full thread chain
  let lastId: string | undefined;
  for (let i = 0; i < truncated.length; i++) {
    const containerId = await createContainer(truncated[i], lastId);
    const postId = await publishContainer(containerId);
    lastId = postId;
    console.log(`  ✓ tweet ${i + 1}/${truncated.length} posted (id: ${postId})`);
    if (i < truncated.length - 1) await new Promise(r => setTimeout(r, 1000)); // brief pause between replies
  }
  return lastId!;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const scheduleMode = args.includes("--schedule");

if (scheduleMode) {
  // Schedule all upcoming posts up to 180 days out (Threads API max)
  const today = new Date().toISOString().slice(0, 10);
  const maxDays = parseInt(args.find(a => /^\d+$/.test(a)) ?? "180", 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + maxDays);

  const upcoming = queue.filter(e => e.date > today && new Date(e.date) <= cutoff);
  console.log(`\nScheduling ${upcoming.length} posts (next ${maxDays} days) on Threads...\n`);

  let scheduled = 0, skipped = 0;
  for (const entry of upcoming) {
    // Schedule at 09:00 UTC (same as X cron)
    const scheduledAt = Math.floor(new Date(`${entry.date}T09:00:00Z`).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    const minFuture = now + 10 * 60; // 10 minutes minimum

    if (scheduledAt < minFuture) {
      skipped++;
      continue;
    }

    try {
      await postThread(entry.tweets, scheduledAt);
      scheduled++;
      console.log(`✓ ${entry.date} [${entry.type}] scheduled`);
      await new Promise(r => setTimeout(r, 500)); // rate limit: 250 calls/day
    } catch (e) {
      console.error(`✗ ${entry.date}: ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ Done: ${scheduled} scheduled, ${skipped} skipped (too soon)\n`);

} else {
  // Post one date immediately
  const targetDate = args[0] ?? new Date().toISOString().slice(0, 10);
  const entry = queue.find(e => e.date === targetDate);

  if (!entry) {
    console.error(`No queue entry for ${targetDate}`);
    process.exit(1);
  }

  console.log(`\nPosting ${entry.type} thread for ${entry.date} (${entry.tweets.length} tweets) on Threads...\n`);
  entry.tweets.forEach((t, i) => console.log(`[${i + 1}/${entry.tweets.length}]\n${t}\n`));
  console.log("---\nPosting now...");

  const lastId = await postThread(entry.tweets);
  console.log(`\n✅ Done — thread posted (last id: ${lastId})`);
}
