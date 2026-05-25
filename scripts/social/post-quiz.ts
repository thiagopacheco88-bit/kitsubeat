#!/usr/bin/env npx ts-node
/**
 * Post a quiz video to social media from the catalog.
 *
 * Usage:
 *   npx ts-node scripts/post-quiz.ts --series one-piece --part 1 [--platform all]
 *
 * Platforms:
 *   instagram  — uploads MP4 to Vercel Blob and posts as a Reel (automated)
 *   facebook   — posts to linked Facebook Page using same Blob URL (automated)
 *   youtube    — uploads MP4 to YouTube Shorts via Data API v3 (automated)
 *   tiktok     — prints caption to console for manual paste
 *   all        — does instagram + facebook + youtube automatically, prints tiktok
 *
 * Default platform: all
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { put } from "@vercel/blob";
import { readFileSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.INSTAGRAM_LONG_TOKEN!;
const IG_ID  = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const BASE   = "https://graph.facebook.com/v19.0";

const CATALOG_PATH = resolve(__dirname, "../videos/catalog.json");
const VIDEOS_DIR   = resolve(__dirname, "../videos");

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadCatalog(): Record<string, any> {
  return JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
}

function saveCatalog(catalog: Record<string, any>) {
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
}

function getPart(catalog: Record<string, any>, series: string, part: number) {
  const s = catalog[series];
  if (!s) throw new Error(`Series "${series}" not found in catalog`);
  const p = s.parts.find((x: any) => x.part === part);
  if (!p) throw new Error(`Part ${part} not found for series "${series}"`);
  return p;
}

async function uploadVideo(videoPath: string): Promise<string> {
  console.log(`\nUploading ${videoPath} to Vercel Blob...`);
  const file = readFileSync(videoPath);
  const filename = `quiz-videos/${Date.now()}-${videoPath.split(/[\\/]/).pop()}`;
  const { url } = await put(filename, file, { access: "public", contentType: "video/mp4" });
  console.log("✓ Uploaded:", url);
  return url;
}

// ─── Instagram Reels ──────────────────────────────────────────────────────────

async function postInstagramReel(videoUrl: string, caption: string): Promise<string> {
  if (!TOKEN || !IG_ID) throw new Error("Missing INSTAGRAM_LONG_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID");

  console.log("\nCreating Instagram Reel container...");
  const createRes = await fetch(`${BASE}/${IG_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl, caption, media_type: "REELS", access_token: TOKEN }),
  });
  const { id: containerId, error: createErr } = await createRes.json() as any;
  if (createErr) throw new Error(`Container error: ${JSON.stringify(createErr)}`);
  console.log("Container ID:", containerId);

  console.log("Waiting for Instagram to process video");
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 8000));
    const statusRes = await fetch(
      `${BASE}/${containerId}?fields=status_code&access_token=${TOKEN}`
    );
    const { status_code } = await statusRes.json() as any;
    process.stdout.write(` ${status_code}`);
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR") throw new Error("Instagram video processing failed");
  }
  console.log();

  console.log("Publishing Reel...");
  const publishRes = await fetch(`${BASE}/${IG_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: TOKEN }),
  });
  const { id: postId, error: publishErr } = await publishRes.json() as any;
  if (publishErr) throw new Error(`Publish error: ${JSON.stringify(publishErr)}`);

  console.log("✓ Reel posted! Post ID:", postId);
  return postId;
}

// ─── Facebook Page ─────────────────────────────────────────────────────────────

async function postFacebook(videoUrl: string, caption: string, scheduledTime?: Date): Promise<string> {
  const FB_PAGE_TOKEN = process.env.FACEBOOK_PAGE_TOKEN;
  const FB_PAGE_ID    = process.env.FACEBOOK_PAGE_ID ?? "1168298143027623"; // KitsuBeat page

  if (!FB_PAGE_TOKEN) throw new Error("Missing FACEBOOK_PAGE_TOKEN in .env.local — get it from developers.facebook.com/tools/explorer");

  const body: Record<string, any> = { file_url: videoUrl, description: caption, access_token: FB_PAGE_TOKEN };
  if (scheduledTime) {
    body.published = false;
    body.scheduled_publish_time = Math.floor(scheduledTime.getTime() / 1000);
    console.log(`\nScheduling Facebook post for: ${scheduledTime.toISOString()}`);
  } else {
    console.log(`\nPosting to Facebook Page ID: ${FB_PAGE_ID}`);
  }

  const fbRes = await fetch(`${BASE}/${FB_PAGE_ID}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const { id: fbPostId, error: fbErr } = await fbRes.json() as any;
  if (fbErr) throw new Error(`Facebook post error: ${JSON.stringify(fbErr)}`);

  if (scheduledTime) {
    console.log("✓ Facebook video scheduled! Post ID:", fbPostId);
  } else {
    console.log("✓ Facebook video posted! Post ID:", fbPostId);
  }
  return fbPostId;
}

// ─── YouTube Shorts ───────────────────────────────────────────────────────────

async function postYouTube(videoPath: string, social: any): Promise<string> {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error("Missing YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, or YOUTUBE_REFRESH_TOKEN");
  }

  // Exchange refresh token for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const { access_token, error: tokenErr } = await tokenRes.json() as any;
  if (tokenErr || !access_token) throw new Error(`YouTube token error: ${JSON.stringify(tokenErr)}`);

  const fileBuffer = readFileSync(videoPath);
  const fileSize = fileBuffer.length;
  console.log(`\nUploading ${(fileSize / 1024 / 1024).toFixed(1)} MB to YouTube Shorts...`);

  // Initiate resumable upload session
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify({
        snippet: {
          title: social.youtube.title,
          description: social.youtube.description,
          tags: social.youtube.tags,
          categoryId: "24", // Entertainment
        },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      }),
    }
  );
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error(`YouTube: no upload URL in response (status ${initRes.status})`);

  // Upload the video binary
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(fileSize) },
    body: fileBuffer,
  });
  const video = await uploadRes.json() as any;
  if (!video.id) throw new Error(`YouTube upload error: ${JSON.stringify(video)}`);

  console.log(`✓ YouTube Short uploaded! https://youtube.com/shorts/${video.id}`);
  return video.id as string;
}

// ─── print helpers ─────────────────────────────────────────────────────────────

function printDivider(label: string) {
  const line = "─".repeat(60);
  console.log(`\n${line}\n  ${label}\n${line}`);
}

function printTikTok(social: any) {
  printDivider("TIKTOK — paste when uploading");
  console.log("\nCaption (add music natively in app):\n");
  console.log(social.tiktok.caption);
}

// ─── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const get  = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

  const series   = get("--series")   ?? (() => { throw new Error("--series required (e.g. one-piece)") })();
  const partNum  = parseInt(get("--part") ?? (() => { throw new Error("--part required (e.g. 1)") })());
  const platform = get("--platform") ?? "all";
  const scheduleAt = get("--schedule-at"); // ISO datetime e.g. "2026-05-25T12:00:00Z"

  const catalog = loadCatalog();
  const part    = getPart(catalog, series, partNum);

  if (!part.render_file) throw new Error(`Part ${partNum} has no render_file. Run 'npx hyperframes render' first.`);
  if (!part.social)      throw new Error(`Part ${partNum} has no social metadata in catalog.json`);

  const videoPath    = join(VIDEOS_DIR, part.render_file);
  const videoPathYT  = part.render_file_yt ? join(VIDEOS_DIR, part.render_file_yt) : videoPath;
  const { social } = part;

  console.log(`\nPosting: ${catalog[series].label} — Part ${partNum}`);
  console.log(`Video:   ${videoPath}`);
  console.log(`Words:   ${part.words.map((w: any) => w.romaji).join(", ")}`);

  // Upload to Blob once — reused for both Instagram and Facebook
  let blobUrl: string | null = null;
  const needsBlob = ["instagram", "facebook", "all"].includes(platform);
  if (needsBlob) blobUrl = await uploadVideo(videoPath);

  if (platform === "instagram" || platform === "all") {
    const postId = await postInstagramReel(blobUrl!, social.instagram.caption);
    getPart(catalog, series, partNum).posted.instagram = { id: postId, date: new Date().toISOString().slice(0, 10) };
    saveCatalog(catalog);
    console.log("✓ catalog.json updated (instagram)");
  }

  if (platform === "facebook" || platform === "all") {
    const fbCaption = social.facebook?.caption ?? social.instagram.caption;
    const scheduledTime = scheduleAt ? new Date(scheduleAt) : undefined;
    const fbPostId = await postFacebook(blobUrl!, fbCaption, scheduledTime);
    const fbEntry: any = { id: fbPostId, date: (scheduledTime ?? new Date()).toISOString().slice(0, 10) };
    if (scheduledTime) fbEntry.scheduled_for = scheduledTime.toISOString();
    getPart(catalog, series, partNum).posted.facebook = fbEntry;
    saveCatalog(catalog);
    console.log("✓ catalog.json updated (facebook)");
  }

  if (platform === "youtube" || platform === "all") {
    const ytId = await postYouTube(videoPathYT, social);
    getPart(catalog, series, partNum).posted.youtube = { id: ytId, date: new Date().toISOString().slice(0, 10) };
    saveCatalog(catalog);
    console.log("✓ catalog.json updated (youtube)");
  }

  if (platform === "tiktok" || platform === "all") printTikTok(social);

  console.log("\n✅ Done.\n");
}

main().catch(e => { console.error("\n❌", e.message); process.exit(1); });
