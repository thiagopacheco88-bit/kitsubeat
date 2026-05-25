/**
 * Daily social post cron — posts to X (Twitter), Threads pending token setup.
 *
 * Schedule:
 *   0 12 * * *   (12:00 UTC daily)       ?slot=morning → vocab (Mon/Wed/Fri), article (Sat/Sun)
 *   0 18 * * 2,4 (18:00 UTC Tue/Thu)    ?slot=quiz    → quiz
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
import { getAllArticles, getArticleSource } from "@/lib/journal/articles";
import matter from "gray-matter";
import { postTweet, postTweetThread } from "@/lib/social/x-client";
import { postThread } from "@/lib/social/threads-client";
import {
  ANIME_LABELS,
  generateVocabThread,
  generateQuizPost,
  generateArticleThread,
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

  const slot = request.nextUrl.searchParams.get("slot");

  // slot=quiz forces quiz regardless of day; slot=morning skips quiz days (quiz posts at 18:00)
  const contentType: ContentType =
    slot === "quiz"
      ? "quiz"
      : contentTypeForDay(new Date().getUTCDay());

  if (slot === "morning" && contentType === "quiz") {
    return NextResponse.json({ ok: true, skipped: "quiz_posts_at_18_utc" });
  }

  // Idempotency — skip if already posted this type today (vocab at 12:00 ≠ quiz at 18:00)
  if (log.posted.some((e) => e.date === todayKey && e.type === contentType)) {
    return NextResponse.json({ ok: true, skipped: "already_posted_today", date: todayKey, content_type: contentType });
  }

  const postedIds = new Set(log.posted.map((e) => e.id));
  const postedVocabIds = log.posted
    .filter((e) => e.type === "vocab" || e.type === "quiz")
    .map((e) => e.id);

  let postText: string;
  let contentId: string;

  if (contentType === "article") {
    const articles = getAllArticles();
    const unposted = articles.filter((a) => !postedIds.has(a.slug));
    const article = (unposted[0] ?? articles[0])!;

    // Extract plain text body (strip frontmatter + JSX/MDX tags)
    const raw = getArticleSource(article.slug) ?? "";
    const { content: mdxBody } = matter(raw);
    const body = mdxBody
      .replace(/^import .+$/gm, "")          // remove import statements
      .replace(/<[^>]+>/g, "")               // remove JSX/HTML tags
      .replace(/\n{3,}/g, "\n\n")            // collapse excess newlines
      .trim()
      .slice(0, 3000);                       // cap tokens — Haiku needs ~20-40% of content

    const tweets = await generateArticleThread({ ...article, body });
    postText = tweets[0];
    contentId = article.slug;

    const platforms: string[] = [];
    const results: Record<string, unknown> = {};

    let articleXIds: string[] | undefined;
    try {
      const ids = await postTweetThread(tweets);
      articleXIds = ids;
      platforms.push("x");
      results.x = ids;
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: "x_post_failed", detail: String(err) },
        { status: 500 }
      );
    }

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
      { date: todayKey, type: contentType, id: contentId, platforms, postIds: { x: articleXIds } },
      log
    );

    return NextResponse.json({
      ok: true,
      content_type: contentType,
      content_id: contentId,
      post_preview: tweets[0].slice(0, 100),
      platforms,
      results,
      duration_ms: Date.now() - startMs,
    });
  } else {
    const vocabSelect = {
      id: vocabularyItems.id,
      dictionary_form: vocabularyItems.dictionary_form,
      reading: vocabularyItems.reading,
      romaji: vocabularyItems.romaji,
      meaning: vocabularyItems.meaning,
      jlpt_level: vocabularyItems.jlpt_level,
      context_note: animeVocabCatalog.context_note,
      anime_slug: animeVocabCatalog.anime_slug,
    } as const;

    if (contentType === "vocab") {
      // Pick an anime that has ≥3 unposted words, then fetch those 3 words.
      // Fallback: if all words cycled, reset and pick from any anime.
      const notPostedFilter =
        postedVocabIds.length > 0
          ? notInArray(vocabularyItems.id, postedVocabIds)
          : sql`true`;

      const eligibleAnimes = await db
        .select({ anime_slug: animeVocabCatalog.anime_slug })
        .from(vocabularyItems)
        .innerJoin(animeVocabCatalog, eq(animeVocabCatalog.vocab_item_id, vocabularyItems.id))
        .where(notPostedFilter)
        .groupBy(animeVocabCatalog.anime_slug)
        .having(sql`count(*) >= 3`)
        .orderBy(sql`RANDOM()`)
        .limit(1);

      // Fallback: cycle is exhausted — pick any anime with ≥3 words total
      const animeSlug =
        eligibleAnimes[0]?.anime_slug ??
        (
          await db
            .select({ anime_slug: animeVocabCatalog.anime_slug })
            .from(animeVocabCatalog)
            .groupBy(animeVocabCatalog.anime_slug)
            .having(sql`count(*) >= 3`)
            .orderBy(sql`RANDOM()`)
            .limit(1)
        )[0]?.anime_slug;

      if (!animeSlug) {
        return NextResponse.json(
          { ok: false, error: "no_anime_with_3_words" },
          { status: 500 }
        );
      }

      const rows = await db
        .select(vocabSelect)
        .from(vocabularyItems)
        .innerJoin(animeVocabCatalog, eq(animeVocabCatalog.vocab_item_id, vocabularyItems.id))
        .where(
          and(
            eq(animeVocabCatalog.anime_slug, animeSlug),
            eligibleAnimes[0] ? notPostedFilter : sql`true`
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(3);

      const animeLabel = ANIME_LABELS[animeSlug] ?? animeSlug;
      const words = rows as (VocabInput & { id: string })[];
      const tweets = await generateVocabThread(words, animeLabel);

      // Post thread; postText is the first tweet for Threads fallback
      postText = tweets[0];
      contentId = words[0].id;

      const platforms: string[] = [];
      const results: Record<string, unknown> = {};

      let vocabXIds: string[] | undefined;
      try {
        const ids = await postTweetThread(tweets);
        vocabXIds = ids;
        platforms.push("x");
        results.x = ids;
      } catch (err) {
        return NextResponse.json(
          { ok: false, error: "x_post_failed", detail: String(err) },
          { status: 500 }
        );
      }

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
        { date: todayKey, type: contentType, id: contentId, platforms, postIds: { x: vocabXIds } },
        log
      );

      return NextResponse.json({
        ok: true,
        content_type: contentType,
        content_id: contentId,
        post_preview: tweets[0].slice(0, 100),
        platforms,
        results,
        duration_ms: Date.now() - startMs,
      });
    }

    // Quiz — single tweet with one random word
    const rows = await db
      .select(vocabSelect)
      .from(vocabularyItems)
      .innerJoin(animeVocabCatalog, eq(animeVocabCatalog.vocab_item_id, vocabularyItems.id))
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
    postText = await generateQuizPost(word);
    contentId = word.id;
  }

  // Post to X
  const platforms: string[] = [];
  const results: Record<string, unknown> = {};

  let quizXIds: string[] | undefined;
  try {
    const tweet = await postTweet(postText);
    quizXIds = [tweet.id];
    platforms.push("x");
    results.x = tweet;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "x_post_failed", detail: String(err) },
      { status: 500 }
    );
  }

  // Threads — only if token is configured
  if (process.env.THREADS_ACCESS_TOKEN) {
    try {
      const thread = await postThread(postText);
      platforms.push("threads");
      results.threads = thread;
    } catch (err) {
      results.threads_error = String(err); // non-fatal — X already posted
    }
  }

  await appendToPostLog(
    { date: todayKey, type: contentType, id: contentId, platforms, postIds: { x: quizXIds } },
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
