import type { Metadata } from 'next';
import { getAllArticles } from '@/lib/journal/articles';
import { JournalCard } from './components/JournalCard';

export const metadata: Metadata = {
  title: 'Journal | KitsuBeat',
  description:
    'Anime culture, song translations, and Japanese language guides — bridge the gap between entertainment and learning.',
};

export default function JournalIndexPage() {
  const articles = getAllArticles();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      {/* Page header — mirrors songs/page.tsx pattern */}
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Content Hub
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">Journal</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Anime lore, song translations, and Japanese language deep-dives.
        </p>
      </header>

      {articles.length === 0 ? (
        /* Empty state — graceful, no crash */
        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <p className="text-[var(--color-text-muted)]">No articles yet — check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <JournalCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
