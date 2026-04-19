/**
 * patch-sign-flow-coverage.ts — Surgically add 13 missing verses to sign-flow
 * so every Japanese lyric line maps to a verse. One-shot script; delete after
 * running + verifying with audit-lesson-coverage.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LESSON_PATH = `${ROOT}/data/lessons-cache/sign-flow.json`;

type Verse = {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: any[];
  translations: { en: string; "pt-BR": string; es: string };
  literal_meaning: { en: string };
};

const tok = (
  surface: string,
  reading: string,
  romaji: string,
  grammar: string,
  color: string,
  en: string,
  ptBR: string,
  es: string,
  jlpt: string
) => ({
  surface,
  reading,
  romaji,
  grammar,
  grammar_color: color,
  meaning: { en, "pt-BR": ptBR, es },
  jlpt_level: jlpt,
});

// Each new verse in song-order with its insertion marker (which existing
// verse it should appear AFTER, by the ORIGINAL numbering).
const NEW_VERSES: { after_original: number; verse: Omit<Verse, "verse_number"> }[] = [
  // After existing 4 ("傷ついたって平気だよ..."): "その足を引きずりながらも"
  {
    after_original: 4,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("その", "その", "sono", "other", "none", "that", "esse/esses", "ese/esos", "N5"),
        tok("足", "あし", "ashi", "noun", "blue", "foot; feet", "pé; pés", "pie; pies", "N5"),
        tok("を", "を", "wo", "particle", "grey", "object marker", "marcador de objeto", "marcador de objeto", "N5"),
        tok("引きずり", "ひきずり", "hikizuri", "verb", "red", "to drag (stem)", "arrastar (raiz)", "arrastrar (raíz)", "N3"),
        tok("ながら", "ながら", "nagara", "particle", "grey", "while (doing)", "enquanto", "mientras", "N4"),
        tok("も", "も", "mo", "particle", "grey", "even; also", "mesmo; também", "incluso; también", "N5"),
      ],
      translations: {
        en: "Even while dragging those feet...",
        "pt-BR": "Mesmo arrastando aqueles pés...",
        es: "Incluso arrastrando esos pies...",
      },
      literal_meaning: { en: "that + foot + obj + drag + while + even" },
    },
  },
  // After existing 6 ("音を立てて崩れていった"): "気付けば風の音だけが..."
  {
    after_original: 6,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("気付け", "きづけ", "kidzuke", "verb", "red", "to notice (provisional stem)", "perceber (provisório)", "darse cuenta (provisional)", "N3"),
        tok("ば", "ば", "ba", "particle", "grey", "if; when", "se; quando", "si; cuando", "N4"),
        tok("風", "かぜ", "kaze", "noun", "blue", "wind", "vento", "viento", "N5"),
        tok("の", "の", "no", "particle", "grey", "of; possessive", "de; posse", "de; posesivo", "N5"),
        tok("音", "おと", "oto", "noun", "blue", "sound", "som", "sonido", "N5"),
        tok("だけ", "だけ", "dake", "particle", "grey", "only; just", "somente", "sólo", "N4"),
        tok("が", "が", "ga", "particle", "grey", "subject marker", "marcador de sujeito", "marcador de sujeto", "N5"),
      ],
      translations: {
        en: "When I noticed, only the sound of wind remained...",
        "pt-BR": "Quando percebi, só restava o som do vento...",
        es: "Cuando me di cuenta, solo quedaba el sonido del viento...",
      },
      literal_meaning: { en: "notice + if/when + wind + of + sound + only + subj" },
    },
  },
  // After existing 11 (chorus end "その痛みがいつも..."): "「傷付かない強さよりも 傷つけない優しさを」"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("傷付か", "きずつか", "kizutsuka", "verb", "red", "to be wounded (negative stem)", "machucar-se (raiz neg.)", "ser herido (raíz neg.)", "N3"),
        tok("ない", "ない", "nai", "adjective", "green", "not (negative)", "não", "no", "N5"),
        tok("強さ", "つよさ", "tsuyosa", "noun", "blue", "strength", "força", "fuerza", "N4"),
        tok("より", "より", "yori", "particle", "grey", "than; rather than", "do que", "que; más que", "N4"),
        tok("も", "も", "mo", "particle", "grey", "even", "mesmo", "incluso", "N5"),
        tok("傷つけ", "きずつけ", "kizutsuke", "verb", "red", "to hurt (someone, neg. stem)", "ferir alguém (raiz neg.)", "herir (raíz neg.)", "N3"),
        tok("ない", "ない", "nai", "adjective", "green", "not (negative)", "não", "no", "N5"),
        tok("優しさ", "やさしさ", "yasashisa", "noun", "blue", "kindness; gentleness", "gentileza", "amabilidad", "N3"),
        tok("を", "を", "wo", "particle", "grey", "object marker", "marcador de objeto", "marcador de objeto", "N5"),
      ],
      translations: {
        en: "\"Rather than strength that never gets hurt, [choose] kindness that never hurts others.\"",
        "pt-BR": "\"Mais do que a força de quem nunca se machuca, [escolha] a gentileza de quem nunca machuca.\"",
        es: "\"Más que la fuerza de no ser herido, [elige] la amabilidad de no herir.\"",
      },
      literal_meaning: { en: "not-hurt + strength + than + even + not-hurt-others + kindness + obj" },
    },
  },
  // After previous (chorus-ish): "その声はどこか悲しそうで"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("その", "その", "sono", "other", "none", "that", "esse", "ese", "N5"),
        tok("声", "こえ", "koe", "noun", "blue", "voice", "voz", "voz", "N5"),
        tok("は", "は", "wa", "particle", "grey", "topic marker", "marcador de tópico", "marcador de tema", "N5"),
        tok("どこ", "どこ", "doko", "other", "none", "where; somewhere", "onde; algum lugar", "dónde; algún lugar", "N5"),
        tok("か", "か", "ka", "particle", "grey", "indefinite (somehow)", "indefinido (de algum modo)", "indefinido (de algún modo)", "N5"),
        tok("悲し", "かなし", "kanashi", "adjective", "green", "sad (stem)", "triste (raiz)", "triste (raíz)", "N4"),
        tok("そう", "そう", "sou", "other", "none", "seems; appears", "parece", "parece", "N4"),
        tok("で", "で", "de", "particle", "grey", "te-form connector", "conector te", "conector te", "N5"),
      ],
      translations: {
        en: "That voice sounded somehow sad, and...",
        "pt-BR": "Aquela voz parecia triste, de algum modo, e...",
        es: "Esa voz sonaba de algún modo triste, y...",
      },
      literal_meaning: { en: "that + voice + topic + somewhere + sad + seems + connector" },
    },
  },
  // "掛け違えた ボタンみたいに"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("掛け違え", "かけちがえ", "kakechigae", "verb", "red", "to button wrong (past stem)", "abotoar errado (raiz passada)", "abrochar mal (raíz pasada)", "N2"),
        tok("た", "た", "ta", "particle", "grey", "past tense", "passado", "pasado", "N5"),
        tok("ボタン", "ボタン", "botan", "noun", "blue", "button", "botão", "botón", "N4"),
        tok("みたい", "みたい", "mitai", "other", "none", "like; as if", "como; como se", "como; como si", "N4"),
        tok("に", "に", "ni", "particle", "grey", "adverbial; like", "adverbial; como", "adverbial; como", "N5"),
      ],
      translations: {
        en: "Like a wrongly-buttoned button,",
        "pt-BR": "Como um botão abotoado errado,",
        es: "Como un botón mal abrochado,",
      },
      literal_meaning: { en: "mis-button + past + button + like + adverbial" },
    },
  },
  // "こころ身体 離れていった"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("こころ", "こころ", "kokoro", "noun", "blue", "heart; mind", "coração; mente", "corazón; mente", "N4"),
        tok("身体", "からだ", "karada", "noun", "blue", "body", "corpo", "cuerpo", "N5"),
        tok("離れ", "はなれ", "hanare", "verb", "red", "to separate (stem)", "separar (raiz)", "separar (raíz)", "N4"),
        tok("て", "て", "te", "particle", "grey", "te-form", "forma-te", "forma-te", "N5"),
        tok("いっ", "いっ", "it", "verb", "red", "to go (stem, aux)", "ir (raiz aux.)", "ir (raíz aux.)", "N5"),
        tok("た", "た", "ta", "particle", "grey", "past tense", "passado", "pasado", "N5"),
      ],
      translations: {
        en: "My heart and body drifted apart.",
        "pt-BR": "Coração e corpo se afastaram.",
        es: "Corazón y cuerpo se separaron.",
      },
      literal_meaning: { en: "heart + body + separate + te + go(aux) + past" },
    },
  },
  // "もう一度 心を掴んで"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("もう", "もう", "mou", "adverb", "orange", "again; already", "de novo; já", "otra vez; ya", "N5"),
        tok("一度", "いちど", "ichido", "noun", "blue", "once", "uma vez", "una vez", "N4"),
        tok("心", "こころ", "kokoro", "noun", "blue", "heart", "coração", "corazón", "N4"),
        tok("を", "を", "wo", "particle", "grey", "object marker", "marcador de objeto", "marcador de objeto", "N5"),
        tok("掴ん", "つかん", "tsukan", "verb", "red", "to grasp (te-form stem)", "agarrar (forma-te)", "agarrar (forma-te)", "N3"),
        tok("で", "で", "de", "particle", "grey", "te-form", "forma-te", "forma-te", "N5"),
      ],
      translations: {
        en: "Once more, grasp my heart —",
        "pt-BR": "Mais uma vez, agarre meu coração —",
        es: "Una vez más, toma mi corazón —",
      },
      literal_meaning: { en: "again + once + heart + obj + grasp + te" },
    },
  },
  // "いつか聞いた あの泣き声は"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("いつか", "いつか", "itsuka", "adverb", "orange", "someday; once", "um dia; certa vez", "algún día; una vez", "N4"),
        tok("聞い", "きい", "kii", "verb", "red", "to hear (past stem)", "ouvir (raiz passada)", "escuchar (raíz pasada)", "N5"),
        tok("た", "た", "ta", "particle", "grey", "past tense", "passado", "pasado", "N5"),
        tok("あの", "あの", "ano", "other", "none", "that (distant)", "aquele", "aquel", "N5"),
        tok("泣き声", "なきごえ", "nakigoe", "noun", "blue", "crying voice", "voz chorando", "voz llorando", "N3"),
        tok("は", "は", "wa", "particle", "grey", "topic marker", "marcador de tópico", "marcador de tema", "N5"),
      ],
      translations: {
        en: "That crying voice I once heard —",
        "pt-BR": "Aquela voz chorando que eu ouvi um dia —",
        es: "Aquella voz llorando que escuché alguna vez —",
      },
      literal_meaning: { en: "someday + heard + past + that + crying-voice + topic" },
    },
  },
  // "間違いなくそう 自分のだった"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("間違い", "まちがい", "machigai", "noun", "blue", "mistake; doubt", "erro; dúvida", "error; duda", "N4"),
        tok("なく", "なく", "naku", "adjective", "green", "without (adv)", "sem (adv)", "sin (adv)", "N4"),
        tok("そう", "そう", "sou", "adverb", "orange", "so; that way", "assim", "así", "N5"),
        tok("自分", "じぶん", "jibun", "noun", "blue", "self; oneself", "si mesmo", "uno mismo", "N4"),
        tok("の", "の", "no", "particle", "grey", "possessive (one's own)", "possessivo", "posesivo", "N5"),
        tok("だっ", "だっ", "dat", "verb", "red", "to be (past stem)", "ser (raiz passada)", "ser (raíz pasada)", "N5"),
        tok("た", "た", "ta", "particle", "grey", "past tense", "passado", "pasado", "N5"),
      ],
      translations: {
        en: "— was undoubtedly my own.",
        "pt-BR": "— era, sem dúvida, minha.",
        es: "— era, sin duda, mía.",
      },
      literal_meaning: { en: "mistake + without + so + self + of + be + past" },
    },
  },
  // "全てはこの時のために"
  {
    after_original: 11,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("全て", "すべて", "subete", "noun", "blue", "all; everything", "tudo", "todo", "N4"),
        tok("は", "は", "wa", "particle", "grey", "topic marker", "marcador de tópico", "marcador de tema", "N5"),
        tok("この", "この", "kono", "other", "none", "this", "este", "este", "N5"),
        tok("時", "とき", "toki", "noun", "blue", "time; moment", "tempo; momento", "tiempo; momento", "N5"),
        tok("の", "の", "no", "particle", "grey", "of", "de", "de", "N5"),
        tok("ため", "ため", "tame", "noun", "blue", "sake; purpose", "por causa de", "por; a causa de", "N4"),
        tok("に", "に", "ni", "particle", "grey", "for; to", "para", "para", "N5"),
      ],
      translations: {
        en: "Everything was for this very moment.",
        "pt-BR": "Tudo foi por causa deste momento.",
        es: "Todo fue por este momento.",
      },
      literal_meaning: { en: "all + topic + this + time + of + sake + for" },
    },
  },
  // After existing 13 ("もう二度と自分だけは離さないで"): "気付いてくれた 君への合図"
  {
    after_original: 13,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("気付い", "きづい", "kidzui", "verb", "red", "to notice (te-form stem)", "perceber (forma-te)", "darse cuenta (forma-te)", "N3"),
        tok("て", "て", "te", "particle", "grey", "te-form", "forma-te", "forma-te", "N5"),
        tok("くれ", "くれ", "kure", "verb", "red", "to do for me (stem)", "fazer por mim (raiz)", "hacer por mí (raíz)", "N4"),
        tok("た", "た", "ta", "particle", "grey", "past tense", "passado", "pasado", "N5"),
        tok("君", "きみ", "kimi", "noun", "blue", "you", "você", "tú", "N4"),
        tok("へ", "へ", "e", "particle", "grey", "direction (to)", "direção", "dirección", "N5"),
        tok("の", "の", "no", "particle", "grey", "of; possessive", "de; posse", "de; posesivo", "N5"),
        tok("合図", "あいず", "aizu", "noun", "blue", "signal; sign", "sinal", "señal", "N2"),
      ],
      translations: {
        en: "The sign to you that you noticed —",
        "pt-BR": "O sinal para você, que você percebeu —",
        es: "La señal hacia ti, que tú notaste —",
      },
      literal_meaning: { en: "noticed-for-me + past + you + to + of + signal" },
    },
  },
  // After existing 13 too (follows the chorus repeat that's already represented):
  // "それなら もう恐れるものはないんだと"
  {
    after_original: 13,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("それなら", "それなら", "sorenara", "other", "none", "in that case; then", "nesse caso", "en ese caso", "N3"),
        tok("もう", "もう", "mou", "adverb", "orange", "anymore; already", "não mais", "ya; ya no", "N5"),
        tok("恐れる", "おそれる", "osoreru", "verb", "red", "to fear", "temer", "temer", "N3"),
        tok("もの", "もの", "mono", "noun", "blue", "thing", "coisa", "cosa", "N5"),
        tok("は", "は", "wa", "particle", "grey", "topic marker", "marcador de tópico", "marcador de tema", "N5"),
        tok("ない", "ない", "nai", "adjective", "green", "not exist (none)", "não existe", "no existe", "N5"),
        tok("ん", "ん", "n", "particle", "grey", "explanatory (nominaliser)", "explicativo", "explicativo", "N4"),
        tok("だ", "だ", "da", "verb", "red", "to be (copula)", "ser (cópula)", "ser (cópula)", "N5"),
        tok("と", "と", "to", "particle", "grey", "quote; that", "que (citação)", "que (cita)", "N5"),
      ],
      translations: {
        en: "In that case, [I realise] there's nothing left to fear.",
        "pt-BR": "Nesse caso, [percebo que] não há mais nada a temer.",
        es: "En ese caso, [me doy cuenta de que] ya no hay nada que temer.",
      },
      literal_meaning: { en: "in-that-case + anymore + to-fear + thing + topic + not-exist + explanatory + be + quote" },
    },
  },
  // "忘れないでね 笑顔の訳を"
  {
    after_original: 13,
    verse: {
      start_time_ms: 0,
      end_time_ms: 0,
      tokens: [
        tok("忘れ", "わすれ", "wasure", "verb", "red", "to forget (neg. stem)", "esquecer (raiz neg.)", "olvidar (raíz neg.)", "N5"),
        tok("ない", "ない", "nai", "adjective", "green", "not (negative)", "não", "no", "N5"),
        tok("で", "で", "de", "particle", "grey", "negative imperative (te-form)", "imperativo negativo", "imperativo negativo", "N5"),
        tok("ね", "ね", "ne", "particle", "grey", "emphasis; seeking agreement", "ênfase", "énfasis", "N5"),
        tok("笑顔", "えがお", "egao", "noun", "blue", "smile; smiling face", "sorriso", "sonrisa", "N3"),
        tok("の", "の", "no", "particle", "grey", "of; possessive", "de; posse", "de; posesivo", "N5"),
        tok("訳", "わけ", "wake", "noun", "blue", "reason; meaning", "razão; significado", "razón; significado", "N3"),
        tok("を", "を", "wo", "particle", "grey", "object marker", "marcador de objeto", "marcador de objeto", "N5"),
      ],
      translations: {
        en: "Don't forget — the reason for that smile.",
        "pt-BR": "Não se esqueça — a razão daquele sorriso.",
        es: "No olvides — la razón de aquella sonrisa.",
      },
      literal_meaning: { en: "forget + not + neg-imperative + emphasis + smile + of + reason + obj" },
    },
  },
];

// ---------------------------------------------------------------------------
// Merge logic: walk original verses in order; after each, splice in any new
// verses whose `after_original` matches; then renumber 1..N.
// ---------------------------------------------------------------------------

const lesson = JSON.parse(readFileSync(LESSON_PATH, "utf-8"));
const original: Verse[] = lesson.verses;
const merged: Verse[] = [];
for (const v of original) {
  merged.push(v);
  for (const nv of NEW_VERSES) {
    if (nv.after_original === v.verse_number) {
      merged.push({ verse_number: 0, ...nv.verse });
    }
  }
}
merged.forEach((v, i) => (v.verse_number = i + 1));

lesson.verses = merged;
writeFileSync(LESSON_PATH, JSON.stringify(lesson, null, 2), "utf-8");

console.log(`Patched sign-flow: ${original.length} → ${merged.length} verses`);
