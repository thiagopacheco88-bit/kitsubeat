#!/usr/bin/env npx tsx --tsconfig tsconfig.scripts.json
/**
 * Batch Instagram scheduler — reads videos/schedule.json and schedules
 * all posts that fall within Instagram's 75-day scheduling window.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-instagram.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-instagram.ts --dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-instagram.ts --from 2026-08-01
 *
 * Run again every ~70 days to schedule the next wave.
 * Instagram limit: posts must be 15 min – 75 days from now.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";
import { basename } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCHEDULE_PATH = resolve(__dirname, "../videos/schedule.json");
const CATALOG_PATH  = resolve(__dirname, "../videos/catalog.json");
const VIDEOS_DIR    = resolve(__dirname, "../videos");

const TOKEN = process.env.INSTAGRAM_LONG_TOKEN!;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const BASE  = "https://graph.facebook.com/v19.0";

const MAX_DAYS_AHEAD = 74; // stay under 75-day limit
const POST_TIME_UTC  = "08:00:00Z"; // 8am UTC = 9am London / 5am Brazil

// ── arg parsing ──────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const fromArg = args.find(a => a.startsWith("--from"))?.split("=")[1]
  ?? args[args.indexOf("--from") + 1];

// ── helpers ──────────────────────────────────────────────────────────────────

function loadSchedule() {
  return JSON.parse(readFileSync(SCHEDULE_PATH, "utf-8"));
}

function loadCatalog(): Record<string, any> {
  return JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
}

function saveCatalog(catalog: Record<string, any>) {
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
}

function saveSchedule(schedule: any) {
  writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2) + "\n");
}

function getCatalogPart(catalog: Record<string, any>, series: string, part: number) {
  return catalog[series]?.parts?.find((p: any) => p.part === part) ?? null;
}

async function uploadToBlob(videoPath: string): Promise<string> {
  const file = readFileSync(videoPath);
  const filename = `instagram/${Date.now()}-${basename(videoPath)}`;
  const { url } = await put(filename, file, { access: "public" });
  console.log("   Blob:", url);
  return url;
}

async function pollUntilReady(containerId: string, maxWaitMs = 300_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res  = await fetch(`${BASE}/${containerId}?fields=status_code&access_token=${TOKEN}`);
    const data = await res.json() as { status_code: string };
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error(`Instagram processing failed for ${containerId}`);
    process.stdout.write(".");
    await new Promise(r => setTimeout(r, 5_000));
  }
  throw new Error("Timed out waiting for Instagram to process video");
}

async function scheduleReel(
  videoUrl: string,
  caption: string,
  scheduledAt: Date,
): Promise<string> {
  const body = {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: true,
    published: false,
    scheduled_publish_time: Math.floor(scheduledAt.getTime() / 1000),
    access_token: TOKEN,
  };
  const res = await fetch(`${BASE}/${IG_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const { id, error } = await res.json() as any;
  if (error) throw new Error(`Container error: ${JSON.stringify(error)}`);

  process.stdout.write(" processing");
  await pollUntilReady(id);
  console.log(" done");

  // Confirm scheduling (publishes at scheduled_publish_time automatically)
  const confirmRes = await fetch(`${BASE}/${IG_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: id, access_token: TOKEN }),
  });
  const { id: postId, error: pubErr } = await confirmRes.json() as any;
  if (pubErr) throw new Error(`Schedule confirm error: ${JSON.stringify(pubErr)}`);
  return postId ?? id;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!TOKEN || !IG_ID) throw new Error("Missing INSTAGRAM_LONG_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID in .env.local");

  const scheduleFile = loadSchedule();
  const catalog      = loadCatalog();
  const posts: any[] = scheduleFile.posts;

  const now        = new Date();
  const windowEnd  = new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const fromFilter = fromArg ? new Date(fromArg) : now;

  // Find posts in window: pending + date within [fromFilter, windowEnd]
  const toSchedule = posts.filter(p => {
    if (p.status !== "pending") return false;
    const postDate = new Date(`${p.date}T${POST_TIME_UTC}`);
    return postDate >= fromFilter && postDate <= windowEnd;
  });

  console.log(`\n📅 Instagram Batch Scheduler`);
  console.log(`   Window: ${fromFilter.toDateString()} → ${windowEnd.toDateString()}`);
  console.log(`   Posts to schedule: ${toSchedule.length} of ${posts.length} total`);
  if (DRY_RUN) console.log("   DRY RUN — no API calls\n");

  if (toSchedule.length === 0) {
    console.log("\n✅ Nothing to schedule in this window.");
    return;
  }

  let scheduled = 0;
  let skipped   = 0;

  for (const post of toSchedule) {
    const { series, part, label, date: dateStr } = post;
    const scheduledAt = new Date(`${dateStr}T${POST_TIME_UTC}`);

    // Find render file in catalog
    const catalogPart = getCatalogPart(catalog, series, part);
    const renderFile  = catalogPart?.render_file;
    const caption     = catalogPart?.social?.instagram?.caption;

    if (!renderFile || !caption) {
      console.log(`\n⚠️  #${post.post} ${label} P${part} — no render or caption yet, skipping`);
      skipped++;
      continue;
    }

    const videoPath = join(VIDEOS_DIR, renderFile);
    console.log(`\n📹 #${post.post} ${label} P${part} → ${scheduledAt.toDateString()}`);

    if (DRY_RUN) {
      console.log(`   [dry-run] would schedule: ${videoPath}`);
      console.log(`   [dry-run] caption: ${caption.slice(0, 60)}...`);
      scheduled++;
      continue;
    }

    try {
      console.log(`   Uploading...`);
      const videoUrl = await uploadToBlob(videoPath);

      console.log(`   Scheduling...`);
      const postId = await scheduleReel(videoUrl, caption, scheduledAt);

      // Update schedule.json
      post.status = "scheduled";
      post.scheduled_instagram_id = postId;
      post.scheduled_for = scheduledAt.toISOString();
      saveSchedule(scheduleFile);

      // Update catalog.json
      if (catalogPart) {
        catalogPart.posted ??= {};
        catalogPart.posted.instagram = {
          id: postId,
          scheduled_for: scheduledAt.toISOString(),
          date: dateStr,
        };
        saveCatalog(catalog);
      }

      console.log(`   ✅ Scheduled! ID: ${postId}`);
      scheduled++;

      // Small delay between posts to avoid rate limits
      await new Promise(r => setTimeout(r, 2_000));
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done. Scheduled: ${scheduled}  Skipped: ${skipped}`);
  console.log(`   Next run needed: ~${new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000).toDateString()}`);
}

main().catch(e => { console.error("\n❌", e.message); process.exit(1); });
