#!/usr/bin/env npx tsx --tsconfig tsconfig.scripts.json
/**
 * Batch social scheduler — reads videos/schedule.json and schedules posts
 * to Instagram, YouTube, and/or Facebook.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-posts.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-posts.ts --platform youtube
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-posts.ts --platform instagram
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-posts.ts --platform facebook
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-posts.ts --dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/schedule-posts.ts --from 2026-08-01
 *
 * Platform notes:
 *   instagram — 75-day window max; re-run every ~70 days for the next wave
 *   youtube   — no window limit; can schedule all 147 at once
 *   facebook  — no window limit; posts daily (147 posts done by Oct 18, 2026)
 *
 * Default: --platform all (instagram + youtube + facebook)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCHEDULE_PATH = resolve(__dirname, "../videos/schedule.json");
const CATALOG_PATH  = resolve(__dirname, "../videos/catalog.json");
const VIDEOS_DIR    = resolve(__dirname, "../videos");

const IG_TOKEN = process.env.INSTAGRAM_LONG_TOKEN!;
const IG_ID    = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const IG_BASE  = "https://graph.facebook.com/v19.0";

const IG_MAX_DAYS = 74;          // stay under Instagram's 75-day limit
const POST_TIME   = "08:00:00Z"; // 8am UTC = 9am London / 5am São Paulo

// ── arg parsing ──────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes("--dry-run");
const platformArg = args.find(a => a.startsWith("--platform="))?.split("=")[1]
  ?? (args.includes("--platform") ? args[args.indexOf("--platform") + 1] : "all");
const fromArg   = args.find(a => a.startsWith("--from="))?.split("=")[1]
  ?? (args.includes("--from") ? args[args.indexOf("--from") + 1] : null);

const DO_INSTAGRAM = platformArg === "all" || platformArg === "instagram";
const DO_YOUTUBE   = platformArg === "all" || platformArg === "youtube";
const DO_FACEBOOK  = platformArg === "all" || platformArg === "facebook";

// ── file helpers ─────────────────────────────────────────────────────────────

function loadSchedule() {
  return JSON.parse(readFileSync(SCHEDULE_PATH, "utf-8"));
}
function saveSchedule(data: any) {
  writeFileSync(SCHEDULE_PATH, JSON.stringify(data, null, 2) + "\n");
}
function loadCatalog(): Record<string, any> {
  return JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
}
function saveCatalog(data: Record<string, any>) {
  writeFileSync(CATALOG_PATH, JSON.stringify(data, null, 2) + "\n");
}
function getCatalogPart(catalog: Record<string, any>, series: string, part: number) {
  return catalog[series]?.parts?.find((p: any) => p.part === part) ?? null;
}

// ── Instagram helpers ─────────────────────────────────────────────────────────

async function uploadToBlob(videoPath: string): Promise<string> {
  const file = readFileSync(videoPath);
  const { url } = await put(`instagram/${Date.now()}-${basename(videoPath)}`, file, { access: "public" });
  return url;
}

async function pollInstagramContainer(containerId: string): Promise<void> {
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    const res  = await fetch(`${IG_BASE}/${containerId}?fields=status_code&access_token=${IG_TOKEN}`);
    const data = await res.json() as { status_code: string };
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error(`Instagram processing failed: ${containerId}`);
    process.stdout.write(".");
    await new Promise(r => setTimeout(r, 5_000));
  }
  throw new Error("Timed out waiting for Instagram processing");
}

async function scheduleInstagramReel(
  videoUrl: string,
  caption: string,
  scheduledAt: Date,
): Promise<string> {
  const res = await fetch(`${IG_BASE}/${IG_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: true,
      published: false,
      scheduled_publish_time: Math.floor(scheduledAt.getTime() / 1000),
      access_token: IG_TOKEN,
    }),
  });
  const { id, error } = await res.json() as any;
  if (error) throw new Error(`IG container error: ${JSON.stringify(error)}`);

  process.stdout.write(" processing");
  await pollInstagramContainer(id);
  console.log("");

  const publishRes = await fetch(`${IG_BASE}/${IG_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: id, access_token: IG_TOKEN }),
  });
  const { id: postId, error: pubErr } = await publishRes.json() as any;
  if (pubErr) throw new Error(`IG schedule confirm error: ${JSON.stringify(pubErr)}`);
  return postId ?? id;
}

// ── Facebook helpers ──────────────────────────────────────────────────────────

async function scheduleFacebookVideo(
  videoUrl: string,
  caption: string,
  scheduledAt: Date,
): Promise<string> {
  const FB_TOKEN   = process.env.FACEBOOK_PAGE_TOKEN;
  const FB_PAGE_ID = process.env.FACEBOOK_PAGE_ID ?? "1168298143027623";
  if (!FB_TOKEN) throw new Error("Missing FACEBOOK_PAGE_TOKEN in .env.local");

  const res = await fetch(`${IG_BASE}/${FB_PAGE_ID}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_url: videoUrl,
      description: caption,
      published: false,
      scheduled_publish_time: Math.floor(scheduledAt.getTime() / 1000),
      access_token: FB_TOKEN,
    }),
  });
  const { id, error } = await res.json() as any;
  if (error) throw new Error(`Facebook schedule error: ${JSON.stringify(error)}`);
  return id;
}

// ── YouTube helpers ───────────────────────────────────────────────────────────

async function getYouTubeToken(): Promise<string> {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error("Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const { access_token, error } = await res.json() as any;
  if (error || !access_token) throw new Error(`YouTube token error: ${JSON.stringify(error)}`);
  return access_token;
}

async function scheduleYouTubeShort(
  videoPath: string,
  social: { title: string; description: string; tags: string[] },
  scheduledAt: Date,
  accessToken: string,
): Promise<string> {
  const fileBuffer = readFileSync(videoPath);
  const fileSize   = fileBuffer.length;

  // Initiate resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify({
        snippet: {
          title: social.title,
          description: social.description,
          tags: social.tags,
          categoryId: "24", // Entertainment
        },
        status: {
          privacyStatus: "private",          // stays private until publishAt
          publishAt: scheduledAt.toISOString(),
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error(`YouTube: no upload URL (status ${initRes.status})`);

  // Upload binary
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(fileSize) },
    body: fileBuffer,
  });
  const video = await uploadRes.json() as any;
  if (!video.id) throw new Error(`YouTube upload error: ${JSON.stringify(video)}`);
  return video.id as string;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const scheduleFile = loadSchedule();
  const catalog      = loadCatalog();
  const posts: any[] = scheduleFile.posts;

  const now       = new Date();
  const igWindow  = new Date(now.getTime() + IG_MAX_DAYS * 24 * 60 * 60 * 1000);
  const fromDate  = fromArg ? new Date(fromArg) : now;

  console.log(`\n📅 Batch Social Scheduler`);
  console.log(`   Platforms: ${[DO_INSTAGRAM && "instagram", DO_YOUTUBE && "youtube", DO_FACEBOOK && "facebook"].filter(Boolean).join(" + ")}`);
  console.log(`   From: ${fromDate.toDateString()}`);
  if (DO_INSTAGRAM) console.log(`   Instagram window: up to ${igWindow.toDateString()} (75-day limit)`);
  if (DO_YOUTUBE)   console.log(`   YouTube: no window limit — can schedule all posts`);
  if (DO_FACEBOOK)  console.log(`   Facebook: daily cadence — all 147 posts done by Oct 18, 2026`);
  if (DRY_RUN)      console.log(`   DRY RUN — no API calls\n`);

  // Get YouTube token once (reuse across all uploads)
  let ytToken: string | null = null;
  if (DO_YOUTUBE && !DRY_RUN) {
    console.log("\n🔑 Fetching YouTube access token...");
    ytToken = await getYouTubeToken();
    console.log("   Got token ✓");
    // Tokens expire in 1hr; warn if scheduling many posts
    const ytPending = posts.filter(p => p.status === "pending" || !p.scheduled_youtube_id).length;
    if (ytPending > 30) {
      console.log(`   ⚠️  ${ytPending} YouTube posts to schedule — token expires in 1hr, may need to re-run`);
    }
  }

  let igScheduled = 0, igSkipped = 0;
  let ytScheduled = 0, ytSkipped = 0;
  let fbScheduled = 0, fbSkipped = 0;

  for (const post of posts) {
    const { series, part, label, date: dateStr, fb_date: fbDateStr } = post;
    const scheduledAt   = new Date(`${dateStr}T${POST_TIME}`);
    const fbScheduledAt = fbDateStr ? new Date(`${fbDateStr}T${POST_TIME}`) : scheduledAt;
    const needsIG = DO_INSTAGRAM && !post.scheduled_instagram_id && scheduledAt >= fromDate && scheduledAt <= igWindow;
    const needsYT = DO_YOUTUBE   && !post.scheduled_youtube_id;
    const needsFB = DO_FACEBOOK  && !post.scheduled_facebook_id && fbScheduledAt >= fromDate;
    if (!needsIG && !needsYT && !needsFB) continue;

    const catalogPart = getCatalogPart(catalog, series, part);
    const renderFile  = catalogPart?.render_file;
    const renderFileYT = catalogPart?.render_file_yt ?? renderFile; // royalty-free version
    const igCaption   = catalogPart?.social?.instagram?.caption;
    const ytSocial    = catalogPart?.social?.youtube;

    const fbCaption = catalogPart?.social?.facebook?.caption ?? igCaption;
    const igReady = renderFile  && igCaption && existsSync(join(VIDEOS_DIR, renderFile));
    const ytReady = renderFileYT && ytSocial && existsSync(join(VIDEOS_DIR, renderFileYT));
    const fbReady = renderFile  && fbCaption && existsSync(join(VIDEOS_DIR, renderFile));

    console.log(`\n📹 #${post.post} ${label} P${part}  →  IG/YT: ${scheduledAt.toDateString()}  FB: ${fbScheduledAt.toDateString()}`);

    // ── Instagram ──
    if (needsIG) {
      if (!igReady) {
        console.log(`   Instagram: ⚠️  no render file yet — skipping`);
        igSkipped++;
      } else if (DRY_RUN) {
        console.log(`   Instagram: [dry-run] would schedule`);
        igScheduled++;
      } else {
        try {
          process.stdout.write(`   Instagram: uploading blob...`);
          const blobUrl = await uploadToBlob(join(VIDEOS_DIR, renderFile!));
          process.stdout.write(` scheduling`);
          const postId = await scheduleInstagramReel(blobUrl, igCaption!, scheduledAt);
          post.scheduled_instagram_id = postId;
          post.scheduled_for = scheduledAt.toISOString();
          catalogPart!.posted ??= {};
          catalogPart!.posted.instagram = { id: postId, scheduled_for: scheduledAt.toISOString(), date: dateStr };
          saveSchedule(scheduleFile);
          saveCatalog(catalog);
          console.log(`   Instagram: ✅ ${postId}`);
          igScheduled++;
          await new Promise(r => setTimeout(r, 2_000));
        } catch (e: any) {
          console.error(`   Instagram: ❌ ${e.message}`);
          igSkipped++;
        }
      }
    }

    // ── Facebook ──
    if (needsFB) {
      if (!fbReady) {
        console.log(`   Facebook:  ⚠️  no render file yet — skipping`);
        fbSkipped++;
      } else if (DRY_RUN) {
        console.log(`   Facebook:  [dry-run] would schedule for ${fbScheduledAt.toDateString()}`);
        fbScheduled++;
      } else {
        try {
          // Reuse blob URL if Instagram already uploaded this post
          let blobUrl: string;
          if (post.blob_url) {
            blobUrl = post.blob_url;
            console.log(`   Facebook:  reusing blob...`);
          } else {
            process.stdout.write(`   Facebook:  uploading blob...`);
            blobUrl = await uploadToBlob(join(VIDEOS_DIR, renderFile!));
            post.blob_url = blobUrl; // cache for reuse
            console.log(``);
          }
          process.stdout.write(`   Facebook:  scheduling...`);
          const postId = await scheduleFacebookVideo(blobUrl, fbCaption!, fbScheduledAt);
          post.scheduled_facebook_id = postId;
          catalogPart!.posted ??= {};
          catalogPart!.posted.facebook = { id: postId, scheduled_for: fbScheduledAt.toISOString(), date: fbDateStr };
          saveSchedule(scheduleFile);
          saveCatalog(catalog);
          console.log(` ✅ ${postId}`);
          fbScheduled++;
          await new Promise(r => setTimeout(r, 1_000));
        } catch (e: any) {
          console.error(`   Facebook:  ❌ ${e.message}`);
          fbSkipped++;
        }
      }
    }

    // ── YouTube ──
    if (needsYT) {
      if (!ytReady) {
        console.log(`   YouTube:   ⚠️  no render file yet — skipping`);
        ytSkipped++;
      } else if (DRY_RUN) {
        console.log(`   YouTube:   [dry-run] would schedule for ${scheduledAt.toISOString()}`);
        ytScheduled++;
      } else {
        try {
          const sizeMB = (readFileSync(join(VIDEOS_DIR, renderFileYT!)).length / 1024 / 1024).toFixed(1);
          process.stdout.write(`   YouTube:   uploading ${sizeMB}MB...`);
          const videoId = await scheduleYouTubeShort(
            join(VIDEOS_DIR, renderFileYT!),
            ytSocial!,
            scheduledAt,
            ytToken!,
          );
          post.scheduled_youtube_id = videoId;
          catalogPart!.posted ??= {};
          catalogPart!.posted.youtube = { id: videoId, scheduled_for: scheduledAt.toISOString(), date: dateStr };
          saveSchedule(scheduleFile);
          saveCatalog(catalog);
          console.log(` ✅ https://youtube.com/shorts/${videoId}`);
          ytScheduled++;
          await new Promise(r => setTimeout(r, 1_000));
        } catch (e: any) {
          console.error(`   YouTube:   ❌ ${e.message}`);
          ytSkipped++;
        }
      }
    }
  }

  console.log(`\n✅ Done.`);
  if (DO_INSTAGRAM) {
    console.log(`   Instagram  scheduled: ${igScheduled}  skipped: ${igSkipped}`);
    if (!DRY_RUN && igScheduled > 0) {
      const nextRun = new Date(igWindow.getTime() - 7 * 24 * 60 * 60 * 1000);
      console.log(`   Next Instagram run: ~${nextRun.toDateString()}`);
    }
  }
  if (DO_YOUTUBE) {
    console.log(`   YouTube    scheduled: ${ytScheduled}  skipped: ${ytSkipped}`);
  }
  if (DO_FACEBOOK) {
    console.log(`   Facebook   scheduled: ${fbScheduled}  skipped: ${fbSkipped}`);
  }
}

main().catch(e => { console.error("\n❌", e.message); process.exit(1); });
