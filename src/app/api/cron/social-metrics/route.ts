/**
 * Weekly social metrics cron — runs every Monday at 06:00 UTC.
 *
 * Reads the post log, fetches X API v2 metrics for all posts from the past 7 days,
 * and saves a weekly snapshot to Vercel Blob as social/metrics-YYYY-WXX.json.
 *
 * Metrics captured per post:
 *   - public_metrics:     likes, retweets, replies, quotes, bookmarks
 *   - non_public_metrics: impressions, link clicks, profile clicks (own tweets, OAuth 1.0a)
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { put, head } from "@vercel/blob";
import { assertCronSecret } from "@/lib/cron/auth";
import { readPostLog } from "@/lib/social/post-log";
import { getTweetMetrics, type TweetMetrics } from "@/lib/social/x-client";

export const dynamic = "force-dynamic";

/** ISO week key: "2026-W21" */
function isoWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - jan4.getTime()) / 86400000 -
        3 +
        ((jan4.getUTCDay() + 6) % 7)) /
        7
    );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export type PostMetricsEntry = {
  date: string;
  type: "vocab" | "quiz" | "article";
  content_id: string;
  x_post_ids: string[];
  metrics: TweetMetrics[];
  /** Engagement rate across all tweets in this post (engagements / impressions) */
  engagement_rate?: number;
  /** Total engagements (likes + retweets + replies + quotes) */
  total_engagements?: number;
  total_impressions?: number;
  total_link_clicks?: number;
};

export type WeeklyMetrics = {
  week: string;
  generated_at: string;
  posts: PostMetricsEntry[];
  summary: {
    total_posts: number;
    total_impressions: number;
    total_engagements: number;
    total_link_clicks: number;
    avg_engagement_rate: number;
    best_post: { date: string; type: string; impressions: number; engagement_rate: number } | null;
  };
};

const BLOB_PATH_PREFIX = "social/metrics-";

async function readExistingWeeklyMetrics(week: string): Promise<WeeklyMetrics | null> {
  try {
    const meta = await head(`${BLOB_PATH_PREFIX}${week}.json`);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return (await res.json()) as WeeklyMetrics;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const unauthorized = assertCronSecret(request);
  if (unauthorized) return unauthorized;

  const now = new Date();
  const week = isoWeekKey(now);

  // Determine the 7-day window: last 7 days from today
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const log = await readPostLog();

  // Filter posts from the past 7 days that have X post IDs
  const recentPosts = log.posted.filter(
    (e) => e.date >= cutoffKey && e.postIds?.x && e.postIds.x.length > 0
  );

  if (recentPosts.length === 0) {
    return NextResponse.json({
      ok: true,
      week,
      skipped: "no_posts_with_ids_in_window",
      cutoff: cutoffKey,
    });
  }

  // Collect all X tweet IDs (deduplicated)
  const allIds = [...new Set(recentPosts.flatMap((e) => e.postIds!.x!))];

  // Fetch metrics from X API (max 100 per call — well within limit for 7 days of posts)
  let metricsById: Map<string, TweetMetrics>;
  try {
    const metrics = await getTweetMetrics(allIds);
    metricsById = new Map(metrics.map((m) => [m.id, m]));
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "x_metrics_fetch_failed", detail: String(err) },
      { status: 500 }
    );
  }

  // Build per-post entries
  const posts: PostMetricsEntry[] = recentPosts.map((entry) => {
    const ids = entry.postIds!.x!;
    const tweetMetrics = ids.map((id) => metricsById.get(id)).filter(Boolean) as TweetMetrics[];

    const totalEngagements = tweetMetrics.reduce(
      (sum, m) => sum + m.like_count + m.retweet_count + m.reply_count + m.quote_count,
      0
    );
    const totalImpressions = tweetMetrics.reduce(
      (sum, m) => sum + (m.impression_count ?? 0),
      0
    );
    const totalLinkClicks = tweetMetrics.reduce(
      (sum, m) => sum + (m.url_link_clicks ?? 0),
      0
    );
    const engagementRate =
      totalImpressions > 0 ? totalEngagements / totalImpressions : undefined;

    return {
      date: entry.date,
      type: entry.type,
      content_id: entry.id,
      x_post_ids: ids,
      metrics: tweetMetrics,
      total_engagements: totalEngagements,
      total_impressions: totalImpressions > 0 ? totalImpressions : undefined,
      total_link_clicks: totalLinkClicks > 0 ? totalLinkClicks : undefined,
      engagement_rate: engagementRate,
    };
  });

  // Compute weekly summary
  const totalImpressions = posts.reduce((s, p) => s + (p.total_impressions ?? 0), 0);
  const totalEngagements = posts.reduce((s, p) => s + (p.total_engagements ?? 0), 0);
  const totalLinkClicks = posts.reduce((s, p) => s + (p.total_link_clicks ?? 0), 0);
  const avgEngagementRate =
    totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

  const bestPost = posts
    .filter((p) => p.total_impressions !== undefined)
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))[0] ?? null;

  const result: WeeklyMetrics = {
    week,
    generated_at: now.toISOString(),
    posts,
    summary: {
      total_posts: posts.length,
      total_impressions: totalImpressions,
      total_engagements: totalEngagements,
      total_link_clicks: totalLinkClicks,
      avg_engagement_rate: avgEngagementRate,
      best_post: bestPost
        ? {
            date: bestPost.date,
            type: bestPost.type,
            impressions: bestPost.total_impressions!,
            engagement_rate: bestPost.engagement_rate!,
          }
        : null,
    },
  };

  const blobPath = `${BLOB_PATH_PREFIX}${week}.json`;
  await put(blobPath, JSON.stringify(result, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return NextResponse.json({
    ok: true,
    week,
    posts_analyzed: posts.length,
    summary: result.summary,
  });
}
