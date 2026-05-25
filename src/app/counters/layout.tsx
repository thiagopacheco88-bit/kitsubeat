import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitsubeat.vercel.app";

export const metadata: Metadata = {
  title: "Counters | KitsuBeat",
  description:
    "Master Japanese counting words with unlock-based progression and per-counter mastery tracking.",
  alternates: { canonical: `${SITE_URL}/counters` },
  openGraph: {
    title: "Counters | KitsuBeat",
    description: "Master Japanese counting words with unlock-based progression.",
    url: `${SITE_URL}/counters`,
    siteName: "KitsuBeat",
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Counters | KitsuBeat",
    description: "Master Japanese counting words with unlock-based progression.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "@id": `${SITE_URL}/counters`,
  name: "Japanese Counters Trainer",
  description: "Interactive Japanese counters practice with phonetic drill and meaning recognition.",
  educationalLevel: "Beginner",
  teaches: "Japanese counter words (助数詞) — JLPT N5 core",
  provider: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "KitsuBeat" },
  url: `${SITE_URL}/counters`,
  inLanguage: "ja",
  isPartOf: { "@type": "WebSite", name: "KitsuBeat", url: SITE_URL },
};

export default function CountersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}
