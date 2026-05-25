#!/usr/bin/env npx ts-node
/**
 * Post an image to @kitsubeat Instagram via the Graph API.
 * Uploads a local image to Vercel Blob to get a public URL first.
 *
 * Usage:
 *   npx ts-node scripts/instagram-post.ts --image ./path/to/image.jpg --caption "Your caption"
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { basename } from "path";

const TOKEN = process.env.INSTAGRAM_LONG_TOKEN!;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const BASE = "https://graph.facebook.com/v19.0";

async function uploadToBlob(imagePath: string): Promise<string> {
  const file = readFileSync(imagePath);
  const filename = `instagram/${Date.now()}-${basename(imagePath)}`;
  const { url } = await put(filename, file, { access: "public" });
  console.log("Uploaded to Blob:", url);
  return url;
}

async function postToInstagram(imageUrl: string, caption: string) {
  // Step 1: create media container
  const createRes = await fetch(`${BASE}/${IG_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: TOKEN }),
  });
  const { id: containerId, error: createError } = await createRes.json() as any;
  if (createError) throw new Error(`Container error: ${JSON.stringify(createError)}`);
  console.log("Container created:", containerId);

  // Step 2: publish
  const publishRes = await fetch(`${BASE}/${IG_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: TOKEN }),
  });
  const { id: postId, error: publishError } = await publishRes.json() as any;
  if (publishError) throw new Error(`Publish error: ${JSON.stringify(publishError)}`);

  console.log("Posted! Post ID:", postId);
}

async function main() {
  if (!TOKEN || !IG_ID) {
    throw new Error("Missing INSTAGRAM_LONG_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID in .env.local");
  }

  const args = process.argv.slice(2);
  const imagePath = args[args.indexOf("--image") + 1];
  const captionIdx = args.indexOf("--caption");
  const caption = captionIdx !== -1 ? args[captionIdx + 1] : "";

  if (!imagePath) {
    console.error("Usage: npx ts-node scripts/instagram-post.ts --image <path> --caption <text>");
    process.exit(1);
  }

  const imageUrl = await uploadToBlob(imagePath);
  await postToInstagram(imageUrl, caption);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
