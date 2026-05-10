import { CardLink } from '@/components/ui/Card';
import type { ArticleMeta } from '@/lib/journal/articles';

const CATEGORY_LABELS: Record<string, string> = {
  lore: 'Lore',
  language: 'Language',
  translation: 'Translation',
};

// Category badge colors: distinguish lore (red-ish), language (blue-ish), translation (green-ish)
const CATEGORY_COLORS: Record<string, string> = {
  lore: 'rgba(220,38,38,0.85)',
  language: 'rgba(37,99,235,0.85)',
  translation: 'rgba(22,163,74,0.85)',
};

export function JournalCard({ article }: { article: ArticleMeta }) {
  return (
    <CardLink
      href={`/journal/${article.slug}`}
      variant="flat"
      size="sm"
      className="relative overflow-hidden p-0"
      style={{ minHeight: '220px' }}
    >
      {article.coverImage && (
        <img
          src={article.coverImage}
          alt={article.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}
      {/* Vignette overlay — pointerEvents: none per M1 invariant */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 25%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      {/* Category badge — top-left */}
      <span
        className="absolute left-2 top-2 rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-bold backdrop-blur-sm"
        style={{
          backgroundColor: CATEGORY_COLORS[article.category] ?? 'rgba(100,100,100,0.85)',
          color: 'white',
        }}
      >
        {CATEGORY_LABELS[article.category] ?? article.category}
      </span>
      {/* Bottom text stack */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {article.readingTimeComputed}
        </p>
        <h3
          className="mt-0.5 text-sm font-bold leading-snug"
          style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
        >
          {article.title}
        </h3>
        <p
          className="mt-1 line-clamp-2 text-xs"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          {article.summary}
        </p>
      </div>
    </CardLink>
  );
}
