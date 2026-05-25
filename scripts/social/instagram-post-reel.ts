#!/usr/bin/env npx ts-node
/**
 * Post a Reel to @kitsubeat Instagram via the Graph API.
 * Uploads the local mp4 to Vercel Blob, then uses the Reels container endpoint.
 *
 * Usage:
 *   npx ts-node scripts/instagram-post-reel.ts --video ./path/to/video.mp4 --caption "text"
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { basename } from "path";

const TOKEN = process.env.INSTAGRAM_LONG_TOKEN!;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const BASE = "https://graph.facebook.com/v19.0";

if (!TOKEN || !IG_ID) throw new Error("Missing INSTAGRAM_LONG_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID");

async function uploadToBlob(videoPath: string): Promise<string> {
  const file = readFileSync(videoPath);
  const filename = `instagram/${Date.now()}-${basename(videoPath)}`;
  const { url } = await put(filename, file, { access: "public" });
  console.log("✓ Uploaded to Blob:", url);
  return url;
}

async function createReelContainer(videoUrl: string, caption: string): Promise<string> {
  const res = await fetch(`${BASE}/${IG_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: true,
      access_token: TOKEN,
    }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(`Container error: ${JSON.stringify(data.error)}`);
  console.log("✓ Container created:", data.id);
  return data.id;
}

async function waitUntilReady(containerId: string, maxWaitSecs = 300): Promise<void> {
  const deadline = Date.now() + maxWaitSecs * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`${BASE}/${containerId}?fields=status_code&access_token=${TOKEN}`);
    const { status_code } = await res.json() as any;
    process.stdout.write(`  status: ${status_code}\n`);
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error("Instagram rejected the video during processing");
  }
  throw new Error("Timed out waiting for video to process");
}

async function publishContainer(containerId: string): Promise<string> {
  const res = await fetch(`${BASE}/${IG_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: TOKEN }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(`Publish error: ${JSON.stringify(data.error)}`);
  console.log("✓ Published! Post ID:", data.id);
  return data.id;
}

async function main() {
  const args = process.argv.slice(2);
  const videoPath = args[args.indexOf("--video") + 1];
  const captionIdx = args.indexOf("--caption");
  const caption = captionIdx !== -1 ? args[captionIdx + 1] : "";

  if (!videoPath) {
    console.error("Usage: npx ts-node scripts/instagram-post-reel.ts --video <path> --caption <text>");
    process.exit(1);
  }

  console.log(`\n🎬 Posting Reel: ${basename(videoPath)}`);
  const videoUrl = await uploadToBlob(videoPath);

  console.log("⏳ Creating Reel container...");
  const containerId = await createReelContainer(videoUrl, caption);

  console.log("⏳ Waiting for Instagram to process video (up to 5 min)...");
  await waitUntilReady(containerId);

  console.log("⏳ Publishing...");
  await publishContainer(containerId);

  console.log("\n✅ Reel posted to @kitsubeat!\n");
}

main().catch(e => { console.error("✗", e.message); process.exit(1); });
