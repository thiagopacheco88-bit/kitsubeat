/**
 * Inject expanded vocabulary into the-1-muque lesson.
 * New entries derived from verse token analysis.
 * Run backfill:vocab after this to assign vocab_item_ids.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { songVersions, songs } from "../../src/lib/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import type { Lesson } from "../types/lesson.js";

const NEW_VOCAB = [
  {
    surface: "また", reading: "また", romaji: "mata",
    part_of_speech: "adverb", jlpt_level: "N5",
    meaning: { en: "again; once more", "pt-BR": "de novo; outra vez", es: "de nuevo; otra vez" },
    example_from_song: "また 誰も守れないの",
    additional_examples: [],
    mnemonic: { en: "MATA sounds like 'matter' — it matters because it happens AGAIN!", "pt-BR": "MATA — algo que importa porque acontece DE NOVO!", es: "MATA — algo que importa porque pasa DE NUEVO!" },
  },
  {
    surface: "もう", reading: "もう", romaji: "mou",
    part_of_speech: "adverb", jlpt_level: "N5",
    meaning: { en: "already; anymore; soon", "pt-BR": "já; mais; logo", es: "ya; más; pronto" },
    example_from_song: "もう止まれないよ",
    additional_examples: [],
    mnemonic: { en: "MOO like a cow that's ALREADY done mooing — no MORE!", "pt-BR": "MUU como uma vaca que JÁ terminou de mugir!", es: "MOO como una vaca que YA terminó de mugir!" },
  },
  {
    surface: "今", reading: "いま", romaji: "ima",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "now; right now; at the moment", "pt-BR": "agora; neste momento", es: "ahora; en este momento" },
    example_from_song: "今ここには暇もない",
    additional_examples: [],
    mnemonic: { en: "EE-MA — 'here ma, look at me NOW!'", "pt-BR": "EE-MA — 'olha aqui, mamãe, AGORA!'", es: "EE-MA — '¡mira aquí mamá, AHORA!'" },
  },
  {
    surface: "海", reading: "うみ", romaji: "umi",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "sea; ocean", "pt-BR": "mar; oceano", es: "mar; océano" },
    example_from_song: "広い海は",
    additional_examples: [],
    mnemonic: { en: "OO-MEE — imagine OOOH the SEA is so meeean and vast!", "pt-BR": "UU-MI — uau, o MAR é tão imenso!", es: "OO-ME — ¡guau, el MAR es tan vasto!" },
  },
  {
    surface: "空", reading: "そら", romaji: "sora",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "sky", "pt-BR": "céu", es: "cielo" },
    example_from_song: "広い空は",
    additional_examples: [],
    mnemonic: { en: "SO-RA — SOAR up into the SKY!", "pt-BR": "SO-RA — sobe no CÉU!", es: "SO-RA — ¡SObre vuela al CIELO!" },
  },
  {
    surface: "声", reading: "こえ", romaji: "koe",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "voice", "pt-BR": "voz", es: "voz" },
    example_from_song: "声は",
    additional_examples: [],
    mnemonic: { en: "KO-E — your VOICE says 'ko-e' to echo!", "pt-BR": "KO-E — sua VOZ diz 'ko-e' ecoando!", es: "KO-E — tu VOZ dice 'ko-e' al hacer eco!" },
  },
  {
    surface: "広い", reading: "ひろい", romaji: "hiroi",
    part_of_speech: "adjective", jlpt_level: "N5",
    meaning: { en: "wide; vast; spacious", "pt-BR": "amplo; vasto; espaçoso", es: "amplio; vasto; espacioso" },
    example_from_song: "広い海は",
    additional_examples: [],
    mnemonic: { en: "HEE-ROI — picture a HERO in a WIDE open field!", "pt-BR": "HEE-ROI — imagine um herói num campo AMPLO!", es: "HEE-ROI — ¡imagina un héroe en un campo AMPLIO!" },
  },
  {
    surface: "深い", reading: "ふかい", romaji: "fukai",
    part_of_speech: "adjective", jlpt_level: "N4",
    meaning: { en: "deep; profound", "pt-BR": "profundo; fundo", es: "profundo; hondo" },
    example_from_song: "深い孤独を",
    additional_examples: [],
    mnemonic: { en: "FOO-KAI — like a DEEP FOG you can't see through!", "pt-BR": "FU-KAI — como uma névoa PROFUNDA que não consegues ver!", es: "FU-KAI — ¡como una niebla PROFUNDA que no puedes ver!" },
  },
  {
    surface: "誰", reading: "だれ", romaji: "dare",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "who; someone", "pt-BR": "quem; alguém", es: "quién; alguien" },
    example_from_song: "誰も守れないの",
    additional_examples: [],
    mnemonic: { en: "DA-RE — 'DA-RE' asks WHO's daring enough?", "pt-BR": "DA-RE — 'DA-RE' pergunta QUEM é corajoso o suficiente?", es: "DA-RE — '¿DA-RE' pregunta QUIÉN se atreve?" },
  },
  {
    surface: "僕", reading: "ぼく", romaji: "boku",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "I; me (masculine, informal)", "pt-BR": "eu (masculino, informal)", es: "yo (masculino, informal)" },
    example_from_song: "僕と違うから",
    additional_examples: [],
    mnemonic: { en: "BO-KU — a BOY says 'boku' — that's ME!", "pt-BR": "BO-KU — um garoto diz 'boku' — sou EU!", es: "BO-KU — un chico dice 'boku' — ¡soy YO!" },
  },
  {
    surface: "止まる", reading: "とまる", romaji: "tomaru",
    part_of_speech: "verb", jlpt_level: "N4",
    meaning: { en: "to stop; to come to a halt", "pt-BR": "parar; deter-se", es: "parar; detenerse" },
    example_from_song: "もう止まれないよ",
    additional_examples: [],
    mnemonic: { en: "TO-MA-RU — a TOMATO rolling that can't STOP!", "pt-BR": "TO-MA-RU — um tomate rolando que não consegue PARAR!", es: "TO-MA-RU — ¡un tomate rodando que no puede PARAR!" },
  },
  {
    surface: "終わる", reading: "おわる", romaji: "owaru",
    part_of_speech: "verb", jlpt_level: "N5",
    meaning: { en: "to end; to finish; to be over", "pt-BR": "terminar; acabar", es: "terminar; acabar; finalizar" },
    example_from_song: "終われない",
    additional_examples: [],
    mnemonic: { en: "O-WA-RU — 'oh wow, it's OVER already!'", "pt-BR": "O-WA-RU — 'nossa, já ACABOU!'", es: "O-WA-RU — '¡oh, ya TERMINÓ!'" },
  },
  {
    surface: "飛ぶ", reading: "とぶ", romaji: "tobu",
    part_of_speech: "verb", jlpt_level: "N4",
    meaning: { en: "to fly; to leap; to jump", "pt-BR": "voar; pular; saltar", es: "volar; saltar; brincar" },
    example_from_song: "飛べないけど",
    additional_examples: [],
    mnemonic: { en: "TO-BU — TO BE a bird and FLY!", "pt-BR": "TO-BU — SER um pássaro e VOAR!", es: "TO-BU — ¡SER un pájaro y VOLAR!" },
  },
  {
    surface: "暇", reading: "ひま", romaji: "hima",
    part_of_speech: "noun", jlpt_level: "N3",
    meaning: { en: "free time; leisure; spare time", "pt-BR": "tempo livre; lazer", es: "tiempo libre; ocio" },
    example_from_song: "今ここには暇もない",
    additional_examples: [],
    mnemonic: { en: "HEE-MA — 'HEY MA, I have free time!'", "pt-BR": "HEE-MA — 'EI MÃE, tenho tempo livre!'", es: "HEE-MA — '¡EY MAMÁ, tengo tiempo libre!'" },
  },
  {
    surface: "船", reading: "ふね", romaji: "fune",
    part_of_speech: "noun", jlpt_level: "N4",
    meaning: { en: "ship; boat; vessel", "pt-BR": "navio; barco; embarcação", es: "barco; nave; embarcación" },
    example_from_song: "船よ",
    additional_examples: [],
    mnemonic: { en: "FOO-NE — a SHIP goes FOO-NEY across the water!", "pt-BR": "FU-NE — um NAVIO vai FU-NE pelo mar!", es: "FU-NE — ¡un BARCO va FU-NE por el agua!" },
  },
  {
    surface: "跡", reading: "あと", romaji: "ato",
    part_of_speech: "noun", jlpt_level: "N3",
    meaning: { en: "trace; mark; scar; remains", "pt-BR": "traço; marca; cicatriz; vestígio", es: "rastro; marca; cicatriz; vestigio" },
    example_from_song: "跡",
    additional_examples: [],
    mnemonic: { en: "A-TO — 'after' leaving a TRACE behind!", "pt-BR": "A-TO — 'depois' deixando um RASTRO para trás!", es: "A-TO — '¡después' dejando un RASTRO atrás!" },
  },
  {
    surface: "俯く", reading: "うつむく", romaji: "utsumuku",
    part_of_speech: "verb", jlpt_level: "N2",
    meaning: { en: "to hang one's head; to look down; to bow", "pt-BR": "abaixar a cabeça; olhar para baixo", es: "bajar la cabeza; mirar hacia abajo" },
    example_from_song: "俯く",
    additional_examples: [],
    mnemonic: { en: "OO-TSU-MU-KU — feeling low, you OOZE sadness and LOOK DOWN", "pt-BR": "U-TSU-MU-KU — sentindo-se mal, você ABAIXA a cabeça", es: "U-TSU-MU-KU — sintiéndote mal, BAJAS la cabeza" },
  },
  {
    surface: "手", reading: "て", romaji: "te",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "hand; arm", "pt-BR": "mão; braço", es: "mano; brazo" },
    example_from_song: "手のひらに",
    additional_examples: [],
    mnemonic: { en: "TE — point to your HAND and say 'TE'!", "pt-BR": "TE — aponte para sua MÃO e diga 'TE'!", es: "TE — ¡señala tu MANO y di 'TE'!" },
  },
];

async function main() {
  const db = getDb();

  const rows = await db
    .select({ id: songVersions.id, lesson: songVersions.lesson })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(and(eq(songs.slug, "the-1-muque"), eq(songVersions.pipeline_status, "idle"), eq(songVersions.version_type, "full")))
    .limit(1);

  if (!rows[0]) { console.error("Song version not found"); process.exit(1); }

  const lesson = rows[0].lesson as Lesson;
  const existingReadings = new Set((lesson.vocabulary ?? []).map((v) => v.reading));

  const toAdd = NEW_VOCAB.filter((v) => !existingReadings.has(v.reading));
  const merged = [...(lesson.vocabulary ?? []), ...toAdd];

  console.log(`\nCurrent vocab: ${lesson.vocabulary?.length ?? 0} entries`);
  console.log(`Adding: ${toAdd.length} new entries`);
  console.log(`Total after merge: ${merged.length} entries\n`);
  for (const v of toAdd) console.log(`  + ${v.surface} (${v.reading}) [${v.jlpt_level}]`);

  await db
    .update(songVersions)
    .set({ lesson: sql`${songVersions.lesson} || jsonb_build_object('vocabulary', ${JSON.stringify(merged)}::jsonb)` })
    .where(eq(songVersions.id, rows[0].id));

  console.log("\n✓ Written to DB. Now running backfill to assign vocab_item_ids...");
}

main().catch(console.error);
