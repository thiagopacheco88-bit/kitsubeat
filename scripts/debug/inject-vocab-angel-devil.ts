/**
 * Inject expanded vocabulary into angel-and-devil-gren-boyz lesson.
 * Both full and tv versions get the same expansion.
 * Run backfill:vocab after to assign vocab_item_ids.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { songVersions, songs } from "../../src/lib/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import type { Lesson } from "../types/lesson.js";

const NEW_VOCAB = [
  {
    surface: "天使", reading: "てんし", romaji: "tenshi",
    part_of_speech: "noun", jlpt_level: "unknown",
    meaning: { en: "angel", "pt-BR": "anjo", es: "ángel" },
    example_from_song: "天使と悪魔",
    additional_examples: [],
    mnemonic: { en: "TEN-SHI — a TENDER SHEep with wings — that's an ANGEL!", "pt-BR": "TEN-SHI — uma ovelha TENra com asas — é um ANJO!", es: "TEN-SHI — una oveja TIERNA con alas — ¡eso es un ÁNGEL!" },
  },
  {
    surface: "悪魔", reading: "あくま", romaji: "akuma",
    part_of_speech: "noun", jlpt_level: "unknown",
    meaning: { en: "devil; demon; evil spirit", "pt-BR": "diabo; demônio; espírito maligno", es: "diablo; demonio; espíritu maligno" },
    example_from_song: "天使と悪魔",
    additional_examples: [],
    mnemonic: { en: "A-KU-MA — AH COO MA — a DEVIOUS cuckoo monster!", "pt-BR": "A-KU-MA — é o DIABO com um coaxo maligno!", es: "A-KU-MA — ¡AH, el DIABLO con un canto maligno!" },
  },
  {
    surface: "明日", reading: "あした", romaji: "ashita",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "tomorrow", "pt-BR": "amanhã", es: "mañana" },
    example_from_song: "明日も",
    additional_examples: [],
    mnemonic: { en: "A-SHI-TA — 'a SHEET of day' awaits TOMORROW!", "pt-BR": "A-SHI-TA — 'uma folha do dia' espera AMANHÃ!", es: "A-SHI-TA — '¡una hoja del día' espera MAÑANA!" },
  },
  {
    surface: "いつまでも", reading: "いつまでも", romaji: "itsumademo",
    part_of_speech: "adverb", jlpt_level: "N4",
    meaning: { en: "forever; always; for ever and ever", "pt-BR": "para sempre; eternamente", es: "para siempre; eternamente" },
    example_from_song: "いつまでも",
    additional_examples: [],
    mnemonic: { en: "EE-TSU-MA-DE-MO — 'EE, it's a mad demo that plays FOREVER!'", "pt-BR": "EE-TSU-MA-DE-MO — uma demo interminável que toca PARA SEMPRE!", es: "EE-TSU-MA-DE-MO — ¡una demo sin fin que suena PARA SIEMPRE!" },
  },
  {
    surface: "嘘", reading: "うそ", romaji: "uso",
    part_of_speech: "noun", jlpt_level: "N4",
    meaning: { en: "lie; falsehood; untruth", "pt-BR": "mentira; falsidade", es: "mentira; falsedad" },
    example_from_song: "嘘だと知るだろう",
    additional_examples: [],
    mnemonic: { en: "OO-SO — 'OOH SO that was a LIE!'", "pt-BR": "U-SO — 'nossa, isso foi uma MENTIRA!'", es: "U-SO — '¡vaya, eso fue una MENTIRA!'" },
  },
  {
    surface: "夢", reading: "ゆめ", romaji: "yume",
    part_of_speech: "noun", jlpt_level: "N4",
    meaning: { en: "dream", "pt-BR": "sonho", es: "sueño" },
    example_from_song: "夢のような時間",
    additional_examples: [],
    mnemonic: { en: "YU-ME — 'YOU ME together is a DREAM!'", "pt-BR": "YU-ME — 'você e eu juntos é um SONHO!'", es: "YU-ME — '¡tú y yo juntos es un SUEÑO!'" },
  },
  {
    surface: "笑う", reading: "わらう", romaji: "warau",
    part_of_speech: "verb", jlpt_level: "N5",
    meaning: { en: "to laugh; to smile", "pt-BR": "rir; sorrir", es: "reír; sonreír" },
    example_from_song: "笑って",
    additional_examples: [],
    mnemonic: { en: "WA-RA-U — 'WOW RA-oo!' you say, laughing out loud!", "pt-BR": "WA-RA-U — 'UAU RA-u!' você grita ao RIR!", es: "WA-RA-U — '¡WOW RA-u!' dices riendo a carcajadas!" },
  },
  {
    surface: "雨", reading: "あめ", romaji: "ame",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "rain", "pt-BR": "chuva", es: "lluvia" },
    example_from_song: "激しい雨の向こう",
    additional_examples: [],
    mnemonic: { en: "A-ME — 'AH ME, it's RAINING again!'", "pt-BR": "A-ME — 'ai meu, está CHOVENDO de novo!'", es: "A-ME — '¡ay de mí, está LLOVIENDO otra vez!'" },
  },
  {
    surface: "声", reading: "こえ", romaji: "koe",
    part_of_speech: "noun", jlpt_level: "N5",
    meaning: { en: "voice", "pt-BR": "voz", es: "voz" },
    example_from_song: "デカい声なんかに",
    additional_examples: [],
    mnemonic: { en: "KO-E — your VOICE says 'ko-e' to echo!", "pt-BR": "KO-E — sua VOZ diz 'ko-e' ao ecoar!", es: "KO-E — tu VOZ dice 'ko-e' al resonar!" },
  },
  {
    surface: "夜明け", reading: "よあけ", romaji: "yoake",
    part_of_speech: "noun", jlpt_level: "N3",
    meaning: { en: "dawn; daybreak", "pt-BR": "amanhecer; aurora", es: "amanecer; alba" },
    example_from_song: "夜明けの向こう",
    additional_examples: [],
    mnemonic: { en: "YO-A-KE — 'YO! A KEY unlocks the DAWN!'", "pt-BR": "YO-A-KE — 'ei! Uma chave abre o AMANHECER!'", es: "YO-A-KE — '¡eh! Una llave abre el AMANECER!'" },
  },
  {
    surface: "向こう", reading: "むこう", romaji: "mukou",
    part_of_speech: "noun", jlpt_level: "N3",
    meaning: { en: "beyond; the other side; over there", "pt-BR": "além; o outro lado; lá", es: "más allá; el otro lado; allá" },
    example_from_song: "夜明けの向こう",
    additional_examples: [],
    mnemonic: { en: "MU-KO-U — 'MOO! COO!' — the cows and doves are BEYOND the hill!", "pt-BR": "MU-KO-U — 'MU! KU!' — as vacas e pombas estão do OUTRO LADO!", es: "MU-KO-U — '¡MU! ¡CU!' — las vacas y palomas están DEL OTRO LADO!" },
  },
  {
    surface: "想い", reading: "おもい", romaji: "omoi",
    part_of_speech: "noun", jlpt_level: "N3",
    meaning: { en: "feeling; thoughts; emotion; sentiment", "pt-BR": "sentimento; pensamento; emoção", es: "sentimiento; pensamiento; emoción" },
    example_from_song: "書ききれない想い",
    additional_examples: [],
    mnemonic: { en: "O-MO-I — 'OH! MORE feelings I can't express!'", "pt-BR": "O-MO-I — 'OH! Mais SENTIMENTOS que não consigo expressar!'", es: "O-MO-I — '¡OH! Más SENTIMIENTOS que no puedo expresar!'" },
  },
];

async function main() {
  const db = getDb();

  // Apply to both full and tv versions
  for (const versionType of ["full", "tv"] as const) {
    const rows = await db
      .select({ id: songVersions.id, lesson: songVersions.lesson })
      .from(songVersions)
      .innerJoin(songs, eq(songs.id, songVersions.song_id))
      .where(and(
        eq(songs.slug, "angel-and-devil-gren-boyz"),
        eq(songVersions.pipeline_status, "idle"),
        eq(songVersions.version_type, versionType),
      ))
      .limit(1);

    if (!rows[0]) { console.log(`No ${versionType} version found, skipping`); continue; }

    const lesson = rows[0].lesson as Lesson;
    const existingReadings = new Set((lesson.vocabulary ?? []).map((v) => v.reading));
    const toAdd = NEW_VOCAB.filter((v) => !existingReadings.has(v.reading));
    const merged = [...(lesson.vocabulary ?? []), ...toAdd];

    console.log(`\n[${versionType}] ${lesson.vocabulary?.length ?? 0} → ${merged.length} vocab entries (+${toAdd.length})`);
    for (const v of toAdd) console.log(`  + ${v.surface} (${v.reading}) [${v.jlpt_level}]`);

    await db
      .update(songVersions)
      .set({ lesson: sql`${songVersions.lesson} || jsonb_build_object('vocabulary', ${JSON.stringify(merged)}::jsonb)` })
      .where(eq(songVersions.id, rows[0].id));
  }

  console.log("\n✓ Done. Run `npm run backfill:vocab` to assign vocab_item_ids.");
}

main().catch(console.error);
