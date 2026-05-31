import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { readFileSync } from "fs";
import { resolve } from "path";
import SocialDashboard from "./SocialDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlatformMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
};

export type PostedRow = {
  series: string;
  label: string;
  part: number;
  platform: "instagram" | "youtube" | "facebook" | "tiktok";
  postId?: string;
  date: string;
  daysAgo: number;
  metrics: PlatformMetrics;
  link?: string;
};

export type ScheduledRow = {
  post: number;
  label: string;
  part: number;
  date: string;
  daysUntil: number;
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

async function fetchIgMetrics(id: string, token: string): Promise<PlatformMetrics> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${id}/insights?metric=plays,likes,comments,shares,saved&access_token=${token}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as any;
    if (json.error) return {};
    const m: PlatformMetrics = {};
    for (const item of json.data ?? []) {
      const val = item.values?.[0]?.value ?? item.value;
      if (item.name === "plays") m.views = val;
      if (item.name === "likes") m.likes = val;
      if (item.name === "comments") m.comments = val;
      if (item.name === "shares") m.shares = val;
      if (item.name === "saved") m.saves = val;
    }
    return m;
  } catch {
    return {};
  }
}

async function getYouTubeAccessToken(): Promise<string | null> {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        refresh_token: YOUTUBE_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    const { access_token } = (await res.json()) as any;
    return access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchYtBatch(ids: string[], token: string): Promise<Record<string, PlatformMetrics>> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}&access_token=${token}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as any;
    const result: Record<string, PlatformMetrics> = {};
    for (const item of json.items ?? []) {
      const s = item.statistics ?? {};
      result[item.id] = {
        views: parseInt(s.viewCount ?? "0"),
        likes: parseInt(s.likeCount ?? "0"),
        comments: parseInt(s.commentCount ?? "0"),
      };
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchFbMetrics(id: string, token: string): Promise<PlatformMetrics> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${id}/video_insights?metric=total_video_views,total_video_reactions_by_type_total,total_video_comments_by_action_type,total_video_shares&access_token=${token}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as any;
    if (json.error) return {};
    const m: PlatformMetrics = {};
    for (const item of json.data ?? []) {
      const val = item.values?.[0]?.value;
      if (item.name === "total_video_views") {
        m.views =
          typeof val === "object"
            ? Object.values(val as Record<string, number>).reduce((a, b) => a + b, 0)
            : val;
      }
      if (item.name === "total_video_reactions_by_type_total") {
        m.likes = typeof val === "object" ? ((val as any).LIKE ?? 0) : val;
      }
      if (item.name === "total_video_comments_by_action_type") {
        m.comments =
          typeof val === "object"
            ? Object.values(val as Record<string, number>).reduce((a, b) => a + b, 0)
            : val;
      }
      if (item.name === "total_video_shares") {
        m.shares = typeof val === "number" ? val : 0;
      }
    }
    return m;
  } catch {
    return {};
  }
}

export default async function SocialPage() {
  try {
    await requireAdminUser();
  } catch {
    return notFound();
  }

  let catalog: Record<string, any> = {};
  let schedule: { posts: any[] } = { posts: [] };
  try {
    catalog = JSON.parse(readFileSync(resolve(process.cwd(), "videos/catalog.json"), "utf-8"));
    schedule = JSON.parse(readFileSync(resolve(process.cwd(), "videos/schedule.json"), "utf-8"));
  } catch (e) {
    console.error("[social] failed to load catalog/schedule:", e);
  }

  const IG_TOKEN = process.env.INSTAGRAM_LONG_TOKEN ?? "";
  const FB_TOKEN = process.env.FACEBOOK_PAGE_TOKEN ?? "";

  // ── Parse posted entries from catalog ──────────────────────────────────────
  type RawEntry = {
    series: string;
    label: string;
    part: number;
    platform: "instagram" | "youtube" | "facebook" | "tiktok";
    postId?: string;
    date: string;
  };
  const raw: RawEntry[] = [];

  for (const [seriesKey, series] of Object.entries(catalog as Record<string, any>)) {
    const label = (series as any).label as string;
    for (const part of (series as any).parts ?? []) {
      const p = part.posted ?? {};
      if (p.instagram?.date)
        raw.push({ series: seriesKey, label, part: part.part, platform: "instagram", postId: p.instagram.id, date: p.instagram.date });
      if (p.youtube?.date)
        raw.push({ series: seriesKey, label, part: part.part, platform: "youtube", postId: p.youtube.id, date: p.youtube.date });
      if (p.facebook?.date)
        raw.push({ series: seriesKey, label, part: part.part, platform: "facebook", postId: p.facebook.id, date: p.facebook.date });
      if (p.tiktok?.date)
        raw.push({ series: seriesKey, label, part: part.part, platform: "tiktok", date: p.tiktok.date });
    }
  }

  // ── Gather IDs by platform ─────────────────────────────────────────────────
  const igIds = raw.filter((r) => r.platform === "instagram" && r.postId).map((r) => r.postId!);
  const ytIds = raw.filter((r) => r.platform === "youtube" && r.postId).map((r) => r.postId!);
  const fbIds = raw.filter((r) => r.platform === "facebook" && r.postId).map((r) => r.postId!);

  // ── Fetch all metrics in parallel ──────────────────────────────────────────
  const [igResults, ytToken, fbResults] = await Promise.all([
    Promise.all(
      igIds.map((id) => fetchIgMetrics(id, IG_TOKEN).then((m) => [id, m] as [string, PlatformMetrics]))
    ),
    getYouTubeAccessToken(),
    Promise.all(
      fbIds.map((id) => fetchFbMetrics(id, FB_TOKEN).then((m) => [id, m] as [string, PlatformMetrics]))
    ),
  ]);

  const igMap = Object.fromEntries(igResults);
  const fbMap = Object.fromEntries(fbResults);
  const ytMap = ytToken ? await fetchYtBatch(ytIds, ytToken) : {};

  // ── Build PostedRow[] ──────────────────────────────────────────────────────
  const posted: PostedRow[] = raw
    .map((r) => {
      let metrics: PlatformMetrics = {};
      let link: string | undefined;
      if (r.platform === "instagram" && r.postId) metrics = igMap[r.postId] ?? {};
      if (r.platform === "youtube" && r.postId) {
        metrics = ytMap[r.postId] ?? {};
        link = `https://www.youtube.com/watch?v=${r.postId}`;
      }
      if (r.platform === "facebook" && r.postId) metrics = fbMap[r.postId] ?? {};
      return { ...r, daysAgo: daysSince(r.date), metrics, link };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Build ScheduledRow[] ───────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const scheduled: ScheduledRow[] = (schedule.posts as any[])
    .filter((p) => p.date >= today && p.status !== "posted")
    .slice(0, 15)
    .map((p) => ({
      post: p.post,
      label: p.label,
      part: p.part,
      date: p.date,
      daysUntil: daysUntil(p.date),
    }));

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">Social Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Posted and scheduled videos across all platforms. Metrics fetched live from Instagram,
          YouTube, and Facebook. TikTok shows dates only (API pending approval).
        </p>
      </header>
      <SocialDashboard posted={posted} scheduled={scheduled} />
    </main>
  );
}
