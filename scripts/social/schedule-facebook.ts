/**
 * Batch Facebook Page scheduler — reads social-queue.json and schedules
 * all upcoming posts within Facebook's 180-day scheduling window.
 *
 * Posts article entries as link posts (with URL preview).
 * Posts vocab/quiz entries as plain text.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/schedule-facebook.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/schedule-facebook.ts --dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/schedule-facebook.ts --from 2026-08-01
 *
 * Run again every ~25 days to schedule the next wave.
 * Facebook limit: posts must be 10 min – 30 days from now.
 */
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const TOKEN = process.env.FACEBOOK_PAGE_TOKEN!;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const BASE = `https://graph.facebook.com/v19.0/${PAGE_ID}`;
const POST_HOUR_UTC = 4; // 05:00 BST / 04:00 GMT

if (!TOKEN || !PAGE_ID) {
  console.error("Missing FACEBOOK_PAGE_TOKEN or FACEBOOK_PAGE_ID in .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fromArg = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a) || a.startsWith("--from="))
  ?.replace("--from=", "");

type QueueEntry = { date: string; type: string; tweets: string[] };
const { queue } = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/social-queue.json"), "utf8")
) as { queue: QueueEntry[] };

// Scheduling window: 10 minutes from now → 180 days from now
const now = Date.now();
const minTs = Math.floor(now / 1000) + 10 * 60;
const maxTs = Math.floor(now / 1000) + 29 * 24 * 3600; // Facebook max: 30 days
const fromDate = fromArg ?? new Date(now + 60_000).toISOString().slice(0, 10);

// Build Facebook post content from queue entry
function buildMessage(entry: QueueEntry): { message: string; link?: string } {
  const allText = entry.tweets.join("\n\n");

  if (entry.type === "article") {
    // Article: T1 hook + T2 narrative + T3-T7 content (skip CTA tweet which has the link)
    const contentTweets = entry.tweets.slice(0, -1); // drop last CTA tweet
    const message = contentTweets.join("\n\n");
    // Extract link from last tweet
    const link = entry.tweets[entry.tweets.length - 1]
      .match(/https:\/\/kitsubeat\.com\/journal\/[^\s]+/)?.[0];
    return { message, link };
  }

  // Vocab / quiz: combine all tweets, strip thread counters
  const message = allText
    .replace(/\n\n\(\d\/\d\)/g, "")
    .replace(/Reply A, B, C, or D below 👇/g, "")
    .replace(/All answers revealed in tweet 4\. No peeking 👀/g, "")
    .replace(/Last question\. All reveals in the next tweet 👇/g, "")
    .trim();

  return { message };
}

// Filter entries in the window
const toSchedule = queue.filter(e => {
  if (e.date < fromDate) return false;
  const ts = Math.floor(new Date(`${e.date}T${String(POST_HOUR_UTC).padStart(2, "0")}:00:00Z`).getTime() / 1000);
  return ts >= minTs && ts <= maxTs;
});

console.log(`\nFacebook batch scheduler`);
console.log(`Window: ${fromDate} → ${new Date(maxTs * 1000).toISOString().slice(0, 10)}`);
console.log(`Entries to schedule: ${toSchedule.length}${dryRun ? " (DRY RUN)" : ""}\n`);

let scheduled = 0, failed = 0;

for (const entry of toSchedule) {
  const scheduledTs = Math.floor(
    new Date(`${entry.date}T${String(POST_HOUR_UTC).padStart(2, "0")}:00:00Z`).getTime() / 1000
  );
  const { message, link } = buildMessage(entry);

  if (dryRun) {
    console.log(`[${entry.date}] [${entry.type}] ${message.slice(0, 80)}…`);
    if (link) console.log(`  → ${link}`);
    scheduled++;
    continue;
  }

  const body: Record<string, string | number> = {
    message,
    scheduled_publish_time: scheduledTs,
    published: "false",
    access_token: TOKEN,
  };
  if (link) body.link = link;

  try {
    const res = await fetch(`${BASE}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { id?: string; error?: { message: string } };

    if (data.id) {
      console.log(`✓ ${entry.date} [${entry.type}] → ${data.id}`);
      scheduled++;
    } else {
      console.error(`✗ ${entry.date}: ${data.error?.message}`);
      failed++;
    }
    // Avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  } catch (e) {
    console.error(`✗ ${entry.date}: ${(e as Error).message}`);
    failed++;
  }
}

console.log(`\n✅ Done: ${scheduled} scheduled, ${failed} failed`);
if (!dryRun && scheduled > 0) {
  console.log(`\nNext run: in ~25 days (before the window expires)`);
  console.log(`View scheduled posts: https://www.facebook.com/${PAGE_ID}/publishing_tools/`);
}
