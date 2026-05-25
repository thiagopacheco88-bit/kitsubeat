import { writeFileSync } from "fs";
import { join } from "path";

export interface YouTubePackage {
  videoPath: string;    // path to *_yt.mp4
  title: string;
  description: string;
  tags: string[];
  outputDir: string;
}

export function generateYouTubePackage(opts: YouTubePackage): void {
  const { videoPath, title, description, tags, outputDir } = opts;

  const content = `# YouTube Upload Package

> Generated ${new Date().toISOString().slice(0, 10)}

## Video file
\`${videoPath}\`

## Title
${title}

## Description
${description}

## Tags
${tags.join(", ")}

---

## Upload steps (YouTube mobile app)
1. Open YouTube app → tap **+** → **Create a Short**
2. Tap the **gallery icon** (bottom-left) → select the video file above
3. Tap **Add sound** → search for the anime OST → select it
4. Tap **Next** → paste the **title** above
5. Tap **More options** → paste the **description** and **tags** above
6. **Post Short**

## Upload steps (YouTube Studio web — no native music)
1. Go to studio.youtube.com → **Create → Upload video**
2. Select the video file above
3. Paste title, description, tags
4. Set visibility → **Public**
5. Publish *(no native music via web — use phone app for OST)*
`;

  const outPath = join(outputDir, "YOUTUBE-UPLOAD.md");
  writeFileSync(outPath, content, "utf-8");
  console.log("📦 YouTube package saved:", outPath);
}
