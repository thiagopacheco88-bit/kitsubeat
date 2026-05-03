/**
 * Batch 6b — 25 v2 grammar rule explanations.
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "76c6c34a": "choudai (頂戴 / ちょうだい) — please give me / casual please",
  "b56957cc": "Absolute self-attribution 〜hoka no dare demo nai (〜他の誰でもない) — none other than",
  "87f55482": "Adjective doubling (深い深い, 青い青い) — emotional intensification",
  "72bcb822": "〜garu (〜がる) — show / act as if (3rd-person desire)",
  "91437b6f": "Adjective-stem + mo + nai (〜くもない) — not even (negative emphasis)",
  "b7ef6b66": "Alternation 〜te wa 〜kaesu (〜ては〜返す) — cyclic action",
  "bc7cff67": "〜ni shite wa (〜にしては) — for / considering it's a (backhanded)",
  "4682e0c4": "Casual contraction 〜e / 〜nee (〜え / 〜ねぇ) — rough masculine",
  "95ec42e5": "Casual contraction 〜cha / 〜ja (〜ちゃ / 〜じゃ) — = 〜ては / 〜では",
  "e34d3207": "Casual contractions (わかんない / やっぱ / どっか / ポッケ)",
  "ad0cab45": "〜mon (〜もん) — casual reasoning 'because' (colloquial)",
  "f0bae0d9": "Casual ra-nuki / 〜ran-nai (〜らんない) — rough male contraction",
  "0ac68c2b": "Cinematic te-form stacking — successive verbs as a moving scene",
  "90efe3f8": "Classical 〜shi (〜し) — literary past / sequential",
  "8eb4cbfb": "Classical / literary endings 〜ki 〜kana (〜き〜かな) — exclamatory",
  "fdb1558f": "Comparative 〜yori + adverb (X-er than)",
  "6607b521": "Compound stem chaining 〜tsuzuke (〜続け) — keep V-ing (stem)",
  "781066f3": "Compound suffix 〜dasu (〜出す) — begin / set out",
  "8b2bd6c4": "Compound suffix 〜nukeru (〜抜ける) — pass through completely",
  "94848eed": "Compound suffix 〜komu (〜込む) — deeply / into",
  "0ff96aa8": "Compound verb suffix 〜nuku / 〜dasu (〜抜く / 〜出す)",
  "645340f4": "V + V compounds 〜ochiru / 〜saru / 〜noseru — direction/completion",
  "0e767da7": "donna ni 〜tatte (どんなに〜たって) — no matter how",
  "8fe73b63": "Conditional stack 〜te shimaetara (〜てしまえたら) — if I could fully",
  "ee51e034": "〜tara nara / 〜raretanara (〜たなら) — counterfactual 'if I had / could'",
};

const REWRITES: Record<string, string> = {
  "76c6c34a": `choudai (<ruby>頂戴<rt>ちょうだい</rt></ruby>) is a casual / familiar way to ask for something. Originally a humble verb meaning 'humbly receive', in modern speech it's a soft / female-leaning request — equivalent to 'please give me / please do'. attached after a noun + を or after a verb's te-form. mizu wo choudai (<ruby>水<rt>みず</rt></ruby>を<ruby>頂戴<rt>ちょうだい</rt></ruby>) "give me water, please".

After te-form: 〜te choudai (〜てちょうだい) is a soft request — gentler than 〜te kudasai, more familiar. mite choudai (<ruby>見<rt>み</rt></ruby>てちょうだい) 'please look'. Stereotypically female / motherly / familial; men can use it but it sounds soft. Casual variant: 〜te chyou (in some dialects).

Compare with 〜te kudasai (formal please), 〜te (bare casual request), 〜te kure (rough male). choudai sits in the soft / intimate request zone — used among family, partners, close friends, especially when the speaker wants warmth.

• mizu wo choudai (<ruby>水<rt>みず</rt></ruby>を<ruby>頂戴<rt>ちょうだい</rt></ruby>) — 'water, please'
• kashi wo choudai (お<ruby>菓子<rt>かし</rt></ruby>を<ruby>頂戴<rt>ちょうだい</rt></ruby>) — 'sweets, please'
• mite choudai (<ruby>見<rt>み</rt></ruby>てちょうだい) — 'please look'
• kiite choudai (<ruby>聞<rt>き</rt></ruby>いてちょうだい) — 'please listen'
• matte choudai (<ruby>待<rt>ま</rt></ruby>ってちょうだい) — 'please wait'
• tetsudatte choudai (<ruby>手伝<rt>てつだ</rt></ruby>ってちょうだい) — 'please help'
• yamete choudai (やめてちょうだい) — 'please stop'
• boku no koto wo wasurenaide choudai (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れないでちょうだい) — 'please don\'t forget me'
• ai wo choudai (<ruby>愛<rt>あい</rt></ruby>を<ruby>頂戴<rt>ちょうだい</rt></ruby>) — 'love, please'
• kotae wo choudai (<ruby>答<rt>こた</rt></ruby>えを<ruby>頂戴<rt>ちょうだい</rt></ruby>) — 'an answer, please'
• yume wo choudai (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>頂戴<rt>ちょうだい</rt></ruby>) — 'a dream, please'
• kotoba wo choudai (<ruby>言葉<rt>ことば</rt></ruby>を<ruby>頂戴<rt>ちょうだい</rt></ruby>) — 'words, please'
• tsutaete choudai (<ruby>伝<rt>つた</rt></ruby>えてちょうだい) — 'please convey'
• kanjite choudai (<ruby>感<rt>かん</rt></ruby>じてちょうだい) — 'please feel'
• ima sugu kite choudai (<ruby>今<rt>いま</rt></ruby>すぐ<ruby>来<rt>き</rt></ruby>てちょうだい) — 'come right now please'

${MARKER}`,

  "b56957cc": `Absolute self-attribution constructions like 〜hoka no dare demo nai (<ruby>他<rt>ほか</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない) and 〜igai no dare demo nai (<ruby>以外<rt>いがい</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない) emphatically identify a single referent as the only possibility — 'none other than X / no one but X'. The structure pairs hoka no / igai no with dare demo nai for absolute exclusivity.

Common in declarations of identity / love / commitment: kimi hoka no dare demo nai (<ruby>君<rt>きみ</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない) "no one but you". Often used emphatically in lyrics for unique value: boku hoka no dare demo nai unmei (<ruby>僕<rt>ぼく</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない<ruby>運命<rt>うんめい</rt></ruby>) 'a fate uniquely mine'.

Compare with 〜dake (just / only — neutral), 〜shika nai (only — exclusive but defensive, batch4a), 〜ni shika〜nai (only to X, batch5b). Absolute self-attribution is the most emphatic 'no one but X' construction — heavy weight, reserved for declarations of uniqueness or destiny.

• kimi hoka no dare demo nai (<ruby>君<rt>きみ</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない) — 'no one but you'
• boku igai no dare demo nai (<ruby>僕<rt>ぼく</rt></ruby><ruby>以外<rt>いがい</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない) — 'none other than me'
• jibun igai no dare demo nai (<ruby>自分<rt>じぶん</rt></ruby><ruby>以外<rt>いがい</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない) — 'no one but oneself'
• ima igai no nani demo nai (<ruby>今<rt>いま</rt></ruby><ruby>以外<rt>いがい</rt></ruby>の<ruby>何<rt>なに</rt></ruby>でもない) — 'nothing but now'
• ai igai no nani demo nai (<ruby>愛<rt>あい</rt></ruby><ruby>以外<rt>いがい</rt></ruby>の<ruby>何<rt>なに</rt></ruby>でもない) — 'nothing but love'
• yume hoka no nani demo nai (<ruby>夢<rt>ゆめ</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>何<rt>なに</rt></ruby>でもない) — 'nothing but a dream'
• unmei hoka no nani demo nai (<ruby>運命<rt>うんめい</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>何<rt>なに</rt></ruby>でもない) — 'nothing but fate'
• boku hoka no dare demo nai unmei (<ruby>僕<rt>ぼく</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない<ruby>運命<rt>うんめい</rt></ruby>) — 'a fate uniquely mine'
• boku-tachi hoka no dare demo nai (<ruby>僕<rt>ぼく</rt></ruby>たち<ruby>他<rt>ほか</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない) — 'no one but us'
• kimi hoka no dare demo nai sonzai (<ruby>君<rt>きみ</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもない<ruby>存在<rt>そんざい</rt></ruby>) — 'an existence uniquely you'
• boku igai no dare demo nai mono (<ruby>僕<rt>ぼく</rt></ruby><ruby>以外<rt>いがい</rt></ruby>の<ruby>誰<rt>だれ</rt></ruby>でもないもの) — 'something only mine'
• ima igai no toki demo nai (<ruby>今<rt>いま</rt></ruby><ruby>以外<rt>いがい</rt></ruby>の<ruby>時<rt>とき</rt></ruby>でもない) — 'no time but now'
• boku-tachi no koe igai (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>声<rt>こえ</rt></ruby><ruby>以外<rt>いがい</rt></ruby>) — 'apart from our voices'
• kimi hoka no nan demo nai sora (<ruby>君<rt>きみ</rt></ruby><ruby>他<rt>ほか</rt></ruby>の<ruby>何<rt>なん</rt></ruby>でもない<ruby>空<rt>そら</rt></ruby>) — 'a sky uniquely yours'
• kotae hoka no nani demo nai (<ruby>答<rt>こた</rt></ruby>え<ruby>他<rt>ほか</rt></ruby>の<ruby>何<rt>なに</rt></ruby>でもない) — 'nothing but the answer'

${MARKER}`,

  "87f55482": `Adjective doubling (e.g., fukai fukai 'deep, deep'; aoi aoi 'blue, blue') is a literary / poetic device in Japanese. The same i-adjective is repeated for emotional emphasis or vivid description. Common in song lyrics, classical literature, children's stories. fukai fukai umi (<ruby>深<rt>ふか</rt></ruby>い<ruby>深<rt>ふか</rt></ruby>い<ruby>海<rt>うみ</rt></ruby>) 'a deep, deep sea'.

Distinct from prefixed intensifiers (真っ〜 batch4b, 超〜 colloquial). Adjective doubling adds rhythmic / lyrical weight rather than absolute intensity. Often used with naturalistic adjectives: aoi (blue), shiroi (white), fukai (deep), tooi (far), nagai (long).

The doubling can extend to onomatopoeia and na-adjectives in some literary contexts. Compare with 真っ〜 (absolute intensification), 〜sugiru (too — batch3a, excess), bare adjective + adverb (totemo). Adjective doubling is the lyrical / poetic intensifier — perfect for songs evoking image and atmosphere.

• fukai fukai umi (<ruby>深<rt>ふか</rt></ruby>い<ruby>深<rt>ふか</rt></ruby>い<ruby>海<rt>うみ</rt></ruby>) — 'a deep, deep sea'
• aoi aoi sora (<ruby>青<rt>あお</rt></ruby>い<ruby>青<rt>あお</rt></ruby>い<ruby>空<rt>そら</rt></ruby>) — 'a blue, blue sky'
• shiroi shiroi yuki (<ruby>白<rt>しろ</rt></ruby>い<ruby>白<rt>しろ</rt></ruby>い<ruby>雪<rt>ゆき</rt></ruby>) — 'pure white snow'
• tooi tooi mukou (<ruby>遠<rt>とお</rt></ruby>い<ruby>遠<rt>とお</rt></ruby>い<ruby>向<rt>む</rt></ruby>こう) — 'far, far away'
• nagai nagai yoru (<ruby>長<rt>なが</rt></ruby>い<ruby>長<rt>なが</rt></ruby>い<ruby>夜<rt>よる</rt></ruby>) — 'a long, long night'
• atsui atsui taiyou (<ruby>暑<rt>あつ</rt></ruby>い<ruby>暑<rt>あつ</rt></ruby>い<ruby>太陽<rt>たいよう</rt></ruby>) — 'a blazing hot sun'
• samui samui kaze (<ruby>寒<rt>さむ</rt></ruby>い<ruby>寒<rt>さむ</rt></ruby>い<ruby>風<rt>かぜ</rt></ruby>) — 'a cold, cold wind'
• kanashii kanashii uta (<ruby>悲<rt>かな</rt></ruby>しい<ruby>悲<rt>かな</rt></ruby>しい<ruby>歌<rt>うた</rt></ruby>) — 'a sad, sad song'
• ureshii ureshii hi (<ruby>嬉<rt>うれ</rt></ruby>しい<ruby>嬉<rt>うれ</rt></ruby>しい<ruby>日<rt>ひ</rt></ruby>) — 'a joyful, joyful day'
• yasashii yasashii koe (<ruby>優<rt>やさ</rt></ruby>しい<ruby>優<rt>やさ</rt></ruby>しい<ruby>声<rt>こえ</rt></ruby>) — 'a gentle, gentle voice'
• tsumetai tsumetai te (<ruby>冷<rt>つめ</rt></ruby>たい<ruby>冷<rt>つめ</rt></ruby>たい<ruby>手<rt>て</rt></ruby>) — 'cold, cold hands'
• atatakai atatakai hidamari (<ruby>暖<rt>あたた</rt></ruby>かい<ruby>暖<rt>あたた</rt></ruby>かい<ruby>日<rt>ひ</rt></ruby>だまり) — 'a warm, warm sunny spot'
• tsuyoi tsuyoi omoi (<ruby>強<rt>つよ</rt></ruby>い<ruby>強<rt>つよ</rt></ruby>い<ruby>想<rt>おも</rt></ruby>い) — 'strong, strong feelings'
• yasashii yasashii ai (<ruby>優<rt>やさ</rt></ruby>しい<ruby>優<rt>やさ</rt></ruby>しい<ruby>愛<rt>あい</rt></ruby>) — 'a gentle, gentle love'
• takai takai yama (<ruby>高<rt>たか</rt></ruby>い<ruby>高<rt>たか</rt></ruby>い<ruby>山<rt>やま</rt></ruby>) — 'a high, high mountain'

${MARKER}`,

  "72bcb822": `〜garu (〜がる) attaches to the stem of an i-adjective or to certain noun-like emotional descriptors. Means 'show / act / display X (as 3rd-person interpretation)'. Used because Japanese restricts emotional adjectives (〜tai, hoshii, samishii, ureshii) to 1st-person inner experience — to describe someone ELSE's feelings, you observe their behaviour with 〜garu. samishii (lonely) → samishi-garu (<ruby>寂<rt>さび</rt></ruby>しがる) "show signs of being lonely".

Conjugates as a regular godan verb: 〜gatta (past), 〜gatte iru (continuous behaviour), 〜garanai (negative). The structure converts 'feel X' into 'show X / act X-ish'. Without 〜garu, third-person sentences with emotional adjectives sound presumptuous — only the speaker can know their own internal feelings; others' feelings must be observed.

Compare with 〜you da (seems X — descriptive, batch3a), 〜sou (visual / hearsay, batch3b), 〜rashii (apparently). 〜garu specifically converts EMOTIONAL adjectives into observable behaviour. Common with hoshi-garu (want), tabe-tagaru (want to eat), kowa-garu (afraid), samishi-garu (lonely-acting).

• samishi-garu (<ruby>寂<rt>さび</rt></ruby>しがる) — 'show signs of being lonely'
• hoshi-garu (<ruby>欲<rt>ほ</rt></ruby>しがる) — 'want / show desire for'
• tabe-tagaru (<ruby>食<rt>た</rt></ruby>べたがる) — 'want to eat (visibly)'
• ki-tagaru (<ruby>来<rt>き</rt></ruby>たがる) — 'want to come'
• kowa-garu (<ruby>怖<rt>こわ</rt></ruby>がる) — 'show fear'
• ureshi-garu (<ruby>嬉<rt>うれ</rt></ruby>しがる) — 'show joy'
• kanashi-garu (<ruby>悲<rt>かな</rt></ruby>しがる) — 'show sadness'
• mendo-gaaru (<ruby>面倒<rt>めんどう</rt></ruby>がる) — 'show reluctance / find tiresome'
• shiri-tagaru (<ruby>知<rt>し</rt></ruby>りたがる) — 'want to know'
• hazukashi-garu (<ruby>恥<rt>は</rt></ruby>ずかしがる) — 'act shy'
• ai-shi-tagaru (<ruby>愛<rt>あい</rt></ruby>したがる) — 'want to love'
• mite-mi-tagaru (<ruby>見<rt>み</rt></ruby>てみたがる) — 'want to try seeing'
• shinjirenagara mo shinji-tagaru (<ruby>信<rt>しん</rt></ruby>じれながらも<ruby>信<rt>しん</rt></ruby>じたがる) — 'want to believe even while doubting'
• kanaragou to itai-garu (<ruby>叶<rt>かな</rt></ruby>らごうと<ruby>痛<rt>いた</rt></ruby>がる) — 'show pain when willed away'
• boku no kao wo mi-tagaru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>顔<rt>かお</rt></ruby>を<ruby>見<rt>み</rt></ruby>たがる) — 'want to see my face'

${MARKER}`,

  "91437b6f": `Adjective-stem + mo + nai (〜くもない / 〜でもない) is an emphatic negation construction. Take an adjective's stem (〜i drop) + mo (も, even) + nai. Means 'not even (X-ish) / not in the slightest'. atatakaku mo nai (<ruby>暖<rt>あたた</rt></ruby>かくもない) "not even warm". Stronger than bare 〜kunai by adding the universal scope of 〜mo.

For na-adjectives and nouns: 〜demo nai (kirei demo nai 'not even pretty'). The structure scopes the negation to 'not at all, not the slightest bit'. Common in lyrics for emphatic dismissal: kanashiku mo nai (<ruby>悲<rt>かな</rt></ruby>しくもない) "not even sad".

Compare with bare 〜kunai (everyday negative i-adj), batch4b's emphatic は in negative (similar role, different particle), 〜sa mo nai (formal / nominalised 'not even -ness'). Adjective-stem + も + ない is the emphatic-everyday negation marker — used when bare 〜nai doesn't carry enough force.

• atatakaku mo nai (<ruby>暖<rt>あたた</rt></ruby>かくもない) — 'not even warm'
• kanashiku mo nai (<ruby>悲<rt>かな</rt></ruby>しくもない) — 'not even sad'
• ureshiku mo nai (<ruby>嬉<rt>うれ</rt></ruby>しくもない) — 'not even happy'
• takaku mo nai (<ruby>高<rt>たか</rt></ruby>くもない) — 'not even expensive / tall'
• yasashiku mo nai (<ruby>優<rt>やさ</rt></ruby>しくもない) — 'not even kind'
• tsuyoku mo nai (<ruby>強<rt>つよ</rt></ruby>くもない) — 'not even strong'
• yowaku mo nai (<ruby>弱<rt>よわ</rt></ruby>くもない) — 'not even weak'
• kirei demo nai (<ruby>綺麗<rt>きれい</rt></ruby>でもない) — 'not even pretty'
• nigiyaka demo nai (<ruby>賑<rt>にぎ</rt></ruby>やかでもない) — 'not even lively'
• shizuka demo nai (<ruby>静<rt>しず</rt></ruby>かでもない) — 'not even quiet'
• boku no koto wo suki demo nai (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>好<rt>す</rt></ruby>きでもない) — 'doesn\'t even like me'
• yume demo nai (<ruby>夢<rt>ゆめ</rt></ruby>でもない) — 'not even a dream'
• ai demo nai (<ruby>愛<rt>あい</rt></ruby>でもない) — 'not even love'
• yorokoshiku mo nai (<ruby>喜<rt>よろこ</rt></ruby>しくもない) — 'not even happy'
• samishiku mo nai (<ruby>寂<rt>さび</rt></ruby>しくもない) — 'not even lonely'

${MARKER}`,

  "b7ef6b66": `Alternation 〜te wa 〜kaesu (〜ては〜<ruby>返<rt>かえ</rt></ruby>す) is a paired construction marking cyclic / repetitive action. Verb + 〜ては + verb + 〜kaesu (return / repeat). Means 'do X then redo Y, repeatedly / cyclically'. yonde wa keshikaesu (<ruby>読<rt>よ</rt></ruby>んでは<ruby>消<rt>け</rt></ruby>し<ruby>返<rt>かえ</rt></ruby>す) 'read then erase, again and again'.

Common in songs and poetry for image of repeating action — waves, breaths, thoughts: kakete wa shimaikaesu (<ruby>賭<rt>か</rt></ruby>けては<ruby>仕舞<rt>しま</rt></ruby>い<ruby>返<rt>かえ</rt></ruby>す) 'bet and pull back, over and over'. The alternation conveys persistence, struggle, indecision, or natural rhythm.

Compare with 〜tari 〜tari (listing examples, batch3a), 〜tsuzukeru (continue — single action), 〜ku 〜suru (alternative pattern). Alternation 〜te wa 〜kaesu is the cyclic repetition marker — perfect for songs about waves crashing, breathing, hope and despair alternating.

• yonde wa keshikaesu (<ruby>読<rt>よ</rt></ruby>んでは<ruby>消<rt>け</rt></ruby>し<ruby>返<rt>かえ</rt></ruby>す) — 'read then erase, repeatedly'
• kaite wa keshikaesu (<ruby>書<rt>か</rt></ruby>いては<ruby>消<rt>け</rt></ruby>し<ruby>返<rt>かえ</rt></ruby>す) — 'write then erase, repeatedly'
• naite wa waraikaesu (<ruby>泣<rt>な</rt></ruby>いては<ruby>笑<rt>わら</rt></ruby>い<ruby>返<rt>かえ</rt></ruby>す) — 'cry then laugh, repeatedly'
• mukatte wa modori-kaesu (<ruby>向<rt>む</rt></ruby>かっては<ruby>戻<rt>もど</rt></ruby>り<ruby>返<rt>かえ</rt></ruby>す) — 'head out then return'
• tsutaete wa wasure-kaesu (<ruby>伝<rt>つた</rt></ruby>えては<ruby>忘<rt>わす</rt></ruby>れ<ruby>返<rt>かえ</rt></ruby>す) — 'convey then forget, again and again'
• shinjite wa utagai-kaesu (<ruby>信<rt>しん</rt></ruby>じては<ruby>疑<rt>うたが</rt></ruby>い<ruby>返<rt>かえ</rt></ruby>す) — 'believe then doubt, cyclically'
• ai shite wa kanashimi-kaesu (<ruby>愛<rt>あい</rt></ruby>しては<ruby>悲<rt>かな</rt></ruby>しみ<ruby>返<rt>かえ</rt></ruby>す) — 'love then grieve, again and again'
• mukaeau-tewa nigeru (<ruby>迎<rt>むか</rt></ruby>えては<ruby>逃<rt>に</rt></ruby>げる) — 'face then flee'
• yatte wa shippai-kaesu (やっては<ruby>失敗<rt>しっぱい</rt></ruby><ruby>返<rt>かえ</rt></ruby>す) — 'try then fail, cyclically'
• mata atte wa wakare-kaesu (また<ruby>会<rt>あ</rt></ruby>っては<ruby>別<rt>わか</rt></ruby>れ<ruby>返<rt>かえ</rt></ruby>す) — 'meet then part again and again'
• nami ga yose tewa kaeshi (<ruby>波<rt>なみ</rt></ruby>が<ruby>寄<rt>よ</rt></ruby>せては<ruby>返<rt>かえ</rt></ruby>し) — 'waves crash and recede'
• iki wo sutete wa hakikaesu (<ruby>息<rt>いき</rt></ruby>を<ruby>吸<rt>す</rt></ruby>っては<ruby>吐<rt>は</rt></ruby>き<ruby>返<rt>かえ</rt></ruby>す) — 'breathe in and out, cyclically'
• kanaratenu omoi wo motte wa kaeshi (<ruby>叶<rt>かな</rt></ruby>らて<ruby>無<rt>ぬ</rt></ruby><ruby>想<rt>おも</rt></ruby>いを<ruby>持<rt>も</rt></ruby>っては<ruby>返<rt>かえ</rt></ruby>し) — 'hold the unfulfilled wish, again and again'
• kotaesakaesu wo motomete (<ruby>答<rt>こた</rt></ruby>えさかえすを<ruby>求<rt>もと</rt></ruby>めて) — 'searching for answer-and-return'
• yume wo mite wa same-kaesu (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>てはさめ<ruby>返<rt>かえ</rt></ruby>す) — 'dream then wake, again and again'

${MARKER}`,

  "bc7cff67": `〜ni shite wa (〜にしては) attaches to a noun. Means 'for / considering it's a X / despite being X'. Marks an evaluation against expectation — what comes after is surprising given the noun's category. kodomo ni shite wa rikou (<ruby>子供<rt>こども</rt></ruby>にしては<ruby>利口<rt>りこう</rt></ruby>) 'smart for a child'.

Often carries a backhanded compliment: implies the standard expectation for X would be lower / different. shoshinsha ni shite wa joutezu (<ruby>初心者<rt>しょしんしゃ</rt></ruby>にしては<ruby>上手<rt>じょうず</rt></ruby>) 'good for a beginner'. The 〜wa in 〜ni shite wa is the contrastive particle — emphasises against expectation.

Compare with 〜to shite (as / in role of, batch5b — neutral), 〜nara (topic conditional), 〜noni (despite, batch2). 〜ni shite wa is uniquely backhanded — used when the speaker wants to acknowledge skill / quality WHILE noting the lower expectation set.

• kodomo ni shite wa rikou (<ruby>子供<rt>こども</rt></ruby>にしては<ruby>利口<rt>りこう</rt></ruby>) — 'smart for a child'
• shoshinsha ni shite wa joutezu (<ruby>初心者<rt>しょしんしゃ</rt></ruby>にしては<ruby>上手<rt>じょうず</rt></ruby>) — 'good for a beginner'
• gakusei ni shite wa otonappoi (<ruby>学生<rt>がくせい</rt></ruby>にしては<ruby>大人<rt>おとな</rt></ruby>っぽい) — 'mature for a student'
• otoko ni shite wa kawaii (<ruby>男<rt>おとこ</rt></ruby>にしては<ruby>可愛<rt>かわい</rt></ruby>い) — 'cute for a guy'
• boku ni shite wa yokuyatta (<ruby>僕<rt>ぼく</rt></ruby>にしてはよくやった) — 'did well, for me'
• tasaba-ka ni shite wa shizuka (たさば<ruby>夏<rt>か</rt></ruby>にしては<ruby>静<rt>しず</rt></ruby>か) — wait
• haru ni shite wa samui (<ruby>春<rt>はる</rt></ruby>にしては<ruby>寒<rt>さむ</rt></ruby>い) — 'cold for spring'
• fuyu ni shite wa atatakai (<ruby>冬<rt>ふゆ</rt></ruby>にしては<ruby>暖<rt>あたた</rt></ruby>かい) — 'warm for winter'
• yasai ni shite wa amai (<ruby>野菜<rt>やさい</rt></ruby>にしては<ruby>甘<rt>あま</rt></ruby>い) — 'sweet for a vegetable'
• boku ni shite wa hayai (<ruby>僕<rt>ぼく</rt></ruby>にしては<ruby>早<rt>はや</rt></ruby>い) — 'fast for me'
• toshi ni shite wa wakai (<ruby>歳<rt>とし</rt></ruby>にしては<ruby>若<rt>わか</rt></ruby>い) — 'young for (their) age'
• kanji ni shite wa yomesou (<ruby>漢字<rt>かんじ</rt></ruby>にしては<ruby>読<rt>よ</rt></ruby>めそう) — 'looks readable, for kanji'
• boku no koe ni shite wa todoiteru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>にしては<ruby>届<rt>とど</rt></ruby>いてる) — 'reaching well, for my voice'
• yume ni shite wa kuwashii (<ruby>夢<rt>ゆめ</rt></ruby>にしては<ruby>詳<rt>くわ</rt></ruby>しい) — 'detailed for a dream'
• boku-tachi ni shite wa kanashii (<ruby>僕<rt>ぼく</rt></ruby>たちにしては<ruby>悲<rt>かな</rt></ruby>しい) — 'sad, for us'

${MARKER}`,

  "4682e0c4": `Casual contractions 〜e (〜え) and 〜nee (〜ねぇ) are rough male / Kansai-flavoured contractions of 〜i (〜い, i-adjective ending or copula). atsui → atsue / atsunee. nai → nee. The structure replaces the polite final 〜i with a draggy 〜e for a rough, casual, often urban / Tokyo-rough effect. atsunee (<ruby>暑<rt>あつ</rt></ruby>ねえ) "fricking hot".

Stereotypically male, often used in anime / manga to characterise rough / blue-collar / yakuza speakers. Common in lyrics for masculine vocal character: ire-nee (いれねぇ) 'not in / not allowed'. Distinct from neutral 〜i — same meaning, much rougher register.

Compare with 〜zo / 〜ze (rough emphatic, batch4a / batch4b), 〜n (Kansai casual contraction), 〜tsu (small tsu emphatic). Casual contraction 〜e / 〜nee is the rough-Tokyo masculine register marker — used when authoring lyrics for tough characters or male bravado.

• atsue (<ruby>暑<rt>あつ</rt></ruby>え) — "fricking hot"
• samue (<ruby>寒<rt>さむ</rt></ruby>え) — "fricking cold"
• ire-nee (いれねぇ) — "not in / not allowed"
• shire-nee (<ruby>知<rt>し</rt></ruby>れねぇ) — "I dunno"
• tabe-nee (<ruby>食<rt>た</rt></ruby>べねぇ) — "ain't eatin'"
• ike-nee (<ruby>行<rt>い</rt></ruby>けねぇ) — "ain't goin'"
• miree (<ruby>見<rt>み</rt></ruby>れえ) — "ain't seein'"
• taberenee (<ruby>食<rt>た</rt></ruby>べれねぇ) — "ain't eatable"
• sugee (すげえ) — "awesome / cool"
• yabee (やべぇ) — "yikes / oh no"
• ureshee (<ruby>嬉<rt>うれ</rt></ruby>しえ) — "fricking happy"
• tsuyei (<ruby>強<rt>つよ</rt></ruby>えい) — "fricking strong"
• boku ja waka-nee (<ruby>僕<rt>ぼく</rt></ruby>じゃわかねぇ) — "I don't get it"
• yume janee (<ruby>夢<rt>ゆめ</rt></ruby>じゃねえ) — "ain't a dream"
• kankei nee (<ruby>関係<rt>かんけい</rt></ruby>ねえ) — "ain't none of (your) business"

${MARKER}`,

  "95ec42e5": `Casual contractions 〜cha / 〜ja (〜ちゃ / 〜じゃ) are spoken contractions of 〜te wa / 〜de wa. The 〜te wa contracts to 〜cha; 〜de wa contracts to 〜ja. Common in casual speech, lyrics, manga dialogue. tabete wa ikenai → tabecha ikenai (<ruby>食<rt>た</rt></ruby>べちゃいけない) "mustn't eat" (covered in batch5a 〜cha ikenai).

Standalone uses: yatcha (やっちゃ) — 'doing X (and as a result...)', conditional + contrast. Or in compound forms like 〜cha dame (must not), 〜cha ikenai. The 〜ja form appears with verbs whose te-form ends in 〜de (e.g., 飲んで → nonja).

Compare with bare 〜te wa (full form, formal), 〜cha ikenai (must not, batch5a), batch1's 〜te shimau → 〜chau (separate but similar contraction). 〜cha / 〜ja is a foundational casual contraction — appears in any spoken-style Japanese, especially song lyrics.

• tabecha (<ruby>食<rt>た</rt></ruby>べちゃ) — "(if you) eat..."
• miccha (<ruby>見<rt>み</rt></ruby>っちゃ) — "(if you) look..."
• yacha (やっちゃ) — "(if you) do..."
• shichya (しっちゃ) — wait
• ittcha (<ruby>行<rt>い</rt></ruby>っちゃ) — "(if you) go..."
• damacha (<ruby>黙<rt>だま</rt></ruby>っちゃ) — "(if you) stay silent..."
• naichya (<ruby>泣<rt>な</rt></ruby>っちゃ) — "(if you) cry..."
• yamecha (やめちゃ) — "(if you) quit..."
• shippai shitcha (<ruby>失敗<rt>しっぱい</rt></ruby>しっちゃ) — "(if you) fail..."
• nigecha (<ruby>逃<rt>に</rt></ruby>げちゃ) — "(if you) run..."
• ai shitcha (<ruby>愛<rt>あい</rt></ruby>しっちゃ) — "(if you) love..."
• shinjicha (<ruby>信<rt>しん</rt></ruby>じっちゃ) — "(if you) believe..."
• nonja (<ruby>飲<rt>の</rt></ruby>んじゃ) — "(if you) drink..."
• shinja (<ruby>死<rt>し</rt></ruby>んじゃ) — "(if you) die..."
• yasunja (<ruby>休<rt>やす</rt></ruby>んじゃ) — "(if you) rest..."

${MARKER}`,

  "e34d3207": `Casual contractions in Japanese collapse common phrases for fluidity: わからない → わかんない (wakannai), やはり → やっぱ (yappa), どこか → どっか (dokka), ポケット → ポッケ (pokke). The pattern usually drops a vowel or consonant and inserts a sokuon (small っ) for rhythm. Highly common in spoken Japanese, lyrics, manga.

Each contraction has a register and feel: 〜nai → 〜n nai (Kansai), わかんない (urban casual), やっぱ (Tokyo casual). Some have feminine / masculine leaning, some are neutral. These are PHONOLOGICAL shortcuts more than grammatical patterns.

Mastery of these contractions is essential for parsing spoken Japanese, song lyrics, and modern manga dialogue. They don't change meaning but signal casualness, intimacy, regional flavour, or character voice. Compare with standard forms (more formal, written), other casual contractions covered in batches 4-5 (〜teru, 〜chau, 〜nakya etc).

• wakannai (わかんない) — = wakaranai 'don\'t get it'
• yappa (やっぱ) — = yappari 'as expected / sure enough'
• dokka (どっか) — = dokoka 'somewhere'
• pokke (ポッケ) — = poketto 'pocket'
• shitten no? (<ruby>知<rt>し</rt></ruby>ってんの？) — = shitte iru no 'do you know?'
• kanji wakaran (<ruby>漢字<rt>かんじ</rt></ruby>わからん) — 'I don\'t get kanji'
• sou nan da (そうなんだ) — 'I see / oh really'
• mada-yo (まだーよ) — 'still'
• boku ja nai-yo (<ruby>僕<rt>ぼく</rt></ruby>じゃないよ) — "ain't me"
• shou-ga-nee (しょうがねえ) — = shou ga nai 'can\'t be helped'
• yare-yare (やれやれ) — 'good grief'
• mendoii (<ruby>面倒<rt>めんどう</rt></ruby>ーい) — = mendokusai 'a pain'
• betsu ni (べつに) — 'not particularly / nothing in particular'
• maji (マジ) — 'seriously / for real'
• chigau-yo (<ruby>違<rt>ちが</rt></ruby>うよ) — "you've got it wrong"

${MARKER}`,

  "ad0cab45": `〜mon (〜もん) is a casual reasoning particle — contraction of 〜mono (もの, 'because / it's a thing of'). Used as a sentence-final particle to give a reason / excuse, often with childish, feminine, or whining flavour. wakaranai mon (わからないもん) "because I don't get it (so there)".

The 〜mon adds emotional self-justification — common in children's speech, casual female speech, light pleading. dakara nakitakatta mon (だから<ruby>泣<rt>な</rt></ruby>きたかったもん) "because I felt like crying!". The full form 〜mono is more formal / literary; 〜mon is the spoken contraction.

Compare with 〜kara (because, batch3a — neutral subjective), 〜node (objective because), 〜nan da (explanatory + assertion). 〜mon sits in the casual / childish / pleading reason zone — perfect for character speech in songs and dialogue, especially when the speaker wants to express emotional justification.

• wakaranai mon (わからないもん) — "because I don't get it"
• dakara naita mon (だから<ruby>泣<rt>な</rt></ruby>いたもん) — "that's why I cried"
• boku ga warui mon (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>悪<rt>わる</rt></ruby>いもん) — "because I'm at fault"
• boku no kotoba ga todoitenai mon (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>が<ruby>届<rt>とど</rt></ruby>いてないもん) — "because my words aren't reaching"
• ai shi-te iru mon (<ruby>愛<rt>あい</rt></ruby>しているもん) — "because I love (you)"
• shinpai dakara mon (<ruby>心配<rt>しんぱい</rt></ruby>だからもん) — "because I'm worried"
• kanji ga muzukashii mon (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>難<rt>むずか</rt></ruby>しいもん) — "because kanji is hard"
• mou tsukareta mon (もう<ruby>疲<rt>つか</rt></ruby>れたもん) — "because I'm tired now"
• haru ga konai mon (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>こ</rt></ruby>ないもん) — "because spring isn't coming"
• kimi to issho ni iru kara mon (<ruby>君<rt>きみ</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>にいるからもん) — "because I'm with you"
• boku no sei mon (<ruby>僕<rt>ぼく</rt></ruby>のせいもん) — "because it's my fault"
• yume mitai mon (<ruby>夢<rt>ゆめ</rt></ruby>みたいもん) — "because it's like a dream"
• kotaerare-nai mon (<ruby>答<rt>こた</rt></ruby>えれないもん) — "because I can't answer"
• boku-tachi ga taisetsu dakara mon (<ruby>僕<rt>ぼく</rt></ruby>たちが<ruby>大切<rt>たいせつ</rt></ruby>だからもん) — "because we matter"
• mou hanaretakunai mon (もう<ruby>離<rt>はな</rt></ruby>れたくないもん) — "because I don't want to part"

${MARKER}`,

  "f0bae0d9": `Casual ら抜き (ra-nuki) drops the ら from the potential form of ichidan (Type 2) verbs and certain irregular potentials. taberareru (can eat) → tabereru. mirareru (can see) → mireru. The classical / standard form keeps the ら; ら抜き is the spoken / modern colloquial form. Standard prescriptive grammar disapproves; spoken Japanese embraces it.

Variants: 〜rannai (rough male contraction of 〜rarenai). The drop happens only with potential, not passive — so taberareru as 'can eat' becomes tabereru, but taberareru as 'is eaten' (passive) keeps the ら. Useful disambiguation cue.

Compare with full potential (formal / written), 〜eru / 〜rareru (canonical, batch4a), other casual contractions (batch6b). ら抜き is the modern conversational marker — appears in casual speech, lyrics, manga, and online Japanese. Avoid in formal writing.

• tabereru (<ruby>食<rt>た</rt></ruby>べれる) — = taberareru 'can eat'
• mireru (<ruby>見<rt>み</rt></ruby>れる) — = mirareru 'can see'
• kireru (<ruby>来<rt>こ</rt></ruby>れる) — = korareru 'can come'
• dekireru (できれる) — = dekirareru 'can do'
• shinjireru (<ruby>信<rt>しん</rt></ruby>じれる) — = shinjirareru 'can believe'
• kotaereru (<ruby>答<rt>こた</rt></ruby>えれる) — = kotaerareru 'can answer'
• ai-rannai (<ruby>愛<rt>あい</rt></ruby>らんない) — = ai-rarenai 'can\'t be loved' (rough)
• tabe-rannai (<ruby>食<rt>た</rt></ruby>べらんない) — = taberarenai 'can\'t eat' (rough)
• mire-naki (<ruby>見<rt>み</rt></ruby>れなき) — wait — mienaki?
• boku ga mireru kara (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>見<rt>み</rt></ruby>れるから) — "because I can see"
• kimi ni aereru (<ruby>君<rt>きみ</rt></ruby>に<ruby>会<rt>あ</rt></ruby>えれる) — 'can meet you'
• mata kaereru (また<ruby>帰<rt>かえ</rt></ruby>れる) — 'can come home again'
• mada hashireru (まだ<ruby>走<rt>はし</rt></ruby>れる) — "can still run"
• kanji ga oboereru (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>覚<rt>おぼ</rt></ruby>えれる) — 'can memorise kanji'
• tsutaeru kotereru (<ruby>伝<rt>つた</rt></ruby>えれるこてれる) — 'can convey'

${MARKER}`,

  "0ac68c2b": `Cinematic stacking of te-forms is a rhetorical / poetic device — chaining multiple te-form verbs in succession to create a moving / sequential / cinematic image. In standard prose this would be excessive; in lyrics and poetry, it builds momentum. tatte aruite hashitte tobasete (<ruby>立<rt>た</rt></ruby>って<ruby>歩<rt>ある</rt></ruby>いて<ruby>走<rt>はし</rt></ruby>って<ruby>飛<rt>と</rt></ruby>ばせて) 'stand, walk, run, fly'.

The technique relies on the te-form's connective ability (batch3b) to string actions without explicit conjunctions. Each verb's brief moment compounds into a flowing sequence of action — like a montage in film. Common in J-pop lyrics for transformations, journeys, escape sequences.

Compare with simple te-form chain (1-2 verbs, neutral), 〜nagara (simultaneous, batch2), 〜tari 〜tari (listed examples, batch3a). Cinematic te-form stacking is the lyrical-rhythm device — used when the speaker wants to build emotional / visual momentum through sequential action.

• tatte aruite hashitte tobasete (<ruby>立<rt>た</rt></ruby>って<ruby>歩<rt>ある</rt></ruby>いて<ruby>走<rt>はし</rt></ruby>って<ruby>飛<rt>と</rt></ruby>ばせて) — 'stand, walk, run, fly'
• nigete aruite mata aruite (<ruby>逃<rt>に</rt></ruby>げて<ruby>歩<rt>ある</rt></ruby>いてまた<ruby>歩<rt>ある</rt></ruby>いて) — 'flee, walk, walk again'
• naite waratte naitemo waratte (<ruby>泣<rt>な</rt></ruby>いて<ruby>笑<rt>わら</rt></ruby>って<ruby>泣<rt>な</rt></ruby>いても<ruby>笑<rt>わら</rt></ruby>って) — 'cry, laugh, even when crying laugh'
• dakishimete kissu shite te wo nigite (<ruby>抱<rt>だ</rt></ruby>きしめてキスして<ruby>手<rt>て</rt></ruby>を<ruby>握<rt>にぎ</rt></ruby>って) — 'embrace, kiss, hold hands'
• hashitte tobu nigi-tatatemte (<ruby>走<rt>はし</rt></ruby>って<ruby>飛<rt>と</rt></ruby>ぶ<ruby>握<rt>にぎ</rt></ruby>たたて) — 'run, fly, grasp'
• mukatte nigetemo modotemo (<ruby>向<rt>む</rt></ruby>かって<ruby>逃<rt>に</rt></ruby>げても<ruby>戻<rt>もど</rt></ruby>っても) — 'face it, run, return'
• yume mite damashitete naitete (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>て<ruby>騙<rt>だま</rt></ruby>しっててないてて) — 'dream, deceive, cry'
• kotoba wo katatte mukaette ushinatemo (<ruby>言葉<rt>ことば</rt></ruby>を<ruby>語<rt>かた</rt></ruby>って<ruby>向<rt>む</rt></ruby>かって<ruby>失<rt>うしな</rt></ruby>っても) — 'speak, face, even losing'
• ai shitete tsutaette kanaete (<ruby>愛<rt>あい</rt></ruby>してて<ruby>伝<rt>つた</rt></ruby>えって<ruby>叶<rt>かな</rt></ruby>えて) — 'loving, conveying, granting'
• mukaeau koto ga aru kara nigete kanji (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うことがあるから<ruby>逃<rt>に</rt></ruby>げて<ruby>感<rt>かん</rt></ruby>じ) — 'because there's confronting, run, feel'
• yatte miyou yatte mishishite mata yatte (やってみようやってみししてまたやって) — 'try, try, try again'
• namida wo kakushite egao misete sayonara (<ruby>涙<rt>なみだ</rt></ruby>を<ruby>隠<rt>かく</rt></ruby>して<ruby>笑顔<rt>えがお</rt></ruby><ruby>見<rt>み</rt></ruby>せてさよなら) — 'hide tears, show smile, goodbye'
• boku no kotoba wo katatte kotaette wakareyou (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>を<ruby>語<rt>かた</rt></ruby>って<ruby>答<rt>こた</rt></ruby>えって<ruby>別<rt>わか</rt></ruby>れよう) — 'tell my words, answer, part'
• kanji wo oboete tsukatte naritake (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>覚<rt>おぼ</rt></ruby>えて<ruby>使<rt>つか</rt></ruby>ってなりたけ) — 'memorise, use, become'
• ikiteku ai shi-te ki-eteku (<ruby>生<rt>い</rt></ruby>きてく<ruby>愛<rt>あい</rt></ruby>してき<ruby>消<rt>き</rt></ruby>えてく) — 'live on, love, fade away'

${MARKER}`,

  "90efe3f8": `Classical 〜shi (〜し) is a literary past / sequential / clausal connector. From the classical adjectival auxiliary ki (き). Shi appears at the end of clauses to mark completed past or finished state, with elevated / poetic register. mukashi arishi (<ruby>昔<rt>むかし</rt></ruby>ありし) 'that which once was'.

Distinct from modern 〜shi (the sentence-final / connective particle 〜し meaning 'and / besides') — the classical 〜shi is a verb suffix in the classical past paradigm. Used in poetry, song lyrics, classical / formal prose. Examples in classical texts: omoishi (<ruby>思<rt>おも</rt></ruby>いし) 'that which I thought'.

Compare with modern 〜ta (past), classical 〜ki (predicative past, related), 〜nu (perfect aspect, batch3b but distinct). Classical 〜shi is the elevated literary past — used in song titles and lyrics for archaic flavour, often in romantic or elegiac contexts.

• mukashi arishi (<ruby>昔<rt>むかし</rt></ruby>ありし) — 'that which once was'
• omoi-shi (<ruby>思<rt>おも</rt></ruby>いし) — 'that which (I) thought'
• aishi (<ruby>愛<rt>あい</rt></ruby>し) — 'beloved' (literary)
• naki-shi hi (<ruby>泣<rt>な</rt></ruby>きし<ruby>日<rt>ひ</rt></ruby>) — 'days when (I) cried'
• kanashimishi yoru (<ruby>悲<rt>かな</rt></ruby>しみし<ruby>夜<rt>よる</rt></ruby>) — 'nights when (I) grieved'
• yumemishi (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>し) — 'that which (I) dreamt'
• mukashi mishi sora (<ruby>昔<rt>むかし</rt></ruby><ruby>見<rt>み</rt></ruby>し<ruby>空<rt>そら</rt></ruby>) — 'sky we once saw'
• warai-shi (<ruby>笑<rt>わら</rt></ruby>いし) — 'that which (I) laughed at'
• matashi (<ruby>待<rt>ま</rt></ruby>たし) — 'kept (one) waiting'
• naki-shi tomo (<ruby>泣<rt>な</rt></ruby>きしとも) — 'friends who cried'
• kanashi-shi shitsuren (<ruby>悲<rt>かな</rt></ruby>しし<ruby>失恋<rt>しつれん</rt></ruby>) — 'lost love'
• ashishi (<ruby>会<rt>あ</rt></ruby>いしし) — 'meeting that was' (compound past)
• tsutaeshi kotoba (<ruby>伝<rt>つた</rt></ruby>えし<ruby>言葉<rt>ことば</rt></ruby>) — 'words once conveyed'
• mukaeau-shi mono (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うしもの) — 'that which we faced'
• boku-tachi no kioku ni nokori-shi (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>記憶<rt>きおく</rt></ruby>に<ruby>残<rt>のこ</rt></ruby>りし) — 'that which remains in our memory'

${MARKER}`,

  "8eb4cbfb": `Classical / literary endings 〜ki 〜kana (〜き〜かな) are an exclamatory pairing in classical Japanese poetry. The 〜ki is the classical attributive (= modern 〜i, batch4b); 〜kana is an exclamatory sentence-ending particle expressing wonder / emotion / lament. utsukushiki kana (<ruby>美<rt>うつく</rt></ruby>しきかな) 'how beautiful!'.

Used heavily in waka, haiku, song lyrics, formal prose for elevated emotional emphasis. The 〜kana here is NOT the modern wondering particle (batch3b 〜かな 'I wonder') but the classical EXCLAMATORY particle. Often follows adjectives + ki: kanashiki kana (<ruby>悲<rt>かな</rt></ruby>しきかな) 'how sad!'.

Compare with modern 〜da na (interjection 'isn't it'), 〜nantte (how X! emphatic), 〜nan to (how X — formal). 〜ki 〜kana is the classical lyrical exclamation — perfect for song titles, poetic refrains, elegiac moments. Recognising it unlocks much of lyrical Japanese.

• utsukushiki kana (<ruby>美<rt>うつく</rt></ruby>しきかな) — 'how beautiful!'
• kanashiki kana (<ruby>悲<rt>かな</rt></ruby>しきかな) — 'how sad!'
• ureshiki kana (<ruby>嬉<rt>うれ</rt></ruby>しきかな) — 'how joyful!'
• yasashiki kana (<ruby>優<rt>やさ</rt></ruby>しきかな) — 'how kind!'
• tsuyoki kana (<ruby>強<rt>つよ</rt></ruby>きかな) — 'how strong!'
• atatakaki kana (<ruby>暖<rt>あたた</rt></ruby>かきかな) — 'how warm!'
• tooki kana (<ruby>遠<rt>とお</rt></ruby>きかな) — 'how far!'
• fukaki kana (<ruby>深<rt>ふか</rt></ruby>きかな) — 'how deep!'
• mizukaraki kana (<ruby>瑞々<rt>みずみず</rt></ruby>しきかな) — 'how vivid!'
• kawaiki kana (<ruby>可愛<rt>かわい</rt></ruby>きかな) — 'how cute!'
• tooi tooi haru kana (<ruby>遠<rt>とお</rt></ruby>い<ruby>遠<rt>とお</rt></ruby>い<ruby>春<rt>はる</rt></ruby>かな) — 'how far the spring!'
• mukashi kana (<ruby>昔<rt>むかし</rt></ruby>かな) — 'how long ago!'
• boku-tachi no jikan ki kana (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>きかな) — 'how (precious) is our time!'
• mukaeshiki kana (<ruby>迎<rt>むか</rt></ruby>えしきかな) — 'how we faced (it)!'
• yumemiru kana (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>るかな) — 'oh how (I) dream!'

${MARKER}`,

  "fdb1558f": `Comparative 〜yori + adverb is a productive comparative pattern. 〜yori (than, batch3a) marks the standard of comparison; an adverb modifies the verb to indicate the degree of comparison. mae yori hayaku (<ruby>前<rt>まえ</rt></ruby>より<ruby>速<rt>はや</rt></ruby>く) 'faster than before'. The adverb (in 〜ku form for i-adj, 〜ni for na-adj) gives the comparative dimension.

Common in songs, sports, self-improvement contexts: kinou yori tsuyoku (<ruby>昨日<rt>きのう</rt></ruby>より<ruby>強<rt>つよ</rt></ruby>く) 'stronger than yesterday'. With motto (more), the comparative is intensified: motto yori tsuyoku (more than ever stronger).

Compare with bare 〜yori (just 'than' — simple comparison, batch3a), 〜hou ga (the X is more — preference, batch6a), 〜kurai (extent, batch3a). Comparative 〜yori + adverb is the dynamic / motion-oriented comparative — perfect for songs about growth, change, surpassing previous states.

• mae yori hayaku (<ruby>前<rt>まえ</rt></ruby>より<ruby>速<rt>はや</rt></ruby>く) — 'faster than before'
• kinou yori tsuyoku (<ruby>昨日<rt>きのう</rt></ruby>より<ruby>強<rt>つよ</rt></ruby>く) — 'stronger than yesterday'
• mukashi yori utsukushiku (<ruby>昔<rt>むかし</rt></ruby>より<ruby>美<rt>うつく</rt></ruby>しく) — 'more beautiful than the past'
• boku yori jouzu (<ruby>僕<rt>ぼく</rt></ruby>より<ruby>上手<rt>じょうず</rt></ruby>) — 'better than me'
• ima yori takaku (<ruby>今<rt>いま</rt></ruby>より<ruby>高<rt>たか</rt></ruby>く) — 'higher than now'
• nani yori taisetsu (<ruby>何<rt>なに</rt></ruby>より<ruby>大切<rt>たいせつ</rt></ruby>) — 'more precious than anything'
• kotoba yori egao (<ruby>言葉<rt>ことば</rt></ruby>より<ruby>笑顔<rt>えがお</rt></ruby>) — 'smiles more than words'
• mae yori shizuka ni (<ruby>前<rt>まえ</rt></ruby>より<ruby>静<rt>しず</rt></ruby>かに) — 'more quietly than before'
• boku yori sukoshi tsuyoku (<ruby>僕<rt>ぼく</rt></ruby>より<ruby>少<rt>すこ</rt></ruby>し<ruby>強<rt>つよ</rt></ruby>く) — 'a little stronger than me'
• ano hi yori tooku (あの<ruby>日<rt>ひ</rt></ruby>より<ruby>遠<rt>とお</rt></ruby>く) — 'farther than that day'
• mae yori shinjirareru (<ruby>前<rt>まえ</rt></ruby>より<ruby>信<rt>しん</rt></ruby>じられる) — 'more believable than before'
• kimi yori boku ga shinpai (<ruby>君<rt>きみ</rt></ruby>より<ruby>僕<rt>ぼく</rt></ruby>が<ruby>心配<rt>しんぱい</rt></ruby>) — "I'm more worried than you"
• mukashi yori hayaku hashireru (<ruby>昔<rt>むかし</rt></ruby>より<ruby>速<rt>はや</rt></ruby>く<ruby>走<rt>はし</rt></ruby>れる) — 'can run faster than before'
• kanji yori hiragana ga kantan (<ruby>漢字<rt>かんじ</rt></ruby>よりひらがなが<ruby>簡単<rt>かんたん</rt></ruby>) — 'hiragana is easier than kanji'
• boku-tachi no ai wa nani yori tsuyoi (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>愛<rt>あい</rt></ruby>は<ruby>何<rt>なに</rt></ruby>より<ruby>強<rt>つよ</rt></ruby>い) — 'our love is stronger than anything'

${MARKER}`,

  "6607b521": `Compound stem chaining 〜tsuzuke (〜<ruby>続<rt>つづ</rt></ruby>け) attaches the masu-stem of tsuzukeru ('to continue') to a verb's masu-stem to form a compound stem. Means 'keep V-ing' as a NOUN or stem-form, not a finite verb. Often appears in titled lyrics, fixed phrases, or chain-construction (batch1's 〜tsuzukeru is the verb form; this is the stem-only chain form).

The stem-form lets the construction modify nouns: ai shi-tsuzuke no hibi (<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>けの<ruby>日々<rt>ひび</rt></ruby>) 'days of continuous loving'. Or appears as a compound-noun chain: tsuzuke no kotoba (<ruby>続<rt>つづ</rt></ruby>けの<ruby>言葉<rt>ことば</rt></ruby>) 'continuing words'.

Compare with verb 〜tsuzukeru (batch1, finite form), 〜nagara (while, batch2). Compound stem 〜tsuzuke is a more LITERARY / NOMINALISED variant — used in song titles and elevated prose where the continuation is itself the focus.

• ai shi-tsuzuke (<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>け) — 'continuous loving'
• shinji-tsuzuke (<ruby>信<rt>しん</rt></ruby>じ<ruby>続<rt>つづ</rt></ruby>け) — 'continuous believing'
• mamori-tsuzuke (<ruby>守<rt>まも</rt></ruby>り<ruby>続<rt>つづ</rt></ruby>け) — 'continuous protecting'
• warai-tsuzuke (<ruby>笑<rt>わら</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>け) — 'continuous smiling'
• naki-tsuzuke (<ruby>泣<rt>な</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>け) — 'continuous crying'
• mukai-tsuzuke (<ruby>向<rt>む</rt></ruby>かい<ruby>続<rt>つづ</rt></ruby>け) — 'continuous heading toward'
• hashiri-tsuzuke (<ruby>走<rt>はし</rt></ruby>り<ruby>続<rt>つづ</rt></ruby>け) — 'continuous running'
• matsuri-tsuzuke (<ruby>待<rt>ま</rt></ruby>つり<ruby>続<rt>つづ</rt></ruby>け) — 'continuous waiting'
• tsutaetsuzuke (<ruby>伝<rt>つた</rt></ruby>え<ruby>続<rt>つづ</rt></ruby>け) — 'continuous conveying'
• ikiru tsuzuke (<ruby>生<rt>い</rt></ruby>きる<ruby>続<rt>つづ</rt></ruby>け) — 'continuous living'
• yume mi-tsuzuke (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby><ruby>続<rt>つづ</rt></ruby>け) — 'continuous dreaming'
• kanjite-tsuzuke (<ruby>感<rt>かん</rt></ruby>じて<ruby>続<rt>つづ</rt></ruby>け) — 'continuous feeling'
• kanji wo benkyou-tsuzuke (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby><ruby>続<rt>つづ</rt></ruby>け) — 'continuous kanji study'
• boku no kotoba wo tsutae-tsuzuke (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>を<ruby>伝<rt>つた</rt></ruby>え<ruby>続<rt>つづ</rt></ruby>け) — 'continuous conveying of my words'
• boku-tachi no jikan no tsuzuke (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>の<ruby>続<rt>つづ</rt></ruby>け) — 'continuation of our time'

${MARKER}`,

  "781066f3": `Compound suffix 〜dasu (〜<ruby>出<rt>だ</rt></ruby>す) attaches the verb dasu ('put / take out') to a verb's masu-stem. Distinct from batch3a's 〜だす (sudden onset) — same kanji 出, different aspectual flavour. The compound suffix sense is 'do X out / draw out / extract by X-ing'. tori-dasu (<ruby>取<rt>と</rt></ruby>り<ruby>出<rt>だ</rt></ruby>す) 'take out / extract'.

Common compound verbs use this productively: kaki-dasu (<ruby>書<rt>か</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) 'write out / list', oi-dasu (<ruby>追<rt>お</rt></ruby>い<ruby>出<rt>だ</rt></ruby>す) 'chase out / expel', mukai-dasu (向かい出す) 'face / set out toward'. The 〜dasu adds a DIRECTIONAL EXTRACTION sense — moving something OUT of an enclosed state.

Compare with batch3a's 〜dasu (sudden inception — naki-dasu burst into tears), 〜komu (deeply / into — opposite direction, batch6b), 〜nuku (through to the end). Compound suffix 〜dasu is the EXTRACTION / OUTWARD-MOTION marker — not 'sudden begin' but 'pull out by V-ing'.

• tori-dasu (<ruby>取<rt>と</rt></ruby>り<ruby>出<rt>だ</rt></ruby>す) — 'take out / extract'
• kaki-dasu (<ruby>書<rt>か</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'write out / list'
• oi-dasu (<ruby>追<rt>お</rt></ruby>い<ruby>出<rt>だ</rt></ruby>す) — 'chase out / expel'
• mukai-dasu (<ruby>向<rt>む</rt></ruby>かい<ruby>出<rt>だ</rt></ruby>す) — 'set out toward'
• yobi-dasu (<ruby>呼<rt>よ</rt></ruby>び<ruby>出<rt>だ</rt></ruby>す) — 'call out / summon'
• motte-dasu (<ruby>持<rt>も</rt></ruby>ち<ruby>出<rt>だ</rt></ruby>す) — 'bring out / take along'
• kasoku-dasu (<ruby>加速<rt>かそく</rt></ruby><ruby>出<rt>だ</rt></ruby>す) — 'accelerate out'
• kane wo dashi-dasu (<ruby>金<rt>かね</rt></ruby>を<ruby>出<rt>だ</rt></ruby>し<ruby>出<rt>だ</rt></ruby>す) — 'pull out money'
• shippai wo dasu (<ruby>失敗<rt>しっぱい</rt></ruby>を<ruby>出<rt>だ</rt></ruby>す) — 'produce failure'
• ai wo tsutae-dasu (<ruby>愛<rt>あい</rt></ruby>を<ruby>伝<rt>つた</rt></ruby>え<ruby>出<rt>だ</rt></ruby>す) — 'convey love outward'
• kanji wo idashidasu (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>引<rt>ひ</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'pull out kanji'
• yume wo katai-dasu (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>語<rt>かた</rt></ruby>り<ruby>出<rt>だ</rt></ruby>す) — 'speak out the dream'
• boku no namida wo morashite-dasu (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>をもらして<ruby>出<rt>だ</rt></ruby>す) — 'let my tears spill out'
• kanji ni kakidasu (<ruby>感<rt>かん</rt></ruby>じに<ruby>書<rt>か</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'write out as feeling'
• boku-tachi no kioku wo idashi-dasu (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>記憶<rt>きおく</rt></ruby>を<ruby>引<rt>ひ</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'pull out our memories'

${MARKER}`,

  "8b2bd6c4": `Compound suffix 〜nukeru (〜<ruby>抜<rt>ぬ</rt></ruby>ける) attaches nukeru ('to slip through / escape') to a verb's masu-stem. Means 'pass through completely / make it through (an obstacle)'. tobi-nukeru (<ruby>飛<rt>と</rt></ruby>び<ruby>抜<rt>ぬ</rt></ruby>ける) 'leap through / stand out'. Conjugates as a regular ichidan verb.

The structure carries connotations of breaking through, surviving, or escaping. Often used in lyrics about overcoming obstacles or reaching the other side: kake-nukeru (<ruby>駆<rt>か</rt></ruby>け<ruby>抜<rt>ぬ</rt></ruby>ける) 'race through'. Distinct from 〜nuku (compound 'V to the end' — no 'through' sense).

Compare with 〜nuku (V to the end / completion), 〜komu (deeply / into — opposite, batch6b), 〜dasu (out-extraction, batch6b). Compound suffix 〜nukeru is the THROUGH-and-OUT motion marker — perfect for songs about surviving, escaping, or transcending.

• kake-nukeru (<ruby>駆<rt>か</rt></ruby>け<ruby>抜<rt>ぬ</rt></ruby>ける) — 'race through'
• tobi-nukeru (<ruby>飛<rt>と</rt></ruby>び<ruby>抜<rt>ぬ</rt></ruby>ける) — 'leap through / stand out'
• ki-nukeru (<ruby>切<rt>き</rt></ruby>り<ruby>抜<rt>ぬ</rt></ruby>ける) — 'cut through / get through'
• tooshi-nukeru (<ruby>通<rt>とお</rt></ruby>し<ruby>抜<rt>ぬ</rt></ruby>ける) — 'pass through'
• kuguri-nukeru (くぐり<ruby>抜<rt>ぬ</rt></ruby>ける) — 'duck through'
• tsuki-nukeru (<ruby>突<rt>つ</rt></ruby>き<ruby>抜<rt>ぬ</rt></ruby>ける) — 'punch / pierce through'
• yari-nukeru (やり<ruby>抜<rt>ぬ</rt></ruby>ける) — 'see (it) through'
• ikinukeru (<ruby>生<rt>い</rt></ruby>き<ruby>抜<rt>ぬ</rt></ruby>ける) — 'survive'
• arashi wo kake-nukeru (<ruby>嵐<rt>あらし</rt></ruby>を<ruby>駆<rt>か</rt></ruby>け<ruby>抜<rt>ぬ</rt></ruby>ける) — 'race through the storm'
• kabe wo tsuki-nukeru (<ruby>壁<rt>かべ</rt></ruby>を<ruby>突<rt>つ</rt></ruby>き<ruby>抜<rt>ぬ</rt></ruby>ける) — 'punch through the wall'
• jikan wo kake-nukeru (<ruby>時間<rt>じかん</rt></ruby>を<ruby>駆<rt>か</rt></ruby>け<ruby>抜<rt>ぬ</rt></ruby>ける) — 'race through time'
• boku-tachi wo tsuki-nukeru hikari (<ruby>僕<rt>ぼく</rt></ruby>たちを<ruby>突<rt>つ</rt></ruby>き<ruby>抜<rt>ぬ</rt></ruby>ける<ruby>光<rt>ひかり</rt></ruby>) — 'light that pierces through us'
• yamiyo wo kake-nukeru (<ruby>闇夜<rt>やみよ</rt></ruby>を<ruby>駆<rt>か</rt></ruby>け<ruby>抜<rt>ぬ</rt></ruby>ける) — 'race through the dark night'
• unmei wo kake-nukeru (<ruby>運命<rt>うんめい</rt></ruby>を<ruby>駆<rt>か</rt></ruby>け<ruby>抜<rt>ぬ</rt></ruby>ける) — 'race through fate'
• boku no koe wa kabe wo tsuki-nukeru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>は<ruby>壁<rt>かべ</rt></ruby>を<ruby>突<rt>つ</rt></ruby>き<ruby>抜<rt>ぬ</rt></ruby>ける) — 'my voice pierces walls'

${MARKER}`,

  "94848eed": `Compound suffix 〜komu (〜<ruby>込<rt>こ</rt></ruby>む) attaches komu ('to be packed / crowded') to a verb's masu-stem. Means 'do X deeply / into / inwardly'. The structure adds INWARD motion or thorough penetration to the base verb. omoi-komu (<ruby>思<rt>おも</rt></ruby>い<ruby>込<rt>こ</rt></ruby>む) 'be convinced / believe deeply'. tobi-komu (<ruby>飛<rt>と</rt></ruby>び<ruby>込<rt>こ</rt></ruby>む) 'jump into'.

Common compound verbs: hairi-komu (slip into), naki-komu (cry intensely / burst into tears), kaite-komu (deep into writing). The 〜komu adds depth, intensity, or destination-arrival. Distinct from 〜dasu (out-extraction, batch6b — opposite direction).

Compare with 〜nukeru (through-and-out, batch6b), 〜tsuzukeru (continue), 〜komu (this — into / deeply). Compound suffix 〜komu is the INWARD / DEEP motion marker — perfect for songs and prose about absorption, arrival, immersion, fixation.

• tobi-komu (<ruby>飛<rt>と</rt></ruby>び<ruby>込<rt>こ</rt></ruby>む) — 'jump into'
• omoi-komu (<ruby>思<rt>おも</rt></ruby>い<ruby>込<rt>こ</rt></ruby>む) — 'be convinced'
• hairi-komu (<ruby>入<rt>はい</rt></ruby>り<ruby>込<rt>こ</rt></ruby>む) — 'slip / squeeze into'
• naki-komu (<ruby>泣<rt>な</rt></ruby>き<ruby>込<rt>こ</rt></ruby>む) — 'cry intensely'
• kaki-komu (<ruby>書<rt>か</rt></ruby>き<ruby>込<rt>こ</rt></ruby>む) — 'write into / fill in'
• yobikomu (<ruby>呼<rt>よ</rt></ruby>び<ruby>込<rt>こ</rt></ruby>む) — 'call into / draw in'
• mochi-komu (<ruby>持<rt>も</rt></ruby>ち<ruby>込<rt>こ</rt></ruby>む) — 'bring in'
• shimekomu (<ruby>閉<rt>し</rt></ruby>め<ruby>込<rt>こ</rt></ruby>む) — 'shut in / lock in'
• ki-komu (<ruby>切<rt>き</rt></ruby>り<ruby>込<rt>こ</rt></ruby>む) — 'cut into'
• boku no kokoro ni hairi-komu (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>に<ruby>入<rt>はい</rt></ruby>り<ruby>込<rt>こ</rt></ruby>む) — 'enter my heart'
• yume ni nomi-komu (<ruby>夢<rt>ゆめ</rt></ruby>に<ruby>飲<rt>の</rt></ruby>み<ruby>込<rt>こ</rt></ruby>む) — 'be swallowed by the dream'
• kanji wo oboe-komu (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>覚<rt>おぼ</rt></ruby>え<ruby>込<rt>こ</rt></ruby>む) — 'memorise kanji deeply'
• ai wo nomi-komu (<ruby>愛<rt>あい</rt></ruby>を<ruby>飲<rt>の</rt></ruby>み<ruby>込<rt>こ</rt></ruby>む) — 'swallow love'
• kanashimi ni shizumi-komu (<ruby>悲<rt>かな</rt></ruby>しみに<ruby>沈<rt>しず</rt></ruby>み<ruby>込<rt>こ</rt></ruby>む) — 'sink deep into sadness'
• boku-tachi no kioku ni nokori-komu (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>記憶<rt>きおく</rt></ruby>に<ruby>残<rt>のこ</rt></ruby>り<ruby>込<rt>こ</rt></ruby>む) — 'embed deep in our memories'

${MARKER}`,

  "0ff96aa8": `Compound verb suffix 〜nuku / 〜dasu (〜<ruby>抜<rt>ぬ</rt></ruby>く / 〜<ruby>出<rt>だ</rt></ruby>す) appears as a paired family of completion / direction suffixes. 〜nuku ('to do completely, to the end' — through difficulty); 〜dasu ('to put out / produce / start') — see batch3a for the inception sense and batch6b for the extraction sense. Together they form a productive compound paradigm.

Many verbs accept both: ikinuku (<ruby>生<rt>い</rt></ruby>き<ruby>抜<rt>ぬ</rt></ruby>く 'survive' = live + through-end) vs. iki-dasu (start living). yari-nuku (やり<ruby>抜<rt>ぬ</rt></ruby>く 'see it through') vs. yari-dasu (start doing). Recognising the paired structure helps parse compound verbs in prose.

Compare with 〜tsuzukeru (continue, simple), 〜komu (into, batch6b), 〜nukeru (through-and-out, batch6b). The 〜nuku / 〜dasu pairing is foundational compound-verb knowledge — appears in countless verbs, especially literary / lyrical ones.

• ikinuku (<ruby>生<rt>い</rt></ruby>き<ruby>抜<rt>ぬ</rt></ruby>く) — 'survive'
• yari-nuku (やり<ruby>抜<rt>ぬ</rt></ruby>く) — 'see (it) through'
• mochi-nuku (<ruby>持<rt>も</rt></ruby>ち<ruby>抜<rt>ぬ</rt></ruby>く) — 'hold to the end'
• kakei-nuku (<ruby>欠<rt>か</rt></ruby>けい<ruby>抜<rt>ぬ</rt></ruby>く) — 'see through fully'
• kake-dasu (<ruby>駆<rt>か</rt></ruby>け<ruby>出<rt>だ</rt></ruby>す) — 'set out / start running'
• kaki-dasu (<ruby>書<rt>か</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'write out'
• tabi-dasu (<ruby>旅<rt>たび</rt></ruby><ruby>出<rt>だ</rt></ruby>す) — 'set out on a journey'
• tobi-dasu (<ruby>飛<rt>と</rt></ruby>び<ruby>出<rt>だ</rt></ruby>す) — 'jump out'
• ai-shi-nuku (<ruby>愛<rt>あい</rt></ruby>し<ruby>抜<rt>ぬ</rt></ruby>く) — 'love completely / to the end'
• shinji-nuku (<ruby>信<rt>しん</rt></ruby>じ<ruby>抜<rt>ぬ</rt></ruby>く) — 'believe completely / to the end'
• yume wo oi-nuku (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>抜<rt>ぬ</rt></ruby>く) — 'chase the dream to the end'
• kanji wo oboe-nuku (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>覚<rt>おぼ</rt></ruby>え<ruby>抜<rt>ぬ</rt></ruby>く) — 'memorise kanji to the end'
• boku no chikara wo dashi-dasu (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>力<rt>ちから</rt></ruby>を<ruby>出<rt>だ</rt></ruby>し<ruby>出<rt>だ</rt></ruby>す) — 'pull out my strength'
• mukaeau-nuku (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>い<ruby>抜<rt>ぬ</rt></ruby>く) — 'face (it) to the end'
• kotaeru-nuku (<ruby>答<rt>こた</rt></ruby>える<ruby>抜<rt>ぬ</rt></ruby>く) — 'answer to the end'

${MARKER}`,

  "645340f4": `V + V compounds 〜<ruby>落<rt>お</rt></ruby>ちる / 〜<ruby>去<rt>さ</rt></ruby>る / 〜<ruby>乗<rt>の</rt></ruby>せる are productive ways to add directional or completive meaning to verbs. ochiru ('fall'), saru ('leave / be gone'), noseru ('place onto'). Each modifier adds a specific motion or completion: drop down, go away, place upward.

Common compound verbs: hi-ochiru (<ruby>引<rt>ひ</rt></ruby>き<ruby>落<rt>お</rt></ruby>ちる) 'pull down', tachi-saru (<ruby>立<rt>た</rt></ruby>ち<ruby>去<rt>さ</rt></ruby>る) 'leave / depart', mochi-noseru (<ruby>持<rt>も</rt></ruby>ち<ruby>乗<rt>の</rt></ruby>せる) 'place / load on'. The pattern allows precise directional expression by stacking primary action + directional modifier.

Compare with 〜nukeru (through-and-out, batch6b), 〜komu (into, batch6b), 〜nuku/〜dasu (completion, batch6b). V+V compounds are foundational productive Japanese morphology — appear constantly in lyrics, prose, news. Mastering the common modifiers (落ちる/去る/乗せる/込む/抜く/出す/上がる/下がる) unlocks ~30% of verb compounds.

• hi-ochiru (<ruby>引<rt>ひ</rt></ruby>き<ruby>落<rt>お</rt></ruby>ちる) — 'pull down'
• tachi-saru (<ruby>立<rt>た</rt></ruby>ち<ruby>去<rt>さ</rt></ruby>る) — 'leave / depart'
• mochi-noseru (<ruby>持<rt>も</rt></ruby>ち<ruby>乗<rt>の</rt></ruby>せる) — 'place / load on'
• tachi-noru (<ruby>立<rt>た</rt></ruby>ち<ruby>乗<rt>の</rt></ruby>る) — 'stand-ride / mount'
• ki-saru (<ruby>切<rt>き</rt></ruby>り<ruby>去<rt>さ</rt></ruby>る) — 'cut off / cut away'
• tobi-saru (<ruby>飛<rt>と</rt></ruby>び<ruby>去<rt>さ</rt></ruby>る) — 'fly away'
• tsuranuku-noseru (<ruby>貫<rt>つらぬ</rt></ruby>く<ruby>乗<rt>の</rt></ruby>せる) — 'pierce-load' (rare)
• ware-ochiru (<ruby>割<rt>わ</rt></ruby>れ<ruby>落<rt>お</rt></ruby>ちる) — 'crack and fall'
• boku ga aruki-saru (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>歩<rt>ある</rt></ruby>き<ruby>去<rt>さ</rt></ruby>る) — 'I walk away'
• yume ga sugi-saru (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>過<rt>す</rt></ruby>ぎ<ruby>去<rt>さ</rt></ruby>る) — 'the dream passes away'
• namida ga koboreochiru (<ruby>涙<rt>なみだ</rt></ruby>がこぼれ<ruby>落<rt>お</rt></ruby>ちる) — 'tears spill and fall'
• jikan ga sugi-saru (<ruby>時間<rt>じかん</rt></ruby>が<ruby>過<rt>す</rt></ruby>ぎ<ruby>去<rt>さ</rt></ruby>る) — 'time passes away'
• boku no namida ga ochiru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>が<ruby>落<rt>お</rt></ruby>ちる) — 'my tears fall'
• ai ga kie-saru (<ruby>愛<rt>あい</rt></ruby>が<ruby>消<rt>き</rt></ruby>え<ruby>去<rt>さ</rt></ruby>る) — 'love disappears'
• boku no kotoba wo nose-saru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>を<ruby>乗<rt>の</rt></ruby>せ<ruby>去<rt>さ</rt></ruby>る) — 'carry my words away'

${MARKER}`,

  "0e767da7": `donna ni 〜tatte (どんなに〜たって) is a paired construction. donna ni ('how / no matter how') + 〜tatte (casual concessive 'even if', batch2). Means 'no matter how (much) X'. Strong concessive emphasising that the action / state, however extreme, doesn't matter. donna ni naitatte (どんなに<ruby>泣<rt>な</rt></ruby>いたって) 'no matter how much (you) cry'.

The donna ni at the front quantifies the concession — emphasises EXTREME degree. The 〜tatte at the end marks casual concessive. Together: 'even at the maximum extent of X, Y still / doesn't change'. Common in songs of unwavering commitment, love declarations, defiance.

Compare with batch3b's tatoe〜demo (strong but no quantifier), 〜noni (despite — actual contradiction, batch2), 〜tatte alone (casual concession, batch2). donna ni 〜tatte is uniquely about EXTREME-DEGREE concession — perfect for songs about love that endures any test, hope that survives any blow.

• donna ni naitatte (どんなに<ruby>泣<rt>な</rt></ruby>いたって) — 'no matter how much (you) cry'
• donna ni tooku tatte (どんなに<ruby>遠<rt>とお</rt></ruby>くたって) — 'no matter how far'
• donna ni kanashikutta tte (どんなに<ruby>悲<rt>かな</rt></ruby>しくったって) — 'no matter how sad'
• donna ni tsurakutta tte (どんなに<ruby>辛<rt>つら</rt></ruby>くったって) — 'no matter how painful'
• donna ni machi gatta tte (どんなに<ruby>間違<rt>まちが</rt></ruby>ったって) — 'no matter how wrong'
• donna ni hashitta tte (どんなに<ruby>走<rt>はし</rt></ruby>ったって) — 'no matter how much (we) run'
• donna ni warawa tte (どんなに<ruby>笑<rt>わら</rt></ruby>わって) — 'no matter how much (we) laugh'
• donna ni nuide mo tte (どんなに<ruby>脱<rt>ぬ</rt></ruby>いでもって) — 'no matter how much we strip away'
• donna ni boku ga yowakute mo tte (どんなに<ruby>僕<rt>ぼく</rt></ruby>が<ruby>弱<rt>よわ</rt></ruby>くてもって) — 'no matter how weak I am'
• donna ni yume mitatte (どんなに<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>たって) — 'no matter how much (we) dream'
• donna ni shinjiyou tatte (どんなに<ruby>信<rt>しん</rt></ruby>じようたって) — 'no matter how much (we) try to believe'
• donna ni jikan ga sugitatta tte (どんなに<ruby>時間<rt>じかん</rt></ruby>が<ruby>過<rt>す</rt></ruby>ぎたったって) — 'no matter how much time passes'
• donna ni hanaretatte (どんなに<ruby>離<rt>はな</rt></ruby>れたって) — 'no matter how far apart'
• donna ni kotoba ni shitatte (どんなに<ruby>言葉<rt>ことば</rt></ruby>にしたって) — 'no matter how much I put into words'
• donna ni boku ga kawattatte (どんなに<ruby>僕<rt>ぼく</rt></ruby>が<ruby>変<rt>か</rt></ruby>わったって) — 'no matter how I change'

${MARKER}`,

  "8fe73b63": `Conditional stack 〜te shimaetara (〜てしまえたら) combines 〜te shimau (completion / regret, batch1) + 〜eru (potential, batch4a) + 〜tara (conditional, batch1). Means 'if I could fully X / if X could be completed'. The triple stack expresses a hypothetical wish for full completion of an action. wasurete shimaetara (<ruby>忘<rt>わす</rt></ruby>れてしまえたら) "if only I could fully forget".

Common in songs of regret and longing — the speaker wishes they could finish / complete an emotional action but cannot. The 〜tara conditional makes it an unfulfilled hypothetical: 'if it were possible to fully X (then Y)'.

Compare with bare 〜te shimau (completion, batch1), 〜eru (just potential, batch4a), 〜tara ii noni (if only, batch5a). Conditional stack 〜te shimaetara is a sophisticated combination — used in literary / lyrical Japanese for the wish to complete inherently incomplete actions (forgetting, letting go, ending).

• wasurete shimaetara (<ruby>忘<rt>わす</rt></ruby>れてしまえたら) — "if only I could fully forget"
• kowashi-te shimaetara (<ruby>壊<rt>こわ</rt></ruby>してしまえたら) — "if only I could completely break (it)"
• tabe-te shimaetara (<ruby>食<rt>た</rt></ruby>べてしまえたら) — "if only I could eat (it) all"
• yamete shimaetara (やめてしまえたら) — "if only I could fully quit"
• ushinatte shimaetara (<ruby>失<rt>うしな</rt></ruby>ってしまえたら) — "if only I could fully lose (it)"
• kotaete shimaetara (<ruby>答<rt>こた</rt></ruby>えてしまえたら) — "if only I could fully answer"
• tsutaete shimaetara (<ruby>伝<rt>つた</rt></ruby>えてしまえたら) — "if only I could fully convey"
• damatte shimaetara (<ruby>黙<rt>だま</rt></ruby>ってしまえたら) — "if only I could stay fully silent"
• shini-te shimaetara (<ruby>死<rt>し</rt></ruby>んでしまえたら) — "if only I could fully die" (heavy)
• boku ga inakune natte shimaetara (<ruby>僕<rt>ぼく</rt></ruby>がいなくなってしまえたら) — "if only I could fully disappear"
• naite shimaetara (<ruby>泣<rt>な</rt></ruby>いてしまえたら) — "if only I could fully cry"
• ai shi-te shimaetara (<ruby>愛<rt>あい</rt></ruby>してしまえたら) — "if only I could fully love"
• kanaete shimaetara (<ruby>叶<rt>かな</rt></ruby>えてしまえたら) — "if only it could fully come true"
• kioku wo keshite shimaetara (<ruby>記憶<rt>きおく</rt></ruby>を<ruby>消<rt>け</rt></ruby>してしまえたら) — "if only I could fully erase memory"
• kanji wo zenbu oboete shimaetara (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>覚<rt>おぼ</rt></ruby>えてしまえたら) — "if only I could memorise all kanji"

${MARKER}`,

  "ee51e034": `〜tanara / 〜raretanara (〜たなら / 〜られたなら) is a counterfactual conditional. Take a verb's past form (〜ta) + nara (topic conditional, batch1). Or potential + 〜tanara: 〜raretanara. Means 'if I had / if (it) had been / if I could have'. Marks unfulfilled past possibility. mireta nara (<ruby>見<rt>み</rt></ruby>れたなら) "if I had been able to see".

Common in songs of regret about the past: aitanara (<ruby>会<rt>あ</rt></ruby>いたなら) 'if (we) had met'. The nara softens the conditional and lends a sense of 'in that case, things would have been different'. Often paired with 〜noni (despite / but, batch2) for full counterfactual lament: aetanara, ii noni 'if we could have met, it would have been good'.

Compare with 〜tara (sequential / discovery conditional, batch1), 〜ba (logical conditional, batch1), 〜nara (topic conditional, batch1), 〜tara ii noni (regretful wish, batch5a). 〜tanara / 〜raretanara is the past-counterfactual marker — uniquely backward-looking, perfect for songs about lost chances.

• mireta nara (<ruby>見<rt>み</rt></ruby>れたなら) — "if I had been able to see"
• aetanara (<ruby>会<rt>あ</rt></ruby>えたなら) — "if (we) had been able to meet"
• kotaeretanara (<ruby>答<rt>こた</rt></ruby>えれたなら) — "if I had been able to answer"
• shinjireta nara (<ruby>信<rt>しん</rt></ruby>じれたなら) — "if I had been able to believe"
• ai-shi-eretanara (<ruby>愛<rt>あい</rt></ruby>しえれたなら) — "if I had been able to love"
• mukaeau-eretanara (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>えれたなら) — "if I had been able to face it"
• tsutaeretanara (<ruby>伝<rt>つた</rt></ruby>えれたなら) — "if I had been able to convey"
• mamore-tanara (<ruby>守<rt>まも</rt></ruby>れたなら) — "if I had been able to protect"
• yume ga kanareta nara (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>叶<rt>かな</rt></ruby>れたなら) — "if the dream had come true"
• kotoba ga todoita nara (<ruby>言葉<rt>ことば</rt></ruby>が<ruby>届<rt>とど</rt></ruby>いたなら) — "if (my) words had reached"
• boku ga inakatta nara (<ruby>僕<rt>ぼく</rt></ruby>がいなかったなら) — "if I hadn't been there"
• mou kawareta nara (もう<ruby>変<rt>か</rt></ruby>われたなら) — "if I could already have changed"
• modore-tanara (<ruby>戻<rt>もど</rt></ruby>れたなら) — "if I could have gone back"
• boku-tachi ga deetanara (<ruby>僕<rt>ぼく</rt></ruby>たちが<ruby>出<rt>で</rt></ruby>えたなら) — "if we had been able to step out"
• boku no koe ga kikoeretanara (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>が<ruby>聞<rt>き</rt></ruby>こえれたなら) — "if my voice could have been heard"

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
