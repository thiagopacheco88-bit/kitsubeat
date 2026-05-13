import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

export const metadata: Metadata = {
  title: 'Kana Trainer | KitsuBeat',
  description: 'Practice hiragana and katakana with instant feedback and progress tracking. Master Japanese syllabaries at your own pace.',
  alternates: { canonical: `${SITE_URL}/kana` },
  openGraph: {
    title: 'Kana Trainer | KitsuBeat',
    description: 'Practice hiragana and katakana with instant feedback and progress tracking.',
    url: `${SITE_URL}/kana`,
    siteName: 'KitsuBeat',
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kana Trainer | KitsuBeat',
    description: 'Practice hiragana and katakana with instant feedback and progress tracking.',
    images: [`${SITE_URL}/og-image.png`],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  '@id': `${SITE_URL}/kana`,
  name: 'Kana Trainer',
  description: 'Interactive hiragana and katakana practice trainer with instant feedback.',
  educationalLevel: 'Beginner',
  teaches: 'Hiragana and Katakana — the two Japanese syllabary writing systems',
  provider: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'KitsuBeat' },
  url: `${SITE_URL}/kana`,
  inLanguage: 'ja',
  isPartOf: { '@type': 'WebSite', name: 'KitsuBeat', url: SITE_URL },
};

export default function KanaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {children}
    </>
  );
}
