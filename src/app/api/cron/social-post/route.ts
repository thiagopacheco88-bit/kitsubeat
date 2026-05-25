/**
 * Daily social post cron — posts to X (Twitter), Threads pending token setup.
 *
 * Schedule: 0 9 * * * (09:00 UTC daily)
 * Rotation:
 *   Mon / Wed / Fri → vocab word
 *   Tue / Thu       → quiz
 *   Sat / Sun       → journal article
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures
 * in this project per Phase 14 anti-pattern.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, notInArray, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { assertCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db";
import { vocabularyItems, animeVocabCatalog } from "@/lib/db/schema";
import { getAllArticles } from "@/lib/journal/articles";
import { postTweet } from "@/lib/social/x-client";
import {
  generateVocabPost,
  generateQuizPost,
  generateArticlePost,
  type VocabInput,
} from "@/lib/social/generate-post";
import { readPostLog, appendToPostLog } from "@/lib/social/post-log";

export const dynamic = "force-dynamic";

type ContentType = "vocab" | "quiz" | "article";

function contentTypeForDay(dayOfWeek: number): ContentType {
  if (dayOfWeek === 0 || dayOfWeek === 6) return "article"; // Sun, Sat
  if (dayOfWeek === 2 || dayOfWeek === 4) return "quiz"; // Tue, Thu
  return "vocab"; // Mon, Wed, Fri
}

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

  const contentType = contentTypeForDay(new Date().getUTCDay());
  const postedIds = new Set(log.posted.map((e) => e.id));
  const postedVocabIds = log.posted
    .filter((e) => e.type === "vocab" || e.type === "quiz")
    .map((e) => e.id);

  let postText: string;
  let contentId: string;

  if (contentType === "article") {
    const articles = getAllArticles();
    const unposted = articles.filter((a) => !postedIds.has(a.slug));
    const article = (unposted[0] ?? articles[0])!; // fallback to newest if all cycled
    postText = await generateArticlePost(article);
    contentId = article.slug;
  } else {
    // Pick a random vocab word with anime context, avoiding recently posted
    const rows = await db
      .select({
        id: vocabularyItems.id,
        dictionary_form: vocabularyItems.dictionary_form,
        reading: vocabularyItems.reading,
        romaji: vocabularyItems.romaji,
        meaning: vocabularyItems.meaning,
        jlpt_level: vocabularyItems.jlpt_level,
        context_note: animeVocabCatalog.context_note,
        anime_slug: animeVocabCatalog.anime_slug,
      })
      .from(vocabularyItems)
      .innerJoin(
        animeVocabCatalog,
        eq(animeVocabCatalog.vocab_item_id, vocabularyItems.id)
      )
      .where(
        postedVocabIds.length > 0
          ? notInArray(vocabularyItems.id, postedVocabIds)
          : sql`true`
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_vocab_available" },
        { status: 500 }
      );
    }

    const word = rows[0] as VocabInput & { id: string };
    postText =
      contentType === "quiz"
        ? await generateQuizPost(word)
        : await generateVocabPost(word);
    contentId = word.id;
  }

  // Post to X
  const platforms: string[] = [];
  const results: Record<string, unknown> = {};

  try {
    const tweet = await postTweet(postText);
    platforms.push("x");
    results.x = tweet;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "x_post_failed", detail: String(err) },
      { status: 500 }
    );
  }

  // TODO: Threads — add THREADS_USER_ID + THREADS_ACCESS_TOKEN to .env.local,
  // then wire up src/lib/social/threads-client.ts here.

  await appendToPostLog(
    { date: todayKey, type: contentType, id: contentId, platforms },
    log
  );

  return NextResponse.json({
    ok: true,
    content_type: contentType,
    content_id: contentId,
    post_preview: postText.slice(0, 100),
    platforms,
    results,
    duration_ms: Date.now() - startMs,
  });
}
