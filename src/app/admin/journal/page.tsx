import Link from 'next/link';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { getAllArticles } from '@/lib/journal/articles';

export default async function AdminJournalPage() {
  await requireAdminUser();
  const articles = getAllArticles();

  return (
    <main style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '20px' }}>
        Journal Articles
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/admin/journal/${a.slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-card)',
              textDecoration: 'none',
              color: 'var(--color-text)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                {a.slug} · {a.date} · {a.category}
              </div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-accent-readable)', fontWeight: 600 }}>
              Edit →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
