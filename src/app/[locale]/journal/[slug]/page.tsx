/**
 * /[locale]/journal/[slug] — Locale-aware journal article page (PT-BR and ES).
 *
 * English canonical stays at /journal/[slug] (src/app/journal/[slug]/page.tsx — UNCHANGED).
 * /pt-BR/journal/[slug] and /es/journal/[slug] resolve here.
 *
 * Uses getArticleSourceByLocale — serves locale MDX if available, falls back to EN.
 * SAFE_SLUG_RE guard is inside getArticleSourceByLocale (T-18.1-14 mitigated).
 * locale param safety: hasLocale() guard in [locale]/layout.tsx prevents invalid locales
 * from reaching this page (T-18.1-15 mitigated).
 *
 * BLAST RADIUS: new file only — src/app/journal/[slug]/page.tsx (EN canonical) UNCHANGED.
 */
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { setRequestLocale } from "next-intl/server";
import {
  getAllArticles,
  getArticleSourceByLocale,
  type ArticleFrontmatter,
  type ArticleMeta,
} from "@/lib/journal/articles";
import { isAdminEmail, parseAdminEmails } from "@/lib/admin/admin-allowlist";
import { ArticleHero } from "@/app/journal/components/ArticleHero";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitsubeat.vercel.app";

// generateStaticParams: enumerate locale × slug combinations at build time.
// Ensures /pt-BR/journal/[slug] and /es/journal/[slug] are pre-rendered.
export async function generateStaticParams() {
  const locales = ["en", "pt-BR", "es"] as const;
  const slugs = getAllArticles().map((a) => a.slug);
  return locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const source = getArticleSourceByLocale(slug, locale as "en" | "pt-BR" | "es");
  if (!source) return { title: "Not Found | KitsuBeat Journal" };

  const { frontmatter } = await compileMDX<ArticleFrontmatter>({
    source,
    options: { parseFrontmatter: true, mdxOptions: { remarkPlugins: [remarkGfm] } },
  });

  // Canonical URL always points to the EN root article (/journal/slug)
  const canonicalUrl = `${BASE_URL}/journal/${slug}`;
  const localeUrl =
    locale === "en"
      ? canonicalUrl
      : `${BASE_URL}/${locale}/journal/${slug}`;

  const coverImageUrl = frontmatter.coverImage
    ? frontmatter.coverImage.startsWith("/")
      ? `${BASE_URL}${frontmatter.coverImage}`
      : frontmatter.coverImage
    : undefined;

  return {
    title: `${frontmatter.title} | KitsuBeat Journal`,
    description: frontmatter.summary,
    keywords: frontmatter.keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "pt-BR": `${BASE_URL}/pt-BR/journal/${slug}`,
        es: `${BASE_URL}/es/journal/${slug}`,
      },
    },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.summary,
      url: localeUrl,
      siteName: "KitsuBeat",
      images: coverImageUrl ? [{ url: coverImageUrl }] : [],
      type: "article",
      publishedTime: frontmatter.date,
      modifiedTime: frontmatter.dateModified ?? frontmatter.date,
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.summary,
      images: coverImageUrl ? [coverImageUrl] : [],
    },
  };
}

export default async function LocaleArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  // MUST be first — enables static rendering for locale segment
  setRequestLocale(locale);

  // getArticleSourceByLocale: reads locale MDX if available, falls back to EN.
  // Returns null for invalid slugs (SAFE_SLUG_RE guard inside — T-18.1-14).
  const source = getArticleSourceByLocale(slug, locale as "en" | "pt-BR" | "es");
  if (!source) notFound();

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress;
  const isAdmin = isAdminEmail(email, parseAdminEmails(process.env.CLERK_ADMIN_EMAILS));

  const { content, frontmatter } = await compileMDX<ArticleFrontmatter>({
    source,
    options: { parseFrontmatter: true, mdxOptions: { remarkPlugins: [remarkGfm] } },
    components: {
      h2: (props) => (
        <h2
          style={{
            fontSize: "1.45rem",
            fontWeight: 700,
            lineHeight: 1.3,
            marginTop: "2.5rem",
            marginBottom: "0.75rem",
            color: "var(--color-text)",
            borderLeft: "3px solid var(--color-accent)",
            paddingLeft: "0.75rem",
          }}
          {...props}
        />
      ),
      h3: (props) => (
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            lineHeight: 1.4,
            marginTop: "1.75rem",
            marginBottom: "0.5rem",
            color: "var(--color-accent-readable)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
          {...props}
        />
      ),
      p: (props) => <p style={{ marginBottom: "1rem" }} {...props} />,
      table: (props) => (
        <div className="overflow-x-auto my-6">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.95em",
            }}
            {...props}
          />
        </div>
      ),
      thead: (props) => (
        <thead
          style={{
            backgroundColor: "var(--color-surface, rgba(255,255,255,0.06))",
          }}
          {...props}
        />
      ),
      th: (props) => (
        <th
          style={{
            padding: "10px 16px",
            textAlign: "left",
            fontWeight: 600,
            border: "1px solid var(--color-border, rgba(255,255,255,0.15))",
          }}
          {...props}
        />
      ),
      td: (props) => (
        <td
          style={{
            padding: "8px 16px",
            border: "1px solid var(--color-border, rgba(255,255,255,0.15))",
          }}
          {...props}
        />
      ),
      img: (props) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={props.alt ?? ""}
          style={{
            width: "100%",
            height: "auto",
            borderRadius: "8px",
            margin: "24px 0",
            display: "block",
          }}
          {...props}
        />
      ),
      blockquote: (props) => (
        <blockquote
          style={{
            borderLeft: "4px solid var(--color-accent)",
            margin: "2rem 0",
            padding: "1rem 1.25rem",
            backgroundColor: "var(--color-surface, rgba(255,255,255,0.04))",
            borderRadius: "0 8px 8px 0",
            fontStyle: "normal",
          }}
          {...props}
        />
      ),
      YouTube: ({ id }: { id: string }) => (
        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            margin: "28px 0",
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "8px",
              border: "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video player"
          />
        </div>
      ),
      a: ({ href, children, ...props }) => (
        <a
          href={href}
          style={{
            color: "var(--color-accent-readable)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
          {...(href?.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          {...props}
        >
          {children}
        </a>
      ),
    },
  });

  const articleMeta: ArticleMeta = {
    ...frontmatter,
    readingTimeComputed: frontmatter.readingTime ?? "5 min read",
  };

  const coverImageUrl = frontmatter.coverImage
    ? frontmatter.coverImage.startsWith("/")
      ? `${BASE_URL}${frontmatter.coverImage}`
      : frontmatter.coverImage
    : undefined;

  // JSON-LD: schema.org/Article — inLanguage reflects the locale being served
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/journal/${slug}`,
    },
    headline: frontmatter.title,
    description: frontmatter.summary,
    datePublished: frontmatter.date,
    dateModified: frontmatter.dateModified ?? frontmatter.date,
    inLanguage: locale,
    articleSection: frontmatter.category,
    image: coverImageUrl
      ? { "@type": "ImageObject", url: coverImageUrl }
      : undefined,
    url: `${BASE_URL}/${locale}/journal/${slug}`,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      name: "KitsuBeat",
      url: BASE_URL,
    },
    author: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: frontmatter.author ?? "KitsuBeat",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
    },
    publisher: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "KitsuBeat",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
    },
    ...(frontmatter.about && frontmatter.about.length > 0
      ? {
          about: frontmatter.about.map((e) => ({
            "@type": e.type ?? "Thing",
            name: e.name,
            ...(e.sameAs ? { sameAs: e.sameAs } : {}),
          })),
        }
      : {}),
    ...(frontmatter.mentions && frontmatter.mentions.length > 0
      ? {
          mentions: frontmatter.mentions.map((e) => ({
            "@type": e.type ?? "Thing",
            name: e.name,
            ...(e.sameAs ? { sameAs: e.sameAs } : {}),
          })),
        }
      : {}),
    keywords: frontmatter.keywords?.join(", "),
  };

  const faqJsonLd =
    frontmatter.faq && frontmatter.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: frontmatter.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Journal",
        item: `${BASE_URL}/journal`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: frontmatter.title,
        item: `${BASE_URL}/journal/${slug}`,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {/* JSON-LD: XSS-safe — replace /</g per Next.js official JSON-LD pattern */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
          <a
            href={`/admin/journal/${slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "999px",
              border: "1px solid var(--color-accent)",
              color: "var(--color-accent-readable)",
              textDecoration: "none",
            }}
          >
            Edit Article
          </a>
        </div>
      )}
      <ArticleHero article={articleMeta} />

      {/* MDX prose body — manual typography wrapper */}
      <article
        className="mt-8 space-y-4"
        style={{ color: "var(--color-text)", lineHeight: "1.75" }}
      >
        {content}
      </article>
    </main>
  );
}
