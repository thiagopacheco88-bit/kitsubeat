import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAnimeVocabBySlug } from "@/lib/db/queries";
import AnimeVocabCarouselWrapper from "../components/AnimeVocabCarouselWrapper";

// Known slugs — for static params generation
const KNOWN_SLUGS = [
  "one-piece",
  "naruto",
  "bleach",
  "fullmetal-alchemist",
  "attack-on-titan",
  "sword-art-online",
  "demon-slayer",
  "death-note",
  "dragon-ball-z",
  "hunter-x-hunter",
  "tokyo-ghoul",
  "jujutsu-kaisen",
  "my-hero-academia",
  "fairy-tail",
  "code-geass",
  "chainsaw-man",
  "anime-core",
];

export async function generateStaticParams() {
  return KNOWN_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const TITLES: Record<string, string> = {
    "one-piece": "One Piece",
    naruto: "Naruto",
    bleach: "Bleach",
    "fullmetal-alchemist": "Fullmetal Alchemist",
    "attack-on-titan": "Attack on Titan",
    "sword-art-online": "Sword Art Online",
    "demon-slayer": "Demon Slayer",
    "death-note": "Death Note",
    "dragon-ball-z": "Dragon Ball Z",
    "hunter-x-hunter": "Hunter × Hunter",
    "tokyo-ghoul": "Tokyo Ghoul",
    "jujutsu-kaisen": "Jujutsu Kaisen",
    "my-hero-academia": "My Hero Academia",
    "fairy-tail": "Fairy Tail",
    "code-geass": "Code Geass",
    "chainsaw-man": "Chainsaw Man",
    "anime-core": "Anime Core — Words from Every Anime",
  };
  const title = TITLES[slug] ?? slug;
  return {
    title: `${title} Vocabulary | KitsuBeat`,
    description: `Study and master ${title} vocabulary with spaced repetition.`,
  };
}

export default async function AnimeCarouselPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { userId } = await auth();

  const { animeMeta, words } = await getAnimeVocabBySlug(slug, userId);

  if (!animeMeta && words.length === 0) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        {animeMeta?.banner_image && (
          <div className="relative h-48 w-full overflow-hidden rounded-xl mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={animeMeta.banner_image}
              alt={animeMeta.title_english ?? slug}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <h1 className="text-3xl font-bold text-[var(--color-text)]">
          {animeMeta?.title_english ?? slug}
        </h1>
        <p className="mt-1 text-[var(--color-text-muted)]">
          {words.length} vocabulary words
        </p>
      </div>

      {/* AnimeVocabCarouselWrapper is a client component that manages session state */}
      {/* It wraps AnimeVocabCarousel; Plan 09 adds AnimeCarouselExerciseSession */}
      <AnimeVocabCarouselWrapper
        words={words}
        animeMeta={animeMeta}
        animeSlug={slug}
        locale="en"
        userId={userId}
      />
    </main>
  );
}
