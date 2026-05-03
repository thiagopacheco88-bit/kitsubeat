/**
 * Top-11..25 canonical grammar rules — v2 format inline rewrite (batch 2 of calibration).
 * Continues from update-top10-rule-explanations.ts.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/update-top25-batch2.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "9c03bf67-2944-4a87-88fe-7ef21fd1edaf": "〜te kureru (〜てくれる) — doing for me / us",
  "16cee5b1-d12f-4943-a9ed-6812dfe73d26": "〜nante (〜なんて) — such a thing as / things like",
  "47e9005b-2c76-4c7d-8e05-10d53c506123": "〜you ni (〜ように) — so that / hoping that",
  "b275fafa-892e-45a7-94c6-8a48271031ed": "〜nagara (〜ながら) — while doing / despite",
  "14e074d3-b63d-429f-954a-03bde8b36612": "〜n da / 〜no da (〜んだ / 〜のだ) — explanatory emphasis",
  "c52c6db9-1101-4e55-a082-e883ac1fa800": "〜sae (〜さえ) — even (emphatic / focal)",
  "02522b64-19a7-422c-87d7-318afd223420": "〜chau / 〜jau (〜ちゃう / 〜じゃう) — casual 〜te shimau",
  "4c07593c-4c9a-4ecb-86d5-ab49c372825f": "〜tatte (〜たって) — even if (casual)",
  "e172f73b-9c00-439a-b0da-b24b207d7e80": "〜nai de (〜ないで) — please don't / without doing",
  "75765b3c-d98d-4081-9316-dd2f85f309eb": "Volitional 〜you / 〜ou (〜よう / 〜おう) — let's / I'll",
  "4d218c66-5ade-47a3-87a1-002466891415": "〜tame ni (〜ために) — for the sake of / in order to",
  "8748faec-25ee-4167-ad26-c7b292f5fa41": "〜noni (〜のに) — even though / despite",
  "c3fd6077-9048-44c1-b8ec-93fe565fdc2b": "〜datte (〜だって) — even / no matter (casual)",
  "82bde35d-b73c-494a-a1a0-dff9fc412303": "〜hodo (〜ほど) — to the extent of",
  "3271a7b8-8e74-4372-9a57-ec39b80e8cc6": "〜mama (〜まま) — as it is / unchanged",
};

const REWRITES: Record<string, string> = {
  // 〜てくれる — doing for me/us
  "9c03bf67-2944-4a87-88fe-7ef21fd1edaf": `Attach kureru (くれる) to a verb's te-form to express that someone does the action as a favour for the speaker (or the speaker's in-group). 〜te kureru carries gratitude — the speaker recognises the action as benevolent. Past form: 〜te kureta (〜てくれた). Polite form: 〜te kudasaru (〜てくださる) for higher-status givers; 〜te kudasai (〜てください) is the imperative request derived from it.

This is one of three giving-and-receiving verbs central to Japanese pragmatics: kureru (くれる, 'someone gives me / does for me'), ageru (<ruby>上<rt>あ</rt></ruby>げる, 'I give / do for someone'), and morau (もらう, 'I receive / have someone do'). Together they encode the directional flow of favours and the social position of the speaker.

Compare 〜te kureru with 〜te ageru (the speaker is the actor) and 〜te morau (the speaker is the receiver of the action). 〜te kureru positions the speaker as the GRATEFUL recipient. The pattern is essential for natural-sounding Japanese — omitting it where it should appear sounds cold or transactional.

• oshiete kureru (<ruby>教<rt>おし</rt></ruby>えてくれる) — 'teaches me'
• tsukutte kureru (<ruby>作<rt>つく</rt></ruby>ってくれる) — 'makes (it) for me'
• matte kureru (<ruby>待<rt>ま</rt></ruby>ってくれる) — 'waits for me'
• tasukete kureru (<ruby>助<rt>たす</rt></ruby>けてくれる) — 'helps me'
• kanaete kureru (<ruby>叶<rt>かな</rt></ruby>えてくれる) — 'grants (the wish) for me'
• yurushite kureta (<ruby>許<rt>ゆる</rt></ruby>してくれた) — 'forgave me'
• wakatte kureru (<ruby>分<rt>わ</rt></ruby>かってくれる) — 'understands me'
• shoukai shite kureta (<ruby>紹介<rt>しょうかい</rt></ruby>してくれた) — 'introduced (someone) to me'
• kashite kureru? (<ruby>貸<rt>か</rt></ruby>してくれる？) — 'will you lend me?'
• yonde kureta (<ruby>読<rt>よ</rt></ruby>んでくれた) — 'read it (out loud) for me'
• kiite kureru (<ruby>聞<rt>き</rt></ruby>いてくれる) — 'listens to me'
• mukae ni kite kureta (<ruby>迎<rt>むか</rt></ruby>えに<ruby>来<rt>き</rt></ruby>てくれた) — 'came to pick me up'
• shinjite kureru (<ruby>信<rt>しん</rt></ruby>じてくれる) — 'believes in me'
• mamotte kureru (<ruby>守<rt>まも</rt></ruby>ってくれる) — 'protects me'
• tetsudatte kureta (<ruby>手伝<rt>てつだ</rt></ruby>ってくれた) — 'helped me out'

${MARKER}`,

  // 〜なんて — such a thing as
  "16cee5b1-d12f-4943-a9ed-6812dfe73d26": `〜nante (なんて) attaches to a noun, verb, or quoted clause to express disbelief, dismissal, surprise, or self-deprecation — 'such a thing as (X)', 'the very idea of (X)', 'I never thought (X)'. The emotional colour is what makes 〜nante distinct from neutral 〜nado (など, 'such things as'). It almost always carries judgement.

Common contexts: dismissive ('grades don't matter — seiseki nante kankei nai'), surprised ('to think you'd come — kuru nante odoroita'), self-deprecating ('me, do something like that — boku ga sonna koto suru nante'). It can attach to a clause via the quotative pattern: 〜suru nante / 〜da nante (just append after the plain form).

Sometimes interchangeable with 〜nanka (なんか) for casual emphasis ('flowers? — hana nanka iranai = I don't need flowers'). Both are colloquial; in formal writing prefer 〜nado. After negation, 〜nante intensifies the negative ('not at all').

• ikemen nante kankei nai (イケメンなんて<ruby>関係<rt>かんけい</rt></ruby>ない) — 'looks have nothing to do with it'
• shinpai nante shinai (<ruby>心配<rt>しんぱい</rt></ruby>なんてしない) — 'I'm not worried at all'
• kuru nante shiranakatta (<ruby>来<rt>く</rt></ruby>るなんて<ruby>知<rt>し</rt></ruby>らなかった) — 'I had no idea you were coming'
• boku nante (<ruby>僕<rt>ぼく</rt></ruby>なんて) — 'someone like me' (self-deprecating)
• yume nante minai (<ruby>夢<rt>ゆめ</rt></ruby>なんて<ruby>見<rt>み</rt></ruby>ない) — 'I don't dream' (dismissive)
• sonna koto nante deki nai (そんなことなんてできない) — 'I can't do something like that'
• atari mae nante uso da (<ruby>当<rt>あ</rt></ruby>たり<ruby>前<rt>まえ</rt></ruby>なんて<ruby>嘘<rt>うそ</rt></ruby>だ) — 'the idea that it's obvious is a lie'
• kane nante iranai (<ruby>金<rt>かね</rt></ruby>なんて<ruby>要<rt>い</rt></ruby>らない) — 'I don't need money or anything'
• benkyou nante taikutsu (<ruby>勉強<rt>べんきょう</rt></ruby>なんて<ruby>退屈<rt>たいくつ</rt></ruby>) — 'studying is boring' (dismissive)
• shippai suru nante omowanakatta (<ruby>失敗<rt>しっぱい</rt></ruby>するなんて<ruby>思<rt>おも</rt></ruby>わなかった) — 'never thought I'd fail'
• kanojo to wakareru nante (<ruby>彼女<rt>かのじょ</rt></ruby>と<ruby>別<rt>わか</rt></ruby>れるなんて) — 'breaking up with her (of all things)'
• kimi nante kirai da (<ruby>君<rt>きみ</rt></ruby>なんて<ruby>嫌<rt>きら</rt></ruby>いだ) — 'I hate someone like you'
• kyou wa hima nante koto nai (<ruby>今日<rt>きょう</rt></ruby>は<ruby>暇<rt>ひま</rt></ruby>なんてことない) — 'it's not like I'm free today'
• ureshii nante mono ja nai (<ruby>嬉<rt>うれ</rt></ruby>しいなんてものじゃない) — 'happy doesn't even cover it'
• shinjirarenai nante (<ruby>信<rt>しん</rt></ruby>じられないなんて) — 'unbelievable, of all things'

${MARKER}`,

  // 〜ように — so that / hoping that
  "47e9005b-2c76-4c7d-8e05-10d53c506123": `〜you ni (ように) attaches to a plain-form verb (often potential or negative) to express purpose, hope, or wish — 'so that / in order that / hoping that (X)'. Unlike 〜tame ni (ために, 'in order to'), 〜you ni works with non-volitional outcomes (things you cannot directly control: 'so that the rain stops', 'hoping it works').

Two main uses: (1) Purpose: V-eru you ni / V-nai you ni — 'so that I can X / so that X doesn't happen'. (2) Hope / prayer: V-masu-stem-less + you ni — addressed to the heavens, often left as a sentence-final wish: hareru you ni (<ruby>晴<rt>は</rt></ruby>れるように) — '(I hope) it'll be sunny'. Common in shrine omikuji and song lyrics.

Compare with 〜tame ni (volitional 'in order to'). Use ように with potential / state / negative verbs (where the actor doesn't directly cause the outcome); use ために with action verbs the actor performs. Also distinguish from 〜you ni naru ('come to be / change into'), which is a separate change-of-state idiom.

• wasurenai you ni (<ruby>忘<rt>わす</rt></ruby>れないように) — 'so I don't forget'
• mienai you ni (<ruby>見<rt>み</rt></ruby>えないように) — 'so it can't be seen'
• ma ni au you ni (<ruby>間<rt>ま</rt></ruby>に<ruby>合<rt>あ</rt></ruby>うように) — 'so I make it in time'
• yoku miru you ni shite (よく<ruby>見<rt>み</rt></ruby>るようにして) — 'try to look closely'
• hareru you ni (<ruby>晴<rt>は</rt></ruby>れるように) — 'hoping it'll be sunny'
• shiawase ni nareru you ni (<ruby>幸<rt>しあわ</rt></ruby>せになれるように) — 'so that you can be happy'
• genki ni narimasu you ni (<ruby>元気<rt>げんき</rt></ruby>になりますように) — 'praying you'll get well' (shrine wish)
• kuru you ni tanonda (<ruby>来<rt>く</rt></ruby>るように<ruby>頼<rt>たの</rt></ruby>んだ) — 'asked them to come'
• ochinai you ni motte (<ruby>落<rt>お</rt></ruby>ちないように<ruby>持<rt>も</rt></ruby>って) — 'hold it so it doesn't fall'
• miemasen you ni (<ruby>見<rt>み</rt></ruby>えませんように) — 'hoping it stays unseen'
• ki o tsukeru you ni iwareta (<ruby>気<rt>き</rt></ruby>をつけるように<ruby>言<rt>い</rt></ruby>われた) — 'I was told to be careful'
• yume ga kanau you ni inoru (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>叶<rt>かな</rt></ruby>うように<ruby>祈<rt>いの</rt></ruby>る) — 'pray that the dream comes true'
• osokunaranai you ni (<ruby>遅<rt>おそ</rt></ruby>くならないように) — 'so as not to be late'
• kowarenai you ni hakobu (<ruby>壊<rt>こわ</rt></ruby>れないように<ruby>運<rt>はこ</rt></ruby>ぶ) — 'carry it so it doesn't break'
• kanojo ni aeru you ni (<ruby>彼女<rt>かのじょ</rt></ruby>に<ruby>会<rt>あ</rt></ruby>えるように) — 'so that I can meet her'

${MARKER}`,

  // 〜ながら — while doing / despite
  "b275fafa-892e-45a7-94c6-8a48271031ed": `〜nagara (ながら) attaches to a verb's i-stem (masu-stem) to express simultaneous actions — 'while (X) is happening, also (Y)'. The two actions belong to the SAME subject. tabe + nagara hon o yomu (<ruby>食<rt>た</rt></ruby>べながら<ruby>本<rt>ほん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>む) — 'read a book while eating'.

A second sense: 〜nagara mo (ながらも) means 'despite / although' — concessive, with an unexpected contrast. tsukareteinagara mo waratta (<ruby>疲<rt>つか</rt></ruby>れていながらも<ruby>笑<rt>わら</rt></ruby>った) — 'despite being tired, smiled'. The mo emphasises the contrast.

Important: the simultaneous-action sense requires the SAME subject for both actions. For different subjects, use 〜te iru aida ni (〜ている<ruby>間<rt>あいだ</rt></ruby>に, 'while X is happening, separately Y'). The masu-stem requirement means na-adjectives and nouns need 〜de ari nagara (〜であり<ruby>乍<rt>なが</rt></ruby>ら) for the despite-sense, or just attach 〜nagara directly for ambient state ('koukousei nagara — being a high-schooler, [yet]').

• aruki nagara hanasu (<ruby>歩<rt>ある</rt></ruby>きながら<ruby>話<rt>はな</rt></ruby>す) — 'talk while walking'
• tabenagara terebi o miru (<ruby>食<rt>た</rt></ruby>べながらテレビを<ruby>見<rt>み</rt></ruby>る) — 'watch TV while eating'
• ongaku o kiki nagara benkyou suru (<ruby>音楽<rt>おんがく</rt></ruby>を<ruby>聴<rt>き</rt></ruby>きながら<ruby>勉強<rt>べんきょう</rt></ruby>する) — 'study while listening to music'
• naki nagara kataru (<ruby>泣<rt>な</rt></ruby>きながら<ruby>語<rt>かた</rt></ruby>る) — 'speak while crying'
• warai nagara hashiru (<ruby>笑<rt>わら</rt></ruby>いながら<ruby>走<rt>はし</rt></ruby>る) — 'run while laughing'
• shitte i nagara mo damatta (<ruby>知<rt>し</rt></ruby>っていながらも<ruby>黙<rt>だま</rt></ruby>った) — 'stayed silent despite knowing' (concessive)
• tsukare nagara mo tsuzukeru (<ruby>疲<rt>つか</rt></ruby>れながらも<ruby>続<rt>つづ</rt></ruby>ける) — 'continue despite being tired'
• kodomo nagara rikou da (<ruby>子供<rt>こども</rt></ruby>ながら<ruby>利口<rt>りこう</rt></ruby>だ) — 'clever for a child'
• unten shi nagara denwa (<ruby>運転<rt>うんてん</rt></ruby>しながら<ruby>電話<rt>でんわ</rt></ruby>) — 'phone while driving'
• mi nagara mane suru (<ruby>見<rt>み</rt></ruby>ながら<ruby>真似<rt>まね</rt></ruby>する) — 'imitate while watching'
• sake o nomi nagara kataru (<ruby>酒<rt>さけ</rt></ruby>を<ruby>飲<rt>の</rt></ruby>みながら<ruby>語<rt>かた</rt></ruby>る) — 'speak over a drink'
• kangae nagara aruku (<ruby>考<rt>かんが</rt></ruby>えながら<ruby>歩<rt>ある</rt></ruby>く) — 'walk while thinking'
• yowai nagara tatakau (<ruby>弱<rt>よわ</rt></ruby>いながら<ruby>戦<rt>たたか</rt></ruby>う) — 'fight despite being weak' (concessive)
• mayoi nagara erabu (<ruby>迷<rt>まよ</rt></ruby>いながら<ruby>選<rt>えら</rt></ruby>ぶ) — 'choose while wavering'
• zannen nagara ikenai (<ruby>残念<rt>ざんねん</rt></ruby>ながら<ruby>行<rt>い</rt></ruby>けない) — 'regrettably, I cannot go' (idiomatic)

${MARKER}`,

  // 〜んだ / 〜のだ — explanatory
  "14e074d3-b63d-429f-954a-03bde8b36612": `〜n da (んだ) is the contracted form of 〜no da (のだ), an explanatory / emphatic copula. It attaches to plain forms of verbs and i-adjectives, and after な for nouns / na-adjectives (〜nan da / 〜na no da). The function: signal that the speaker is providing an explanation, justifying a stance, or seeking confirmation.

Three flavours: (1) Explaining: kaze o hiita n da (<ruby>風邪<rt>かぜ</rt></ruby>を<ruby>引<rt>ひ</rt></ruby>いたんだ) — 'it's that I caught a cold' (explaining why I'm tired). (2) Asking for explanation: dou shita n da? (どうしたんだ？) — 'what's going on?'. (3) Strong assertion / emphasis: kore wa boku no da (これは<ruby>僕<rt>ぼく</rt></ruby>のだ) — 'this IS mine'.

The polite version 〜n desu (〜んです) is used in formal speech. Female speakers may prefer 〜no (without だ) for a softer feel: kaeru no? (<ruby>帰<rt>かえ</rt></ruby>るの？) — 'going home?'. Without 〜n da, the same statement reads as cold or factual; with it, as engaged and contextualised.

• kaze o hiita n da (<ruby>風邪<rt>かぜ</rt></ruby>を<ruby>引<rt>ひ</rt></ruby>いたんだ) — 'it's that I caught a cold'
• shukudai ga aru n da (<ruby>宿題<rt>しゅくだい</rt></ruby>があるんだ) — 'I have homework, you see'
• ame ga futte iru n da (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>っているんだ) — 'it's raining (that's why)'
• dou shita n da? (どうしたんだ？) — 'what's the matter?'
• naze naite iru n da? (なぜ<ruby>泣<rt>な</rt></ruby>いているんだ？) — 'why are you crying?'
• kore ga hoshii n da (これが<ruby>欲<rt>ほ</rt></ruby>しいんだ) — 'I want THIS one' (emphatic)
• tabetai n da (<ruby>食<rt>た</rt></ruby>べたいんだ) — 'I want to eat (that's the thing)'
• gakusei nan da (<ruby>学生<rt>がくせい</rt></ruby>なんだ) — 'I'm a student (that's why)'
• shitte iru n da yo (<ruby>知<rt>し</rt></ruby>っているんだよ) — 'I do know!' (emphatic with よ)
• samui n desu (<ruby>寒<rt>さむ</rt></ruby>いんです) — 'it's cold (informing)'
• ikitakunai n da (<ruby>行<rt>い</rt></ruby>きたくないんだ) — 'I don't want to go'
• genki na n da (<ruby>元気<rt>げんき</rt></ruby>なんだ) — 'I'm fine (informing)'
• yatto kaereru n da (やっと<ruby>帰<rt>かえ</rt></ruby>れるんだ) — 'I can finally go home'
• boku no sei nan da (<ruby>僕<rt>ぼく</rt></ruby>のせいなんだ) — 'it's my fault'
• mou tsukareta n da (もう<ruby>疲<rt>つか</rt></ruby>れたんだ) — 'I'm just exhausted'

${MARKER}`,

  // 〜さえ — even (emphatic)
  "c52c6db9-1101-4e55-a082-e883ac1fa800": `〜sae (さえ) is a focal / emphatic particle meaning 'even (X)' — singling out a minimal or extreme case. It can attach to nouns directly (kodomo sae wakaru — even a child understands) or to clause-internal constituents. With 〜sae 〜eba / 〜nara, it forms a sufficient-condition pattern: 'as long as ONLY (X), then Y'.

Two main constructions: (1) Emphatic 'even' alone: kuuki sae nai (<ruby>空気<rt>くうき</rt></ruby>さえない) — 'there isn't even air'. (2) Sufficient condition with conditional: ki sae areba (<ruby>気<rt>き</rt></ruby>さえあれば) — 'if I just have the will'. The second usage is very common in songs and motivational speech.

Compare with 〜mo (も, 'also / even') and 〜datte (だって, casual 'even'): 〜sae is the most emphatic and works best when the example is at the extreme low end of expectation ('even THIS minimal thing is missing / is enough'). It always carries surprise or focus on the minimum.

• kodomo sae wakaru (<ruby>子供<rt>こども</rt></ruby>さえわかる) — 'even a child understands'
• kuuki sae nai (<ruby>空気<rt>くうき</rt></ruby>さえない) — 'there isn't even air'
• Tarou sae shitte iru (<ruby>太郎<rt>たろう</rt></ruby>さえ<ruby>知<rt>し</rt></ruby>っている) — 'even Tarou knows'
• yume sae mireba (<ruby>夢<rt>ゆめ</rt></ruby>さえ<ruby>見<rt>み</rt></ruby>れば) — 'as long as I just dream'
• kimi sae ireba ii (<ruby>君<rt>きみ</rt></ruby>さえいればいい) — 'as long as you're here, that's enough'
• genki sae areba (<ruby>元気<rt>げんき</rt></ruby>さえあれば) — 'as long as I just have my health'
• jikan sae areba (<ruby>時間<rt>じかん</rt></ruby>さえあれば) — 'if I just had time'
• namae sae shiranai (<ruby>名前<rt>なまえ</rt></ruby>さえ<ruby>知<rt>し</rt></ruby>らない) — 'I don't even know the name'
• jibun no namae sae kakenai (<ruby>自分<rt>じぶん</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>さえ<ruby>書<rt>か</rt></ruby>けない) — 'can't even write his own name'
• ippun sae matenai (<ruby>一分<rt>いっぷん</rt></ruby>さえ<ruby>待<rt>ま</rt></ruby>てない) — 'can't wait even one minute'
• kotoba sae denai (<ruby>言葉<rt>ことば</rt></ruby>さえ<ruby>出<rt>で</rt></ruby>ない) — 'words won't even come out'
• kao sae mitakunai (<ruby>顔<rt>かお</rt></ruby>さえ<ruby>見<rt>み</rt></ruby>たくない) — 'don't even want to see your face'
• ame sae fureba shiawase (<ruby>雨<rt>あめ</rt></ruby>さえ<ruby>降<rt>ふ</rt></ruby>れば<ruby>幸<rt>しあわ</rt></ruby>せ) — 'as long as it rains, I'm happy'
• benkyou sae sureba goukaku (<ruby>勉強<rt>べんきょう</rt></ruby>さえすれば<ruby>合格<rt>ごうかく</rt></ruby>) — 'pass as long as you just study'
• sora sae aoi nara (<ruby>空<rt>そら</rt></ruby>さえ<ruby>青<rt>あお</rt></ruby>いなら) — 'as long as the sky is blue'

${MARKER}`,

  // 〜ちゃう / 〜じゃう — casual てしまう
  "02522b64-19a7-422c-87d7-318afd223420": `〜chau (〜ちゃう) is the casual contraction of 〜te shimau (〜てしまう); 〜jau (〜じゃう) is the casual contraction of 〜de shimau (〜でしまう, used after -de te-forms like 飲んで). Both express either (a) total / thorough completion, or (b) doing something unintentionally / regretfully. Context — and often the verb's lexical aspect — determines which reading dominates.

Formation: take the te-form, drop て, append ちゃう (or ぢゃう). For verbs with 〜nde te-form (yonde, nonde, shinde), use じゃう: yonde → yonjau (<ruby>読<rt>よ</rt></ruby>んじゃう). Past forms 〜chatta / 〜jatta are extremely common in spoken Japanese, songs, and informal text.

Compared to the full 〜te shimau, the contracted forms feel more spoken / colloquial / emotional. Songs lean on them heavily for the regret nuance ('went and did it, can't take it back'). Avoid in business writing or formal speech — use 〜te shimau or just past form there.

• tabechatta (<ruby>食<rt>た</rt></ruby>べちゃった) — 'I ate it all up'
• wasurechatta (<ruby>忘<rt>わす</rt></ruby>れちゃった) — 'I (sadly) forgot'
• owacchatta (<ruby>終<rt>お</rt></ruby>わっちゃった) — 'it's all over now'
• icchatta (<ruby>言<rt>い</rt></ruby>っちゃった) — 'I went and said it'
• kowashichatta (<ruby>壊<rt>こわ</rt></ruby>しちゃった) — 'I broke it (oops)'
• yonjatta (<ruby>読<rt>よ</rt></ruby>んじゃった) — 'I read it through'
• shinjatta (<ruby>死<rt>し</rt></ruby>んじゃった) — 'they died (sadly)'
• shippai shichatta (<ruby>失敗<rt>しっぱい</rt></ruby>しちゃった) — 'I screwed up'
• chikoku shichau (<ruby>遅刻<rt>ちこく</rt></ruby>しちゃう) — 'I'm going to be late'
• nechatta (<ruby>寝<rt>ね</rt></ruby>ちゃった) — 'I fell asleep accidentally'
• naichatta (<ruby>泣<rt>な</rt></ruby>いちゃった) — 'I cried (couldn't help it)'
• nigechatta (<ruby>逃<rt>に</rt></ruby>げちゃった) — 'they ran away'
• yacchatta (やっちゃった) — 'I (went and) did it'
• modotte kichau (<ruby>戻<rt>もど</rt></ruby>ってきちゃう) — 'ends up coming back'
• tsukarechatta (<ruby>疲<rt>つか</rt></ruby>れちゃった) — 'I'm exhausted (and that's that)'

${MARKER}`,

  // 〜たって — even if (casual)
  "4c07593c-4c9a-4ecb-86d5-ab49c372825f": `〜tatte (たって) is the casual / colloquial equivalent of 〜te mo (ても), meaning 'even if (X)'. Formation is irregular: it derives from past tense + って (the casual quotative), but functions as a conditional concessive. ittatte (<ruby>言<rt>い</rt></ruby>ったって) ≈ itte mo (<ruby>言<rt>い</rt></ruby>っても) — 'even if (I) say'.

For i-adjectives, 〜kutatte (くたって): yasukutatte kawanai (<ruby>安<rt>やす</rt></ruby>くたって<ruby>買<rt>か</rt></ruby>わない) — 'won't buy it even if cheap'. For nouns / na-adjectives, 〜datte: kodomo datte wakaru (<ruby>子供<rt>こども</rt></ruby>だってわかる) — 'even a child understands' (note: this overlaps with the standalone 〜datte particle for 'even / no matter').

The register is decidedly casual, often defiant or dismissive. Common in song lyrics expressing stubbornness. Compare 〜tatte with 〜te mo (more neutral / everyday) and 〜tokoro de (〜ところで, more formal-literary 'no matter what'). Never use 〜tatte in business writing.

• naitatte muda da (<ruby>泣<rt>な</rt></ruby>いたって<ruby>無駄<rt>むだ</rt></ruby>だ) — 'crying won't help'
• ittatte kawaranai (<ruby>言<rt>い</rt></ruby>ったって<ruby>変<rt>か</rt></ruby>わらない) — 'even if I say it, nothing changes'
• benkyou shitatte muda (<ruby>勉強<rt>べんきょう</rt></ruby>したって<ruby>無駄<rt>むだ</rt></ruby>) — 'studying won't help'
• ame ga futtatte iku (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ったって<ruby>行<rt>い</rt></ruby>く) — 'I'll go even if it rains'
• damattatte wakaru (<ruby>黙<rt>だま</rt></ruby>ったってわかる) — 'I can tell even if you don't speak'
• tabetatte futoranai (<ruby>食<rt>た</rt></ruby>べたって<ruby>太<rt>ふと</rt></ruby>らない) — 'I won't gain weight even if I eat'
• yasukutatte iranai (<ruby>安<rt>やす</rt></ruby>くたって<ruby>要<rt>い</rt></ruby>らない) — 'don't want it even if it's cheap'
• takakutatte hoshii (<ruby>高<rt>たか</rt></ruby>くたって<ruby>欲<rt>ほ</rt></ruby>しい) — 'I want it even if expensive'
• samukutatte heiki (<ruby>寒<rt>さむ</rt></ruby>くたって<ruby>平気<rt>へいき</rt></ruby>) — 'I'm fine even if it's cold'
• shittatte oshienai (<ruby>知<rt>し</rt></ruby>ったって<ruby>教<rt>おし</rt></ruby>えない) — 'I won't tell you even if I know'
• mattatte konai (<ruby>待<rt>ま</rt></ruby>ったって<ruby>来<rt>こ</rt></ruby>ない) — 'no matter how long I wait, they won't come'
• ittatte kikanai (<ruby>言<rt>い</rt></ruby>ったって<ruby>聞<rt>き</rt></ruby>かない) — 'they won't listen no matter what I say'
• ishi ga atatte mo heiki (<ruby>石<rt>いし</rt></ruby>が<ruby>当<rt>あ</rt></ruby>たっても<ruby>平気<rt>へいき</rt></ruby>) — 'even if a stone hits me, I'm fine' (note: 〜ても here, neutral form)
• damattatte tsumannai (<ruby>黙<rt>だま</rt></ruby>ったってつまんない) — 'staying silent is boring anyway'
• onaji datte ii (<ruby>同<rt>おな</rt></ruby>じだっていい) — 'it's fine even if it's the same'

${MARKER}`,

  // 〜ないで — please don't / without doing
  "e172f73b-9c00-439a-b0da-b24b207d7e80": `〜nai de (ないで) attaches to the negative ない-form of a verb to express two related senses: (1) 'without doing (X)' — describing the manner of another action (gohan o tabe nai de neta = 'slept without eating'), and (2) 'please don't (X)' — a soft negative request (ikanai de = 'please don't go'). The sense depends on whether 〜nai de stands alone or feeds into another verb.

The formal / written counterpart is 〜zu (ni) (〜ず(に)) — same meaning, more literary register. The polite imperative 'please don't' adds 〜kudasai: konaide kudasai (<ruby>来<rt>こ</rt></ruby>ないでください) — 'please don't come'. Without kudasai, it's still polite-ish but more intimate.

Distinguish from 〜nakute (なくて, the negative te-form), which is used for cause / sequence — could not 〜 and so 〜 — not for 'without doing'. tabenakute komatta (<ruby>食<rt>た</rt></ruby>べなくて<ruby>困<rt>こま</rt></ruby>った) — 'I was troubled because I couldn't eat' (cause). vs tabenai de neta — 'slept without eating' (manner).

• nakanai de (<ruby>泣<rt>な</rt></ruby>かないで) — 'please don't cry'
• ikanai de (<ruby>行<rt>い</rt></ruby>かないで) — 'please don't go'
• wasurenai de (<ruby>忘<rt>わす</rt></ruby>れないで) — 'please don't forget'
• shimpai shinai de (<ruby>心配<rt>しんぱい</rt></ruby>しないで) — 'don't worry'
• gohan o tabenai de neta (ご<ruby>飯<rt>はん</rt></ruby>を<ruby>食<rt>た</rt></ruby>べないで<ruby>寝<rt>ね</rt></ruby>た) — 'slept without eating'
• ki ni shinai de kudasai (<ruby>気<rt>き</rt></ruby>にしないでください) — 'please don't worry about it'
• matanai de yon de (<ruby>待<rt>ま</rt></ruby>たないで<ruby>呼<rt>よ</rt></ruby>んで) — 'call me without waiting'
• nan mo iwanai de (<ruby>何<rt>なに</rt></ruby>も<ruby>言<rt>い</rt></ruby>わないで) — 'don't say anything'
• samenai de yume (<ruby>覚<rt>さ</rt></ruby>めないで<ruby>夢<rt>ゆめ</rt></ruby>) — 'don't wake from the dream' (poetic)
• denwa shinai de hatsu shi (<ruby>電話<rt>でんわ</rt></ruby>しないで<ruby>発<rt>はっ</rt></ruby>し) — 'left without calling'
• minai de hashitta (<ruby>見<rt>み</rt></ruby>ないで<ruby>走<rt>はし</rt></ruby>った) — 'ran without looking'
• kasa o sasanai de aruita (<ruby>傘<rt>かさ</rt></ruby>を<ruby>差<rt>さ</rt></ruby>さないで<ruby>歩<rt>ある</rt></ruby>いた) — 'walked without an umbrella'
• shippai shinai de yatte (<ruby>失敗<rt>しっぱい</rt></ruby>しないでやって) — 'do it without messing up'
• furikaeranai de susume (<ruby>振<rt>ふ</rt></ruby>り<ruby>返<rt>かえ</rt></ruby>らないで<ruby>進<rt>すす</rt></ruby>め) — 'go forward without looking back'
• naka nai de waratte (<ruby>泣<rt>な</rt></ruby>かないで<ruby>笑<rt>わら</rt></ruby>って) — 'smile, don't cry'

${MARKER}`,

  // Volitional 〜よう / 〜う
  "75765b3c-d98d-4081-9316-dd2f85f309eb": `The volitional form expresses 'let's (X)' (1st-person plural intent) or 'I'll (X)' (1st-person resolve / suggestion to oneself). For godan (Group 1) verbs, change the final -u to -ou: iku → ikou (<ruby>行<rt>い</rt></ruby>く → <ruby>行<rt>い</rt></ruby>こう), nomu → nomou (<ruby>飲<rt>の</rt></ruby>む → <ruby>飲<rt>の</rt></ruby>もう). For ichidan (Group 2), drop -ru and add -you: taberu → tabeyou (<ruby>食<rt>た</rt></ruby>べる → <ruby>食<rt>た</rt></ruby>べよう). Irregulars: suru → shiyou (する → しよう), kuru → koyou (<ruby>来<rt>く</rt></ruby>る → <ruby>来<rt>こ</rt></ruby>よう).

Common contexts: invitations ('let's go for a coffee'), self-resolutions ('I'll try harder'), and conjecture pairings (V-volitional + to omou — 'I think I'll V'). Polite version: 〜mashou (〜ましょう) — ikimashou (<ruby>行<rt>い</rt></ruby>きましょう) — 'shall we go'. The pattern V-you to suru (V-volitional + とする) means 'try to / about to V'.

Distinguish volitional from 〜tai (which is desire, not invitation/resolve): tabeyou = 'let's eat / I'll eat (intent)'. tabetai = 'I want to eat (desire)'. Songs use volitionals for chant-like motivational lines ('let's run, let's fight, let's keep going').

• ikou (<ruby>行<rt>い</rt></ruby>こう) — 'let's go'
• tabeyou (<ruby>食<rt>た</rt></ruby>べよう) — 'let's eat'
• nomou (<ruby>飲<rt>の</rt></ruby>もう) — 'let's drink'
• miyou (<ruby>見<rt>み</rt></ruby>よう) — 'let's see / let's watch'
• shiyou (しよう) — 'let's do'
• koyou (<ruby>来<rt>こ</rt></ruby>よう) — 'let me come / let's come'
• ganbarou (<ruby>頑張<rt>がんば</rt></ruby>ろう) — 'let's do our best'
• hashirou (<ruby>走<rt>はし</rt></ruby>ろう) — 'let's run'
• hanasou (<ruby>話<rt>はな</rt></ruby>そう) — 'let's talk'
• arukou (<ruby>歩<rt>ある</rt></ruby>こう) — 'let's walk'
• yasumou (<ruby>休<rt>やす</rt></ruby>もう) — 'let's rest'
• kaerou (<ruby>帰<rt>かえ</rt></ruby>ろう) — 'let's go home'
• tatakaou (<ruby>戦<rt>たたか</rt></ruby>おう) — 'let's fight'
• shinjiyou (<ruby>信<rt>しん</rt></ruby>じよう) — 'let's believe'
• ikou to omou (<ruby>行<rt>い</rt></ruby>こうと<ruby>思<rt>おも</rt></ruby>う) — 'I think I'll go'

${MARKER}`,

  // 〜ために — for the sake of / in order to
  "4d218c66-5ade-47a3-87a1-002466891415": `〜tame ni (ために) expresses purpose ('in order to / for the sake of') and reason ('because of'). The volitional purpose sense attaches to a dictionary-form verb: yume o kanaeru tame ni (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>叶<rt>かな</rt></ruby>えるために) — 'in order to make my dream come true'. Both clauses must share the same agent.

Two distinct uses: (1) Purpose: V-dict + tame ni — 'in order to V'. The agent of the goal-clause must be able to perform the goal. (2) Beneficiary / reason: N + no tame ni — 'for the sake of (N) / because of (N)'. kazoku no tame ni (<ruby>家族<rt>かぞく</rt></ruby>のために) — 'for my family'.

Compare with 〜you ni (ように, 'so that' for non-volitional outcomes — see separate rule). Use ために when YOU control the outcome via direct action; use ように when the outcome is hoped for / non-volitional. Never use ために with potential or state verbs — those need ように.

• benkyou suru tame ni (<ruby>勉強<rt>べんきょう</rt></ruby>するために) — 'in order to study'
• yume no tame ni (<ruby>夢<rt>ゆめ</rt></ruby>のために) — 'for the sake of the dream'
• kazoku no tame ni hataraku (<ruby>家族<rt>かぞく</rt></ruby>のために<ruby>働<rt>はたら</rt></ruby>く) — 'work for the family'
• kenkou no tame ni (<ruby>健康<rt>けんこう</rt></ruby>のために) — 'for one's health'
• miru tame ni kita (<ruby>見<rt>み</rt></ruby>るために<ruby>来<rt>き</rt></ruby>た) — 'came in order to see (it)'
• kau tame ni okane o tameru (<ruby>買<rt>か</rt></ruby>うためにお<ruby>金<rt>かね</rt></ruby>を<ruby>貯<rt>た</rt></ruby>める) — 'save money to buy it'
• shiken no tame ni (<ruby>試験<rt>しけん</rt></ruby>のために) — 'for the exam'
• ai no tame ni (<ruby>愛<rt>あい</rt></ruby>のために) — 'for love'
• mamoru tame ni tatakau (<ruby>守<rt>まも</rt></ruby>るために<ruby>戦<rt>たたか</rt></ruby>う) — 'fight in order to protect'
• shourai no tame ni (<ruby>将来<rt>しょうらい</rt></ruby>のために) — 'for the future'
• yasai o tabe-ru tame ni (<ruby>野菜<rt>やさい</rt></ruby>を<ruby>食<rt>た</rt></ruby>べるために) — 'in order to eat vegetables'
• kimi no tame ni utau (<ruby>君<rt>きみ</rt></ruby>のために<ruby>歌<rt>うた</rt></ruby>う) — 'sing for you'
• ikiru tame ni hataraku (<ruby>生<rt>い</rt></ruby>きるために<ruby>働<rt>はたら</rt></ruby>く) — 'work in order to live'
• shiawase ni naru tame ni (<ruby>幸<rt>しあわ</rt></ruby>せになるために) — 'in order to become happy'
• kodomo no tame ni (<ruby>子供<rt>こども</rt></ruby>のために) — 'for the children'

${MARKER}`,

  // 〜のに — even though
  "8748faec-25ee-4167-ad26-c7b292f5fa41": `〜noni (のに) connects two clauses where the second contradicts what one would expect from the first. Unlike neutral 〜kedo (けど) or 〜ga (が), 〜noni carries strong emotional colour — disappointment, frustration, or surprise. Attaches to plain forms of verbs and i-adjectives; for nouns and na-adjectives, use 〜na noni (なのに).

Sentence-final 〜noni often expresses regret with the second clause left unsaid: '...even though it should be otherwise'. ii hito na noni... (いい<ruby>人<rt>ひと</rt></ruby>なのに...) — 'they're a good person, but...' (and yet things didn't work out). This trailing form is heavily used in songs and emotional speech.

Compare with kedo (neutral, 'but') and ga (more formal but still neutral). 〜noni adds the emotional layer — accusatory, regretful, or wistful. Don't use 〜noni in business writing where neutrality is expected; ga is the safe formal choice.

• benkyou shita noni (<ruby>勉強<rt>べんきょう</rt></ruby>したのに) — 'even though I studied'
• takai noni mazui (<ruby>高<rt>たか</rt></ruby>いのにまずい) — 'expensive but tastes bad'
• ganbatta noni dame datta (<ruby>頑張<rt>がんば</rt></ruby>ったのにダメだった) — 'I tried my best but it didn't work'
• wakai noni kashikoi (<ruby>若<rt>わか</rt></ruby>いのに<ruby>賢<rt>かしこ</rt></ruby>い) — 'wise despite being young'
• shizuka na noni nemurenai (<ruby>静<rt>しず</rt></ruby>かなのに<ruby>眠<rt>ねむ</rt></ruby>れない) — 'even though it's quiet, I can't sleep'
• yakusoku shita noni konakatta (<ruby>約束<rt>やくそく</rt></ruby>したのに<ruby>来<rt>こ</rt></ruby>なかった) — 'they promised but didn't come'
• dekiru noni shinai (できるのにしない) — 'they could do it but they don't'
• ame na noni dekaketa (<ruby>雨<rt>あめ</rt></ruby>なのに<ruby>出<rt>で</rt></ruby>かけた) — 'went out despite the rain'
• tsukareta noni neru jikan ga nai (<ruby>疲<rt>つか</rt></ruby>れたのに<ruby>寝<rt>ね</rt></ruby>る<ruby>時間<rt>じかん</rt></ruby>がない) — 'tired but no time to sleep'
• atatakai noni samui (<ruby>暖<rt>あたた</rt></ruby>かいのに<ruby>寒<rt>さむ</rt></ruby>い) — 'feels cold despite being warm'
• matta noni konakatta (<ruby>待<rt>ま</rt></ruby>ったのに<ruby>来<rt>こ</rt></ruby>なかった) — 'I waited but they didn't show'
• ii hito na noni... (いい<ruby>人<rt>ひと</rt></ruby>なのに...) — 'they're a good person, but...' (sentence-final regret)
• eigo o benkyou shita noni hanasenai (<ruby>英語<rt>えいご</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>したのに<ruby>話<rt>はな</rt></ruby>せない) — 'studied English but can't speak'
• itte oita noni (<ruby>言<rt>い</rt></ruby>っておいたのに) — 'I told you, and yet...'
• mou otona na noni (もう<ruby>大人<rt>おとな</rt></ruby>なのに) — 'even though you're an adult now'

${MARKER}`,

  // 〜だって — even / no matter (casual)
  "c3fd6077-9048-44c1-b8ec-93fe565fdc2b": `〜datte (だって) is a casual particle with two related senses. (1) Emphatic 'even / also' — kodomo datte wakaru (<ruby>子供<rt>こども</rt></ruby>だってわかる) — 'even a child understands'. (2) 'They say / I heard that' — kuru n datte (<ruby>来<rt>く</rt></ruby>るんだって) — 'they say (he)'s coming'. Context disambiguates.

The 'even' sense is interchangeable with 〜demo (〜でも) and 〜sae (〜さえ) in many contexts, but 〜datte is the most casual and most emotional of the three. Often used as a defensive or assertive emphasis: hima da datte! (<ruby>暇<rt>ひま</rt></ruby>ださって!) — 'I'm free, I tell you!'.

The hearsay sense derives from 〜da to itta — shortened. Only attaches to plain forms of verbs / i-adjectives (kuru datte, samui datte). For na-adjectives and nouns, use 〜nan datte (〜なんだって): kirei nan datte — 'they say it's pretty'. Sentence-initial datte = 'because / it's just that' — a separate connective use ('datte / shikata nai').

• kodomo datte wakaru (<ruby>子供<rt>こども</rt></ruby>だってわかる) — 'even a child understands'
• boku datte ningen da (<ruby>僕<rt>ぼく</rt></ruby>だって<ruby>人間<rt>にんげん</rt></ruby>だ) — 'I'm human too, you know'
• ame ga futta n datte (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ったんだって) — 'I heard it rained'
• kanojo datte kuru (<ruby>彼女<rt>かのじょ</rt></ruby>だって<ruby>来<rt>く</rt></ruby>る) — 'she's coming too'
• yasui datte iiyo (<ruby>安<rt>やす</rt></ruby>いだっていいよ) — 'cheap is fine'
• shinjirarenai datte (<ruby>信<rt>しん</rt></ruby>じられないだって) — 'unbelievable, they say'
• boku datte hoshii (<ruby>僕<rt>ぼく</rt></ruby>だって<ruby>欲<rt>ほ</rt></ruby>しい) — 'I want one too'
• kirei nan datte (きれいなんだって) — 'they say it's pretty'
• jikan ga nai n datte (<ruby>時間<rt>じかん</rt></ruby>がないんだって) — 'they say there's no time'
• hima datte nai (<ruby>暇<rt>ひま</rt></ruby>だってない) — 'I'm not even free'
• gakusei datte tsukareru (<ruby>学生<rt>がくせい</rt></ruby>だって<ruby>疲<rt>つか</rt></ruby>れる) — 'students get tired too'
• kau datte iwa-rete-mo (<ruby>買<rt>か</rt></ruby>うだって<ruby>言<rt>い</rt></ruby>われても) — 'even being told to buy it...'
• warui datte (<ruby>悪<rt>わる</rt></ruby>いだって) — 'I heard it's bad'
• onaji datte ii (<ruby>同<rt>おな</rt></ruby>じだっていい) — 'the same is fine'
• inu datte kowai (<ruby>犬<rt>いぬ</rt></ruby>だって<ruby>怖<rt>こわ</rt></ruby>い) — 'even dogs are scary'

${MARKER}`,

  // 〜ほど — to the extent of
  "82bde35d-b73c-494a-a1a0-dff9fc412303": `〜hodo (ほど) expresses degree or extent — 'to the extent of (X)', '(as much as) X'. Attaches to nouns directly, to plain-form verbs, or to i-adjectives. The degree may be a comparison (kuruma ga hoshii hodo — 'as much as I want a car'), a benchmark (sora ni todoku hodo — 'to the extent of reaching the sky'), or a measurement (1-jikan hodo — 'about an hour').

Two key constructions: (1) X 〜hodo Y nai (X ほど Y ない) — 'not as Y as X' (e.g., kanji wa eigo hodo muzukashikunai — 'kanji isn't as hard as English'). (2) 〜ba 〜hodo (the more X, the more Y) — okiku nareba naru hodo (<ruby>大<rt>おお</rt></ruby>きくなればなるほど) — 'the bigger it gets, the more...'.

Also forms set phrases: naku hodo ureshii (<ruby>泣<rt>な</rt></ruby>くほど<ruby>嬉<rt>うれ</rt></ruby>しい) — 'happy enough to cry'; nemurenai hodo (<ruby>眠<rt>ねむ</rt></ruby>れないほど) — 'so much that I can't sleep'. The 'about / approximately' use is more colloquial when applied to small amounts (jippun hodo — 'about ten minutes'); for larger / more formal estimates use 〜kurai or 〜gurai.

• naku hodo ureshii (<ruby>泣<rt>な</rt></ruby>くほど<ruby>嬉<rt>うれ</rt></ruby>しい) — 'happy enough to cry'
• shinu hodo tsukareta (<ruby>死<rt>し</rt></ruby>ぬほど<ruby>疲<rt>つか</rt></ruby>れた) — 'tired enough to die' (hyperbolic)
• 1-jikan hodo (<ruby>一時間<rt>いちじかん</rt></ruby>ほど) — 'about an hour'
• miru hodo utsukushii (<ruby>見<rt>み</rt></ruby>るほど<ruby>美<rt>うつく</rt></ruby>しい) — 'beautiful (the more I look)'
• kare hodo kashikoi hito wa inai (<ruby>彼<rt>かれ</rt></ruby>ほど<ruby>賢<rt>かしこ</rt></ruby>い<ruby>人<rt>ひと</rt></ruby>はいない) — 'no one is as smart as him'
• shaberu hodo wasureru (<ruby>喋<rt>しゃべ</rt></ruby>るほど<ruby>忘<rt>わす</rt></ruby>れる) — 'the more I talk, the more I forget'
• yamu hodo amai (<ruby>止<rt>や</rt></ruby>むほど<ruby>甘<rt>あま</rt></ruby>い) — 'sweet enough to make you stop'
• kurai hodo aoi sora (<ruby>暗<rt>くら</rt></ruby>いほど<ruby>青<rt>あお</rt></ruby>い<ruby>空<rt>そら</rt></ruby>) — 'a sky as deep blue as it is dark'
• ureshikute namida ga deru hodo (<ruby>嬉<rt>うれ</rt></ruby>しくて<ruby>涙<rt>なみだ</rt></ruby>が<ruby>出<rt>で</rt></ruby>るほど) — 'happy enough to bring tears'
• matsu hodo oishikunaru (<ruby>待<rt>ま</rt></ruby>つほどおいしくなる) — 'the longer you wait, the better it tastes'
• ima hodo yoi koto wa nai (<ruby>今<rt>いま</rt></ruby>ほど<ruby>良<rt>よ</rt></ruby>いことはない) — 'nothing is as good as right now'
• ki ga tsukanai hodo shizuka (<ruby>気<rt>き</rt></ruby>がつかないほど<ruby>静<rt>しず</rt></ruby>か) — 'so quiet you wouldn't notice'
• benkyou sureba suru hodo (<ruby>勉強<rt>べんきょう</rt></ruby>すればするほど) — 'the more you study, the more...'
• samui hodo kirei na keshiki (<ruby>寒<rt>さむ</rt></ruby>いほど<ruby>綺麗<rt>きれい</rt></ruby>な<ruby>景色<rt>けしき</rt></ruby>) — 'a view as beautiful as it is cold'
• yume hodo tooi (<ruby>夢<rt>ゆめ</rt></ruby>ほど<ruby>遠<rt>とお</rt></ruby>い) — 'as distant as a dream'

${MARKER}`,

  // 〜まま — as it is
  "3271a7b8-8e74-4372-9a57-ec39b80e8cc6": `〜mama (まま) expresses 'as it is / unchanged / in the state of (X)' — describing a state that persists while another action takes place. Attaches to past-tense verbs (-ta form), to i-adjectives (-i form), to nouns + no, or to na-adjectives + na. The state is held constant while something else happens.

Common patterns: (1) V-ta + mama: tatta mama (<ruby>立<rt>た</rt></ruby>ったまま) — 'while standing'; nuida mama (<ruby>脱<rt>ぬ</rt></ruby>いだまま) — 'left taken-off'. (2) i-adj + mama: atatakai mama (<ruby>暖<rt>あたた</rt></ruby>かいまま) — 'while still warm'. (3) N-no + mama: kodomo no mama (<ruby>子供<rt>こども</rt></ruby>のまま) — 'still a child'. (4) na-adj-na + mama: kirei na mama (きれいなまま) — 'still pretty'.

The pattern often carries a sense of ineffectiveness or unfinished state ('left as is, didn't change') — kuruma o tometa mama dekaketa = 'went out, leaving the car parked'. In poetic / song contexts, 〜mama frames a frozen-in-time emotional state. Distinguish from 〜tabaka-ri (just-finished action) and 〜te iru (state in progress) — 〜mama is about preserved condition.

• tatta mama (<ruby>立<rt>た</rt></ruby>ったまま) — 'while standing'
• suwatta mama (<ruby>座<rt>すわ</rt></ruby>ったまま) — 'while seated'
• megane o kaketa mama neta (<ruby>眼鏡<rt>めがね</rt></ruby>をかけたまま<ruby>寝<rt>ね</rt></ruby>た) — 'fell asleep with glasses on'
• tabako o tsuketa mama (タバコをつけたまま) — 'with the cigarette still lit'
• kutsu o haita mama (<ruby>靴<rt>くつ</rt></ruby>を<ruby>履<rt>は</rt></ruby>いたまま) — 'with shoes still on'
• mado o aketa mama (<ruby>窓<rt>まど</rt></ruby>を<ruby>開<rt>あ</rt></ruby>けたまま) — 'leaving the window open'
• atatakai mama tabete (<ruby>暖<rt>あたた</rt></ruby>かいまま<ruby>食<rt>た</rt></ruby>べて) — 'eat while it's still warm'
• kodomo no mama (<ruby>子供<rt>こども</rt></ruby>のまま) — 'still a child'
• kirei na mama (きれいなまま) — 'still pretty / pristine'
• mukashi no mama (<ruby>昔<rt>むかし</rt></ruby>のまま) — 'just like the old days'
• shitta-ka-buri shita mama (<ruby>知<rt>し</rt></ruby>ったかぶりしたまま) — 'while pretending to know'
• damatta mama (<ruby>黙<rt>だま</rt></ruby>ったまま) — 'staying silent'
• shiranai mama owatta (<ruby>知<rt>し</rt></ruby>らないまま<ruby>終<rt>お</rt></ruby>わった) — 'ended without knowing'
• yume no mama (<ruby>夢<rt>ゆめ</rt></ruby>のまま) — 'as a dream / left unfulfilled'
• ano hi no mama (あの<ruby>日<rt>ひ</rt></ruby>のまま) — 'just like that day' (frozen in time)

${MARKER}`,
};

async function main() {
  const db = getDb();

  let rulesUpdated = 0;
  const oldToNew: Record<string, { oldName: string; newName: string; oldJlpt: string }> = {};
  for (const [id, en] of Object.entries(REWRITES)) {
    const newName = NAME_REWRITES[id];
    if (!newName) { console.error(`no NAME_REWRITES entry for ${id}`); continue; }
    const before = await db.execute(sql`
      SELECT name, jlpt_reference FROM grammar_rules WHERE id = ${id}::uuid
    `);
    const beforeRows = (before.rows ?? before) as Array<{ name: string; jlpt_reference: string }>;
    if (beforeRows.length === 0) continue;

    await db.execute(sql`
      UPDATE grammar_rules
      SET explanation = ${JSON.stringify({ en })}::jsonb,
          name = ${newName},
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
    oldToNew[id] = {
      oldName: beforeRows[0].name,
      newName,
      oldJlpt: beforeRows[0].jlpt_reference,
    };
    rulesUpdated++;
  }
  console.log(`updated ${rulesUpdated} grammar_rules`);

  const versionRes = await db.execute(sql`
    SELECT sv.id, sv.lesson FROM song_versions sv
    JOIN song_version_grammar_rules svgr ON svgr.song_version_id = sv.id
    WHERE svgr.grammar_rule_id IN (${sql.raw(Object.keys(REWRITES).map((id) => `'${id}'::uuid`).join(","))})
  `);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;

  let lessonsUpdated = 0;
  for (const v of versions) {
    const lesson = v.lesson;
    if (!lesson?.grammar_points || !Array.isArray(lesson.grammar_points)) continue;
    let mutated = false;
    for (const gp of lesson.grammar_points) {
      const matchId = Object.entries(oldToNew).find(
        ([, info]) =>
          (info.oldName.trim() === (gp.name ?? "").trim() ||
            info.newName.trim() === (gp.name ?? "").trim()) &&
          info.oldJlpt.trim() === (gp.jlpt_reference ?? "").trim(),
      )?.[0];
      if (!matchId) continue;
      gp.name = oldToNew[matchId].newName;
      gp.explanation = { en: REWRITES[matchId] };
      mutated = true;
    }
    if (mutated) {
      await db.execute(sql`
        UPDATE song_versions
        SET lesson = ${JSON.stringify(lesson)}::jsonb, updated_at = NOW()
        WHERE id = ${v.id}::uuid
      `);
      lessonsUpdated++;
    }
  }
  console.log(`updated ${lessonsUpdated} song_versions.lesson.grammar_points`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
