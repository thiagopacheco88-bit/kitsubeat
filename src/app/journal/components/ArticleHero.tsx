// Renders the full-bleed hero for an article page.
// coverImage: absolute URL or /public path. Uses bare <img> per project pattern (not next/image).
import type { ArticleMeta } from '@/lib/journal/articles';

const CATEGORY_LABELS: Record<string, string> = {
  lore: 'Lore',
  language: 'Language',
  translation: 'Translation',
};

const CATEGORY_COLORS: Record<string, string> = {
  lore: 'rgba(220,38,38,0.85)',
  language: 'rgba(37,99,235,0.85)',
  translation: 'rgba(22,163,74,0.85)',
};

interface ArticleHeroProps {
  article: ArticleMeta;
}

export function ArticleHero({ article }: ArticleHeroProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-2xl)]"
      style={{ minHeight: '320px' }}
    >
      {article.coverImage && (
        <img
          src={article.coverImage}
          alt={article.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
      )}
      {/* Dark overlay — same vignette pattern as JournalCard */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.75) 100%)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      {/* Content over overlay */}
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <span
          className="mb-3 inline-block rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold backdrop-blur-sm"
          style={{
            backgroundColor: CATEGORY_COLORS[article.category] ?? 'rgba(100,100,100,0.85)',
            color: 'white',
          }}
        >
          {CATEGORY_LABELS[article.category] ?? article.category}
        </span>
        <h1
          className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
          style={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
        >
          {article.title}
        </h1>
        {article.subtitle && (
          <p
            className="mt-1 text-base font-medium sm:text-lg"
            style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            {article.subtitle}
          </p>
        )}
        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {article.readingTimeComputed}
          {' · '}
          {new Date(article.date).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {article.author ? ` · ${article.author}` : ''}
        </p>
      </div>
    </div>
  );
}
