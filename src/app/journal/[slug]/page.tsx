import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import type { Metadata } from 'next';
import {
  getAllArticles,
  getArticleSource,
  type ArticleFrontmatter,
  type ArticleMeta,
} from '@/lib/journal/articles';
import { ArticleHero } from '../components/ArticleHero';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

// generateStaticParams: enumerate all known slugs at build time.
// If no articles exist, returns [] — Next.js warns but does not break.
export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // CRITICAL: await params — Next.js 15 async params (Pitfall 2 in RESEARCH.md)
  const { slug } = await params;
  const source = getArticleSource(slug);
  if (!source) return { title: 'Not Found | KitsuBeat Journal' };

  const { frontmatter } = await compileMDX<ArticleFrontmatter>({
    source,
    options: { parseFrontmatter: true },
  });

  const canonicalUrl = `${BASE_URL}/journal/${slug}`;

  return {
    title: `${frontmatter.title} | KitsuBeat Journal`,
    description: frontmatter.summary,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.summary,
      url: canonicalUrl,
      images: [
        {
          url: frontmatter.coverImage.startsWith('/')
            ? `${BASE_URL}${frontmatter.coverImage}`
            : frontmatter.coverImage,
        },
      ],
      type: 'article',
      publishedTime: frontmatter.date,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // CRITICAL: await params — Next.js 15 async params
  const { slug } = await params;

  const source = getArticleSource(slug);
  if (!source) notFound();

  // compileMDX parses frontmatter AND returns the rendered React content tree.
  // parseFrontmatter: true avoids a separate gray-matter call here.
  const { content, frontmatter } = await compileMDX<ArticleFrontmatter>({
    source,
    options: { parseFrontmatter: true },
  });

  // Build ArticleMeta for ArticleHero (readingTimeComputed may come from frontmatter)
  const articleMeta: ArticleMeta = {
    ...frontmatter,
    readingTimeComputed: frontmatter.readingTime ?? '5 min read',
  };

  // JSON-LD: schema.org/Article structured data for search engines
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.summary,
    datePublished: frontmatter.date,
    image: frontmatter.coverImage.startsWith('/')
      ? `${BASE_URL}${frontmatter.coverImage}`
      : frontmatter.coverImage,
    url: `${BASE_URL}/journal/${slug}`,
    author: {
      '@type': 'Organization',
      name: frontmatter.author ?? 'KitsuBeat',
    },
    publisher: {
      '@type': 'Organization',
      name: 'KitsuBeat',
      url: BASE_URL,
    },
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {/* JSON-LD: XSS-safe — replace /</g per Next.js official JSON-LD pattern */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <ArticleHero article={articleMeta} />

      {/* MDX prose body — manual typography wrapper (@tailwindcss/typography not installed) */}
      <article
        className="mt-8 space-y-4"
        style={{ color: 'var(--color-text)', lineHeight: '1.75' }}
      >
        {content}
      </article>
    </main>
  );
}
