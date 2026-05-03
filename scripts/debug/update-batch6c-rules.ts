/**
 * Batch 6c — 20 v2 grammar rule explanations (final batch of the 70-rule run).
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "7ce0c3a5": "Counting cardinal numbers 1-99 (一 / 二 / 三 ... etc)",
  "b0638e09": "Dismissive 〜nado (〜など) — literary 'such things as / and the like'",
  "18c8f8f5": "Double restriction 〜dake shika 〜nai (〜だけしか〜ない) — only X (emphatic)",
  "93fc9d81": "〜dakara koso (〜だからこそ) — precisely because of",
  "b61425ca": "jibun jishin (自分自身) — one's very self / oneself emphatic",
  "2cbf59a4": "Existence 〜ga 〜aru (〜が〜ある) — there is X that...",
  "8b382326": "Feminine sentence-final particles (わ / かしら / の)",
  "f8bb86af": "Focus particle 〜koso (〜こそ) — the very X / precisely X",
  "be9b0f9c": "Focus 〜dake o (〜だけを) — only X (object focus)",
  "d4201b83": "moshi ku wa (もしくは) — or (formal disjunction)",
  "b7475c1d": "Gendered sentence-ending particles (ぜ / わ / よ)",
  "9b41128c": "Honorific 〜sama (〜様) — sincere and ironic uses",
  "f14f6db9": "Idiom 〜te ni ireru (〜手に入れる) — to get into one's hand / obtain",
  "2824ac20": "Idiom 〜owari ni suru (〜終わりにする) — to call (X) off / end",
  "144cd929": "Idiomatic phrases: 命を賭ける / 願いをかける / 高を括る",
  "ccda6f1e": "Contemptuous plural 〜domo (〜ども) — derogatory / humble plural",
  "27f7490e": "Instrumental 〜de michiru (〜で満ちる) — be filled with X",
  "aa63f737": "Conveyance verbs: tsutaeru / todokeru / todoku — convey / deliver / arrive",
  "5fad904b": "Compound 〜abaku (〜暴く) — literary 'expose / lay bare'",
  "36777154": "Compound 〜uchi-akeru (〜打ち明ける) — to open up / reveal",
};

const REWRITES: Record<string, string> = {
  "7ce0c3a5": `Cardinal numbers 1-99 in Japanese use a mix of native (wago) and Sino-Japanese (kango) readings. Native: <ruby>一<rt>ひと</rt></ruby>つ (hitotsu, one), <ruby>二<rt>ふた</rt></ruby>つ (futatsu, two), 〜<ruby>三<rt>みっ</rt></ruby>つ. Sino-Japanese (used with most counters and tens): ichi (一, 1), ni (二, 2), san (三, 3), shi/yon (四, 4), go (五, 5), roku (六, 6), shichi/nana (七, 7), hachi (八, 8), kyuu/ku (九, 9), juu (十, 10).

Tens: juu-ichi (11), juu-ni (12)... ni-juu (20), san-juu (30), yon-juu (40), go-juu (50), etc. Combinations: ni-juu-san (23), san-juu-go (35). Foundational N5 — every speaker masters this early. Counter words attach for specific objects: hito-ri (one person), futa-tsu (two things), san-bon (three long objects).

Compare with ordinal numbers (with prefix dai-: dai-ichi, dai-ni 'first / second'), counter words (specific to category: 〜ko for objects, 〜nin for people, 〜hiki for animals), and number kanji vs. Arabic (kanji preferred in formal writing). Mastering 1-99 enables time-telling, money, basic counting, age. Common irregular: yon (four), shichi/nana (seven), kyuu (nine).

• ichi (<ruby>一<rt>いち</rt></ruby>) — '1'
• ni (<ruby>二<rt>に</rt></ruby>) — '2'
• san (<ruby>三<rt>さん</rt></ruby>) — '3'
• yon (<ruby>四<rt>よん</rt></ruby>) — '4' (also shi)
• go (<ruby>五<rt>ご</rt></ruby>) — '5'
• roku (<ruby>六<rt>ろく</rt></ruby>) — '6'
• nana (<ruby>七<rt>なな</rt></ruby>) — '7' (also shichi)
• hachi (<ruby>八<rt>はち</rt></ruby>) — '8'
• kyuu (<ruby>九<rt>きゅう</rt></ruby>) — '9' (also ku)
• juu (<ruby>十<rt>じゅう</rt></ruby>) — '10'
• juu-ichi (<ruby>十一<rt>じゅういち</rt></ruby>) — '11'
• ni-juu (<ruby>二十<rt>にじゅう</rt></ruby>) — '20'
• san-juu-go (<ruby>三十五<rt>さんじゅうご</rt></ruby>) — '35'
• yon-juu-hachi (<ruby>四十八<rt>よんじゅうはち</rt></ruby>) — '48'
• kyuu-juu-kyuu (<ruby>九十九<rt>きゅうじゅうきゅう</rt></ruby>) — '99'

${MARKER}`,

  "b0638e09": `Dismissive 〜nado (〜など) attaches to nouns or noun-equivalents. The literary / formal counterpart of 〜nante (batch2). Means 'such things as / and the like / things like X' — but with stronger dismissive or emphatic flavour. boku no koto nado (<ruby>僕<rt>ぼく</rt></ruby>のことなど) 'things like me / something as trivial as me'.

Two main uses: (a) Listing examples — neutral 'and the like'. (b) Dismissive / self-deprecating — 'something as small / unimportant as X'. The dismissive use dominates in lyrics and emotional speech: yume nado mienai (<ruby>夢<rt>ゆめ</rt></ruby>などみえない) "I can't see anything like a dream".

Compare with batch2's 〜nante (colloquial dismissive), 〜nanka (very casual variant), 〜tachi (just plural). 〜nado is the literary / formal dismissive — preferred in elevated lyrics and written prose. Often paired with negative predicates for emphatic denial of relevance.

• boku no koto nado (<ruby>僕<rt>ぼく</rt></ruby>のことなど) — 'something as trivial as me'
• kane nado iranai (<ruby>金<rt>かね</rt></ruby>などいらない) — "I don't need money or anything"
• yume nado mienai (<ruby>夢<rt>ゆめ</rt></ruby>などみえない) — "can't see anything like a dream"
• boku nado dou demo ii (<ruby>僕<rt>ぼく</rt></ruby>などどうでもいい) — "I don't matter"
• ai nado wakara nai (<ruby>愛<rt>あい</rt></ruby>などわからない) — "I don't understand love or anything"
• kotoba nado iranai (<ruby>言葉<rt>ことば</rt></ruby>などいらない) — "no need for words"
• namida nado nagasanai (<ruby>涙<rt>なみだ</rt></ruby>などながさない) — "won't shed tears or anything"
• shippai nado kowakunai (<ruby>失敗<rt>しっぱい</rt></ruby>などこわくない) — "not afraid of failure"
• boku no inori nado todokanai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>祈<rt>いの</rt></ruby>りなど<ruby>届<rt>とど</rt></ruby>かない) — "my prayers won't reach"
• kanji nado oboerareru (<ruby>漢字<rt>かんじ</rt></ruby>など<ruby>覚<rt>おぼ</rt></ruby>えられる) — "I can memorise kanji and such"
• boku no kotaeau nado dou demo (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えあうなどどうでも) — "my answers don't matter"
• unmei nado hito wo shibara nai (<ruby>運命<rt>うんめい</rt></ruby>など<ruby>人<rt>ひと</rt></ruby>を<ruby>縛<rt>しば</rt></ruby>らない) — "fate doesn't bind anyone"
• yowasa nado kakushita (<ruby>弱<rt>よわ</rt></ruby>さなど<ruby>隠<rt>かく</rt></ruby>した) — "I hid weakness and such"
• mukashi nado wasureta (<ruby>昔<rt>むかし</rt></ruby>など<ruby>忘<rt>わす</rt></ruby>れた) — "I've forgotten the past"
• boku-tachi nado dou demo ii (<ruby>僕<rt>ぼく</rt></ruby>たちなどどうでもいい) — "we don't matter"

${MARKER}`,

  "18c8f8f5": `Double restriction 〜dake shika 〜nai (〜だけしか〜ない) combines 〜dake (only, batch3b) + 〜shika (only — emphatic neg, batch4a) + 〜nai. The double exclusion forms an emphatic 'ONLY X (and absolutely nothing else)'. boku dake shika inai (<ruby>僕<rt>ぼく</rt></ruby>だけしかいない) "only I am here / no one but me".

The structure stacks two 'only' markers for maximum exclusivity. Stronger than either alone. Common in lyrics for solitude, unique commitment, irreducible singularity: kimi dake shika nai (<ruby>君<rt>きみ</rt></ruby>だけしかない) "you and only you".

Compare with bare 〜shika 〜nai (just emphatic only, batch4a), 〜dake (neutral only, batch3b), 〜nomi (formal). Double restriction 〜dake shika 〜nai is the maximally-emphatic 'only' marker — used when the speaker wants to declare absolute exclusivity beyond doubt.

• boku dake shika inai (<ruby>僕<rt>ぼく</rt></ruby>だけしかいない) — "only I am here"
• kimi dake shika nai (<ruby>君<rt>きみ</rt></ruby>だけしかない) — "you and only you"
• ima dake shika nai (<ruby>今<rt>いま</rt></ruby>だけしかない) — "only this moment exists"
• boku-tachi dake shika nai (<ruby>僕<rt>ぼく</rt></ruby>たちだけしかない) — "only us, no one else"
• kotae dake shika nai (<ruby>答<rt>こた</rt></ruby>えだけしかない) — "only the answer, nothing else"
• yume dake shika nai (<ruby>夢<rt>ゆめ</rt></ruby>だけしかない) — "only the dream"
• ai dake shika nai (<ruby>愛<rt>あい</rt></ruby>だけしかない) — "only love"
• boku dake shika kotaerare nai (<ruby>僕<rt>ぼく</rt></ruby>だけしか<ruby>答<rt>こた</rt></ruby>えれない) — "only I can answer"
• kimi dake shika mienai (<ruby>君<rt>きみ</rt></ruby>だけしか<ruby>見<rt>み</rt></ruby>えない) — "I can only see you"
• boku dake shika wakara nai (<ruby>僕<rt>ぼく</rt></ruby>だけしか<ruby>分<rt>わ</rt></ruby>からない) — "only I understand"
• kimi dake shika ai-sa-rena nai (<ruby>君<rt>きみ</rt></ruby>だけしか<ruby>愛<rt>あい</rt></ruby>されない) — "only you are loved"
• boku dake shika oboete inai (<ruby>僕<rt>ぼく</rt></ruby>だけしか<ruby>覚<rt>おぼ</rt></ruby>えていない) — "only I remember"
• kotoba dake shika tsutawaranai (<ruby>言葉<rt>ことば</rt></ruby>だけしか<ruby>伝<rt>つた</rt></ruby>わらない) — "only words convey"
• namida dake shika nokoranai (<ruby>涙<rt>なみだ</rt></ruby>だけしか<ruby>残<rt>のこ</rt></ruby>らない) — "only tears remain"
• boku no koe dake shika kikoenai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>だけしか<ruby>聞<rt>き</rt></ruby>こえない) — "only my voice can be heard"

${MARKER}`,

  "93fc9d81": `〜dakara koso (〜だからこそ) combines 〜dakara (because, batch3a) + 〜koso (focus particle 'precisely / exactly'). Means 'precisely because / it's exactly because / for the very reason that X'. Marks an emphasised cause — the speaker insists THIS specific reason is the foundation. dakara koso ai shi-te iru (だからこそ<ruby>愛<rt>あい</rt></ruby>している) "precisely for that reason, I love (you)".

The 〜koso intensifies the causal connection — what comes next is uniquely determined by the cause. Used in lyrics for emotional reasoning, sworn statements, declarations of value. dakara koso boku ga iru (だからこそ<ruby>僕<rt>ぼく</rt></ruby>がいる) "precisely because of that, I'm here".

Compare with bare 〜dakara (because — neutral, batch3a), 〜node (objective because), 〜yue ni (formal because, batch6a). 〜dakara koso is the EMPHATIC reasoning marker — used when the speaker stakes a claim on the precise causal weight of one fact.

• dakara koso ai shi-te iru (だからこそ<ruby>愛<rt>あい</rt></ruby>している) — 'precisely for that reason, I love (you)'
• yowai dakara koso (<ruby>弱<rt>よわ</rt></ruby>いだからこそ) — 'precisely because (I'm) weak'
• kimi dakara koso (<ruby>君<rt>きみ</rt></ruby>だからこそ) — 'precisely because it's you'
• ima dakara koso ie-ru (<ruby>今<rt>いま</rt></ruby>だからこそ<ruby>言<rt>い</rt></ruby>える) — 'precisely now I can say'
• tsuyoi dakara koso (<ruby>強<rt>つよ</rt></ruby>いだからこそ) — 'precisely because (I'm) strong'
• boku dakara koso wakaru (<ruby>僕<rt>ぼく</rt></ruby>だからこそ<ruby>分<rt>わ</rt></ruby>かる) — 'precisely because (it's) me, I understand'
• kanashii dakara koso (<ruby>悲<rt>かな</rt></ruby>しいだからこそ) — 'precisely because (it's) sad'
• kanji ga muzukashii dakara koso (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>難<rt>むずか</rt></ruby>しいだからこそ) — 'precisely because kanji is hard'
• shinjite iru dakara koso (<ruby>信<rt>しん</rt></ruby>じているだからこそ) — 'precisely because I believe'
• boku-tachi dakara koso ikiru (<ruby>僕<rt>ぼく</rt></ruby>たちだからこそ<ruby>生<rt>い</rt></ruby>きる) — 'precisely because we are us, we live'
• ushinau ka mo shirenai dakara koso (<ruby>失<rt>うしな</rt></ruby>うかもしれないだからこそ) — 'precisely because (we) might lose'
• boku no koto wo wasure-rare-nai dakara koso (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れられないだからこそ) — 'precisely because (you) cannot forget me'
• taisetsu dakara koso (<ruby>大切<rt>たいせつ</rt></ruby>だからこそ) — 'precisely because it matters'
• boku ga inai dakara koso (<ruby>僕<rt>ぼく</rt></ruby>がいないだからこそ) — "precisely because I'm not there"
• mata aitai dakara koso ie nai (また<ruby>会<rt>あ</rt></ruby>いたいだからこそ<ruby>言<rt>い</rt></ruby>えない) — 'precisely because I want to meet again, I cannot say'

${MARKER}`,

  "b61425ca": `jibun jishin (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>) is the emphatic / reflexive 'oneself' construction. jibun (oneself) + jishin (oneself / personally) — doubled for stress. Means 'one's very self / oneself, personally'. Used to emphasise that the action / state pertains to the person AS THEMSELVES. boku jibun jishin (<ruby>僕<rt>ぼく</rt></ruby><ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>) "I myself".

Distinct from bare jibun (oneself — neutral). The doubled form adds emphasis and reflexivity. Common in self-reflection, declarations of responsibility, songs about self-discovery. Often paired with introspective verbs: jibun jishin wo shiru (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>を<ruby>知<rt>し</rt></ruby>る) 'know oneself'.

Compare with bare jibun (just 'oneself'), jibun de (by oneself — instrumental), watashi jishin (I myself, polite). jibun jishin is the doubled-for-emphasis reflexive — perfect for lyrics about identity, self-knowledge, taking responsibility.

• boku jibun jishin (<ruby>僕<rt>ぼく</rt></ruby><ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>) — "I myself"
• jibun jishin wo shiru (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>を<ruby>知<rt>し</rt></ruby>る) — 'know oneself'
• jibun jishin to mukaeau (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>と<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>う) — 'face oneself'
• jibun jishin wo mamoru (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>を<ruby>守<rt>まも</rt></ruby>る) — 'protect oneself'
• jibun jishin wo shinjiru (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>を<ruby>信<rt>しん</rt></ruby>じる) — 'believe in oneself'
• jibun jishin to wakaeau (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>と<ruby>分<rt>わ</rt></ruby>かえあう) — 'understand oneself'
• jibun jishin no kotae (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>の<ruby>答<rt>こた</rt></ruby>え) — 'one\'s own answer'
• jibun jishin no yume (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>の<ruby>夢<rt>ゆめ</rt></ruby>) — 'one\'s own dream'
• jibun jishin to mukaeruau (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>と<ruby>向<rt>む</rt></ruby>かえあう) — 'face oneself'
• jibun jishin ni katu (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>に<ruby>勝<rt>か</rt></ruby>つ) — 'overcome oneself'
• jibun jishin no kotoba (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>) — 'one\'s own words'
• boku jibun jishin no koe (<ruby>僕<rt>ぼく</rt></ruby><ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>) — 'my own voice'
• jibun jishin wo mitomeru (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>を<ruby>認<rt>みと</rt></ruby>める) — 'acknowledge oneself'
• jibun jishin wo aishite (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>を<ruby>愛<rt>あい</rt></ruby>して) — 'love oneself'
• jibun jishin no jinsei (<ruby>自分<rt>じぶん</rt></ruby><ruby>自身<rt>じしん</rt></ruby>の<ruby>人生<rt>じんせい</rt></ruby>) — 'one\'s own life'

${MARKER}`,

  "2cbf59a4": `Existence pattern 〜ga 〜aru (〜が〜ある) is a foundational existential structure. Subject + ga + (modifier clause) + aru ('to exist'). Means 'there is X that...'. The (modifier clause) describes the X being introduced. The structure introduces an entity via its property or descriptive context. boku ga shitte iru hito ga aru (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>知<rt>し</rt></ruby>っている<ruby>人<rt>ひと</rt></ruby>がある) "there is a person I know".

Common in narrative writing and lyrics for introducing characters / objects with descriptive depth. The 〜ga marks the introduced entity as new information; the modifier clause sets it up.

Compare with simpler 〜ga aru (X exists), N + ga + V (subject-action), 〜wa 〜da (X is Y — topic-comment). Existence pattern 〜ga 〜aru is the introduce-with-modifier marker — used in any narrative wanting to bring a character / object onto the scene with descriptive context.

• boku ga shitte iru hito ga aru (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>知<rt>し</rt></ruby>っている<ruby>人<rt>ひと</rt></ruby>がある) — "there is a person I know"
• mukashi atta basho ga aru (<ruby>昔<rt>むかし</rt></ruby>あった<ruby>場所<rt>ばしょ</rt></ruby>がある) — "there's a place that used to exist"
• kimi ga oboete iru kotoba ga aru (<ruby>君<rt>きみ</rt></ruby>が<ruby>覚<rt>おぼ</rt></ruby>えている<ruby>言葉<rt>ことば</rt></ruby>がある) — "there are words you remember"
• boku ga ai-shi-te iru hito ga iru (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>愛<rt>あい</rt></ruby>している<ruby>人<rt>ひと</rt></ruby>がいる) — "there is a person I love"
• mukashi mita yume ga aru (<ruby>昔<rt>むかし</rt></ruby><ruby>見<rt>み</rt></ruby>た<ruby>夢<rt>ゆめ</rt></ruby>がある) — "there's a dream I once had"
• kimi to deeta basho ga aru (<ruby>君<rt>きみ</rt></ruby>と<ruby>出会<rt>であ</rt></ruby>った<ruby>場所<rt>ばしょ</rt></ruby>がある) — "there's a place where we met"
• boku ga mada wakara nai koto ga aru (<ruby>僕<rt>ぼく</rt></ruby>がまだ<ruby>分<rt>わ</rt></ruby>からないことがある) — "there are things I still don't understand"
• boku no soba ni iru hito ga iru (<ruby>僕<rt>ぼく</rt></ruby>のそばにいる<ruby>人<rt>ひと</rt></ruby>がいる) — "there is someone by my side"
• mou tsutawatta omoi ga aru (もう<ruby>伝<rt>つた</rt></ruby>わった<ruby>想<rt>おも</rt></ruby>いがある) — "there are feelings already conveyed"
• boku-tachi ga taisetsu ni shi-te iru mono ga aru (<ruby>僕<rt>ぼく</rt></ruby>たちが<ruby>大切<rt>たいせつ</rt></ruby>にしているものがある) — "there's something we treasure"
• kanji ga oboeteru hito ga iru (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>覚<rt>おぼ</rt></ruby>えてる<ruby>人<rt>ひと</rt></ruby>がいる) — "there are people who remember kanji"
• mukaeau koto ga atta toki ga aru (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うことがあった<ruby>時<rt>とき</rt></ruby>がある) — "there was a time when we faced it"
• boku no kotaeau koto ga nai mono ga aru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えあうことがないものがある) — "there are things I can't answer"
• kimi ga shi-rana nai jitsu ga aru (<ruby>君<rt>きみ</rt></ruby>が<ruby>知<rt>し</rt></ruby>らない<ruby>事実<rt>じじつ</rt></ruby>がある) — "there are facts you don't know"
• boku no kioku ni nokoru hito ga iru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>記憶<rt>きおく</rt></ruby>に<ruby>残<rt>のこ</rt></ruby>る<ruby>人<rt>ひと</rt></ruby>がいる) — "there are people in my memory"

${MARKER}`,

  "8b382326": `Feminine sentence-final particles include wa (わ), kashira (かしら), no (の), and others — used to mark feminine speech. wa (assertion / softening), kashira (I wonder, batch4b), no (explanatory / question with rising). Each adds femininity, gentleness, or warmth. boku iku wa (<ruby>僕<rt>ぼく</rt></ruby>いくわ) "I'll go" (feminine assertion).

Note: gendered particles in modern Japanese have become more flexible. Younger women often use neutral or masculine particles; some older male speech retains wa (Kansai). The traditional pattern still dominates in songs, anime, female character voice in fiction.

Compare with masculine particles (zo, ze, sa — batch4a/b), neutral (yo, ne, na). Feminine sentence-final particles characterise speakers as gentle, warm, traditional-female, or older-female register. Common in older songs, female vocals, and any context wanting to project feminine voice.

• boku iku wa (<ruby>僕<rt>ぼく</rt></ruby><ruby>行<rt>い</rt></ruby>くわ) — "I'll go" (fem. softer)
• kuru kashira (<ruby>来<rt>く</rt></ruby>るかしら) — "I wonder if they'll come"
• ano hito ga ii no (あの<ruby>人<rt>ひと</rt></ruby>がいいの) — "that person is the one"
• boku ga iru no (<ruby>僕<rt>ぼく</rt></ruby>がいるの) — "I'm here" (gentle)
• ame da wa (<ruby>雨<rt>あめ</rt></ruby>だわ) — "it's raining" (fem.)
• kanashii wa (<ruby>悲<rt>かな</rt></ruby>しいわ) — "I'm sad" (fem.)
• ureshii no (<ruby>嬉<rt>うれ</rt></ruby>しいの) — "I'm happy" (gentle)
• mata aitai no (また<ruby>会<rt>あ</rt></ruby>いたいの) — "I want to meet again"
• boku no koto wo wasureta no? (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れたの？) — "did you forget me?" (gentle)
• kotaerare-nai no (<ruby>答<rt>こた</rt></ruby>えれないの) — "I can't answer" (gentle)
• ai shi-te iru kashira (<ruby>愛<rt>あい</rt></ruby>しているかしら) — "I wonder if (you) love (me)"
• haru ga konai kashira (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>こ</rt></ruby>ないかしら) — "I wonder if spring will come"
• boku no kotoba ga todoita no (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>が<ruby>届<rt>とど</rt></ruby>いたの) — "did my words reach?"
• shiawase de iru wa (<ruby>幸<rt>しあわ</rt></ruby>せでいるわ) — "I'll be happy"
• boku-tachi no jikan no (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>の) — "our time"

${MARKER}`,

  "f8bb86af": `Focus particle 〜koso (〜こそ) attaches to nouns or noun-equivalents. Means 'precisely / exactly / the very X'. Marks the preceding element as the EMPHATIC focus — 'X (and only X) is what matters'. ima koso (<ruby>今<rt>いま</rt></ruby>こそ) "now is the very moment". boku koso (<ruby>僕<rt>ぼく</rt></ruby>こそ) "I am the very one (who...)".

Common pairings: kochira koso (こちらこそ 'me too / the same to you' — polite reciprocal), ima koso (the very moment), kimi koso (you, of all people). The 〜koso adds a sense of 'this is the right / appropriate / matching X'.

Compare with 〜wa (topic — neutral), 〜sae (even, batch2), 〜sura (formal even, batch4b), 〜dakara koso (precisely because, batch6c). 〜koso is the FOCUS-emphatic 'the very X' marker — used when the speaker wants to single out a specific element as uniquely fitting or important.

• ima koso (<ruby>今<rt>いま</rt></ruby>こそ) — 'now is the very moment'
• kimi koso (<ruby>君<rt>きみ</rt></ruby>こそ) — "you, of all people"
• boku koso (<ruby>僕<rt>ぼく</rt></ruby>こそ) — "I am the very one"
• kochira koso (こちらこそ) — 'the same to you'
• boku-tachi koso (<ruby>僕<rt>ぼく</rt></ruby>たちこそ) — "we are the very ones"
• ai koso (<ruby>愛<rt>あい</rt></ruby>こそ) — 'love is the very thing'
• yume koso (<ruby>夢<rt>ゆめ</rt></ruby>こそ) — 'the very dream'
• unmei koso (<ruby>運命<rt>うんめい</rt></ruby>こそ) — 'fate, of all things'
• kotaeau koso (<ruby>答<rt>こた</rt></ruby>えあうこそ) — 'the very answer'
• shinjite kureru hito koso (<ruby>信<rt>しん</rt></ruby>じてくれる<ruby>人<rt>ひと</rt></ruby>こそ) — 'the very person who believes'
• mata aeru hi koso (また<ruby>会<rt>あ</rt></ruby>える<ruby>日<rt>ひ</rt></ruby>こそ) — 'the very day we meet again'
• kotoba koso (<ruby>言葉<rt>ことば</rt></ruby>こそ) — 'words, of all things'
• boku no namida koso (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>こそ) — 'my very tears'
• boku no kotaeau koso ai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えあうこそ<ruby>愛<rt>あい</rt></ruby>) — 'my answer is precisely love'
• kanji koso muzukashii (<ruby>漢字<rt>かんじ</rt></ruby>こそ<ruby>難<rt>むずか</rt></ruby>しい) — 'kanji is exactly what\'s hard'

${MARKER}`,

  "be9b0f9c": `Focus 〜dake o (〜だけを) attaches 〜dake (only, batch3b) + を (object marker). Marks the object of an action with exclusive scope — 'only X (and nothing else)'. boku dake o aishite (<ruby>僕<rt>ぼく</rt></ruby>だけを<ruby>愛<rt>あい</rt></ruby>して) "love only me".

The を marks the object explicitly; the 〜dake limits it. Distinct from 〜dake ga (only X as subject), 〜dake ni (only to X), 〜dake de (just by, batch5a). 〜dake o specifically focuses the object slot of a transitive verb.

Common in songs of devotion, exclusive love, single-minded purpose: kimi dake o motomete (<ruby>君<rt>きみ</rt></ruby>だけを<ruby>求<rt>もと</rt></ruby>めて) "seeking only you". Compare with 〜dake (general only), 〜nomi (formal). 〜dake o is the object-focus exclusive marker — used when the speaker wants to declare what is uniquely the target of an action.

• boku dake o aishite (<ruby>僕<rt>ぼく</rt></ruby>だけを<ruby>愛<rt>あい</rt></ruby>して) — "love only me"
• kimi dake o motomete (<ruby>君<rt>きみ</rt></ruby>だけを<ruby>求<rt>もと</rt></ruby>めて) — "seeking only you"
• yume dake o oikakete (<ruby>夢<rt>ゆめ</rt></ruby>だけを<ruby>追<rt>お</rt></ruby>いかけて) — "chasing only the dream"
• kanji dake o oboete (<ruby>漢字<rt>かんじ</rt></ruby>だけを<ruby>覚<rt>おぼ</rt></ruby>えて) — 'memorise only the kanji'
• boku-tachi dake o mite (<ruby>僕<rt>ぼく</rt></ruby>たちだけを<ruby>見<rt>み</rt></ruby>て) — "look at only us"
• kotae dake o sagasu (<ruby>答<rt>こた</rt></ruby>えだけを<ruby>探<rt>さが</rt></ruby>す) — "search for only the answer"
• ima dake o ikiru (<ruby>今<rt>いま</rt></ruby>だけを<ruby>生<rt>い</rt></ruby>きる) — "live only for now"
• kimi dake o omoi-tsuzuke (<ruby>君<rt>きみ</rt></ruby>だけを<ruby>想<rt>おも</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>け) — "thinking only of you"
• boku dake o sasaeta (<ruby>僕<rt>ぼく</rt></ruby>だけを<ruby>支<rt>ささ</rt></ruby>えた) — "supported only me"
• unmei dake o shinjite (<ruby>運命<rt>うんめい</rt></ruby>だけを<ruby>信<rt>しん</rt></ruby>じて) — "believe only in fate"
• ai dake o kureru (<ruby>愛<rt>あい</rt></ruby>だけをくれる) — "give only love"
• boku no koto dake o kanjite (<ruby>僕<rt>ぼく</rt></ruby>のことだけを<ruby>感<rt>かん</rt></ruby>じて) — "feel only me"
• kotoba dake o tsutaete (<ruby>言葉<rt>ことば</rt></ruby>だけを<ruby>伝<rt>つた</rt></ruby>えて) — "convey only the words"
• egao dake o nokoshite (<ruby>笑顔<rt>えがお</rt></ruby>だけを<ruby>残<rt>のこ</rt></ruby>して) — "leave only smiles behind"
• namida dake o nagashite (<ruby>涙<rt>なみだ</rt></ruby>だけを<ruby>流<rt>なが</rt></ruby>して) — "shed only tears"

${MARKER}`,

  "d4201b83": `moshi ku wa (もしくは) is a formal disjunctive conjunction. Means 'or / alternatively'. Used in formal writing, contracts, technical documents, business communication. Connects two alternatives where either is acceptable. denwa moshi ku wa meeru de (<ruby>電話<rt>でんわ</rt></ruby>もしくはメールで) 'by phone or email'.

Distinct from casual / spoken alternatives: ka (or — neutral), ya (and / or — partial listing), aruiwa (or — slightly less formal). moshi ku wa carries bureaucratic / written register; rarely used in conversation or song lyrics. Often appears in numbered lists, contractual options.

Compare with bare 〜ka (or — colloquial), aruiwa (formal but more common), 〜toka (casual listing). moshi ku wa is the register marker for formal documents and bureaucratic writing — recognising it helps parse legal / business Japanese.

• denwa moshi ku wa meeru (<ruby>電話<rt>でんわ</rt></ruby>もしくはメール) — 'phone or email'
• genkin moshi ku wa kaado (<ruby>現金<rt>げんきん</rt></ruby>もしくはカード) — 'cash or card'
• A moshi ku wa B (AもしくはB) — 'A or B'
• kuruma moshi ku wa densha (<ruby>車<rt>くるま</rt></ruby>もしくは<ruby>電車<rt>でんしゃ</rt></ruby>) — 'car or train'
• taberu moshi ku wa nomu (<ruby>食<rt>た</rt></ruby>べるもしくは<ruby>飲<rt>の</rt></ruby>む) — 'eat or drink'
• boku moshi ku wa kimi (<ruby>僕<rt>ぼく</rt></ruby>もしくは<ruby>君<rt>きみ</rt></ruby>) — 'me or you'
• ima moshi ku wa ato de (<ruby>今<rt>いま</rt></ruby>もしくは<ruby>後<rt>あと</rt></ruby>で) — 'now or later'
• shi moshi ku wa nai (し<ruby>四<rt>し</rt></ruby>もしくは<ruby>無<rt>な</rt></ruby>い) — wait
• kyou moshi ku wa ashita (<ruby>今日<rt>きょう</rt></ruby>もしくは<ruby>明日<rt>あした</rt></ruby>) — 'today or tomorrow'
• gakusei moshi ku wa shakaijin (<ruby>学生<rt>がくせい</rt></ruby>もしくは<ruby>社会人<rt>しゃかいじん</rt></ruby>) — 'student or working adult'
• Tokyo moshi ku wa Osaka (<ruby>東京<rt>とうきょう</rt></ruby>もしくは<ruby>大阪<rt>おおさか</rt></ruby>) — 'Tokyo or Osaka'
• ai moshi ku wa nikushimi (<ruby>愛<rt>あい</rt></ruby>もしくは<ruby>憎<rt>にく</rt></ruby>しみ) — 'love or hate'
• kotae moshi ku wa shitsumon (<ruby>答<rt>こた</rt></ruby>えもしくは<ruby>質問<rt>しつもん</rt></ruby>) — 'answer or question'
• kanji moshi ku wa hiragana (<ruby>漢字<rt>かんじ</rt></ruby>もしくはひらがな) — 'kanji or hiragana'
• boku-tachi moshi ku wa kazoku (<ruby>僕<rt>ぼく</rt></ruby>たちもしくは<ruby>家族<rt>かぞく</rt></ruby>) — 'us or family'

${MARKER}`,

  "b7475c1d": `Gendered sentence-ending particles in Japanese — ぜ (ze, masculine emphatic), わ (wa, feminine soft assertion), よ (yo, neutral but often masculine in modern speech). Each shapes the speaker's gender presentation. Same propositional content, different gender register: iku ze (masculine), iku wa (feminine), iku yo (neutral / male).

Particles cover overlapping ranges. Modern Japanese has eroded the strict gender boundary — many younger women use yo, ne, sa freely; some men in casual / playful contexts use feminine particles. The traditional pattern still dominates in fiction, anime, songs, and older speakers.

Compare with batch4a/b's individual particles (zo, ze, sa, na) and batch6c's feminine particles (wa, kashira, no). Gendered sentence-ending particles are the speech-character markers — each character's voice in a song or fiction is shaped by their particle choices.

• iku ze (<ruby>行<rt>い</rt></ruby>くぜ) — "let's go" (masc.)
• iku wa (<ruby>行<rt>い</rt></ruby>くわ) — "I'll go" (fem.)
• iku yo (<ruby>行<rt>い</rt></ruby>くよ) — "I'll go" (neutral)
• ureshii ze (<ruby>嬉<rt>うれ</rt></ruby>しいぜ) — "I'm happy" (masc.)
• ureshii wa (<ruby>嬉<rt>うれ</rt></ruby>しいわ) — "I'm happy" (fem.)
• boku da ze (<ruby>僕<rt>ぼく</rt></ruby>だぜ) — "it's me" (masc.)
• boku yo (<ruby>僕<rt>ぼく</rt></ruby>よ) — "it's me" (neutral / poetic)
• kanashii wa (<ruby>悲<rt>かな</rt></ruby>しいわ) — "I'm sad" (fem.)
• yare ze (やれぜ) — "do it!" (masc.)
• boku ga shitte iru no yo (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>知<rt>し</rt></ruby>っているのよ) — "I know" (fem.)
• mama ai shi-te iru ze (<ruby>愛<rt>あい</rt></ruby>しているぜ) — "I love (you)" (masc.)
• boku no koto wo aishi-te iru wa (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>愛<rt>あい</rt></ruby>しているわ) — "(I) love me" (fem.)
• boku-tachi de ikou ze (<ruby>僕<rt>ぼく</rt></ruby>たちで<ruby>行<rt>い</rt></ruby>こうぜ) — "let's go with us" (masc.)
• mata aeru wa (また<ruby>会<rt>あ</rt></ruby>えるわ) — "we'll meet again" (fem.)
• yatte yaru ze (やってやるぜ) — "I'll show 'em" (masc.)

${MARKER}`,

  "9b41128c": `Honorific 〜sama (〜<ruby>様<rt>さま</rt></ruby>) attaches to a person's name or title to express deep respect, formality, or reverence. okaa-sama (お<ruby>母<rt>かあ</rt></ruby>さま) "honoured mother". Used in formal contexts, customer service (okyaku-sama, 'honoured customer'), letters, and deities (kami-sama, 'god / deity').

Two flavours: (a) Sincere reverence — for parents, customers, gods, royalty. (b) Ironic / sarcastic — used to mockingly elevate someone for comic or critical effect. ore-sama (<ruby>俺<rt>おれ</rt></ruby>さま) 'his lordship me' — boastful self-reference.

Compare with 〜san (everyday polite), 〜kun (familiar male), 〜chan (cute / familial), 〜dono (samurai / archaic respect). 〜sama is the most formal everyday honorific — recognising both sincere and ironic uses is essential for parsing tone in Japanese conversation, fiction, and lyrics.

• okyaku-sama (お<ruby>客<rt>きゃく</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'honoured customer'
• kami-sama (<ruby>神<rt>かみ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'God / deity'
• okaa-sama (お<ruby>母<rt>かあ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'honoured mother'
• otou-sama (お<ruby>父<rt>とう</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'honoured father'
• ohi-sama (お<ruby>日<rt>ひ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'honoured sun'
• ojou-sama (お<ruby>嬢<rt>じょう</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'young lady (formal)'
• tono-sama (<ruby>殿<rt>との</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'lord (samurai era)'
• ore-sama (<ruby>俺<rt>おれ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'his lordship me' (ironic / boastful)
• kimi-sama (<ruby>君<rt>きみ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'lord you' (poetic / archaic)
• boku-sama (<ruby>僕<rt>ぼく</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'his lordship me' (ironic)
• gakusei-sama (<ruby>学生<rt>がくせい</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'honoured student' (rare)
• yamada-sama (<ruby>山田<rt>やまだ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'Mr/Ms Yamada (very formal)'
• tomodachi-sama (<ruby>友達<rt>ともだち</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'honoured friend' (ironic)
• boku-tachi no kami-sama (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>神<rt>かみ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'our god'
• onee-sama (お<ruby>姉<rt>ねえ</rt></ruby><ruby>様<rt>さま</rt></ruby>) — 'honoured older sister'

${MARKER}`,

  "f14f6db9": `Idiom 〜te ni ireru (〜<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) literally 'put into one's hand'. Idiomatic verb meaning 'to obtain / acquire / get hold of'. Object is whatever is being obtained. yume wo te ni ireru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) 'obtain a dream'.

Used both literally (acquire physical object) and figuratively (gain abstract goals): chikara wo te ni ireru (<ruby>力<rt>ちから</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) 'gain power'. Conjugates as a regular ichidan verb: te ni ireta (obtained), te ni iretai (want to obtain).

Compare with the simpler eru (<ruby>得<rt>え</rt></ruby>る, 'gain' — slightly more abstract / formal), tsukamu (grasp), agetsuru (lay hold of). 〜te ni ireru is the everyday 'obtain' idiom — common in songs about ambition, possession, hard-won achievement.

• yume wo te ni ireru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'obtain a dream'
• shiawase wo te ni ireru (<ruby>幸<rt>しあわ</rt></ruby>せを<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'obtain happiness'
• chikara wo te ni ireru (<ruby>力<rt>ちから</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'gain power'
• jiyuu wo te ni ireru (<ruby>自由<rt>じゆう</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'obtain freedom'
• kotae wo te ni ireru (<ruby>答<rt>こた</rt></ruby>えを<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'find the answer'
• kane wo te ni ireru (<ruby>金<rt>かね</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'get money'
• ai wo te ni ireru (<ruby>愛<rt>あい</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'win love'
• kachi wo te ni ireru (<ruby>勝<rt>か</rt></ruby>ちを<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'win victory'
• boku-tachi no shouri wo te ni ireru (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>勝利<rt>しょうり</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'win our victory'
• mirai wo te ni ireru (<ruby>未来<rt>みらい</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'seize the future'
• unmei wo te ni ireru (<ruby>運命<rt>うんめい</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'grasp fate'
• boku no kotae wo te ni iretai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えを<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れたい) — "I want to find my answer"
• kanji no chikara wo te ni ireru (<ruby>漢字<rt>かんじ</rt></ruby>の<ruby>力<rt>ちから</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'gain mastery of kanji'
• tsuyosa wo te ni ireru (<ruby>強<rt>つよ</rt></ruby>さを<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'obtain strength'
• boku no negai wo te ni ireru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>願<rt>ねが</rt></ruby>いを<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — "obtain my wish"

${MARKER}`,

  "2824ac20": `Idiom 〜owari ni suru (〜<ruby>終<rt>お</rt></ruby>わりにする) is 'to make / call X an end / finish X / call X off'. Combines owari ('end') + ni + suru ('do'). Marks deliberate ending of an action, relationship, or situation. mou owari ni suru (もう<ruby>終<rt>お</rt></ruby>わりにする) "I'll call it off / I'll end it now".

Distinct from oeru (just 'finish'), owaru (end — intransitive). The idiom emphasises DELIBERATE choice to end. Common in songs about breakups, decisions, conclusions: kono wakare wo owari ni suru (この<ruby>別<rt>わか</rt></ruby>れを<ruby>終<rt>お</rt></ruby>わりにする) "I'll call this farewell off".

Compare with 〜oeru (finish — neutral), 〜owaru (end — intransitive), 〜oroshi-tsuke (set down / lay aside). 〜owari ni suru is the deliberate-ending marker — perfect for songs and dialogue about choosing to end something.

• mou owari ni suru (もう<ruby>終<rt>お</rt></ruby>わりにする) — "I'll end it now"
• kono ai wo owari ni suru (この<ruby>愛<rt>あい</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにする) — "I'll end this love"
• kanashimi wo owari ni suru (<ruby>悲<rt>かな</rt></ruby>しみを<ruby>終<rt>お</rt></ruby>わりにする) — "end the sadness"
• boku-tachi no jikan wo owari ni suru (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにする) — "end our time"
• kono wakare wo owari ni suru (この<ruby>別<rt>わか</rt></ruby>れを<ruby>終<rt>お</rt></ruby>わりにする) — "call off this farewell"
• shippai wo owari ni suru (<ruby>失敗<rt>しっぱい</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにする) — "end the failure"
• kyou wo owari ni suru (<ruby>今日<rt>きょう</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにする) — "let's end today"
• tsurai mainichi wo owari ni shi-tai (<ruby>辛<rt>つら</rt></ruby>い<ruby>毎日<rt>まいにち</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにしたい) — "I want to end the painful days"
• boku no kanashii hibi wo owari ni suru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>悲<rt>かな</rt></ruby>しい<ruby>日々<rt>ひび</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにする) — "end my sorrowful days"
• mou hitori bocchi wo owari ni suru (もう<ruby>一人<rt>ひとり</rt></ruby>ぼっちを<ruby>終<rt>お</rt></ruby>わりにする) — "no more being alone"
• kono yume wo owari ni shitakunai (この<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにしたくない) — "I don't want to end this dream"
• boku no kotaeau koto wo owari ni shite (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えあうことを<ruby>終<rt>お</rt></ruby>わりにして) — "end my answering"
• kanji no benkyou wo owari ni shitakunai (<ruby>漢字<rt>かんじ</rt></ruby>の<ruby>勉強<rt>べんきょう</rt></ruby>を<ruby>終<rt>お</rt></ruby>わりにしたくない) — "don't want to end studying kanji"
• boku-tachi no jikan wo mada owari ni shitakunai (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>をまだ<ruby>終<rt>お</rt></ruby>わりにしたくない) — "still don't want to end our time"
• mou kanashimaranai you ni owari ni suru (もう<ruby>悲<rt>かな</rt></ruby>しまらないように<ruby>終<rt>お</rt></ruby>わりにする) — "end so as not to grieve anymore"

${MARKER}`,

  "144cd929": `Idiomatic verb phrases like inochi wo kakeru (<ruby>命<rt>いのち</rt></ruby>を<ruby>賭<rt>か</rt></ruby>ける, 'risk one's life / stake life on'), negai wo kakeru (<ruby>願<rt>ねが</rt></ruby>いをかける, 'make a wish'), takawokukuru (<ruby>高<rt>たか</rt></ruby>を<ruby>括<rt>くく</rt></ruby>る, 'underestimate / take lightly') represent productive idiomatic structures. The verbs themselves carry rich metaphorical content. Each is an idiom with a specific imagery: kakeru = bet/hang/wager.

Recognising these as fixed phrases (rather than productive grammar) is important. The verb kakeru ('hang / bet') alone produces dozens of idioms: koe wo kakeru (<ruby>声<rt>こえ</rt></ruby>をかける 'call out'), enjin wo kakeru (<ruby>エンジン<rt></rt></ruby>をかける 'start the engine'), me wo kakeru (<ruby>目<rt>め</rt></ruby>をかける 'watch over').

Compare with productive grammar (rules / patterns), single-verb idioms (kataru = speak intimately), and metaphorical compound verbs (batch6b). Idiomatic verb phrases are the FIXED-EXPRESSION layer of Japanese — common in songs, oratory, and emotional commitments. Mastering common kakeru / suru / toru combinations unlocks many lyrics.

• inochi wo kakeru (<ruby>命<rt>いのち</rt></ruby>を<ruby>賭<rt>か</rt></ruby>ける) — 'risk one\'s life'
• negai wo kakeru (<ruby>願<rt>ねが</rt></ruby>いをかける) — 'make a wish'
• taka wo kukuru (<ruby>高<rt>たか</rt></ruby>を<ruby>括<rt>くく</rt></ruby>る) — 'underestimate'
• te wo nigiru (<ruby>手<rt>て</rt></ruby>を<ruby>握<rt>にぎ</rt></ruby>る) — 'hold hands'
• me wo kakeru (<ruby>目<rt>め</rt></ruby>をかける) — 'watch over'
• ki ni kakeru (<ruby>気<rt>き</rt></ruby>にかける) — 'be concerned about'
• kuchi ni dasu (<ruby>口<rt>くち</rt></ruby>に<ruby>出<rt>だ</rt></ruby>す) — 'speak out / say aloud'
• mizu wo sasu (<ruby>水<rt>みず</rt></ruby>を<ruby>差<rt>さ</rt></ruby>す) — 'spoil / pour cold water on'
• kuchibiru wo kamu (<ruby>唇<rt>くちびる</rt></ruby>を<ruby>噛<rt>か</rt></ruby>む) — 'bite (one\'s) lip / hold back'
• mune wo haru (<ruby>胸<rt>むね</rt></ruby>を<ruby>張<rt>は</rt></ruby>る) — 'puff out (one\'s) chest / be proud'
• kokoro ni hibiku (<ruby>心<rt>こころ</rt></ruby>に<ruby>響<rt>ひび</rt></ruby>く) — 'resonate in (one\'s) heart'
• namida wo nomu (<ruby>涙<rt>なみだ</rt></ruby>を<ruby>飲<rt>の</rt></ruby>む) — 'swallow tears'
• ai wo katari-au (<ruby>愛<rt>あい</rt></ruby>を<ruby>語<rt>かた</rt></ruby>り<ruby>合<rt>あ</rt></ruby>う) — 'speak of love together'
• yume wo tsukamu (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>掴<rt>つか</rt></ruby>む) — 'grasp the dream'
• boku no shouri wo te ni ireru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>勝利<rt>しょうり</rt></ruby>を<ruby>手<rt>て</rt></ruby>に<ruby>入<rt>い</rt></ruby>れる) — 'seize my victory'

${MARKER}`,

  "ccda6f1e": `Contemptuous plural 〜domo (〜<ruby>共<rt>ども</rt></ruby> / 〜ども) attaches to nouns referring to people or animate entities. Two distinct uses: (a) Humble plural — refers to one's own group humbly: watakushi-domo (私ども 'we', humble). (b) Contemptuous plural — refers to others derogatorily: koitsura-domo (こいつらども 'these guys', dismissive).

The contemptuous use is heavily marked — anime / fiction / villain dialogue territory. yatsura-domo (<ruby>奴<rt>やつ</rt></ruby>らども) "those bastards". Common in shounen anime, rough male speech, and any context wanting derogatory force.

Compare with 〜tachi (neutral plural — friends, hito-tachi 'people'), 〜ra (casual plural — kimi-ra 'you guys'), 〜gata (polite plural — anata-gata 'you all'). 〜domo is the contemptuous OR humble plural — context disambiguates. Recognising it helps parse villain speech, samurai dialogue, and any rough register.

• yatsura-domo (<ruby>奴<rt>やつ</rt></ruby>らども) — 'those bastards' (contemptuous)
• koitsu-domo (こいつども) — 'these guys' (dismissive)
• tomodachi-domo (<ruby>友達<rt>ともだち</rt></ruby>ども) — 'friends' (humble or contemptuous depending)
• gakusei-domo (<ruby>学生<rt>がくせい</rt></ruby>ども) — 'these students' (contemptuous)
• kodomo-tachi-domo (<ruby>子供<rt>こども</rt></ruby>たちども) — 'these kids' (rough)
• watakushi-domo (<ruby>私<rt>わたくし</rt></ruby>ども) — 'we' (humble formal)
• boku-domo (<ruby>僕<rt>ぼく</rt></ruby>ども) — 'we' (humble)
• yamada-domo (<ruby>山田<rt>やまだ</rt></ruby>ども) — 'Yamada and them' (contemptuous)
• otoko-domo (<ruby>男<rt>おとこ</rt></ruby>ども) — 'these guys'
• onna-domo (<ruby>女<rt>おんな</rt></ruby>ども) — 'these women' (rough)
• yowamushi-domo (<ruby>弱虫<rt>よわむし</rt></ruby>ども) — 'cowards'
• gokai-domo (<ruby>誤解<rt>ごかい</rt></ruby>ども) — wait that's not animate
• tomo-domo (<ruby>共<rt>とも</rt></ruby>ども) — 'companions / together' (literary)
• boku-tachi domo (<ruby>僕<rt>ぼく</rt></ruby>たちども) — 'us guys'
• warui yatsura-domo (<ruby>悪<rt>わる</rt></ruby>い<ruby>奴<rt>やつ</rt></ruby>らども) — 'those bad guys'

${MARKER}`,

  "27f7490e": `Instrumental 〜de michiru (〜で<ruby>満<rt>み</rt></ruby>ちる) attaches a noun + で (means / instrument particle, batch3b) + michiru ('to fill / be full'). Means 'be filled with X'. The 〜de marks what fills the space; michiru is intransitive ('be full'). namida de michiru (<ruby>涙<rt>なみだ</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) 'be filled with tears'.

Distinct from de ippai (full of — colloquial), 〜ni michiru (〜に<ruby>満<rt>み</rt></ruby>ちる, also 'filled with' — more literary). The 〜de form emphasises the SOURCE / MEANS of filling. Common in lyrics for emotional fullness, rooms full of light, hearts full of love.

Compare with 〜ippai (colloquial 'full'), 〜sugiru (too much, batch3a — excess), 〜darake (covered in, batch3a — saturation often negative), 〜mamire (covered in, batch6a — visceral). 〜de michiru is the lyrical 'filled with' marker — preferred in songs and elevated prose for atmospheric fullness.

• namida de michiru (<ruby>涙<rt>なみだ</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with tears'
• hikari de michiru (<ruby>光<rt>ひかり</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with light'
• ai de michiru (<ruby>愛<rt>あい</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with love'
• kanashimi de michiru (<ruby>悲<rt>かな</rt></ruby>しみで<ruby>満<rt>み</rt></ruby>ちる) — 'filled with sorrow'
• kibou de michiru (<ruby>希望<rt>きぼう</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with hope'
• yorokobi de michiru (<ruby>喜<rt>よろこ</rt></ruby>びで<ruby>満<rt>み</rt></ruby>ちる) — 'filled with joy'
• natsukashisa de michiru (<ruby>懐<rt>なつ</rt></ruby>かしさで<ruby>満<rt>み</rt></ruby>ちる) — 'filled with nostalgia'
• yume de michiru (<ruby>夢<rt>ゆめ</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with dreams'
• kioku de michiru (<ruby>記憶<rt>きおく</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with memories'
• boku no kokoro ga ai de michiru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>が<ruby>愛<rt>あい</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'my heart fills with love'
• boku-tachi no jikan ga shiawase de michiru (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>が<ruby>幸<rt>しあわ</rt></ruby>せで<ruby>満<rt>み</rt></ruby>ちる) — 'our time fills with happiness'
• kotoba de michiru (<ruby>言葉<rt>ことば</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with words'
• kanjou de michiru (<ruby>感情<rt>かんじょう</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with feeling'
• boku no inori de michiru sora (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>祈<rt>いの</rt></ruby>りで<ruby>満<rt>み</rt></ruby>ちる<ruby>空<rt>そら</rt></ruby>) — 'sky filled with my prayers'
• boku-tachi no koe de michiru (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>声<rt>こえ</rt></ruby>で<ruby>満<rt>み</rt></ruby>ちる) — 'filled with our voices'

${MARKER}`,

  "aa63f737": `Conveyance verbs in Japanese form a productive triplet around the act of getting something from one place / person to another: <ruby>伝<rt>つた</rt></ruby>える (tsutaeru, 'to convey / tell — agentive'), <ruby>届<rt>とど</rt></ruby>ける (todokeru, 'to deliver — agentive'), <ruby>届<rt>とど</rt></ruby>く (todoku, 'to arrive / reach — intransitive'). Often used metaphorically in lyrics for emotional reaching: omoi wo tsutaeru (<ruby>想<rt>おも</rt></ruby>いを<ruby>伝<rt>つた</rt></ruby>える) 'convey feelings'.

The verbs cover different perspectives: tsutaeru = speaker transmits message; todokeru = sender delivers package; todoku = recipient receives or message arrives. boku no koe ga todoku (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>が<ruby>届<rt>とど</rt></ruby>く) "my voice reaches".

Compare with 7f95be38's declaration verbs (告げる, 寄せる, かける — more formal / declarative). The conveyance triplet is foundational for any communication / delivery / arrival context — essential in love songs, message lyrics, prayer-and-arrival imagery.

• boku no omoi wo tsutaeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>想<rt>おも</rt></ruby>いを<ruby>伝<rt>つた</rt></ruby>える) — 'convey my feelings'
• kotoba ga tsutawaru (<ruby>言葉<rt>ことば</rt></ruby>が<ruby>伝<rt>つた</rt></ruby>わる) — 'words get through'
• tegami wo todokeru (<ruby>手紙<rt>てがみ</rt></ruby>を<ruby>届<rt>とど</rt></ruby>ける) — 'deliver a letter'
• yume wo todokeru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>届<rt>とど</rt></ruby>ける) — 'deliver a dream'
• boku no koe ga todoku (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>が<ruby>届<rt>とど</rt></ruby>く) — 'my voice reaches'
• ai wo todokeru (<ruby>愛<rt>あい</rt></ruby>を<ruby>届<rt>とど</rt></ruby>ける) — 'deliver love'
• negai ga todoku (<ruby>願<rt>ねが</rt></ruby>いが<ruby>届<rt>とど</rt></ruby>く) — 'a wish is granted'
• kotaeau wo tsutaetai (<ruby>答<rt>こた</rt></ruby>えあうを<ruby>伝<rt>つた</rt></ruby>えたい) — 'want to convey the answer'
• boku no namida wo todokete (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>を<ruby>届<rt>とど</rt></ruby>けて) — 'deliver my tears'
• kimi ni todoku (<ruby>君<rt>きみ</rt></ruby>に<ruby>届<rt>とど</rt></ruby>く) — 'reach you'
• boku-tachi no kokoro wo tsutaeru (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>心<rt>こころ</rt></ruby>を<ruby>伝<rt>つた</rt></ruby>える) — 'convey our hearts'
• boku no inori ga todoku you ni (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>祈<rt>いの</rt></ruby>りが<ruby>届<rt>とど</rt></ruby>くように) — 'may my prayer reach'
• kanji ga tsutawaru (<ruby>感<rt>かん</rt></ruby>じが<ruby>伝<rt>つた</rt></ruby>わる) — 'the feeling gets through'
• tegami ga todokanai (<ruby>手紙<rt>てがみ</rt></ruby>が<ruby>届<rt>とど</rt></ruby>かない) — "the letter doesn't reach"
• boku no kotoba ga todoke (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>が<ruby>届<rt>とど</rt></ruby>け) — 'let my words reach' (imperative literary)

${MARKER}`,

  "5fad904b": `Compound 〜abaku (〜<ruby>暴<rt>あば</rt></ruby>く) is a literary verb meaning 'to expose / lay bare / unmask'. Often used in compound forms with suffix verbs to add emphasis: tsuki-abaku (<ruby>突<rt>つ</rt></ruby>き<ruby>暴<rt>あば</rt></ruby>く) 'expose forcefully'. Stand-alone abaku appears in news, mystery / detective fiction, lyrics about revelation.

Common in metaphorical usage for revealing hidden truths, emotional unmasking, exposing facades: kokoro wo abaku (<ruby>心<rt>こころ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) 'lay bare the heart'. The compound forms intensify: hagi-abaku (<ruby>剥<rt>は</rt></ruby>ぎ<ruby>暴<rt>あば</rt></ruby>く) 'strip and expose'.

Compare with miseru (show — neutral), arawasu (reveal — intransitive), bakeru (transform). 〜abaku is the LITERARY exposing verb — used in detective novels, dramatic / emotional songs, prosecutorial speech. Often pairs with secrets, lies, hidden things.

• abaku (<ruby>暴<rt>あば</rt></ruby>く) — 'to expose / lay bare'
• shinjitsu wo abaku (<ruby>真実<rt>しんじつ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'expose the truth'
• himitsu wo abaku (<ruby>秘密<rt>ひみつ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'expose a secret'
• uso wo abaku (<ruby>嘘<rt>うそ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'expose a lie'
• kokoro wo abaku (<ruby>心<rt>こころ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'lay bare the heart'
• tsuki-abaku (<ruby>突<rt>つ</rt></ruby>き<ruby>暴<rt>あば</rt></ruby>く) — 'expose forcefully'
• hagi-abaku (<ruby>剥<rt>は</rt></ruby>ぎ<ruby>暴<rt>あば</rt></ruby>く) — 'strip and expose'
• jiken wo abaku (<ruby>事件<rt>じけん</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'crack a case'
• inbou wo abaku (<ruby>陰謀<rt>いんぼう</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'expose a conspiracy'
• kako wo abaku (<ruby>過去<rt>かこ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'expose the past'
• boku no kokoro wo abakareta (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>かれた) — "my heart was laid bare"
• yowasa wo abaku (<ruby>弱<rt>よわ</rt></ruby>さを<ruby>暴<rt>あば</rt></ruby>く) — 'expose weakness'
• shitsuren wo abaku (<ruby>失恋<rt>しつれん</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'expose a broken heart'
• boku no namida wo abaku (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'expose my tears'
• mukashi no kioku wo abaku (<ruby>昔<rt>むかし</rt></ruby>の<ruby>記憶<rt>きおく</rt></ruby>を<ruby>暴<rt>あば</rt></ruby>く) — 'lay bare old memories'

${MARKER}`,

  "36777154": `Compound 〜uchi-akeru (〜<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) combines uchi ('strike / hit') + akeru ('open'). Means 'to open up about / reveal / confess (something hidden)'. The structure carries imagery of breaking open something to reveal what's inside. honne wo uchi-akeru (<ruby>本音<rt>ほんね</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) 'open up about (one's) true feelings'.

Distinct from kokuhaku (declaration / love confession — own grammar), iu (just say), tsutaeru (convey, batch6c). 〜uchi-akeru emphasises the EMOTIONAL OPENING UP — sharing something previously kept hidden. Common in songs of intimacy, confession of feelings, friendship.

Compare with 〜abaku (expose — to others' hidden things, batch6c), 〜kokoro hiraku (open the heart — slightly different idiom), 〜miseru (show). 〜uchi-akeru is the SELF-DISCLOSURE marker — used when the speaker reveals their own inner truth to a trusted listener.

• honne wo uchi-akeru (<ruby>本音<rt>ほんね</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — "open up about (one's) true feelings"
• kimochi wo uchi-akeru (<ruby>気持<rt>きも</rt></ruby>ちを<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'open up about (one's) feelings'
• himitsu wo uchi-akeru (<ruby>秘密<rt>ひみつ</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'reveal a secret'
• boku no kokoro wo uchi-akeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — "open up my heart"
• boku no kako wo uchi-akeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>過去<rt>かこ</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — "reveal my past"
• tomodachi ni uchi-akeru (<ruby>友達<rt>ともだち</rt></ruby>に<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'open up to a friend'
• boku no fuan wo uchi-akeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>不安<rt>ふあん</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — "open up about my anxieties"
• ai wo uchi-akeru (<ruby>愛<rt>あい</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'confess love'
• jitsu wo uchi-akeru (<ruby>実<rt>じつ</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'come clean about'
• boku no namida wo uchi-akeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'reveal my tears'
• yowasa wo uchi-akeru (<ruby>弱<rt>よわ</rt></ruby>さを<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'confess weakness'
• boku no negai wo uchi-akeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>願<rt>ねが</rt></ruby>いを<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'open up about my wish'
• boku no yume wo uchi-akeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — "share my dream"
• kako no kanashimi wo uchi-akeru (<ruby>過去<rt>かこ</rt></ruby>の<ruby>悲<rt>かな</rt></ruby>しみを<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>ける) — 'open up about past sorrow'
• boku-tachi no himitsu wo uchi-akeyou (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>秘密<rt>ひみつ</rt></ruby>を<ruby>打<rt>う</rt></ruby>ち<ruby>明<rt>あ</rt></ruby>けよう) — "let's open up about our secret"

${MARKER}`,
};

async function main() {
  const db = getDb();
  const partials = Object.keys(REWRITES);
  const idMap = new Map<string, string>();
  for (const p of partials) {
    const r = await db.execute(sql.raw(`SELECT id::text FROM grammar_rules WHERE id::text LIKE '${p}%'`));
    const rows = (r.rows ?? r) as Array<{ id: string }>;
    if (rows.length === 1) idMap.set(p, rows[0].id);
  }
  let rulesUpdated = 0;
  const oldToNew: Record<string, { oldName: string; newName: string; oldJlpt: string; newJlpt: string; fullId: string }> = {};
  for (const [partialId, en] of Object.entries(REWRITES)) {
    const newName = NAME_REWRITES[partialId];
    const fullId = idMap.get(partialId);
    if (!fullId || !newName) continue;
    const before = await db.execute(sql.raw(`SELECT name, jlpt_reference FROM grammar_rules WHERE id = '${fullId}'::uuid`));
    const beforeRows = (before.rows ?? before) as Array<{ name: string; jlpt_reference: string }>;
    if (beforeRows.length === 0) continue;
    await db.execute(sql`UPDATE grammar_rules SET explanation = ${JSON.stringify({ en })}::jsonb, name = ${newName}, updated_at = NOW() WHERE id = ${fullId}::uuid`);
    oldToNew[partialId] = { oldName: beforeRows[0].name, newName, oldJlpt: beforeRows[0].jlpt_reference, newJlpt: beforeRows[0].jlpt_reference, fullId };
    rulesUpdated++;
  }
  console.log(`updated ${rulesUpdated}/${Object.keys(REWRITES).length} grammar_rules`);

  const fullIds = Object.values(oldToNew).map((o) => o.fullId);
  if (fullIds.length === 0) return;
  const idList = fullIds.map((id) => `'${id}'::uuid`).join(",");
  const versionRes = await db.execute(sql.raw(`SELECT sv.id, sv.lesson FROM song_versions sv JOIN song_version_grammar_rules svgr ON svgr.song_version_id = sv.id WHERE svgr.grammar_rule_id IN (${idList})`));
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;
  let lessonsUpdated = 0;
  for (const v of versions) {
    const lesson = v.lesson;
    if (!lesson?.grammar_points || !Array.isArray(lesson.grammar_points)) continue;
    let mutated = false;
    for (const gp of lesson.grammar_points) {
      const matchPartial = Object.entries(oldToNew).find(([, info]) =>
        (info.oldName.trim() === (gp.name ?? "").trim() || info.newName.trim() === (gp.name ?? "").trim())
        && info.oldJlpt.trim() === (gp.jlpt_reference ?? "").trim())?.[0];
      if (!matchPartial) continue;
      gp.name = oldToNew[matchPartial].newName;
      gp.explanation = { en: REWRITES[matchPartial] };
      mutated = true;
    }
    if (mutated) {
      await db.execute(sql`UPDATE song_versions SET lesson = ${JSON.stringify(lesson)}::jsonb, updated_at = NOW() WHERE id = ${v.id}::uuid`);
      lessonsUpdated++;
    }
  }
  console.log(`updated ${lessonsUpdated} song_versions.lesson.grammar_points`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
