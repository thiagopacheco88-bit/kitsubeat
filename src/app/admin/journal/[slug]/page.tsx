import { notFound } from 'next/navigation';
import matter from 'gray-matter';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { getArticleSource } from '@/lib/journal/articles';
import type { ArticleFrontmatter } from '@/lib/journal/articles';
import { JournalEditor } from './JournalEditor';

export default async function AdminJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdminUser();

  const { slug } = await params;
  const source = getArticleSource(slug);
  if (!source) notFound();

  const { data, content } = matter(source);
  const fm = data as ArticleFrontmatter;

  return (
    <main style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <JournalEditor slug={slug} frontmatter={fm} body={content} />
    </main>
  );
}
