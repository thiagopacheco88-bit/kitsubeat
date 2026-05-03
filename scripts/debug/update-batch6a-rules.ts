/**
 * Batch 6a — 25 v2 grammar rule explanations.
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "74492d07": "〜hazu no nai (〜はずのない) — impossible that / cannot be",
  "85d0b4b9": "〜nakatta (〜なかった) — past negative (didn't / couldn't)",
  "66607f63": "〜no ka (〜のか) — rhetorical / emphatic question",
  "6f43bb26": "〜no kana (〜のかな) — I wonder if (compound)",
  "4f946a7b": "〜no sei (〜のせい) — because of / blame on",
  "bfee67fe": "〜no mama ni (〜のままに) — as it is / following along",
  "0f81aa3c": "〜no hou ga (〜の方が) — the X one is more (comparative)",
  "7f805eca": "〜wa shinai (〜はしない) — emphatic negation (won't even)",
  "fcd4142b": "〜hajimeru (〜はじめる / 〜始める) — begin to",
  "9fa079a5": "〜beki (〜べき) — should / ought to (moral)",
  "a0e00979": "〜masu you ni (〜ますように) — may it be / wish prayer",
  "4c36f71d": "〜mamire (〜まみれ) — covered in / smeared with",
  "b67ce8fc": "marude 〜no you ni (まるで〜のように) — just like / exactly as if",
  "3298d59f": "〜mo 〜mo (〜も〜も) — both X and Y",
  "49a2dab5": "〜yuku (〜ゆく) — literary 'to go' (vs. iku)",
  "74b4a502": "〜you ni suru (〜ようにする) — make sure to / try to (habituate)",
  "d85daf5b": "〜o koete (〜を超えて) — to surpass / beyond",
  "7d3cac62": "〜o oikosu (〜を追い越す) — to overtake / surpass",
  "40bb1891": "〜n ja nai no (〜んじゃないの) — isn't it that / could it be",
  "4c081e42": "〜wake ni wa ikanai (〜わけにはいかない) — can't / shouldn't (social)",
  "312577e4": "〜mae ni (〜前に) — before X (temporal)",
  "54e4ec9d": "〜yue ni (〜故に) — because of / on account of (formal)",
  "57d21878": "sekkaku 〜noni / kara (せっかく〜のに/から) — after all the trouble",
  "82528077": "douka (どうか) — please / somehow (formal plea)",
  "5b163db1": "mo (も) — also / too / even (basic particle)",
};

const REWRITES: Record<string, string> = {
  "74492d07": `〜hazu no nai (〜はずのない) extends 〜hazu (logical expectation, batch3a) with の (attributive linker) + nai (negative). Modifies a following noun: 'X that should not be / X that cannot be'. atta hazu no nai mono (<ruby>あった<rt></rt></ruby>はずのないもの) 'something that shouldn't have existed'. The structure asserts that the noun being described is logically impossible.

Distinct from batch3b's 〜hazu ga nai (sentence-final 'no way'). 〜hazu no nai modifies a noun and lives inside a noun phrase. Common in lyrics for impossible feelings, vanished things, paradoxical states: tsunagaru hazu no nai te (<ruby>繋<rt>つな</rt></ruby>がるはずのない<ruby>手<rt>て</rt></ruby>) 'a hand that shouldn't connect'.

Compare with 〜hazu ga nai (sentence final, batch3b), 〜wake no nai (no reason for X — even more emotional), 〜beki ja nai (shouldn't — moral). 〜hazu no nai is the attributive 'impossible' marker — used to qualify nouns with logical impossibility.

• atta hazu no nai mono (<ruby>あった<rt></rt></ruby>はずのないもの) — 'something that shouldn't have existed'
• kuru hazu no nai hito (<ruby>来<rt>く</rt></ruby>るはずのない<ruby>人<rt>ひと</rt></ruby>) — 'a person who shouldn't come'
• kanau hazu no nai yume (<ruby>叶<rt>かな</rt></ruby>うはずのない<ruby>夢<rt>ゆめ</rt></ruby>) — 'a dream that shouldn't come true'
• tsunagaru hazu no nai te (<ruby>繋<rt>つな</rt></ruby>がるはずのない<ruby>手<rt>て</rt></ruby>) — 'a hand that shouldn't connect'
• kawaru hazu no nai kimochi (<ruby>変<rt>か</rt></ruby>わるはずのない<ruby>気持<rt>きも</rt></ruby>ち) — 'feelings that shouldn't change'
• mienai hazu no nai sora (<ruby>見<rt>み</rt></ruby>えないはずのない<ruby>空<rt>そら</rt></ruby>) — 'a sky that shouldn't be invisible'
• ushinau hazu no nai mono (<ruby>失<rt>うしな</rt></ruby>うはずのないもの) — 'something that shouldn't be lost'
• wasureta hazu no nai namae (<ruby>忘<rt>わす</rt></ruby>れたはずのない<ruby>名前<rt>なまえ</rt></ruby>) — 'a name that shouldn't have been forgotten'
• ai hazu no nai hito (<ruby>会<rt>あ</rt></ruby>うはずのない<ruby>人<rt>ひと</rt></ruby>) — 'a person we shouldn't meet'
• mata aeru hazu no nai (また<ruby>会<rt>あ</rt></ruby>えるはずのない) — 'shouldn't be able to meet again'
• boku no kotoba ga todoku hazu no nai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>が<ruby>届<rt>とど</rt></ruby>くはずのない) — "my words shouldn't reach"
• kanjiru hazu no nai itami (<ruby>感<rt>かん</rt></ruby>じるはずのない<ruby>痛<rt>いた</rt></ruby>み) — 'pain that shouldn't be felt'
• kawaranai hazu no nai mono (<ruby>変<rt>か</rt></ruby>わらないはずのないもの) — 'something that shouldn't stay unchanged'
• kotoba ni naru hazu no nai (<ruby>言葉<rt>ことば</rt></ruby>になるはずのない) — 'shouldn't become words'
• ima koko ni iru hazu no nai (<ruby>今<rt>いま</rt></ruby>ここにいるはずのない) — "(I) shouldn't be here now"

${MARKER}`,

  "85d0b4b9": `〜nakatta (〜なかった) is the past form of the negative 〜nai (batch4a). Take any verb's nai-stem + なかった: tabe-nakatta (<ruby>食<rt>た</rt></ruby>べなかった) "didn't eat". For i-adjectives: 〜kunakatta (atatakai → atatakakunakatta 'was not warm'). For na-adj/nouns: 〜janakatta (kirei janakatta 'was not pretty').

Conjugates as the past form of the i-adjective 〜nai: 〜nakatta (past), 〜nakute (past + te-form for connecting). Polite: 〜masen deshita / 〜nakatta desu. The negative-past pairing is one of the most-used conjugations in Japanese — virtually every spoken sentence about past inaction uses it.

Common in lyrics for regret, missed opportunity, lost time: aenakatta (<ruby>会<rt>あ</rt></ruby>えなかった) "couldn't meet". Also used for retrospective realisation: shira-nakatta (<ruby>知<rt>し</rt></ruby>らなかった) "I didn't know (until now)". Compare with 〜nakatta + 〜noni (despite not having X-ed), 〜nakatta + 〜hazu (was supposed not to). Foundational — every learner masters it early.

• tabenakatta (<ruby>食<rt>た</rt></ruby>べなかった) — "didn't eat"
• ikanakatta (<ruby>行<rt>い</rt></ruby>かなかった) — "didn't go"
• shiranakatta (<ruby>知<rt>し</rt></ruby>らなかった) — "didn't know"
• wakaranakatta (<ruby>分<rt>わ</rt></ruby>からなかった) — "didn't understand"
• mienakatta (<ruby>見<rt>み</rt></ruby>えなかった) — "couldn't see"
• kikoenakatta (<ruby>聞<rt>き</rt></ruby>こえなかった) — "couldn't hear"
• aenakatta (<ruby>会<rt>あ</rt></ruby>えなかった) — "couldn't meet"
• ie-nakatta (<ruby>言<rt>い</rt></ruby>えなかった) — "couldn't say"
• atatakakunakatta (<ruby>暖<rt>あたた</rt></ruby>かくなかった) — "wasn't warm"
• kirei janakatta (<ruby>綺麗<rt>きれい</rt></ruby>じゃなかった) — "wasn't pretty"
• gakusei janakatta (<ruby>学生<rt>がくせい</rt></ruby>じゃなかった) — "wasn't a student"
• matanakatta (<ruby>待<rt>ま</rt></ruby>たなかった) — "didn't wait"
• shinjirenakatta (<ruby>信<rt>しん</rt></ruby>じれなかった) — "couldn't believe"
• kanaranakatta (<ruby>叶<rt>かな</rt></ruby>らなかった) — "didn't come true"
• naka-nakatta (<ruby>泣<rt>な</rt></ruby>かなかった) — "didn't cry"

${MARKER}`,

  "66607f63": `〜no ka (〜のか) attaches to plain-form sentences. Combines explanatory の (の, often in feminine speech 〜の) with the question particle ka (か). Functions as a rhetorical or emphatic question — often demanding an answer or expressing frustration / surprise. wakaru no ka (<ruby>分<rt>わ</rt></ruby>かるのか) "do you understand or not?". Casual / male: 〜n da ka (〜んだか).

Two flavours: (a) Direct rhetorical question — confronting the listener / self with intent. (b) Indirect-style question embedded in a larger thought: shitte iru no ka douka (<ruby>知<rt>し</rt></ruby>っているのかどうか) 'whether they know'. Often paired with naze, dou shite for 'why on earth?'.

Compare with bare 〜ka (neutral question), 〜kana (lighter wonder, batch3b), 〜n darou (explanatory conjecture, batch3b). 〜no ka adds emphasis or demands accountability — used in arguments, emotional lyrics, and any context where the question carries weight.

• wakaru no ka (<ruby>分<rt>わ</rt></ruby>かるのか) — "do you understand?"
• naze konna ni kanashii no ka (なぜこんなに<ruby>悲<rt>かな</rt></ruby>しいのか) — "why am I this sad?"
• dou shite naita no ka (どうして<ruby>泣<rt>な</rt></ruby>いたのか) — "why did I cry?"
• boku ga dare nano ka (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>誰<rt>だれ</rt></ruby>なのか) — "who am I?"
• ikiteru no ka (<ruby>生<rt>い</rt></ruby>きてるのか) — "am I really alive?"
• ai shite iru no ka (<ruby>愛<rt>あい</rt></ruby>しているのか) — "do (you) love (me)?"
• shitsumon ga aru no ka douka (<ruby>質問<rt>しつもん</rt></ruby>があるのかどうか) — "whether there's a question"
• shinjirareru no ka (<ruby>信<rt>しん</rt></ruby>じられるのか) — "can (I) believe?"
• mou owatta no ka (もう<ruby>終<rt>お</rt></ruby>わったのか) — "is it already over?"
• kanaeru tsumori no ka (<ruby>叶<rt>かな</rt></ruby>えるつもりのか) — "do (you) intend to make it come true?"
• kuru no ka konai no ka (<ruby>来<rt>く</rt></ruby>るのか<ruby>来<rt>こ</rt></ruby>ないのか) — "are they coming or not?"
• kotaeru no ka (<ruby>答<rt>こた</rt></ruby>えるのか) — "will you answer?"
• boku no koto wo wasureta no ka (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れたのか) — "have you forgotten me?"
• mada hashireru no ka (まだ<ruby>走<rt>はし</rt></ruby>れるのか) — "can (I) still run?"
• yume na no ka (<ruby>夢<rt>ゆめ</rt></ruby>なのか) — "is it a dream?"

${MARKER}`,

  "6f43bb26": `〜no kana (〜のかな) combines explanatory の (の) with 〜kana (I wonder, batch3b). Means "I wonder if X / could it be that X". The の adds explanatory grounding to the wonder — implies there's a reason / context for the question. boku ga warui no kana (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>悪<rt>わる</rt></ruby>いのかな) "I wonder if I'm the one at fault".

More reflective than bare 〜kana — the の signals 'there might be an underlying reason'. Often used in introspective speech and emotional lyrics: kowareta no kana (<ruby>壊<rt>こわ</rt></ruby>れたのかな) "I wonder if it's broken". Casual contraction: 〜n kana (〜んかな).

Compare with 〜kana (light wonder, batch3b), 〜no darou (formal speculative wonder, batch4b), 〜n darou (more direct, batch3b). 〜no kana sits in the introspective-evidence-based wonder zone — perfect for songs about self-doubt, second-guessing, and reflective questions.

• boku ga warui no kana (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>悪<rt>わる</rt></ruby>いのかな) — "I wonder if I'm at fault"
• kowareta no kana (<ruby>壊<rt>こわ</rt></ruby>れたのかな) — "I wonder if it's broken"
• kuru no kana (<ruby>来<rt>く</rt></ruby>るのかな) — "I wonder if they'll come"
• shinjite kureru no kana (<ruby>信<rt>しん</rt></ruby>じてくれるのかな) — "I wonder if they'll believe"
• boku no kotoba wa todoku no kana (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>は<ruby>届<rt>とど</rt></ruby>くのかな) — "I wonder if my words will reach"
• boku ni dekiru no kana (<ruby>僕<rt>ぼく</rt></ruby>にできるのかな) — "I wonder if I can do it"
• mada aishi-te iru no kana (まだ<ruby>愛<rt>あい</rt></ruby>しているのかな) — "I wonder if (you) still love (me)"
• onaji yume wo mite iru no kana (<ruby>同<rt>おな</rt></ruby>じ<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>ているのかな) — "I wonder if (we're) dreaming the same dream"
• boku no koto wo kioku ni nokoshite iru no kana (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>記憶<rt>きおく</rt></ruby>に<ruby>残<rt>のこ</rt></ruby>しているのかな) — "I wonder if (you) keep me in memory"
• mou aenai no kana (もう<ruby>会<rt>あ</rt></ruby>えないのかな) — "I wonder if we won't meet again"
• kawatta no kana (<ruby>変<rt>か</rt></ruby>わったのかな) — "I wonder if (you've) changed"
• haru ga konai no kana (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>こ</rt></ruby>ないのかな) — "I wonder if spring will come"
• ai datta no kana (<ruby>愛<rt>あい</rt></ruby>だったのかな) — "I wonder if it was love"
• sayonara nano kana (さよならなのかな) — "I wonder if it's goodbye"
• boku-tachi no jikan wa owatta no kana (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>は<ruby>終<rt>お</rt></ruby>わったのかな) — "I wonder if our time has ended"

${MARKER}`,

  "4f946a7b": `〜no sei (〜のせい / 〜の<ruby>所為<rt>せい</rt></ruby>) attaches to plain-form sentences or nouns + の. Means 'because of X / due to X / X is to blame'. Carries a NEGATIVE connotation — X is the cause of an unwanted situation. ame no sei de okureta (<ruby>雨<rt>あめ</rt></ruby>のせいで<ruby>遅<rt>おく</rt></ruby>れた) 'I was late because of the rain'.

The structure pairs with 〜de (せいで, 'because of, blame') for cause and 〜da (せいだ, 'is the fault of'). Distinct from 〜no okage (〜のおかげ, 'thanks to' — POSITIVE counterpart), and from 〜node (because — neutral). 〜no sei explicitly attributes blame.

Often used in songs of regret, accusation, or self-blame: boku no sei da (<ruby>僕<rt>ぼく</rt></ruby>のせいだ) "it's my fault". Common pairings: dare no sei? (whose fault?), boku no sei (my fault), kimi no sei janai (not your fault). Compare with 〜node (neutral cause), 〜kara (subjective reason, batch3a), 〜okage (positive cause).

• ame no sei de okureta (<ruby>雨<rt>あめ</rt></ruby>のせいで<ruby>遅<rt>おく</rt></ruby>れた) — 'late because of rain'
• boku no sei da (<ruby>僕<rt>ぼく</rt></ruby>のせいだ) — "it's my fault"
• kimi no sei janai (<ruby>君<rt>きみ</rt></ruby>のせいじゃない) — "not your fault"
• dare no sei? (<ruby>誰<rt>だれ</rt></ruby>のせい？) — "whose fault?"
• kanashimi no sei de naita (<ruby>悲<rt>かな</rt></ruby>しみのせいで<ruby>泣<rt>な</rt></ruby>いた) — 'cried because of sadness'
• tsukareta no sei (<ruby>疲<rt>つか</rt></ruby>れたのせい) — 'because (I'm) tired'
• kanji ga muzukashii no sei (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>難<rt>むずか</rt></ruby>しいのせい) — 'because kanji is hard'
• kaze no sei (<ruby>風邪<rt>かぜ</rt></ruby>のせい) — "because of the cold"
• kimi no sei de boku ga (<ruby>君<rt>きみ</rt></ruby>のせいで<ruby>僕<rt>ぼく</rt></ruby>が) — "because of you, I..."
• jikan no sei (<ruby>時間<rt>じかん</rt></ruby>のせい) — "because of time"
• ano hi no sei (あの<ruby>日<rt>ひ</rt></ruby>のせい) — "because of that day"
• boku no yowasa no sei (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>弱<rt>よわ</rt></ruby>さのせい) — "because of my weakness"
• yume no sei (<ruby>夢<rt>ゆめ</rt></ruby>のせい) — "because of the dream"
• kotoba no sei de (<ruby>言葉<rt>ことば</rt></ruby>のせいで) — "because of words"
• namida no sei de mienai (<ruby>涙<rt>なみだ</rt></ruby>のせいで<ruby>見<rt>み</rt></ruby>えない) — "can't see because of tears"

${MARKER}`,

  "bfee67fe": `〜no mama ni (〜のままに) attaches a noun + の + mama (state, as is — batch2) + ni (adverbial). Means 'as it is / following X / in keeping with X / left to X'. shizen no mama ni (<ruby>自然<rt>しぜん</rt></ruby>のままに) 'as nature dictates / left to nature'. The structure marks an action carried out PRESERVING or FOLLOWING the noun's state.

Distinct from batch4b's 〜ga mama ni (literary 'as one pleases' with subject marker) and batch2's 〜mama (state-preserving 'as is'). 〜no mama ni specifically chains a noun-state with adverbial ni — yields 'in the manner of N's state'.

Common in songs and lyrical prose for surrender to natural forces or accepted situations: kokoro no mama ni (<ruby>心<rt>こころ</rt></ruby>のままに) 'following the heart'. Compare with 〜you ni (manner / so that, batch3a / batch2), 〜doori (according to). 〜no mama ni is the elevated 'as N dictates' marker.

• shizen no mama ni (<ruby>自然<rt>しぜん</rt></ruby>のままに) — 'as nature dictates'
• kokoro no mama ni (<ruby>心<rt>こころ</rt></ruby>のままに) — 'following the heart'
• unmei no mama ni (<ruby>運命<rt>うんめい</rt></ruby>のままに) — 'as fate dictates'
• jiyuu no mama ni (<ruby>自由<rt>じゆう</rt></ruby>のままに) — 'in freedom'
• arugamama ni (あるがままに) — 'just as it is'
• kaze no mama ni (<ruby>風<rt>かぜ</rt></ruby>のままに) — 'as the wind blows'
• jikan no mama ni (<ruby>時間<rt>じかん</rt></ruby>のままに) — 'as time flows'
• boku no kimochi no mama ni (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>気持<rt>きも</rt></ruby>ちのままに) — 'as my feelings go'
• yume no mama ni (<ruby>夢<rt>ゆめ</rt></ruby>のままに) — 'as the dream goes'
• boku-tachi no jinsei no mama ni (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>人生<rt>じんせい</rt></ruby>のままに) — 'as our lives go'
• ano hi no mama ni (あの<ruby>日<rt>ひ</rt></ruby>のままに) — 'as that day was'
• boku no kotoba no mama ni (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>のままに) — 'as my words go'
• ikiru mama ni (<ruby>生<rt>い</rt></ruby>きるままに) — 'as I live'
• kaza no nagare no mama ni (<ruby>風<rt>かぜ</rt></ruby>の<ruby>流<rt>なが</rt></ruby>れのままに) — 'with the wind'
• boku-tachi no kioku no mama ni (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>記憶<rt>きおく</rt></ruby>のままに) — 'as our memories remain'

${MARKER}`,

  "0f81aa3c": `〜no hou ga (〜の<ruby>方<rt>ほう</rt></ruby>が) attaches to nouns or noun-equivalents. Marks the BETTER / PREFERRED option in a comparison. ringo no hou ga ii (りんごの<ruby>方<rt>ほう</rt></ruby>がいい) "apples are better". Often paired with 〜yori (than, batch3a) for explicit comparison: orange yori ringo no hou ga suki (オレンジよりりんごの<ruby>方<rt>ほう</rt></ruby>が<ruby>好<rt>す</rt></ruby>き) "I like apples more than oranges".

The 〜hou (方) literally means 'side / direction'; the 〜ga marks the preferred element as subject. Used heavily in everyday speech for preference, recommendation, statistical comparison. Variant: 〜no hou ga ii (better to / X is better) — the everyday recommendation construction.

Compare with 〜yori (just comparison, batch3a), 〜beki (moral should — different meaning, batch6a), 〜hazu (logical expectation, batch3a). 〜no hou ga is the everyday preference marker — appears in any context wanting to favour one option over another.

• ringo no hou ga ii (りんごの<ruby>方<rt>ほう</rt></ruby>がいい) — 'apples are better'
• boku no hou ga ureshi (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>が<ruby>嬉<rt>うれ</rt></ruby>し) — "I'm the happier one"
• A yori B no hou ga (AよりBの<ruby>方<rt>ほう</rt></ruby>が) — 'B (more) than A'
• kimi no hou ga tsuyoi (<ruby>君<rt>きみ</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>が<ruby>強<rt>つよ</rt></ruby>い) — "you're the stronger one"
• mukashi no hou ga yokatta (<ruby>昔<rt>むかし</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>がよかった) — "the past was better"
• kono uta no hou ga suki (この<ruby>歌<rt>うた</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>が<ruby>好<rt>す</rt></ruby>き) — "I like this song more"
• boku no kotae no hou ga tadashii (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えの<ruby>方<rt>ほう</rt></ruby>が<ruby>正<rt>ただ</rt></ruby>しい) — "my answer is the right one"
• warau no hou ga ii (<ruby>笑<rt>わら</rt></ruby>うの<ruby>方<rt>ほう</rt></ruby>がいい) — "smiling is better"
• shinjiru no hou ga ii (<ruby>信<rt>しん</rt></ruby>じるの<ruby>方<rt>ほう</rt></ruby>がいい) — "better to believe"
• issho ni iru no hou ga shiawase (<ruby>一緒<rt>いっしょ</rt></ruby>にいるの<ruby>方<rt>ほう</rt></ruby>が<ruby>幸<rt>しあわ</rt></ruby>せ) — "being together is happier"
• boku no namida no hou ga atsu (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>が<ruby>熱<rt>あつ</rt></ruby>) — "my tears are hotter"
• haru no hou ga suki (<ruby>春<rt>はる</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>が<ruby>好<rt>す</rt></ruby>き) — "I like spring more"
• kotoba yori egao no hou ga (<ruby>言葉<rt>ことば</rt></ruby>より<ruby>笑顔<rt>えがお</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>が) — "smiles more than words"
• yume no hou ga genjitsu yori utsukushii (<ruby>夢<rt>ゆめ</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>が<ruby>現実<rt>げんじつ</rt></ruby>より<ruby>美<rt>うつく</rt></ruby>しい) — 'dreams are more beautiful than reality'
• kanji yori hiragana no hou ga kantan (<ruby>漢字<rt>かんじ</rt></ruby>よりひらがなの<ruby>方<rt>ほう</rt></ruby>が<ruby>簡単<rt>かんたん</rt></ruby>) — 'hiragana is easier than kanji'

${MARKER}`,

  "7f805eca": `〜wa shinai (〜はしない) is an emphatic negation. Combines V-masu-stem + は (focus particle) + shinai (don't do). Means "won't do (X) at all / will not (X), I assure you". The 〜は inserts contrast / focus into the negation, intensifying it. naki wa shinai (<ruby>泣<rt>な</rt></ruby>きはしない) "I won't cry".

The structure scopes the negation onto the masu-stem of the verb, then adds the negative shinai. Stronger than bare 〜nai because of the explicit focus marker 〜は. Common in lyrics for declarations of resolve: makewashi nai (<ruby>負<rt>ま</rt></ruby>けはしない) "I won't lose".

Compare with batch4b's 〜ya shinai (rougher, similar role), bare 〜nai (everyday), 〜nai (negated potential), 〜hazu ga nai (no possibility, batch3b). 〜wa shinai sits between 〜nai and 〜ya shinai in register — emphatic but not as rough as 〜ya shinai.

• naki wa shinai (<ruby>泣<rt>な</rt></ruby>きはしない) — "won't cry"
• make wa shinai (<ruby>負<rt>ま</rt></ruby>けはしない) — "won't lose"
• nige wa shinai (<ruby>逃<rt>に</rt></ruby>げはしない) — "won't run"
• yame wa shinai (やめはしない) — "won't quit"
• damari wa shinai (<ruby>黙<rt>だま</rt></ruby>りはしない) — "won't stay silent"
• wasure wa shinai (<ruby>忘<rt>わす</rt></ruby>れはしない) — "won't forget"
• ushinai wa shinai (<ruby>失<rt>うしな</rt></ruby>いはしない) — "won't lose"
• kotae wa shinai (<ruby>答<rt>こた</rt></ruby>えはしない) — "won't answer"
• shinji wa shinai (<ruby>信<rt>しん</rt></ruby>じはしない) — "won't believe"
• ai-shi wa shinai (<ruby>愛<rt>あい</rt></ruby>しはしない) — "won't love"
• kawari wa shinai (<ruby>変<rt>か</rt></ruby>わりはしない) — "won't change"
• damasare wa shinai (<ruby>騙<rt>だま</rt></ruby>されはしない) — "won't be deceived"
• mata kowarewa shinai (<ruby>壊<rt>こわ</rt></ruby>れはしない) — "won't break (again)"
• kanji wo wasure wa shinai (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れはしない) — "won't forget kanji"
• boku no koto wo akirame wa shinai (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>諦<rt>あきら</rt></ruby>めはしない) — "won't give up on me"

${MARKER}`,

  "fcd4142b": `〜hajimeru (〜はじめる / 〜<ruby>始<rt>はじ</rt></ruby>める) attaches the verb hajimeru ('to begin') to a verb's masu-stem. Means 'begin to X / start X-ing'. Inceptive aspect — marks the START of an action. tabe-hajimeru (<ruby>食<rt>た</rt></ruby>べ<ruby>始<rt>はじ</rt></ruby>める) 'begin to eat'. Conjugates as a regular ichidan verb: hajimeta (started), hajimete (te-form).

Distinct from 〜dasu (sudden onset, batch3a — 'burst into') and 〜kakeru (on the verge / partial, batch3b). 〜hajimeru is NEUTRAL beginning — planned, gradual, expected. naki-hajimeru (<ruby>泣<rt>な</rt></ruby>き<ruby>始<rt>はじ</rt></ruby>める) 'start crying' (vs. 〜dasu 'burst into tears').

Compare with 〜dasu (sudden, emotional onset), 〜kakeru (partial / threshold), 〜tsuzukeru (keep doing — opposite, batch1). 〜hajimeru is the everyday, neutral 'start to' marker — appears in any context describing the beginning of a planned or natural action.

• tabe-hajimeru (<ruby>食<rt>た</rt></ruby>べ<ruby>始<rt>はじ</rt></ruby>める) — 'begin to eat'
• benkyou shi-hajimeru (<ruby>勉強<rt>べんきょう</rt></ruby>し<ruby>始<rt>はじ</rt></ruby>める) — 'begin to study'
• hashiri-hajimeru (<ruby>走<rt>はし</rt></ruby>り<ruby>始<rt>はじ</rt></ruby>める) — 'start running'
• naki-hajimeru (<ruby>泣<rt>な</rt></ruby>き<ruby>始<rt>はじ</rt></ruby>める) — 'start crying'
• warai-hajimeru (<ruby>笑<rt>わら</rt></ruby>い<ruby>始<rt>はじ</rt></ruby>める) — 'start laughing'
• yomi-hajimeru (<ruby>読<rt>よ</rt></ruby>み<ruby>始<rt>はじ</rt></ruby>める) — 'start reading'
• kaki-hajimeru (<ruby>書<rt>か</rt></ruby>き<ruby>始<rt>はじ</rt></ruby>める) — 'start writing'
• kawari-hajimeru (<ruby>変<rt>か</rt></ruby>わり<ruby>始<rt>はじ</rt></ruby>める) — 'start changing'
• mukai-hajimeru (<ruby>向<rt>む</rt></ruby>かい<ruby>始<rt>はじ</rt></ruby>める) — 'start heading toward'
• ai-shi-hajimeru (<ruby>愛<rt>あい</rt></ruby>し<ruby>始<rt>はじ</rt></ruby>める) — 'start loving'
• shinji-hajimeru (<ruby>信<rt>しん</rt></ruby>じ<ruby>始<rt>はじ</rt></ruby>める) — 'start believing'
• kioku ga modori-hajimeru (<ruby>記憶<rt>きおく</rt></ruby>が<ruby>戻<rt>もど</rt></ruby>り<ruby>始<rt>はじ</rt></ruby>める) — 'memories start coming back'
• yume wo mi-hajimeru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>始<rt>はじ</rt></ruby>める) — 'start dreaming'
• kanji wo oboe-hajimeru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>覚<rt>おぼ</rt></ruby>え<ruby>始<rt>はじ</rt></ruby>める) — 'start memorising kanji'
• kanjiru hajimeru (<ruby>感<rt>かん</rt></ruby>じる<ruby>始<rt>はじ</rt></ruby>める) — 'start to feel'

${MARKER}`,

  "9fa079a5": `〜beki (〜べき) attaches to a verb's dictionary form (suru can also become subeki). Means 'should X / ought to X'. Carries MORAL or DEONTIC obligation — the action is what's right or required, not just probable. yaru beki (やるべき) 'should do'. Conjugates: 〜beki da (assertive), 〜beki janai (shouldn't), 〜beki datta (should have).

Distinct from 〜hazu (logical expectation, batch3a — predicts), 〜nakereba naranai (must — necessity, no moral charge), 〜hou ga ii (better to — recommendation, no obligation). 〜beki is the moral / right-thing-to-do marker.

Common in formal advice, ethical reasoning, and lyrics about duty / right action: kotaeru beki da (<ruby>答<rt>こた</rt></ruby>えるべきだ) "must answer (it's the right thing)". Polite forms: 〜beki desu, 〜beki deshou. The negation 〜beki dewa nai is forceful — 'must not / shouldn't'.

• yaru beki (やるべき) — 'should do'
• kotaeru beki da (<ruby>答<rt>こた</rt></ruby>えるべきだ) — 'should answer'
• shinjiru beki (<ruby>信<rt>しん</rt></ruby>じるべき) — 'should believe'
• ayamaru beki (<ruby>謝<rt>あやま</rt></ruby>るべき) — 'should apologise'
• yameru beki (やめるべき) — 'should quit'
• mae ni susumubeki (<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>むべき) — 'should move forward'
• mukaeau beki (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うべき) — 'should face it'
• boku ga iku beki da (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>行<rt>い</rt></ruby>くべきだ) — "I should be the one to go"
• tsutaeru beki (<ruby>伝<rt>つた</rt></ruby>えるべき) — 'should convey'
• ai shi-tsuzukeru beki (<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>けるべき) — 'should keep loving'
• mamoru beki mono (<ruby>守<rt>まも</rt></ruby>るべきもの) — 'something (I) should protect'
• tatakau beki (<ruby>戦<rt>たたか</rt></ruby>うべき) — 'should fight'
• yurusu beki janai (<ruby>許<rt>ゆる</rt></ruby>すべきじゃない) — 'shouldn't forgive'
• kanji wo benkyou subeki (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>すべき) — 'should study kanji'
• boku ga kotaeru beki datta (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>答<rt>こた</rt></ruby>えるべきだった) — "I should have answered"

${MARKER}`,

  "a0e00979": `〜masu you ni (〜ますように) attaches the polite 〜masu form + you ni (so that / hope, batch2). Means "may it be that / I hope X / praying that X". A wish or prayer formula — common in Shinto omikuji (fortune slips) and at shrines. shiawase ni naremasu you ni (<ruby>幸<rt>しあわ</rt></ruby>せになれますように) "may you be happy".

The polite 〜masu adds reverence; the 〜you ni expresses the wish. Often left as a sentence-final wish without explicit verb after — implicit prayer. Common at New Year, on tanabata wishes, in lyrics about hope: ame ga yamimasu you ni (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>みますように) "may the rain stop".

Compare with 〜tara ii (lighter wish, batch4a), 〜tara ii noni (regretful wish, batch5a), 〜tame ni inoru (pray for the sake of). 〜masu you ni is the FORMAL / REVERENT wish — perfect for solemn songs, prayers, ceremonial speech.

• shiawase ni naremasu you ni (<ruby>幸<rt>しあわ</rt></ruby>せになれますように) — "may (you) be happy"
• genki ni narimasu you ni (<ruby>元気<rt>げんき</rt></ruby>になりますように) — "may (you) get well"
• ame ga yamimasu you ni (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>みますように) — "may the rain stop"
• yume ga kanaimasu you ni (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>叶<rt>かな</rt></ruby>いますように) — "may the dream come true"
• boku-tachi ga deawemasu you ni (<ruby>僕<rt>ぼく</rt></ruby>たちが<ruby>出会<rt>であ</rt></ruby>えますように) — "may we meet"
• mamoremasu you ni (<ruby>守<rt>まも</rt></ruby>れますように) — "may (I) be able to protect"
• mata aemasu you ni (また<ruby>会<rt>あ</rt></ruby>えますように) — "may we meet again"
• boku no koe ga todokimasu you ni (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>が<ruby>届<rt>とど</rt></ruby>きますように) — "may my voice reach"
• kanaimasu you ni (<ruby>叶<rt>かな</rt></ruby>いますように) — "may it come true"
• egao de iremasu you ni (<ruby>笑顔<rt>えがお</rt></ruby>でいれますように) — "may we be smiling"
• haru ga kimasu you ni (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>き</rt></ruby>ますように) — "may spring come"
• kanashimaranai you ni (<ruby>悲<rt>かな</rt></ruby>しまらないように) — "may (you) not grieve"
• ai ga tsuzukimasu you ni (<ruby>愛<rt>あい</rt></ruby>が<ruby>続<rt>つづ</rt></ruby>きますように) — "may love continue"
• boku-tachi ga shiawase ni naremasu you ni (<ruby>僕<rt>ぼく</rt></ruby>たちが<ruby>幸<rt>しあわ</rt></ruby>せになれますように) — "may we be happy"
• kotoba ga tsutawarimasu you ni (<ruby>言葉<rt>ことば</rt></ruby>が<ruby>伝<rt>つた</rt></ruby>わりますように) — "may the words convey"

${MARKER}`,

  "4c36f71d": `〜mamire (〜まみれ) attaches directly to a noun (no particle). Means 'covered in / smeared with X'. More physical / wet / visceral than batch3a's 〜darake. Common with bodily substances and dirty / sticky things. chi-mamire (<ruby>血<rt>ち</rt></ruby>まみれ) 'drenched in blood'.

The image is one of full coating — every surface covered. Often used with blood, mud, sweat, oil, dust: doro-mamire (<ruby>泥<rt>どろ</rt></ruby>まみれ) 'covered in mud'. Modifies a following noun attributively with の: chi-mamire no te (<ruby>血<rt>ち</rt></ruby>まみれの<ruby>手<rt>て</rt></ruby>) 'a blood-soaked hand'.

Compare with 〜darake (covered in / riddled with — batch3a, more abstract / countable), 〜zukume (all-X — neutral / positive: ii koto zukume), 〜dake (only — batch3b). 〜mamire is the visceral / physical-substance 'covered with' marker.

• chi-mamire (<ruby>血<rt>ち</rt></ruby>まみれ) — 'drenched in blood'
• doro-mamire (<ruby>泥<rt>どろ</rt></ruby>まみれ) — 'covered in mud'
• ase-mamire (<ruby>汗<rt>あせ</rt></ruby>まみれ) — 'drenched in sweat'
• abura-mamire (<ruby>油<rt>あぶら</rt></ruby>まみれ) — 'oily / covered in oil'
• namida-mamire (<ruby>涙<rt>なみだ</rt></ruby>まみれ) — 'tear-soaked'
• hokori-mamire (<ruby>埃<rt>ほこり</rt></ruby>まみれ) — 'dust-covered'
• chi-mamire no te (<ruby>血<rt>ち</rt></ruby>まみれの<ruby>手<rt>て</rt></ruby>) — 'a blood-soaked hand'
• doro-mamire no kao (<ruby>泥<rt>どろ</rt></ruby>まみれの<ruby>顔<rt>かお</rt></ruby>) — 'a mud-streaked face'
• ase-mamire no shatsu (<ruby>汗<rt>あせ</rt></ruby>まみれのシャツ) — 'a sweat-soaked shirt'
• namida-mamire no yoru (<ruby>涙<rt>なみだ</rt></ruby>まみれの<ruby>夜<rt>よる</rt></ruby>) — 'a tear-soaked night'
• yume-mamire (<ruby>夢<rt>ゆめ</rt></ruby>まみれ) — 'caked in dreams' (poetic)
• inku-mamire (インクまみれ) — 'inky / covered in ink'
• zougen-mamire (<ruby>象嵌<rt>ぞうげん</rt></ruby>まみれ) — 'coated with inlay'
• tsuyu-mamire (<ruby>露<rt>つゆ</rt></ruby>まみれ) — 'dew-drenched'
• boku no kako wa kanashimi-mamire (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>過去<rt>かこ</rt></ruby>は<ruby>悲<rt>かな</rt></ruby>しみまみれ) — 'my past is steeped in sorrow'

${MARKER}`,

  "b67ce8fc": `marude 〜no you ni (まるで〜のように) is a paired construction. The adverb marude (まるで, 'just / exactly') at the front intensifies; 〜no you ni (like, batch3a) at the end completes the simile. Means 'just like X / exactly as if X'. marude yume no you ni (まるで<ruby>夢<rt>ゆめ</rt></ruby>のように) 'just like a dream'.

The marude amplifies the comparison — without it, you have a neutral simile; with it, you have an emphatic, almost theatrical comparison. Common in songs and prose for striking imagery: marude tori no you ni jiyuu (まるで<ruby>鳥<rt>とり</rt></ruby>のように<ruby>自由<rt>じゆう</rt></ruby>) 'free, just like a bird'.

Compare with bare 〜no you ni (everyday simile, batch3a), 〜mitai (colloquial simile, batch3a), marude〜mitai (similar, more casual). marude〜no you ni is the literary / emphatic version of the simile family — perfect for elevated lyrics, dramatic moments, and any context wanting weighty comparison.

• marude yume no you ni (まるで<ruby>夢<rt>ゆめ</rt></ruby>のように) — 'just like a dream'
• marude uso no you ni (まるで<ruby>嘘<rt>うそ</rt></ruby>のように) — 'just like a lie'
• marude tori no you ni jiyuu (まるで<ruby>鳥<rt>とり</rt></ruby>のように<ruby>自由<rt>じゆう</rt></ruby>) — 'free, like a bird'
• marude kaze no you ni (まるで<ruby>風<rt>かぜ</rt></ruby>のように) — 'just like the wind'
• marude jikan ga tomatta you ni (まるで<ruby>時間<rt>じかん</rt></ruby>が<ruby>止<rt>と</rt></ruby>まったように) — 'as if time stopped'
• marude boku ja nai you ni (まるで<ruby>僕<rt>ぼく</rt></ruby>じゃないように) — "as if it weren't me"
• marude hajimete au you ni (まるで<ruby>初<rt>はじ</rt></ruby>めて<ruby>会<rt>あ</rt></ruby>うように) — 'as if meeting for the first time'
• marude shitte ita you ni (まるで<ruby>知<rt>し</rt></ruby>っていたように) — 'as if I had known'
• marude eien no you ni (まるで<ruby>永遠<rt>えいえん</rt></ruby>のように) — 'just like eternity'
• marude kage no you ni (まるで<ruby>影<rt>かげ</rt></ruby>のように) — 'just like a shadow'
• marude utai-tsuzukeru you ni (まるで<ruby>歌<rt>うた</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>けるように) — 'as if singing on'
• marude saiyo no you ni (まるで<ruby>最初<rt>さいしょ</rt></ruby>のように) — 'just like the first time'
• marude mukashi no you ni (まるで<ruby>昔<rt>むかし</rt></ruby>のように) — 'just like the old days'
• marude maho no you ni (まるで<ruby>魔法<rt>まほう</rt></ruby>のように) — 'just like magic'
• marude nakatta koto no you ni (まるでなかったことのように) — 'as if it never happened'

${MARKER}`,

  "3298d59f": `〜mo 〜mo (〜も〜も) attaches the も (also / even) particle to two parallel nouns. Means 'both X and Y / X as well as Y'. neko mo inu mo (<ruby>猫<rt>ねこ</rt></ruby>も<ruby>犬<rt>いぬ</rt></ruby>も) 'both cats and dogs'. With negative predicate: 'neither X nor Y' — neko mo inu mo inai (neither cats nor dogs are here).

The structure adds X to Y as additive parallelism. Distinct from 〜to 〜to (X and Y — exhaustive listing), 〜ya 〜ya (X and Y — partial / casual), 〜toka 〜toka (X and Y and so on, batch5b). 〜mo 〜mo specifically emphasises the SAME-CATEGORY parallel.

Common in songs and lyrical lists: namida mo egao mo (<ruby>涙<rt>なみだ</rt></ruby>も<ruby>笑顔<rt>えがお</rt></ruby>も) 'both tears and smiles'. The structure can extend to verbs: warau mo naku mo (<ruby>笑<rt>わら</rt></ruby>うも<ruby>泣<rt>な</rt></ruby>くも) 'both laughing and crying'. Used heavily in poetry for symmetric pairings.

• neko mo inu mo (<ruby>猫<rt>ねこ</rt></ruby>も<ruby>犬<rt>いぬ</rt></ruby>も) — 'both cats and dogs'
• namida mo egao mo (<ruby>涙<rt>なみだ</rt></ruby>も<ruby>笑顔<rt>えがお</rt></ruby>も) — 'both tears and smiles'
• haru mo aki mo (<ruby>春<rt>はる</rt></ruby>も<ruby>秋<rt>あき</rt></ruby>も) — 'both spring and autumn'
• boku mo kimi mo (<ruby>僕<rt>ぼく</rt></ruby>も<ruby>君<rt>きみ</rt></ruby>も) — 'both me and you'
• ame mo yuki mo (<ruby>雨<rt>あめ</rt></ruby>も<ruby>雪<rt>ゆき</rt></ruby>も) — 'both rain and snow'
• yorokobi mo kanashimi mo (<ruby>喜<rt>よろこ</rt></ruby>びも<ruby>悲<rt>かな</rt></ruby>しみも) — 'both joy and sorrow'
• ai mo nikushimi mo (<ruby>愛<rt>あい</rt></ruby>も<ruby>憎<rt>にく</rt></ruby>しみも) — 'both love and hate'
• yume mo genjitsu mo (<ruby>夢<rt>ゆめ</rt></ruby>も<ruby>現実<rt>げんじつ</rt></ruby>も) — 'both dream and reality'
• warau mo naku mo (<ruby>笑<rt>わら</rt></ruby>うも<ruby>泣<rt>な</rt></ruby>くも) — 'both laughing and crying'
• mukashi mo ima mo (<ruby>昔<rt>むかし</rt></ruby>も<ruby>今<rt>いま</rt></ruby>も) — 'both past and present'
• kanji mo hiragana mo (<ruby>漢字<rt>かんじ</rt></ruby>もひらがなも) — 'both kanji and hiragana'
• tsuyo-sa mo yowasa mo (<ruby>強<rt>つよ</rt></ruby>さも<ruby>弱<rt>よわ</rt></ruby>さも) — 'both strength and weakness'
• boku-tachi mo kazoku mo (<ruby>僕<rt>ぼく</rt></ruby>たちも<ruby>家族<rt>かぞく</rt></ruby>も) — 'both us and family'
• kotoba mo namida mo (<ruby>言葉<rt>ことば</rt></ruby>も<ruby>涙<rt>なみだ</rt></ruby>も) — 'both words and tears'
• hikari mo kage mo (<ruby>光<rt>ひかり</rt></ruby>も<ruby>影<rt>かげ</rt></ruby>も) — 'both light and shadow'

${MARKER}`,

  "49a2dab5": `〜yuku (〜<ruby>行<rt>ゆ</rt></ruby>く / 〜ゆく) is the literary reading of 行く ('to go'), used as a standalone verb. Modern colloquial uses iku (<ruby>行<rt>い</rt></ruby>く); yuku is preserved in poetry, song lyrics, formal / classical writing, and fixed expressions: yuku kawa no nagare (<ruby>行<rt>ゆ</rt></ruby>く<ruby>川<rt>かわ</rt></ruby>の<ruby>流<rt>なが</rt></ruby>れ) 'the flowing river that goes'.

Conjugates regularly as a godan verb but the past form is irregular: itta (not yukita). Auxiliary use 〜teyuku (batch3a) keeps the literary register. Standalone yuku in modern writing is purely a register marker — anything using it reads as elevated.

Compare with iku (modern everyday 'to go'), yukukke (no — different word, 'has been gone'), 〜teyuku (literary auxiliary, batch3a). 〜yuku as standalone verb pairs naturally with literary subjects — kawa, kaze, jikan, michi: things that flow / move on with timeless inevitability.

• yuku kawa (<ruby>行<rt>ゆ</rt></ruby>く<ruby>川<rt>かわ</rt></ruby>) — 'the flowing river'
• yuku michi (<ruby>行<rt>ゆ</rt></ruby>く<ruby>道<rt>みち</rt></ruby>) — 'the road (we) go'
• yuku haru (<ruby>行<rt>ゆ</rt></ruby>く<ruby>春<rt>はる</rt></ruby>) — 'departing spring'
• yuku natsu (<ruby>行<rt>ゆ</rt></ruby>く<ruby>夏<rt>なつ</rt></ruby>) — 'departing summer'
• yuku jikan (<ruby>行<rt>ゆ</rt></ruby>く<ruby>時間<rt>じかん</rt></ruby>) — 'time that passes'
• kaze yuku (<ruby>風<rt>かぜ</rt></ruby><ruby>行<rt>ゆ</rt></ruby>く) — 'the wind goes'
• yuku saki (<ruby>行<rt>ゆ</rt></ruby>く<ruby>先<rt>さき</rt></ruby>) — 'destination'
• yuku kage (<ruby>行<rt>ゆ</rt></ruby>く<ruby>影<rt>かげ</rt></ruby>) — 'a passing shadow'
• yuku kotoba (<ruby>行<rt>ゆ</rt></ruby>く<ruby>言葉<rt>ことば</rt></ruby>) — 'words that go forth'
• boku-tachi no yuku michi (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>行<rt>ゆ</rt></ruby>く<ruby>道<rt>みち</rt></ruby>) — 'the road we travel'
• yuku no wa kimi (<ruby>行<rt>ゆ</rt></ruby>くのは<ruby>君<rt>きみ</rt></ruby>) — "you're the one going"
• yuku akarui hi (<ruby>行<rt>ゆ</rt></ruby>く<ruby>明<rt>あか</rt></ruby>るい<ruby>日<rt>ひ</rt></ruby>) — 'a bright day passing'
• yuku omoi (<ruby>行<rt>ゆ</rt></ruby>く<ruby>想<rt>おも</rt></ruby>い) — 'feelings that go'
• yuku boku no namida (<ruby>行<rt>ゆ</rt></ruby>く<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>) — 'my receding tears'
• yuku hibi no naka de (<ruby>行<rt>ゆ</rt></ruby>く<ruby>日々<rt>ひび</rt></ruby>の<ruby>中<rt>なか</rt></ruby>で) — 'within the passing days'

${MARKER}`,

  "74b4a502": `〜you ni suru (〜ようにする) attaches you ni (so that, batch2 purpose) + suru (to do). Means 'try to / make sure to / habituate to (X)'. Marks intentional behaviour change or sustained effort. mainichi benkyou suru you ni shite iru (<ruby>毎日<rt>まいにち</rt></ruby><ruby>勉強<rt>べんきょう</rt></ruby>するようにしている) "I make sure to study every day".

The structure expresses INTENT to make X a habit or pattern. Conjugates: 〜you ni shite iru (currently making sure to), 〜you ni shi-tai (want to make sure to), 〜you ni shite kudasai (please make sure to). Distinct from 〜you ni (purpose / hope, batch2 — which doesn't carry agentive intent in itself).

Compare with 〜beki (moral should, batch6a), 〜tsumori da (intend to), 〜hou ga ii (better to). 〜you ni suru is the deliberate-habituation marker — common in advice, self-discipline, commitment lyrics: tabe-naku naru you ni shi-tai (<ruby>食<rt>た</rt></ruby>べなくなるようにしたい) "I want to make sure (I) stop eating".

• benkyou suru you ni shite iru (<ruby>勉強<rt>べんきょう</rt></ruby>するようにしている) — 'making sure to study'
• ki wo tsukeru you ni shite (<ruby>気<rt>き</rt></ruby>をつけるようにして) — 'try to be careful'
• warau you ni suru (<ruby>笑<rt>わら</rt></ruby>うようにする) — 'try to smile'
• naka-nai you ni suru (<ruby>泣<rt>な</rt></ruby>かないようにする) — 'try not to cry'
• ganbaru you ni suru (<ruby>頑張<rt>がんば</rt></ruby>るようにする) — 'try to push through'
• egao de iru you ni suru (<ruby>笑顔<rt>えがお</rt></ruby>でいるようにする) — 'try to keep smiling'
• kanji wo benkyou suru you ni shi-tai (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>するようにしたい) — "I want to make sure to study kanji"
• shinjiru you ni suru (<ruby>信<rt>しん</rt></ruby>じるようにする) — 'try to believe'
• kotaeru you ni shite (<ruby>答<rt>こた</rt></ruby>えるようにして) — 'make sure to answer'
• mukaeau you ni suru (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うようにする) — 'try to face it'
• boku no koto wo wasurenai you ni shi-te kudasai (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れないようにしてください) — "please make sure not to forget me"
• ai-suru you ni shi-tai (<ruby>愛<rt>あい</rt></ruby>するようにしたい) — "I want to make sure to love"
• ushinau-naru you ni suru (<ruby>失<rt>うしな</rt></ruby>うならないようにする) — 'try not to lose'
• tatakau you ni suru (<ruby>戦<rt>たたか</rt></ruby>うようにする) — 'try to fight'
• hashiri-tsuzukerareru you ni suru (<ruby>走<rt>はし</rt></ruby>り<ruby>続<rt>つづ</rt></ruby>けられるようにする) — 'try to keep running'

${MARKER}`,

  "d85daf5b": `〜o koete (〜を<ruby>超<rt>こ</rt></ruby>えて) attaches the object marker を + koete (te-form of koeru, 'to surpass / exceed'). Means 'beyond X / surpassing X / over X'. genkai wo koete (<ruby>限界<rt>げんかい</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) 'beyond the limit'. The structure marks transcendence, breakthrough, or distance covered.

Common in inspirational lyrics, sports speeches, breakthrough moments: jikan wo koete (<ruby>時間<rt>じかん</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) 'beyond time'. Often paired with abstract nouns: kabe (wall), genkai (limit), unmei (fate), kanou-sei (possibility).

Compare with 〜o oikosu (overtake — batch6a, similar but emphasises competition), 〜ni koete (incorrect — koeru takes を), 〜ijou (more than — neutral comparison). 〜o koete is the transcendence / break-through marker — perfect for songs about surpassing limits and crossing thresholds.

• genkai wo koete (<ruby>限界<rt>げんかい</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond the limit'
• jikan wo koete (<ruby>時間<rt>じかん</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond time'
• kuni wo koete (<ruby>国<rt>くに</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'crossing borders'
• unmei wo koete (<ruby>運命<rt>うんめい</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond fate'
• kabe wo koete (<ruby>壁<rt>かべ</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'breaking through walls'
• boku-tachi no kako wo koete (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>過去<rt>かこ</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond our past'
• kotoba wo koete (<ruby>言葉<rt>ことば</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond words'
• namida wo koete (<ruby>涙<rt>なみだ</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond tears'
• kanashimi wo koete (<ruby>悲<rt>かな</rt></ruby>しみを<ruby>超<rt>こ</rt></ruby>えて) — 'beyond sorrow'
• yume wo koete (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond the dream'
• boku no yowasa wo koete (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>弱<rt>よわ</rt></ruby>さを<ruby>超<rt>こ</rt></ruby>えて) — 'beyond my weakness'
• jikuu wo koete (<ruby>時空<rt>じくう</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond space-time'
• kioku wo koete ai-shi-tsuzukeru (<ruby>記憶<rt>きおく</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>ける) — 'love beyond memory'
• kotaerare-nai jibun wo koete (<ruby>答<rt>こた</rt></ruby>えられない<ruby>自分<rt>じぶん</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond the self that cannot answer'
• boku-tachi no kanou-sei wo koete (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>可能性<rt>かのうせい</rt></ruby>を<ruby>超<rt>こ</rt></ruby>えて) — 'beyond our possibilities'

${MARKER}`,

  "7d3cac62": `〜o oikosu (〜を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) is a compound verb: oi (chase) + kosu (cross over) — 'to overtake / surpass (in a race or competition)'. Attaches to a noun via を to mark the thing being overtaken. boku wo oikosu (<ruby>僕<rt>ぼく</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) 'overtake me'.

Distinguished from 〜o koete (surpass / beyond — batch6a, abstract transcendence) by being CONCRETE COMPETITIVE — overtaking in a race, surpassing in skill. Often used metaphorically in songs about ambition: yume wo oikosu (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) 'outpace the dream'.

Compare with 〜oou (chase / pursue — different verb), 〜nuki (compound 'pass through'), 〜ageru (overtake in some contexts). 〜o oikosu is the specific competitive-overtaking verb — concrete physical or metaphorical surpassing.

• boku wo oikosu (<ruby>僕<rt>ぼく</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake me'
• kuruma wo oikosu (<ruby>車<rt>くるま</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake a car'
• ranna wo oikosu (ランナーを<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake a runner'
• mae no hito wo oikosu (<ruby>前<rt>まえ</rt></ruby>の<ruby>人<rt>ひと</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake the person in front'
• mukashi no jibun wo oikosu (<ruby>昔<rt>むかし</rt></ruby>の<ruby>自分<rt>じぶん</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake my past self'
• yume wo oikosu (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'outpace the dream'
• kimi wo oikosu (<ruby>君<rt>きみ</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'surpass you'
• jikan wo oikosu (<ruby>時間<rt>じかん</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'outrun time'
• tooku no hoshi wo oikosu (<ruby>遠<rt>とお</rt></ruby>くの<ruby>星<rt>ほし</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake a distant star'
• kage wo oikosu (<ruby>影<rt>かげ</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake (one's) shadow'
• raibaru wo oikosu (ライバルを<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake a rival'
• kotoba wo oikosu omoi (<ruby>言葉<rt>ことば</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す<ruby>想<rt>おも</rt></ruby>い) — 'feelings that outpace words'
• boku no kanou-sei wo oikosu (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>可能性<rt>かのうせい</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'overtake my own possibility'
• boku-tachi no jikan wo oikosu (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>時間<rt>じかん</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'outrun our time'
• yume ga genjitsu wo oikosu (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>現実<rt>げんじつ</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>越<rt>こ</rt></ruby>す) — 'dreams overtake reality'

${MARKER}`,

  "40bb1891": `〜n ja nai no (〜んじゃないの) combines 〜n da (explanatory contraction of 〜noda, batch2) with 〜janai (negative copula) + 〜no (question / softening). Means "isn't it that / could it be / right?". Casual, often confrontational or insistent. wakatte iru n ja nai no? (<ruby>分<rt>わ</rt></ruby>かっているんじゃないの？) "you DO understand, don't you?".

Two common uses: (a) Soft confrontation — pressing the listener with a suspected truth. (b) Dismissive judgement — boku no sei n ja nai no? (<ruby>僕<rt>ぼく</rt></ruby>のせいんじゃないの？) 'isn't it your fault?'. The 〜の at the end is often dropped in male speech: 〜n ja nai? = same meaning.

Compare with batch4b's 〜janai ka (gentler 'isn't it?'), 〜n darou (explanatory conjecture, batch3b), 〜n da (just explanatory, batch2). 〜n ja nai no carries pushback / accusation flavour — used when the speaker thinks the listener should know better or when challenging an assumption.

• wakatte iru n ja nai no? (<ruby>分<rt>わ</rt></ruby>かっているんじゃないの？) — "you DO understand, right?"
• boku no sei n ja nai no? (<ruby>僕<rt>ぼく</rt></ruby>のせいんじゃないの？) — "isn't it your fault?"
• kuru n ja nai no? (<ruby>来<rt>く</rt></ruby>るんじゃないの？) — "they're coming, aren't they?"
• kowareta n ja nai no? (<ruby>壊<rt>こわ</rt></ruby>れたんじゃないの？) — "isn't it broken?"
• boku-tachi mo onaji n ja nai? (<ruby>僕<rt>ぼく</rt></ruby>たちも<ruby>同<rt>おな</rt></ruby>じんじゃない？) — "aren't we the same too?"
• shitte iru n ja nai? (<ruby>知<rt>し</rt></ruby>っているんじゃない？) — "you know, don't you?"
• kawatta n ja nai? (<ruby>変<rt>か</rt></ruby>わったんじゃない？) — "you've changed, haven't you?"
• mou owatta n ja nai? (もう<ruby>終<rt>お</rt></ruby>わったんじゃない？) — "isn't it already over?"
• ai shi-te iru n ja nai? (<ruby>愛<rt>あい</rt></ruby>しているんじゃない？) — "you love (me), don't you?"
• shinjite kureta n ja nai? (<ruby>信<rt>しん</rt></ruby>じてくれたんじゃない？) — "you believed (me), didn't you?"
• boku no kotoba ga todoita n ja nai? (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>が<ruby>届<rt>とど</rt></ruby>いたんじゃない？) — "didn't my words reach?"
• yume wo wasureta n ja nai? (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れたんじゃない？) — "didn't (you) forget the dream?"
• onaji ki mochi n ja nai? (<ruby>同<rt>おな</rt></ruby>じ<ruby>気持<rt>きも</rt></ruby>ちんじゃない？) — "isn't it the same feeling?"
• mata aeru n ja nai? (また<ruby>会<rt>あ</rt></ruby>えるんじゃない？) — "we'll meet again, won't we?"
• boku ja nai n ja nai? (<ruby>僕<rt>ぼく</rt></ruby>じゃないんじゃない？) — "wasn't it me?"

${MARKER}`,

  "4c081e42": `〜wake ni wa ikanai (〜わけにはいかない) attaches a V-dictionary form + wake (reason / case) + ni wa + ikanai (won't go). Means 'cannot / shouldn't (do X) — for social / moral / practical reasons'. Marks an action that's prohibited or impossible due to circumstances or social pressure. yameru wake ni wa ikanai (やめるわけにはいかない) "I can't quit (for what people would think / what's expected)".

Distinct from batch3b's 〜wake ga nai (no possible way emotionally / logically). 〜wake ni wa ikanai is about SOCIAL / SITUATIONAL impossibility — the speaker has reasons not to act, often duty, expectation, or commitment to others.

Compare with 〜beki ja nai (shouldn't — moral, batch6a), 〜nakereba naranai (must — necessity), 〜wake ga nai (no way — impossibility). 〜wake ni wa ikanai is uniquely about socially-bound restraint — perfect for songs about duty, sacrifice, and reluctant commitments.

• yameru wake ni wa ikanai (やめるわけにはいかない) — "can't quit"
• nigeru wake ni wa ikanai (<ruby>逃<rt>に</rt></ruby>げるわけにはいかない) — "can't run"
• naku wake ni wa ikanai (<ruby>泣<rt>な</rt></ruby>くわけにはいかない) — "can't cry"
• ushinau wake ni wa ikanai (<ruby>失<rt>うしな</rt></ruby>うわけにはいかない) — "can't lose"
• makeru wake ni wa ikanai (<ruby>負<rt>ま</rt></ruby>けるわけにはいかない) — "can't lose (a match)"
• damaru wake ni wa ikanai (<ruby>黙<rt>だま</rt></ruby>るわけにはいかない) — "can't stay silent"
• tomaru wake ni wa ikanai (<ruby>止<rt>と</rt></ruby>まるわけにはいかない) — "can't stop"
• wasureru wake ni wa ikanai (<ruby>忘<rt>わす</rt></ruby>れるわけにはいかない) — "can't forget"
• boku ga ushinau wake ni wa ikanai (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>失<rt>うしな</rt></ruby>うわけにはいかない) — "I can't be the one to lose"
• shippai suru wake ni wa ikanai (<ruby>失敗<rt>しっぱい</rt></ruby>するわけにはいかない) — "can't fail"
• boku ga inai wake ni wa ikanai (<ruby>僕<rt>ぼく</rt></ruby>がいないわけにはいかない) — "I can't not be there"
• mata machigaeru wake ni wa ikanai (また<ruby>間違<rt>まちが</rt></ruby>えるわけにはいかない) — "can't make the mistake again"
• akirameru wake ni wa ikanai (<ruby>諦<rt>あきら</rt></ruby>めるわけにはいかない) — "can't give up"
• shinjinai wake ni wa ikanai (<ruby>信<rt>しん</rt></ruby>じないわけにはいかない) — "can't not believe"
• boku ga sou suru wake ni wa ikanai (<ruby>僕<rt>ぼく</rt></ruby>がそうするわけにはいかない) — "I can't do that"

${MARKER}`,

  "312577e4": `〜mae ni (〜<ruby>前<rt>まえ</rt></ruby>に) attaches to a V-dictionary form, noun + の, or time expression. Means 'before X'. Marks a time / event that precedes another. neru mae ni (<ruby>寝<rt>ね</rt></ruby>る<ruby>前<rt>まえ</rt></ruby>に) 'before sleeping'. Noun: shokuji no mae ni (<ruby>食事<rt>しょくじ</rt></ruby>の<ruby>前<rt>まえ</rt></ruby>に) 'before the meal'.

The structure scopes the action: do Y BEFORE X happens. Distinct from 〜ato (after — opposite), 〜tokoro (just about to — different temporal frame), 〜made ni (by — deadline). 〜mae ni is the simple temporal precedence marker.

Common in instructions, narrative, songs about regret or anticipation: sayonara wo iu mae ni (さよならを<ruby>言<rt>い</rt></ruby>う<ruby>前<rt>まえ</rt></ruby>に) 'before saying goodbye'. Foundational structure — appears in everyday Japanese for any sequence of events.

• neru mae ni (<ruby>寝<rt>ね</rt></ruby>る<ruby>前<rt>まえ</rt></ruby>に) — 'before sleeping'
• taberu mae ni (<ruby>食<rt>た</rt></ruby>べる<ruby>前<rt>まえ</rt></ruby>に) — 'before eating'
• iku mae ni (<ruby>行<rt>い</rt></ruby>く<ruby>前<rt>まえ</rt></ruby>に) — 'before going'
• shokuji no mae ni (<ruby>食事<rt>しょくじ</rt></ruby>の<ruby>前<rt>まえ</rt></ruby>に) — 'before the meal'
• shukudai no mae ni (<ruby>宿題<rt>しゅくだい</rt></ruby>の<ruby>前<rt>まえ</rt></ruby>に) — 'before homework'
• sayonara wo iu mae ni (さよならを<ruby>言<rt>い</rt></ruby>う<ruby>前<rt>まえ</rt></ruby>に) — 'before saying goodbye'
• boku ga inakune naru mae ni (<ruby>僕<rt>ぼく</rt></ruby>がいなくなる<ruby>前<rt>まえ</rt></ruby>に) — 'before I disappear'
• haru ga kuru mae ni (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>く</rt></ruby>る<ruby>前<rt>まえ</rt></ruby>に) — 'before spring comes'
• kimi to wakareru mae ni (<ruby>君<rt>きみ</rt></ruby>と<ruby>別<rt>わか</rt></ruby>れる<ruby>前<rt>まえ</rt></ruby>に) — 'before parting from you'
• yume ga sa-meru mae ni (<ruby>夢<rt>ゆめ</rt></ruby>がさめる<ruby>前<rt>まえ</rt></ruby>に) — 'before the dream ends'
• boku ga wasureru mae ni (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>忘<rt>わす</rt></ruby>れる<ruby>前<rt>まえ</rt></ruby>に) — 'before I forget'
• ki ga kawaru mae ni (<ruby>気<rt>き</rt></ruby>が<ruby>変<rt>か</rt></ruby>わる<ruby>前<rt>まえ</rt></ruby>に) — 'before (you) change your mind'
• mou osokure-ru mae ni (もう<ruby>遅<rt>おそ</rt></ruby>くれる<ruby>前<rt>まえ</rt></ruby>に) — "before it's too late"
• boku no namida ga koboreru mae ni (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>がこぼれる<ruby>前<rt>まえ</rt></ruby>に) — 'before my tears spill'
• yoake no mae ni (<ruby>夜明<rt>よあ</rt></ruby>けの<ruby>前<rt>まえ</rt></ruby>に) — 'before the dawn'

${MARKER}`,

  "54e4ec9d": `〜yue ni (〜<ruby>故<rt>ゆえ</rt></ruby>に) attaches to a noun + の or to plain-form sentences. Means 'because of X / on account of X / hence'. FORMAL / LITERARY equivalent of 〜node or 〜kara (because). yue (故) is a noun meaning 'reason / cause'. ai yue ni (<ruby>愛<rt>あい</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に) 'because of love'.

The structure carries gravitas — preferred in formal writing, philosophy, song lyrics aiming for weight: kotoba yue ni umareru gokai (<ruby>言葉<rt>ことば</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に<ruby>生<rt>う</rt></ruby>まれる<ruby>誤解<rt>ごかい</rt></ruby>) 'misunderstandings born of words'. Sometimes used for syllogistic reasoning: ware omou yue ni ware ari ('I think therefore I am').

Compare with 〜kara (subjective reason, batch3a), 〜node (objective / softer), 〜tame ni (for the sake of, batch2). 〜yue ni is the most formal / literary 'because' — used in elevated lyrics, formal speeches, philosophy, written prose. Not for everyday speech.

• ai yue ni (<ruby>愛<rt>あい</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に) — 'because of love'
• kanashimi yue ni (<ruby>悲<rt>かな</rt></ruby>しみ<ruby>故<rt>ゆえ</rt></ruby>に) — 'because of sorrow'
• yume yue ni (<ruby>夢<rt>ゆめ</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に) — 'because of the dream'
• unmei yue ni (<ruby>運命<rt>うんめい</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に) — 'because of fate'
• kotoba yue ni umareru gokai (<ruby>言葉<rt>ことば</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に<ruby>生<rt>う</rt></ruby>まれる<ruby>誤解<rt>ごかい</rt></ruby>) — 'misunderstandings born of words'
• boku no yowasa yue ni (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>弱<rt>よわ</rt></ruby>さ<ruby>故<rt>ゆえ</rt></ruby>に) — 'because of my weakness'
• shippai yue ni manabu (<ruby>失敗<rt>しっぱい</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に<ruby>学<rt>まな</rt></ruby>ぶ) — 'we learn through failure'
• tsumi yue ni (<ruby>罪<rt>つみ</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に) — 'because of sin'
• ware omou yue ni ware ari (<ruby>我<rt>われ</rt></ruby><ruby>思<rt>おも</rt></ruby>う<ruby>故<rt>ゆえ</rt></ruby>に<ruby>我<rt>われ</rt></ruby>あり) — "I think, therefore I am"
• boku-tachi no inori yue ni (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>祈<rt>いの</rt></ruby>り<ruby>故<rt>ゆえ</rt></ruby>に) — 'because of our prayers'
• kotaeru yue ni (<ruby>答<rt>こた</rt></ruby>える<ruby>故<rt>ゆえ</rt></ruby>に) — 'because of the answer'
• kotoba ni naranai yue ni (<ruby>言葉<rt>ことば</rt></ruby>にならない<ruby>故<rt>ゆえ</rt></ruby>に) — 'because (it) cannot become words'
• boku ga aru yue ni (<ruby>僕<rt>ぼく</rt></ruby>がある<ruby>故<rt>ゆえ</rt></ruby>に) — 'because I exist'
• mukaeau yue ni (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>う<ruby>故<rt>ゆえ</rt></ruby>に) — 'because (we) face it'
• taisetsu na hito yue ni (<ruby>大切<rt>たいせつ</rt></ruby>な<ruby>人<rt>ひと</rt></ruby><ruby>故<rt>ゆえ</rt></ruby>に) — 'because (you are) precious'

${MARKER}`,

  "57d21878": `sekkaku 〜noni / kara (せっかく〜のに / せっかく〜から) is a paired construction with the adverb sekkaku ('with great trouble / specially'). Means 'after all the trouble / since the effort was made / it would be a waste if / X'. Marks emotional weight on an effortful action. sekkaku kita noni (せっかく<ruby>来<rt>き</rt></ruby>たのに) 'after coming all this way (and yet...)'.

Two common pairings: (a) sekkaku 〜noni — emphasises wasted / unrewarded effort. (b) sekkaku 〜kara — leveraging the effort: sekkaku kita kara, asobou (せっかく<ruby>来<rt>き</rt></ruby>たから、<ruby>遊<rt>あそ</rt></ruby>ぼう) 'since we came all this way, let's play'. The sekkaku adds emotional value.

Compare with bare 〜noni (despite, batch2), 〜kara (because, batch3a), 〜doryoku shite (having tried). sekkaku 〜noni / kara is a uniquely Japanese expression of 'effort consciousness' — perfect for songs and conversations about disappointment, leveraging opportunity, or remembering invested time.

• sekkaku kita noni (せっかく<ruby>来<rt>き</rt></ruby>たのに) — 'after coming all this way'
• sekkaku kita kara (せっかく<ruby>来<rt>き</rt></ruby>たから) — 'since we came all this way'
• sekkaku ganbatta noni (せっかく<ruby>頑張<rt>がんば</rt></ruby>ったのに) — 'after all the trying'
• sekkaku no kikai (せっかくの<ruby>機会<rt>きかい</rt></ruby>) — 'a precious opportunity'
• sekkaku no jikan (せっかくの<ruby>時間<rt>じかん</rt></ruby>) — 'precious time'
• sekkaku ai-shi-te iru noni (せっかく<ruby>愛<rt>あい</rt></ruby>しているのに) — 'after all the loving'
• sekkaku tsutaeta noni (せっかく<ruby>伝<rt>つた</rt></ruby>えたのに) — 'after all the conveying'
• sekkaku boku-tachi ga atta kara (せっかく<ruby>僕<rt>ぼく</rt></ruby>たちが<ruby>会<rt>あ</rt></ruby>ったから) — 'since we met'
• sekkaku no chansu (せっかくのチャンス) — 'a precious chance'
• sekkaku oboeta kanji ga (せっかく<ruby>覚<rt>おぼ</rt></ruby>えた<ruby>漢字<rt>かんじ</rt></ruby>が) — 'kanji I worked so hard to learn'
• sekkaku no shiawase (せっかくの<ruby>幸<rt>しあわ</rt></ruby>せ) — 'precious happiness'
• sekkaku no haru (せっかくの<ruby>春<rt>はる</rt></ruby>) — 'precious spring'
• sekkaku boku ga inai (せっかく<ruby>僕<rt>ぼく</rt></ruby>がいない) — 'since I'm finally not there'
• sekkaku shinjite kureta noni (せっかく<ruby>信<rt>しん</rt></ruby>じてくれたのに) — 'after you went and believed in me'
• sekkaku tsuyoku natta noni (せっかく<ruby>強<rt>つよ</rt></ruby>くなったのに) — 'after becoming strong with effort'

${MARKER}`,

  "82528077": `douka (どうか) is an adverb / particle. Two main uses: (a) Formal plea — 'please / I beg you' — douka onegai (どうかお<ruby>願<rt>ねが</rt></ruby>い) 'please (I implore)'. (b) Indirect question / uncertainty — 'whether or not / somehow' — douka iku no ka wakaranai (どうか<ruby>行<rt>い</rt></ruby>くのか<ruby>分<rt>わ</rt></ruby>からない) 'I don't know whether to go'.

The plea use is heartfelt / reverent — beyond simple 〜te kudasai. Common in shrine prayers, emotional appeals, song lyrics: douka boku wo wasure-naide (どうか<ruby>僕<rt>ぼく</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れないで) 'please don't forget me'. Often paired with 〜ka douka (whether or not) for indirect questions: kuru ka douka wakaranai (whether they'll come or not).

Compare with onegai (please — neutral), 〜te kudasai (formal request), zehi (by all means). douka is the heartfelt / poetic plea — used when the request carries weight. Distinct from konoyou ni (in this manner), nantonaku (somehow / vaguely).

• douka onegai (どうかお<ruby>願<rt>ねが</rt></ruby>い) — "please (I beg you)"
• douka boku wo wasure-naide (どうか<ruby>僕<rt>ぼく</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れないで) — "please don't forget me"
• douka kanaete (どうか<ruby>叶<rt>かな</rt></ruby>えて) — "please grant (this wish)"
• douka kimi ga shiawase de aru you ni (どうか<ruby>君<rt>きみ</rt></ruby>が<ruby>幸<rt>しあわ</rt></ruby>せであるように) — "may you, please, be happy"
• douka muji de ite (どうか<ruby>無事<rt>ぶじ</rt></ruby>でいて) — "please be safe"
• kuru ka douka wakaranai (<ruby>来<rt>く</rt></ruby>るかどうか<ruby>分<rt>わ</rt></ruby>からない) — "whether they come or not, I don't know"
• shitte iru ka douka (<ruby>知<rt>し</rt></ruby>っているかどうか) — "whether (they) know or not"
• douka boku-tachi wo mamotte (どうか<ruby>僕<rt>ぼく</rt></ruby>たちを<ruby>守<rt>まも</rt></ruby>って) — "please protect us"
• douka ai-shi-te ite (どうか<ruby>愛<rt>あい</rt></ruby>していて) — "please keep loving (me)"
• ai datta ka douka (<ruby>愛<rt>あい</rt></ruby>だったかどうか) — "whether it was love or not"
• kanaete kureru ka douka (<ruby>叶<rt>かな</rt></ruby>えてくれるかどうか) — "whether (it'll be) granted or not"
• douka ima sugu (どうか<ruby>今<rt>いま</rt></ruby>すぐ) — "please right now"
• yume ka douka (<ruby>夢<rt>ゆめ</rt></ruby>かどうか) — "whether it's a dream or not"
• tsuzukerareru ka douka (<ruby>続<rt>つづ</rt></ruby>けられるかどうか) — "whether (I) can keep going"
• douka kotoba ga todoki masu you ni (どうか<ruby>言葉<rt>ことば</rt></ruby>が<ruby>届<rt>とど</rt></ruby>きますように) — "please, may the words reach"

${MARKER}`,

  "5b163db1": `mo (も) is a foundational particle attaching to nouns or noun-equivalents. Multiple senses: (a) 'also / too' — boku mo iku (<ruby>僕<rt>ぼく</rt></ruby>も<ruby>行<rt>い</rt></ruby>く) "I'm going too". (b) 'even' — sonna koto mo wakaranai (そんなこともわからない) 'doesn't even understand that'. (c) Emphasis with quantifier — san-jikan mo matta (<ruby>三時間<rt>さんじかん</rt></ruby>も<ruby>待<rt>ま</rt></ruby>った) 'waited for THREE WHOLE hours'.

Replaces wa (topic) and ga (subject) when adding 'too / also' nuance. With negation: 'not even / no...at all' — nani mo nai (<ruby>何<rt>なに</rt></ruby>もない) 'nothing'. With question words: universal scope (covered in batch4b 'question word + も + negative').

Compare with wa (topic — distinct), to (and — exhaustive), ya (and — partial). も is the additive / inclusive marker — extends the predicate to additional referents. Foundational N5 — every speaker uses it dozens of times daily. Key contrasting usage: boku wa iku (the speaker — 'I'm going') vs. boku mo iku (one of many — 'I'm going too').

• boku mo iku (<ruby>僕<rt>ぼく</rt></ruby>も<ruby>行<rt>い</rt></ruby>く) — "I'm going too"
• kimi mo (<ruby>君<rt>きみ</rt></ruby>も) — 'you too'
• kore mo (これも) — 'this too'
• nani mo nai (<ruby>何<rt>なに</rt></ruby>もない) — 'there's nothing'
• dare mo inai (<ruby>誰<rt>だれ</rt></ruby>もいない) — 'no one is here'
• san-jikan mo matta (<ruby>三時間<rt>さんじかん</rt></ruby>も<ruby>待<rt>ま</rt></ruby>った) — 'waited three whole hours'
• ame mo yuki mo (<ruby>雨<rt>あめ</rt></ruby>も<ruby>雪<rt>ゆき</rt></ruby>も) — 'rain and snow' (additive listing)
• boku mo wakaranai (<ruby>僕<rt>ぼく</rt></ruby>もわからない) — "I don't get it either"
• ima mo (<ruby>今<rt>いま</rt></ruby>も) — 'even now'
• kimi no koto mo (<ruby>君<rt>きみ</rt></ruby>のことも) — 'you too / about you also'
• kore mo ai (これも<ruby>愛<rt>あい</rt></ruby>) — 'this is love too'
• boku-tachi mo onaji (<ruby>僕<rt>ぼく</rt></ruby>たちも<ruby>同<rt>おな</rt></ruby>じ) — "we're the same too"
• mukashi mo ima mo (<ruby>昔<rt>むかし</rt></ruby>も<ruby>今<rt>いま</rt></ruby>も) — 'past and present'
• nani mo iwanai (<ruby>何<rt>なに</rt></ruby>も<ruby>言<rt>い</rt></ruby>わない) — "won't say anything"
• jikan mo wasureta (<ruby>時間<rt>じかん</rt></ruby>も<ruby>忘<rt>わす</rt></ruby>れた) — 'forgot even time'

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
