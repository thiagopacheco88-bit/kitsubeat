/**
 * Daily social post cron — reads from pre-generated queue (src/data/social-queue.json).
 * No Anthropic API calls — all content generated offline via scripts/generate-social-queue.ts.
 *
 * Schedule: 0 9 * * * (09:00 UTC daily)
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures
 * in this project per Phase 14 anti-pattern.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron/auth";
import { postTweet, postTweetThread } from "@/lib/social/x-client";
import { postThread } from "@/lib/social/threads-client";
import { readPostLog, appendToPostLog } from "@/lib/social/post-log";
import { getQueueEntryForDate } from "@/lib/social/queue";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = assertCronSecret(request);
  if (unauthorized) return unauthorized;

  const startMs = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);
  const log = await readPostLog();

  // Idempotency — skip if already posted today
  if (log.posted.some((e) => e.date === todayKey)) {
    return NextResponse.json({ ok: true, skipped: "already_posted_today", date: todayKey });
  }

  // Look up today's pre-generated post
  const entry = getQueueEntryForDate(todayKey);
  if (!entry) {
    return NextResponse.json(
      { ok: false, error: "no_queue_entry", date: todayKey, hint: "Regenerate queue: npx tsx scripts/generate-social-queue.ts" },
      { status: 404 }
    );
  }

  const { type, tweets } = entry;
  const platforms: string[] = [];
  const results: Record<string, unknown> = {};

  // Post to X
  try {
    if (tweets.length === 1) {
      const tweet = await postTweet(tweets[0]);
      platforms.push("x");
      results.x = tweet;
    } else {
      const ids = await postTweetThread(tweets);
      platforms.push("x");
      results.x = ids;
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "x_post_failed", detail: String(err) },
      { status: 500 }
    );
  }

  // Threads — only if token is configured (non-fatal)
  if (process.env.THREADS_ACCESS_TOKEN) {
    try {
      const thread = await postThread(tweets.join("\n\n"));
      platforms.push("threads");
      results.threads = thread;
    } catch (err) {
      results.threads_error = String(err);
    }
  }

  await appendToPostLog(
    { date: todayKey, type, id: todayKey, platforms },
    log
  );

  return NextResponse.json({
    ok: true,
    content_type: type,
    date: todayKey,
    post_preview: tweets[0].slice(0, 100),
    tweet_count: tweets.length,
    platforms,
    results,
    duration_ms: Date.now() - startMs,
  });
}
