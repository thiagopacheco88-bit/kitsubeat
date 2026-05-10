import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import {
  getAllArticles,
  getArticleSource,
  type ArticleFrontmatter,
  type ArticleMeta,
} from '@/lib/journal/articles';
import { ArticleHero } from '../components/ArticleHero';

// generateStaticParams: enumerate all known slugs at build time.
// If no articles exist, returns [] — Next.js warns but does not break.
export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
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
