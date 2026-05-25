#!/usr/bin/env npx ts-node
/**
 * Post a quiz Reel to @KitsuBeat YouTube channel.
 * Reads metadata from videos/catalog.json.
 * Uses the pre-built _yt.mp4 from embed-music.mjs (no audio remixing).
 *
 * Usage:
 *   npx ts-node scripts/youtube-post.ts --anime naruto
 *   npx ts-node scripts/youtube-post.ts --anime naruto --part 2
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, resolve, basename } from "path";
import * as https from "https";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname as _dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname  = _dirname(__filename);

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID!;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN!;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error("Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN in .env.local");
}

const CATEGORY_ID   = "27"; // Education
const PLAYLIST_NAME = "Japanese Vocab Quiz";
const ROOT          = resolve(__dirname, "..");

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const getArg   = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const animeSlug = getArg("--anime");
const partN     = getArg("--part") ? parseInt(getArg("--part")!, 10) : 1;

if (!animeSlug) {
  console.error("Usage: npx ts-node scripts/youtube-post.ts --anime <slug> [--part <n>]");
  process.exit(1);
}

// ─── Load catalog ─────────────────────────────────────────────────────────────

const catalog = JSON.parse(readFileSync(join(ROOT, "videos", "catalog.json"), "utf-8"));
const series  = catalog[animeSlug];
if (!series) { console.error(`✗ Unknown anime: ${animeSlug}`); process.exit(1); }

const part = series.parts.find((p: any) => p.part === partN);
if (!part) { console.error(`✗ Part ${partN} not found for ${animeSlug}`); process.exit(1); }

const yt = part.social?.youtube;
if (!yt?.title) { console.error(`✗ No social.youtube metadata in catalog.json for ${animeSlug} part ${partN}`); process.exit(1); }

// ─── Resolve files ───────────────────────────────────────────────────────────

const folderName = partN === 1 ? `${animeSlug}-quiz` : `${animeSlug}-quiz-${partN}`;
const quizDir    = join(ROOT, "videos", folderName);
const rendersDir = join(quizDir, "renders");
const thumbPath  = join(quizDir, "thumbnail.png");

if (!existsSync(rendersDir)) { console.error(`✗ renders/ not found at ${rendersDir}`); process.exit(1); }

// Use render_file_yt from catalog, or find newest _yt.mp4
let videoPath: string;
if (part.render_file_yt) {
  videoPath = join(ROOT, "videos", part.render_file_yt);
} else {
  const ytFiles = readdirSync(rendersDir)
    .filter(f => f.endsWith("_yt.mp4"))
    .map(f => join(rendersDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!ytFiles.length) { console.error(`✗ No _yt.mp4 found in ${rendersDir} — run: node scripts/embed-music.mjs --anime ${animeSlug}`); process.exit(1); }
  videoPath = ytFiles[0];
}

if (!existsSync(videoPath)) { console.error(`✗ Video file not found: ${videoPath}`); process.exit(1); }
if (!existsSync(thumbPath)) { console.warn(`⚠  No thumbnail.png at ${thumbPath} — skipping thumbnail`); }

console.log(`\n▶ YouTube upload — ${series.label} Part ${partN}`);
console.log(`  Video : ${basename(videoPath)}`);
console.log(`  Title : ${yt.title}`);
console.log("");

// ─── OAuth ────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
  }).toString();
  const data = await httpPost("oauth2.googleapis.com", "/token", body, {
    "Content-Type": "application/x-www-form-urlencoded",
  });
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function httpPost(host: string, path: string, body: string | Buffer, headers: Record<string, string>): Promise<any> {
  return new Promise((res, rej) => {
    const buf = typeof body === "string" ? Buffer.from(body) : body;
    const req = https.request(
      { host, path, method: "POST", headers: { ...headers, "Content-Length": buf.length } },
      (r) => { const c: Buffer[] = []; r.on("data", d => c.push(d)); r.on("end", () => { try { res(JSON.parse(Buffer.concat(c).toString())); } catch { res(Buffer.concat(c).toString()); } }); }
    );
    req.on("error", rej); req.write(buf); req.end();
  });
}

function httpGet(host: string, path: string, headers: Record<string, string>): Promise<any> {
  return new Promise((res, rej) => {
    const req = https.request({ host, path, method: "GET", headers }, (r) => {
      const c: Buffer[] = []; r.on("data", d => c.push(d)); r.on("end", () => { try { res(JSON.parse(Buffer.concat(c).toString())); } catch { res(Buffer.concat(c).toString()); } });
    });
    req.on("error", rej); req.end();
  });
}

// ─── YouTube API ──────────────────────────────────────────────────────────────

async function uploadVideo(token: string): Promise<string> {
  console.log("⏳ Initiating resumable upload...");
  const fileSize = fs.statSync(videoPath).size;
  const meta = JSON.stringify({
    snippet: { title: yt.title, description: yt.description, tags: yt.tags ?? [], categoryId: CATEGORY_ID },
    status:  { privacyStatus: "public", selfDeclaredMadeForKids: false },
  });

  const uploadUrl = await new Promise<string>((res, rej) => {
    const req = https.request({
      host: "www.googleapis.com",
      path: "/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": fileSize,
        "Content-Length": Buffer.byteLength(meta),
      },
    }, (r) => { const c: Buffer[] = []; r.on("data", d => c.push(d)); r.on("end", () => res(r.headers.location!)); });
    req.on("error", rej); req.write(meta); req.end();
  });

  console.log("⏳ Uploading video...");
  const videoId = await new Promise<string>((res, rej) => {
    const url = new URL(uploadUrl);
    const req = https.request({
      host: url.host, path: url.pathname + url.search, method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Length": fileSize },
    }, (r) => {
      const c: Buffer[] = []; r.on("data", d => c.push(d));
      r.on("end", () => { const body = JSON.parse(Buffer.concat(c).toString()); res(body.id); });
    });
    req.on("error", rej);
    const stream = fs.createReadStream(videoPath);
    let uploaded = 0;
    stream.on("data", (chunk) => {
      uploaded += (chunk as Buffer).length;
      process.stdout.write(`\r  ${Math.round(uploaded / fileSize * 100)}%  `);
    });
    stream.on("end", () => process.stdout.write("\n"));
    stream.pipe(req);
  });

  console.log(`✓ Uploaded — video ID: ${videoId}`);
  return videoId;
}

async function setThumbnail(token: string, videoId: string) {
  if (!existsSync(thumbPath)) return;
  console.log("⏳ Setting thumbnail...");
  const img = readFileSync(thumbPath);
  const res = await new Promise<any>((resolve, reject) => {
    const req = https.request({
      host: "www.googleapis.com",
      path: `/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png", "Content-Length": img.length },
    }, (r) => { const c: Buffer[] = []; r.on("data", d => c.push(d)); r.on("end", () => resolve(JSON.parse(Buffer.concat(c).toString()))); });
    req.on("error", reject); req.write(img); req.end();
  });
  if (res.error) console.warn("  ⚠ Thumbnail error:", res.error.message);
  else console.log("✓ Thumbnail set");
}

async function addToPlaylist(token: string, videoId: string) {
  console.log("⏳ Adding to playlist...");
  const list = await httpGet("www.googleapis.com",
    "/youtube/v3/playlists?part=snippet&mine=true&maxResults=50",
    { Authorization: `Bearer ${token}` });

  let playlistId = list.items?.find((p: any) => p.snippet.title === PLAYLIST_NAME)?.id;
  if (!playlistId) {
    console.log(`  Creating playlist "${PLAYLIST_NAME}"...`);
    const created = await httpPost("www.googleapis.com", "/youtube/v3/playlists?part=snippet,status",
      JSON.stringify({ snippet: { title: PLAYLIST_NAME }, status: { privacyStatus: "public" } }),
      { Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
    playlistId = created.id;
  }

  await httpPost("www.googleapis.com", "/youtube/v3/playlistItems?part=snippet",
    JSON.stringify({ snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } }),
    { Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
  console.log("✓ Added to playlist");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const token   = await getAccessToken();
  const videoId = await uploadVideo(token);
  await setThumbnail(token, videoId);
  await addToPlaylist(token, videoId);

  // Update catalog.json
  const today        = new Date().toISOString().slice(0, 10);
  const freshCatalog = JSON.parse(readFileSync(join(ROOT, "videos", "catalog.json"), "utf-8"));
  const freshPart    = freshCatalog[animeSlug].parts.find((p: any) => p.part === partN);
  if (!freshPart.posted) freshPart.posted = {};
  freshPart.posted.youtube = { id: videoId, date: today };
  fs.writeFileSync(join(ROOT, "videos", "catalog.json"), JSON.stringify(freshCatalog, null, 2), "utf-8");

  console.log(`\n✅ Posted to YouTube: https://youtube.com/shorts/${videoId}`);
  console.log("   catalog.json updated.\n");
}

main().catch(e => { console.error("✗", e.message ?? e); process.exit(1); });
