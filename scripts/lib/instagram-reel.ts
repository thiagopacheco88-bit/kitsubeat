import { config } from "dotenv";
config({ path: ".env.local" });
import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { basename } from "path";

const TOKEN = process.env.INSTAGRAM_LONG_TOKEN!;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const BASE = "https://graph.facebook.com/v19.0";

async function uploadToBlob(videoPath: string): Promise<string> {
  const file = readFileSync(videoPath);
  const filename = `instagram/${Date.now()}-${basename(videoPath)}`;
  const { url } = await put(filename, file, { access: "public" });
  console.log("   Blob URL:", url);
  return url;
}

async function pollUntilReady(containerId: string, maxWaitMs = 300_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${BASE}/${containerId}?fields=status_code,status&access_token=${TOKEN}`
    );
    const data = await res.json() as { status_code: string; status?: string };
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error(`Instagram processing failed: ${JSON.stringify(data)}`);
    console.log("   Status:", data.status_code, "— waiting 5s...");
    await new Promise(r => setTimeout(r, 5_000));
  }
  throw new Error("Timed out waiting for Instagram to process video");
}

export async function postInstagramReel(
  videoPath: string,
  caption: string,
  scheduledAt?: Date,
): Promise<string> {
  if (!TOKEN || !IG_ID) throw new Error("Missing INSTAGRAM_LONG_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID");

  // Instagram allows scheduling 15 min – 75 days out
  if (scheduledAt) {
    const minutesOut = (scheduledAt.getTime() - Date.now()) / 60_000;
    if (minutesOut < 15) throw new Error("scheduledAt must be at least 15 minutes in the future");
    if (minutesOut > 75 * 24 * 60) throw new Error("scheduledAt must be within 75 days");
    console.log(`📸 Instagram: scheduling for ${scheduledAt.toISOString()}...`);
  } else {
    console.log("📸 Instagram: uploading video to Blob...");
  }

  const videoUrl = await uploadToBlob(videoPath);

  console.log("📸 Instagram: creating Reels container...");
  const body: Record<string, any> = {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: true,
    access_token: TOKEN,
  };
  if (scheduledAt) {
    body.published = false;
    body.scheduled_publish_time = Math.floor(scheduledAt.getTime() / 1000);
  }

  const containerRes = await fetch(`${BASE}/${IG_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const { id: containerId, error } = await containerRes.json() as any;
  if (error) throw new Error(`Container error: ${JSON.stringify(error)}`);
  console.log("   Container ID:", containerId);

  console.log("📸 Instagram: waiting for video processing (up to 5 min)...");
  await pollUntilReady(containerId);

  console.log("📸 Instagram: publishing...");
  const publishRes = await fetch(`${BASE}/${IG_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: TOKEN }),
  });
  const { id: postId, error: pubError } = await publishRes.json() as any;
  if (pubError) throw new Error(`Publish error: ${JSON.stringify(pubError)}`);

  if (scheduledAt) {
    console.log(`✅ Instagram: scheduled for ${scheduledAt.toISOString()}! Container ID:`, containerId);
    return containerId; // scheduled posts return container ID, not post ID
  }
  console.log("✅ Instagram: posted! Post ID:", postId);
  return postId;
}
