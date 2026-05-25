#!/usr/bin/env npx ts-node
/**
 * Post a quiz video to Instagram + TikTok, and generate a YouTube upload package.
 *
 * Usage:
 *   npx ts-node scripts/post-social.ts --dir videos/one-piece-quiz
 *
 * Reads metadata from <dir>/social.json.
 * Video files are discovered in <dir>/renders/:
 *   *_music.mp4  → Instagram (anime OST baked in)
 *   *_yt.mp4     → YouTube package (royalty-free)
 *   *.mp4        → TikTok (clean, no suffix match above)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, resolve, basename } from "path";
import { execSync } from "child_process";
import { postInstagramReel } from "../lib/instagram-reel";
import { generateYouTubePackage } from "../lib/youtube-package";

// ── Args ─────────────────────────────────────────────────────────────────────

function getArg(flag: string): string {
  const i = process.argv.indexOf(flag);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`Missing arg: ${flag}`);
  return process.argv[i + 1];
}

function hasArg(flag: string): boolean {
  return process.argv.includes(flag);
}

// ── Social config schema ──────────────────────────────────────────────────────

interface SocialConfig {
  caption: string;           // shared caption for Instagram + TikTok
  tiktokSound: string;       // sound name to search on TikTok (e.g. "Overtaken")
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
}

// ── File discovery ────────────────────────────────────────────────────────────

function findRenders(dir: string): { music: string; yt: string; clean: string } {
  const rendersDir = join(dir, "renders");
  if (!existsSync(rendersDir)) throw new Error(`renders/ not found in ${dir}`);

  // Sort descending by name — timestamps in filenames mean latest render is last alphabetically
  const files = readdirSync(rendersDir).filter(f => f.endsWith(".mp4")).sort().reverse();
  const music = files.find(f => f.includes("_music"));
  const yt = files.find(f => f.includes("_yt"));
  const clean = files.find(f => !f.includes("_music") && !f.includes("_yt") && !f.includes("_sagas"));

  if (!music) throw new Error(`No *_music.mp4 found in ${rendersDir}`);
  if (!yt) throw new Error(`No *_yt.mp4 found in ${rendersDir}`);
  if (!clean) throw new Error(`No clean .mp4 found in ${rendersDir}`);

  return {
    music: join(rendersDir, music),
    yt: join(rendersDir, yt),
    clean: join(rendersDir, clean),
  };
}

// ── Catalog write-back ────────────────────────────────────────────────────────

const CATALOG_PATH = join("videos", "catalog.json");

function updateCatalog(dir: string, platform: "instagram" | "tiktok" | "youtube", id?: string): void {
  if (!existsSync(CATALOG_PATH)) return;
  const folderName = basename(dir); // e.g. "one-piece-quiz-2"
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
  for (const series of Object.values(catalog) as any[]) {
    const part = (series.parts || []).find((p: any) => p.folder === folderName);
    if (part) {
      if (!part.posted) part.posted = {};
      part.posted[platform] = { date: new Date().toISOString().slice(0, 10), ...(id ? { id } : {}) };
      part.status = "posted";
      writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf-8");
      console.log(`📋 catalog.json updated: ${folderName} → ${platform}`);
      return;
    }
  }
  console.warn(`⚠️  catalog.json: no entry found for folder "${folderName}" — update manually`);
}

// ── TikTok via browser-harness ────────────────────────────────────────────────

function runTikTokUpload(cleanVideo: string, cfg: SocialConfig): void {
  const absVideo = resolve(cleanVideo).replace(/\\/g, "/");
  const tmp = join(process.env.TEMP || "/tmp", `tiktok-${Date.now()}`);
  const cfgPath = `${tmp}.json`;
  const pyPath  = `${tmp}.py`;

  // Write config as JSON to avoid Unicode issues with emoji in caption
  writeFileSync(cfgPath, JSON.stringify({
    video: absVideo,
    caption: cfg.caption,
    sound: cfg.tiktokSound,
  }), "utf-8");

  const script = `
import json
_cfg = json.load(open(${JSON.stringify(cfgPath)}, encoding='utf-8'))
TIKTOK_VIDEO_PATH = _cfg['video']
TIKTOK_CAPTION    = _cfg['caption']
TIKTOK_SOUND      = _cfg['sound']
exec(open('scripts/tiktok-upload.py', encoding='utf-8').read())
`.trim();

  writeFileSync(pyPath, script, "ascii");  // ascii-safe wrapper

  console.log("🎵 TikTok: launching browser-harness...");
  try {
    execSync(`browser-harness < "${pyPath}"`, { stdio: "inherit" });
  } finally {
    try { unlinkSync(pyPath); } catch {}
    try { unlinkSync(cfgPath); } catch {}
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dir = getArg("--dir");
  if (!existsSync(dir)) throw new Error(`Directory not found: ${dir}`);

  const cfgPath = join(dir, "social.json");
  if (!existsSync(cfgPath)) throw new Error(`Missing ${cfgPath} — create it with caption/tiktokSound/youtube metadata`);

  const cfg: SocialConfig = JSON.parse(readFileSync(cfgPath, "utf-8"));
  const { music, yt, clean } = findRenders(dir);

  const skipInstagram = hasArg("--skip-instagram");
  const skipTikTok    = hasArg("--skip-tiktok");
  const skipYoutube   = hasArg("--skip-youtube");

  console.log("\n📋 Post plan:");
  console.log(`   Dir:       ${dir}`);
  console.log(`   Instagram: ${skipInstagram ? "SKIP" : music}`);
  console.log(`   TikTok:    ${skipTikTok    ? "SKIP" : clean}`);
  console.log(`   YouTube:   ${skipYoutube   ? "SKIP" : yt + " → YOUTUBE-UPLOAD.md"}`);
  console.log(`   Caption:   ${cfg.caption.slice(0, 60)}...`);
  console.log("");

  // 1. Instagram Reels
  if (!skipInstagram) {
    const igId = await postInstagramReel(music, cfg.caption);
    updateCatalog(dir, "instagram", igId);
    console.log("");
  }

  // 2. YouTube package (local, instant)
  if (!skipYoutube) {
    generateYouTubePackage({
      videoPath: yt,
      title: cfg.youtube.title,
      description: cfg.youtube.description,
      tags: cfg.youtube.tags,
      outputDir: dir,
    });
    // YouTube ID comes from manual upload; mark as posted without ID
    updateCatalog(dir, "youtube");
    console.log("");
  }

  // 3. TikTok (browser automation — runs last, may need interaction)
  if (!skipTikTok) {
    runTikTokUpload(clean, cfg);
    updateCatalog(dir, "tiktok");
    console.log("");
  }

  console.log("🎉 Done!");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
