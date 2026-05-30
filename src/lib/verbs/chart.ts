import type { VerbEntry } from "./types";

export const VERB_CHART: VerbEntry[] = [
  // ── N5 verbs ──────────────────────────────────────────────────────────────

  {
    id: "taberu",
    dict: "食べる", reading: "たべる", romaji: "taberu",
    meaning: "to eat", verbClass: "ichidan", jlptLevel: "N5", order: 0,
    presentSentence: { jp_pre: "毎日、寿司を", jp_post: "。", en: "I ___ sushi every day." },
    pastSentence:    { jp_pre: "昨日、寿司を", jp_post: "。", en: "I ___ sushi yesterday." },
  },
  {
    id: "nomu",
    dict: "飲む", reading: "のむ", romaji: "nomu",
    meaning: "to drink", verbClass: "godan", jlptLevel: "N5", order: 1,
    presentSentence: { jp_pre: "毎朝、コーヒーを", jp_post: "。", en: "I ___ coffee every morning." },
    pastSentence:    { jp_pre: "昨日、水を", jp_post: "。", en: "I ___ water yesterday." },
  },
  {
    id: "miru",
    dict: "見る", reading: "みる", romaji: "miru",
    meaning: "to watch / see", verbClass: "ichidan", jlptLevel: "N5", order: 2,
    presentSentence: { jp_pre: "毎週、映画を", jp_post: "。", en: "I ___ movies every week." },
    pastSentence:    { jp_pre: "昨日、テレビを", jp_post: "。", en: "I ___ TV yesterday." },
  },
  {
    id: "kaku",
    dict: "書く", reading: "かく", romaji: "kaku",
    meaning: "to write", verbClass: "godan", jlptLevel: "N5", order: 3,
    presentSentence: { jp_pre: "毎日、日記を", jp_post: "。", en: "I ___ in my diary every day." },
    pastSentence:    { jp_pre: "昨日、手紙を", jp_post: "。", en: "I ___ a letter yesterday." },
  },
  {
    id: "yomu",
    dict: "読む", reading: "よむ", romaji: "yomu",
    meaning: "to read", verbClass: "godan", jlptLevel: "N5", order: 4,
    presentSentence: { jp_pre: "毎日、本を", jp_post: "。", en: "I ___ books every day." },
    pastSentence:    { jp_pre: "昨日、本を", jp_post: "。", en: "I ___ a book yesterday." },
  },
  {
    id: "kiku",
    dict: "聞く", reading: "きく", romaji: "kiku",
    meaning: "to listen / hear", verbClass: "godan", jlptLevel: "N5", order: 5,
    presentSentence: { jp_pre: "毎日、音楽を", jp_post: "。", en: "I ___ to music every day." },
    pastSentence:    { jp_pre: "昨日、音楽を", jp_post: "。", en: "I ___ to music yesterday." },
  },
  {
    id: "hanasu",
    dict: "話す", reading: "はなす", romaji: "hanasu",
    meaning: "to speak", verbClass: "godan", jlptLevel: "N5", order: 6,
    presentSentence: { jp_pre: "よく日本語で", jp_post: "。", en: "I often ___ in Japanese." },
    pastSentence:    { jp_pre: "昨日、先生と", jp_post: "。", en: "I ___ with the teacher yesterday." },
  },
  {
    id: "iku",
    dict: "行く", reading: "いく", romaji: "iku",
    meaning: "to go", verbClass: "godan", jlptLevel: "N5", order: 7,
    presentSentence: { jp_pre: "毎日、学校に", jp_post: "。", en: "I ___ to school every day." },
    pastSentence:    { jp_pre: "昨日、公園に", jp_post: "。", en: "I ___ to the park yesterday." },
  },
  {
    id: "kuru",
    dict: "来る", reading: "くる", romaji: "kuru",
    meaning: "to come", verbClass: "irregular", jlptLevel: "N5", order: 8,
    presentSentence: { jp_pre: "友達が家に", jp_post: "。", en: "My friend ___ to my house." },
    pastSentence:    { jp_pre: "昨日、友達が", jp_post: "。", en: "My friend ___ yesterday." },
  },
  {
    id: "kaeru",
    dict: "帰る", reading: "かえる", romaji: "kaeru",
    meaning: "to return home", verbClass: "godan", jlptLevel: "N5", order: 9,
    presentSentence: { jp_pre: "毎日、早く", jp_post: "。", en: "I ___ home early every day." },
    pastSentence:    { jp_pre: "昨日、早く", jp_post: "。", en: "I ___ home early yesterday." },
  },
  {
    id: "okiru",
    dict: "起きる", reading: "おきる", romaji: "okiru",
    meaning: "to wake up", verbClass: "ichidan", jlptLevel: "N5", order: 10,
    presentSentence: { jp_pre: "毎朝、七時に", jp_post: "。", en: "I ___ at 7 every morning." },
    pastSentence:    { jp_pre: "今日、遅く", jp_post: "。", en: "I ___ late today." },
  },
  {
    id: "neru",
    dict: "寝る", reading: "ねる", romaji: "neru",
    meaning: "to sleep", verbClass: "ichidan", jlptLevel: "N5", order: 11,
    presentSentence: { jp_pre: "毎晩、十時に", jp_post: "。", en: "I ___ at 10 every night." },
    pastSentence:    { jp_pre: "昨日、早く", jp_post: "。", en: "I ___ early yesterday." },
  },
  {
    id: "kau",
    dict: "買う", reading: "かう", romaji: "kau",
    meaning: "to buy", verbClass: "godan", jlptLevel: "N5", order: 12,
    presentSentence: { jp_pre: "スーパーで食べ物を", jp_post: "。", en: "I ___ food at the supermarket." },
    pastSentence:    { jp_pre: "昨日、服を", jp_post: "。", en: "I ___ clothes yesterday." },
  },
  {
    id: "matsu",
    dict: "待つ", reading: "まつ", romaji: "matsu",
    meaning: "to wait", verbClass: "godan", jlptLevel: "N5", order: 13,
    presentSentence: { jp_pre: "バス停で", jp_post: "。", en: "I ___ at the bus stop." },
    pastSentence:    { jp_pre: "一時間、", jp_post: "。", en: "I ___ for one hour." },
  },
  {
    id: "au",
    dict: "会う", reading: "あう", romaji: "au",
    meaning: "to meet", verbClass: "godan", jlptLevel: "N5", order: 14,
    presentSentence: { jp_pre: "友達と", jp_post: "。", en: "I ___ with friends." },
    pastSentence:    { jp_pre: "昨日、友達と", jp_post: "。", en: "I ___ with friends yesterday." },
  },
  {
    id: "suru",
    dict: "する", reading: "する", romaji: "suru",
    meaning: "to do", verbClass: "irregular", jlptLevel: "N5", order: 15,
    presentSentence: { jp_pre: "毎日、宿題を", jp_post: "。", en: "I ___ my homework every day." },
    pastSentence:    { jp_pre: "昨日、運動を", jp_post: "。", en: "I ___ exercise yesterday." },
  },
  {
    id: "wakaru",
    dict: "分かる", reading: "わかる", romaji: "wakaru",
    meaning: "to understand", verbClass: "godan", jlptLevel: "N5", order: 16,
    presentSentence: { jp_pre: "日本語が", jp_post: "。", en: "I ___ Japanese." },
    pastSentence:    { jp_pre: "問題が", jp_post: "。", en: "I ___ the problem." },
  },
  {
    id: "iu",
    dict: "言う", reading: "いう", romaji: "iu",
    meaning: "to say", verbClass: "godan", jlptLevel: "N5", order: 17,
    presentSentence: { jp_pre: "「ありがとう」と", jp_post: "。", en: "I ___ 'thank you'." },
    pastSentence:    { jp_pre: "先生が", jp_post: "。", en: "The teacher ___." },
  },
  {
    id: "noru",
    dict: "乗る", reading: "のる", romaji: "noru",
    meaning: "to ride / board", verbClass: "godan", jlptLevel: "N5", order: 18,
    presentSentence: { jp_pre: "毎日、電車に", jp_post: "。", en: "I ___ the train every day." },
    pastSentence:    { jp_pre: "昨日、バスに", jp_post: "。", en: "I ___ the bus yesterday." },
  },
  {
    id: "deru",
    dict: "出る", reading: "でる", romaji: "deru",
    meaning: "to leave / exit", verbClass: "ichidan", jlptLevel: "N5", order: 19,
    presentSentence: { jp_pre: "八時に家を", jp_post: "。", en: "I ___ the house at 8." },
    pastSentence:    { jp_pre: "昨日、早く家を", jp_post: "。", en: "I ___ the house early yesterday." },
  },

  // ── N4 verbs ──────────────────────────────────────────────────────────────

  {
    id: "oboeru",
    dict: "覚える", reading: "おぼえる", romaji: "oboeru",
    meaning: "to memorize", verbClass: "ichidan", jlptLevel: "N4", order: 20,
    presentSentence: { jp_pre: "新しい単語を", jp_post: "。", en: "I ___ new words." },
    pastSentence:    { jp_pre: "この曲を", jp_post: "。", en: "I ___ this song." },
  },
  {
    id: "wasureru",
    dict: "忘れる", reading: "わすれる", romaji: "wasureru",
    meaning: "to forget", verbClass: "ichidan", jlptLevel: "N4", order: 21,
    presentSentence: { jp_pre: "よく単語を", jp_post: "。", en: "I often ___ words." },
    pastSentence:    { jp_pre: "宿題を", jp_post: "。", en: "I ___ my homework." },
  },
  {
    id: "tsukau",
    dict: "使う", reading: "つかう", romaji: "tsukau",
    meaning: "to use", verbClass: "godan", jlptLevel: "N4", order: 22,
    presentSentence: { jp_pre: "毎日、スマホを", jp_post: "。", en: "I ___ my phone every day." },
    pastSentence:    { jp_pre: "昨日、辞書を", jp_post: "。", en: "I ___ the dictionary yesterday." },
  },
  {
    id: "motsu",
    dict: "持つ", reading: "もつ", romaji: "motsu",
    meaning: "to hold / have", verbClass: "godan", jlptLevel: "N4", order: 23,
    presentSentence: { jp_pre: "バッグを", jp_post: "。", en: "I ___ a bag." },
    pastSentence:    { jp_pre: "昨日、傘を", jp_post: "。", en: "I ___ an umbrella yesterday." },
  },
  {
    id: "shiru",
    dict: "知る", reading: "しる", romaji: "shiru",
    meaning: "to know", verbClass: "godan", jlptLevel: "N4", order: 24,
    presentSentence: { jp_pre: "その話を", jp_post: "。", en: "I ___ that story." },
    pastSentence:    { jp_pre: "答えを", jp_post: "。", en: "I ___ the answer." },
  },
  {
    id: "omou",
    dict: "思う", reading: "おもう", romaji: "omou",
    meaning: "to think", verbClass: "godan", jlptLevel: "N4", order: 25,
    presentSentence: { jp_pre: "彼は優しいと", jp_post: "。", en: "I ___ he is kind." },
    pastSentence:    { jp_pre: "難しいと", jp_post: "。", en: "I ___ it was difficult." },
  },
  {
    id: "hashiru",
    dict: "走る", reading: "はしる", romaji: "hashiru",
    meaning: "to run", verbClass: "godan", jlptLevel: "N4", order: 26,
    presentSentence: { jp_pre: "毎日、公園で", jp_post: "。", en: "I ___ in the park every day." },
    pastSentence:    { jp_pre: "昨日、学校まで", jp_post: "。", en: "I ___ to school yesterday." },
  },
  {
    id: "oyogu",
    dict: "泳ぐ", reading: "およぐ", romaji: "oyogu",
    meaning: "to swim", verbClass: "godan", jlptLevel: "N4", order: 27,
    presentSentence: { jp_pre: "夏、海で", jp_post: "。", en: "I ___ in the sea in summer." },
    pastSentence:    { jp_pre: "昨日、プールで", jp_post: "。", en: "I ___ in the pool yesterday." },
  },
  {
    id: "asobu",
    dict: "遊ぶ", reading: "あそぶ", romaji: "asobu",
    meaning: "to play", verbClass: "godan", jlptLevel: "N4", order: 28,
    presentSentence: { jp_pre: "友達と", jp_post: "。", en: "I ___ with friends." },
    pastSentence:    { jp_pre: "昨日、公園で", jp_post: "。", en: "I ___ in the park yesterday." },
  },
  {
    id: "hajimeru",
    dict: "始める", reading: "はじめる", romaji: "hajimeru",
    meaning: "to start / begin", verbClass: "ichidan", jlptLevel: "N4", order: 29,
    presentSentence: { jp_pre: "新しいプロジェクトを", jp_post: "。", en: "I ___ a new project." },
    pastSentence:    { jp_pre: "日本語の勉強を", jp_post: "。", en: "I ___ studying Japanese." },
  },
];

/** First N verbs that are unlocked at session start */
export const INITIAL_UNLOCK_COUNT = 5;

/**
 * How many verbs to unlock when mastery threshold is met.
 * A "verb" is considered mastered when the average star across its polite
 * forms is >= VERB_MASTERY_THRESHOLD.
 */
export const VERB_MASTERY_THRESHOLD = 5;
export const UNLOCK_BATCH_SIZE = 3;
