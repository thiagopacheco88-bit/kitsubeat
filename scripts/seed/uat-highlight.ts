import { chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

const slug = process.argv[2] || "kaikai-kitan-eve";
const baseUrl = process.argv[3] || "http://localhost:7000";

(async () => {
  const lesson = JSON.parse(readFileSync(resolve(`data/lessons-cache/${slug}.json`), "utf-8"));
  const checkpoints = [10000, 60000, 120000, 180000];
  const expected = checkpoints.map((ms) => {
    let pick = -1;
    for (let i = lesson.verses.length - 1; i >= 0; i--) {
      if (lesson.verses[i].start_time_ms <= ms) { pick = lesson.verses[i].verse_number; break; }
    }
    return { ms, expected: pick };
  });
  console.log("[uat] expected active verses by time:", expected);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto(`${baseUrl}/songs/${slug}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);

  // Wait for YouTube iframe + click play (player loads on user interaction)
  // We can't easily drive the YT iframe from outside, but we can directly inject
  // a fake currentTimeMs into PlayerContext via a custom event if exposed,
  // OR just check whether the verse-block "isActive" state propagates by
  // watching data-active attributes — they'll only flip if the player ticks.
  // Easier: peek at the React internals via the data attribute over time.

  // The reliable way: simulate the YouTube player tick by injecting a fake
  // Player context value via window.postMessage isn't possible without app
  // hooks. So just open the page, click play once, and observe.
  console.log("[uat] looking for play button...");
  // Try several strategies
  const playBtn = await page.locator('button:has-text("Play"), [aria-label*="play" i], button[aria-label*="play" i]').first();
  if (await playBtn.count()) {
    await playBtn.click();
    console.log("[uat] clicked play button");
  } else {
    console.log("[uat] no in-page play button; YT iframe will render its own play overlay");
  }
  await page.waitForTimeout(3000);

  // Try clicking inside the iframe (if reachable)
  for (const checkpoint of checkpoints) {
    // Without direct YT control, best we can do is wait-and-poll; skip if no movement
    const active = await page.$$eval('[data-active="true"]', els => els.map(e => (e as HTMLElement).getAttribute("data-verse-number")));
    console.log(`[uat] at ${checkpoint}ms wall-clock check: data-active verses =`, active);
    await page.waitForTimeout(500);
  }
  await browser.close();
})();
