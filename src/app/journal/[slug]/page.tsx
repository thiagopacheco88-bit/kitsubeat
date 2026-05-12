import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
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
    options: { parseFrontmatter: true, mdxOptions: { remarkPlugins: [remarkGfm] } },
  });

  const canonicalUrl = `${BASE_URL}/journal/${slug}`;

  const coverImageUrl = frontmatter.coverImage
    ? frontmatter.coverImage.startsWith('/')
      ? `${BASE_URL}${frontmatter.coverImage}`
      : frontmatter.coverImage
    : undefined;

  return {
    title: `${frontmatter.title} | KitsuBeat Journal`,
    description: frontmatter.summary,
    keywords: frontmatter.keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.summary,
      url: canonicalUrl,
      siteName: 'KitsuBeat',
      images: coverImageUrl ? [{ url: coverImageUrl }] : [],
      type: 'article',
      publishedTime: frontmatter.date,
      modifiedTime: frontmatter.dateModified ?? frontmatter.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: frontmatter.title,
      description: frontmatter.summary,
      images: coverImageUrl ? [coverImageUrl] : [],
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
    options: { parseFrontmatter: true, mdxOptions: { remarkPlugins: [remarkGfm] } },
    components: {
      h2: (props) => (
        <h2
          style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            lineHeight: 1.3,
            marginTop: '2.5rem',
            marginBottom: '0.75rem',
            color: 'var(--color-text)',
            borderLeft: '3px solid var(--color-accent)',
            paddingLeft: '0.75rem',
          }}
          {...props}
        />
      ),
      h3: (props) => (
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            lineHeight: 1.4,
            marginTop: '1.75rem',
            marginBottom: '0.5rem',
            color: 'var(--color-accent-readable)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
          {...props}
        />
      ),
      p: (props) => (
        <p style={{ marginBottom: '1rem' }} {...props} />
      ),
      table: (props) => (
        <div className="overflow-x-auto my-6">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95em' }} {...props} />
        </div>
      ),
      thead: (props) => (
        <thead style={{ backgroundColor: 'var(--color-surface, rgba(255,255,255,0.06))' }} {...props} />
      ),
      th: (props) => (
        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, border: '1px solid var(--color-border, rgba(255,255,255,0.15))' }} {...props} />
      ),
      td: (props) => (
        <td style={{ padding: '8px 16px', border: '1px solid var(--color-border, rgba(255,255,255,0.15))' }} {...props} />
      ),
      img: (props) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={props.alt ?? ''}
          style={{ width: '100%', height: 'auto', borderRadius: '8px', margin: '24px 0', display: 'block' }}
          {...props}
        />
      ),
      blockquote: (props) => (
        <blockquote
          style={{
            borderLeft: '4px solid var(--color-accent)',
            margin: '2rem 0',
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--color-surface, rgba(255,255,255,0.04))',
            borderRadius: '0 8px 8px 0',
            fontStyle: 'normal',
          }}
          {...props}
        />
      ),
      a: ({ href, children, ...props }) => (
        <a
          href={href}
          style={{ color: 'var(--color-accent-readable)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          {...(href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...props}
        >
          {children}
        </a>
      ),
    },
  });

  // Build ArticleMeta for ArticleHero (readingTimeComputed may come from frontmatter)
  const articleMeta: ArticleMeta = {
    ...frontmatter,
    readingTimeComputed: frontmatter.readingTime ?? '5 min read',
  };

  const coverImageUrl = frontmatter.coverImage
    ? frontmatter.coverImage.startsWith('/')
      ? `${BASE_URL}${frontmatter.coverImage}`
      : frontmatter.coverImage
    : undefined;

  // JSON-LD: schema.org/Article structured data for search engines
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/journal/${slug}`,
    },
    headline: frontmatter.title,
    description: frontmatter.summary,
    datePublished: frontmatter.date,
    dateModified: frontmatter.dateModified ?? frontmatter.date,
    inLanguage: 'en',
    articleSection: frontmatter.category,
    image: coverImageUrl,
    url: `${BASE_URL}/journal/${slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'KitsuBeat',
      url: BASE_URL,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'h2'],
    },
    author: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: frontmatter.author ?? 'KitsuBeat',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'KitsuBeat',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    ...(frontmatter.about && frontmatter.about.length > 0
      ? { about: frontmatter.about.map((e) => ({ '@type': e.type ?? 'Thing', name: e.name, ...(e.sameAs ? { sameAs: e.sameAs } : {}) })) }
      : {}),
    ...(frontmatter.mentions && frontmatter.mentions.length > 0
      ? { mentions: frontmatter.mentions.map((e) => ({ '@type': e.type ?? 'Thing', name: e.name, ...(e.sameAs ? { sameAs: e.sameAs } : {}) })) }
      : {}),
    keywords: frontmatter.keywords?.join(', '),
    ...(frontmatter.about?.some((e) => e.sameAs)
      ? {
          citation: frontmatter.about
            .filter((e) => e.sameAs)
            .map((e) => ({ '@type': 'CreativeWork', name: e.name, url: e.sameAs })),
        }
      : {}),
  };

  const faqJsonLd =
    frontmatter.faq && frontmatter.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: frontmatter.faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Journal', item: `${BASE_URL}/journal` },
      { '@type': 'ListItem', position: 3, name: frontmatter.title, item: `${BASE_URL}/journal/${slug}` },
    ],
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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
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
