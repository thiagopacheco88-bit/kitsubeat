/**
 * Batch 5b — 20 v2 grammar rule explanations.
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "5e544164": "〜de arou (〜であろう) — probably is / will be (formal conjecture)",
  "c954075b": "〜de arou to (〜であろうと) — whether X or not (formal concession)",
  "f9788474": "〜de ite (〜でいて) — please be / stay (continuous request)",
  "94459561": "〜de shika nai (〜でしかない) — can only be / nothing more than",
  "574fac10": "〜to iu no (〜というの) — are you saying / the fact that",
  "f376a137": "〜toka 〜toka (〜とか〜とか) — things like X and Y (casual listing)",
  "4cff93ad": "〜to shite (〜として) — as / in the capacity of",
  "f22f9bb7": "〜to naru (〜となる) — to become / turn into (formal)",
  "bbd3bfb6": "〜to iu (〜と言う) — to say / call (basic quotative)",
  "a39935db": "〜nai you ni (〜ないように) — so as not to / so that X doesn't",
  "84ad8647": "〜nagara mo (〜ながらも) — even while / despite",
  "9dff88d4": "〜nakya yokatta (〜なきゃよかった) — wish I hadn't",
  "ffee1e24": "〜nari ni (〜なりに) — in one's own way",
  "12f9c2c6": "〜ni shika 〜nai (〜にしか〜ない) — only X can / only to X",
  "9ed3eebc": "〜ni suru (〜にする) — make / turn into / decide on",
  "161d00ad": "〜ni datte (〜にだって) — even (to / by) X",
  "e2efd972": "〜ni de mo nareru (〜にでもなれる) — can even become",
  "4aa667f2": "〜ni mo 〜nai (〜にも〜ない) — not even / no one can",
  "b5402ad0": "〜ni mo makezu (〜にも負けず) — without losing to / undaunted by",
  "21288264": "〜ni kawaru (〜に変わる) — to change into",
};

const REWRITES: Record<string, string> = {
  "5e544164": `〜de arou (〜であろう) is the formal / literary equivalent of 〜darou (probably, batch3a). Made of de (copula) + arou (volitional / conjectural form of aru, 'to be'). Means 'probably is / probably will be' with an elevated, written register. yume de arou (<ruby>夢<rt>ゆめ</rt></ruby>であろう) "probably is a dream".

Used in poetry, formal writing, classical-flavoured prose, and song lyrics wanting weight. Modern colloquial Japanese has almost entirely replaced 〜de arou with 〜darou; encountering 〜de arou marks a text as deliberately formal or archaic. Conjugates: 〜de arou ka (formal 'I wonder if').

Compare with 〜darou (everyday conjecture, batch3a), 〜deshou (polite, batch3a-merged), 〜hazu (high confidence, batch3b), 〜kamo shirenai (uncertainty, batch3b). 〜de arou is the formal-literary 'probably' — used when the speaker wants distance, dignity, or song-lyric gravity.

• yume de arou (<ruby>夢<rt>ゆめ</rt></ruby>であろう) — "probably is a dream"
• shinjitsu de arou (<ruby>真実<rt>しんじつ</rt></ruby>であろう) — "probably is the truth"
• kanou de arou (<ruby>可能<rt>かのう</rt></ruby>であろう) — "probably is possible"
• ai de arou (<ruby>愛<rt>あい</rt></ruby>であろう) — "probably is love"
• unmei de arou (<ruby>運命<rt>うんめい</rt></ruby>であろう) — "probably is fate"
• boku no kakugo de arou (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>覚悟<rt>かくご</rt></ruby>であろう) — "probably is my resolve"
• kotae de arou (<ruby>答<rt>こた</rt></ruby>えであろう) — "probably is the answer"
• haru de arou (<ruby>春<rt>はる</rt></ruby>であろう) — "probably is spring"
• sayonara de arou (さよならであろう) — "probably is goodbye"
• shiawase de arou (<ruby>幸<rt>しあわ</rt></ruby>せであろう) — "probably is happiness"
• boku-tachi no kotoba de arou (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>言葉<rt>ことば</rt></ruby>であろう) — "probably are our words"
• tooi mukashi no koto de arou (<ruby>遠<rt>とお</rt></ruby>い<ruby>昔<rt>むかし</rt></ruby>のことであろう) — "probably is from long ago"
• unmei no shinpan de arou (<ruby>運命<rt>うんめい</rt></ruby>の<ruby>審判<rt>しんぱん</rt></ruby>であろう) — "probably is fate's judgement"
• boku no inochi de arou (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>命<rt>いのち</rt></ruby>であろう) — "probably is my life"
• namida no riyuu de arou (<ruby>涙<rt>なみだ</rt></ruby>の<ruby>理由<rt>りゆう</rt></ruby>であろう) — "probably is the reason for tears"

${MARKER}`,

  "c954075b": `〜de arou to (〜であろうと) extends 〜de arou (formal probably, batch5b) with と (quotative). Means 'whether X or not / regardless of X / no matter what X is'. Formal / literary concessive — emphasises that X (whatever it might be) doesn't change the outcome. nani de arou to (<ruby>何<rt>なに</rt></ruby>であろうと) 'no matter what'.

Often paired with kekka, kotoba, koto for emphatic regardless-claims: dou iu kotoba de arou to (どういう<ruby>言葉<rt>ことば</rt></ruby>であろうと) 'whatever the words may be'. Distinct from 〜you to (no matter what — verbal volitional, batch4b) by attaching to the formal copula form.

Compare with 〜demo (basic concession), tatoe〜demo (strong, batch3b), 〜you to (verbal regardless, batch4b). 〜de arou to is the formal / literary 'whatever / no matter' marker — preferred in elevated speech, written prose, song lyrics that want gravity.

• nani de arou to (<ruby>何<rt>なに</rt></ruby>であろうと) — 'no matter what'
• dare de arou to (<ruby>誰<rt>だれ</rt></ruby>であろうと) — 'no matter who'
• doko de arou to (どこであろうと) — 'no matter where'
• itsu de arou to (いつであろうと) — 'no matter when'
• yume de arou to (<ruby>夢<rt>ゆめ</rt></ruby>であろうと) — 'whether or not it be a dream'
• shippai de arou to (<ruby>失敗<rt>しっぱい</rt></ruby>であろうと) — 'whether or not it be failure'
• unmei de arou to (<ruby>運命<rt>うんめい</rt></ruby>であろうと) — 'whether it be fate'
• donna kotoba de arou to (どんな<ruby>言葉<rt>ことば</rt></ruby>であろうと) — 'whatever the words'
• boku ga dare de arou to (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>誰<rt>だれ</rt></ruby>であろうと) — 'whoever I am'
• kotoba dewa nai de arou to (<ruby>言葉<rt>ことば</rt></ruby>ではないであろうと) — 'whether or not it be words'
• ai dewa nai de arou to (<ruby>愛<rt>あい</rt></ruby>ではないであろうと) — 'whether or not it be love'
• boku-tachi no koto de arou to (<ruby>僕<rt>ぼく</rt></ruby>たちのことであろうと) — 'whether or not (it concerns) us'
• taisetsu na koto de arou to (<ruby>大切<rt>たいせつ</rt></ruby>なことであろうと) — 'whether or not (it be) important'
• boku no koe de arou to (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>であろうと) — "whether or not it be my voice"
• kanji de arou to hiragana de arou to (<ruby>漢字<rt>かんじ</rt></ruby>であろうとひらがなであろうと) — 'whether kanji or hiragana'

${MARKER}`,

  "f9788474": `〜de ite (〜でいて) attaches the te-form of the copula (de) + iru (be / exist, in te-form ite). Means 'please be / stay (in the state of) X'. A request for someone to remain in a state. genki de ite (<ruby>元気<rt>げんき</rt></ruby>でいて) "please stay well / take care".

The structure parallels batch4a's 〜nai de ite (keep not doing) — both use the te-form of iru to extend a state. 〜de ite specifically requests positive state-maintenance. Common in farewells, songs about distance, and tender wishes: shiawase de ite (<ruby>幸<rt>しあわ</rt></ruby>せでいて) "please stay happy".

Compare with 〜nai de ite (please keep not doing, batch4a), 〜te ite (please be doing — verb te-form + ite, request for ongoing action), and 〜ite (just 'be / stay', short form). 〜de ite is the noun/na-adj-state request — gentle, often emotional, sometimes wistful.

• genki de ite (<ruby>元気<rt>げんき</rt></ruby>でいて) — 'stay well'
• shiawase de ite (<ruby>幸<rt>しあわ</rt></ruby>せでいて) — 'stay happy'
• egao de ite (<ruby>笑顔<rt>えがお</rt></ruby>でいて) — 'stay smiling'
• tsuyoku de ite (<ruby>強<rt>つよ</rt></ruby>くでいて) — 'stay strong' (de-ite construction with adjective)
• boku no soba ni ite (<ruby>僕<rt>ぼく</rt></ruby>のそばにいて) — 'stay by my side'
• kawaranaide ite (<ruby>変<rt>か</rt></ruby>わらないでいて) — 'stay unchanged' (negation overlap)
• jiyuu de ite (<ruby>自由<rt>じゆう</rt></ruby>でいて) — 'stay free'
• yasashii mama de ite (<ruby>優<rt>やさ</rt></ruby>しいままでいて) — 'stay kind'
• boku no kaze de ite (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>風<rt>かぜ</rt></ruby>でいて) — 'be my wind'
• boku no soba de ite (<ruby>僕<rt>ぼく</rt></ruby>のそばでいて) — 'stay near me'
• damatte ite kudasai (<ruby>黙<rt>だま</rt></ruby>っていてください) — 'please stay silent'
• mama no mama de ite (ままのままでいて) — 'stay just as you are'
• warai-tsuzukete ite (<ruby>笑<rt>わら</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>けていて) — 'keep on smiling'
• kimi de ite (<ruby>君<rt>きみ</rt></ruby>でいて) — 'be (just) you'
• boku no inori de ite (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>祈<rt>いの</rt></ruby>りでいて) — 'be my prayer'

${MARKER}`,

  "94459561": `〜de shika nai (〜でしかない) combines 〜de (copula te-form) + shika (only — used with negative, batch4a) + nai (negative). Means 'is nothing more than X / can only be X / is merely X'. Strong reductive claim — emphasises that X is the LIMIT of what something is. boku wa boku de shika nai (<ruby>僕<rt>ぼく</rt></ruby>は<ruby>僕<rt>ぼく</rt></ruby>でしかない) "I am nothing more than myself".

The structure carries a sense of resignation, acceptance, or bitter limitation. Common in lyrics for self-knowledge: yume de shika nai (<ruby>夢<rt>ゆめ</rt></ruby>でしかない) "it's nothing more than a dream". Often left at sentence-end as a definitive judgement.

Compare with 〜dake (just, neutral, batch3b), 〜ni suginai (no more than — formal), 〜nomi (formal only). 〜de shika nai is the emphatic 'only / nothing more than' marker — used when the speaker wants to assert a hard floor or reductive identity.

• boku wa boku de shika nai (<ruby>僕<rt>ぼく</rt></ruby>は<ruby>僕<rt>ぼく</rt></ruby>でしかない) — "I am nothing more than myself"
• yume de shika nai (<ruby>夢<rt>ゆめ</rt></ruby>でしかない) — "nothing more than a dream"
• kotoba de shika nai (<ruby>言葉<rt>ことば</rt></ruby>でしかない) — "nothing more than words"
• boku-tachi de shika nai (<ruby>僕<rt>ぼく</rt></ruby>たちでしかない) — "nothing more than us"
• ima de shika nai (<ruby>今<rt>いま</rt></ruby>でしかない) — "nothing more than now"
• shippai de shika nai (<ruby>失敗<rt>しっぱい</rt></ruby>でしかない) — "nothing more than failure"
• yowasa de shika nai (<ruby>弱<rt>よわ</rt></ruby>さでしかない) — "nothing more than weakness"
• namida de shika nai (<ruby>涙<rt>なみだ</rt></ruby>でしかない) — "nothing more than tears"
• boku no kotae de shika nai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えでしかない) — "nothing more than my answer"
• kioku de shika nai (<ruby>記憶<rt>きおく</rt></ruby>でしかない) — "nothing more than memory"
• ai no kotoba de shika nai (<ruby>愛<rt>あい</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>でしかない) — "nothing more than words of love"
• nageki de shika nai (<ruby>嘆<rt>なげ</rt></ruby>きでしかない) — "nothing more than lament"
• boku no kage de shika nai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>影<rt>かげ</rt></ruby>でしかない) — "nothing more than my shadow"
• onaji koto de shika nai (<ruby>同<rt>おな</rt></ruby>じことでしかない) — "amounts to the same thing"
• boku no inori de shika nai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>祈<rt>いの</rt></ruby>りでしかない) — "nothing more than my prayer"

${MARKER}`,

  "574fac10": `〜to iu no (〜というの) extends 〜to iu (called / the fact that, batch3a) with の (nominaliser). Two main uses: (a) Question of disbelief — 'are you saying that X?' — okiru to iu no? (<ruby>起<rt>お</rt></ruby>きるというの？) "are you saying you'll wake up?". (b) Definitional / topic-introducing — 'the fact / case of X' — ai to iu no wa (<ruby>愛<rt>あい</rt></ruby>というのは) 'as for what we call love'.

The disbelief flavour is emotional — often used in dialogue or lyrics for incredulous response. Casual contraction: 〜tte iu no (〜っていうの) or just 〜tte no. Often paired with 〜? for the question form: kanji ga muzukashii to iu no? "are you saying kanji is hard?".

Compare with 〜to iu (basic quotative, batch3a), 〜tte (casual quotative, batch4a), 〜to iu no wa (definitional opening). 〜to iu no in question form is one of the most expressive ways to register surprise / disbelief / pushback in Japanese conversation.

• okiru to iu no? (<ruby>起<rt>お</rt></ruby>きるというの？) — "are you saying you'll wake up?"
• shinjiru to iu no? (<ruby>信<rt>しん</rt></ruby>じるというの？) — "are you saying you believe?"
• boku wo wasureta to iu no? (<ruby>僕<rt>ぼく</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れたというの？) — "are you saying you've forgotten me?"
• ai to iu no wa nan da (<ruby>愛<rt>あい</rt></ruby>というのは<ruby>何<rt>なん</rt></ruby>だ) — "what is this thing called love?"
• yume to iu no wa (<ruby>夢<rt>ゆめ</rt></ruby>というのは) — "as for what's called a dream"
• kawaru to iu no? (<ruby>変<rt>か</rt></ruby>わるというの？) — "are you saying you'll change?"
• ushinau to iu no? (<ruby>失<rt>うしな</rt></ruby>うというの？) — "are you saying you'll lose (it)?"
• shi-te kureta to iu no? (してくれたというの？) — "are you saying (you) did it for me?"
• ima sara to iu no? (<ruby>今<rt>いま</rt></ruby>さらというの？) — "now of all times, you're saying that?"
• mou owari to iu no? (もう<ruby>終<rt>お</rt></ruby>わりというの？) — "are you saying it's already over?"
• nigeru to iu no? (<ruby>逃<rt>に</rt></ruby>げるというの？) — "are you saying you'll run?"
• boku no koto wo aishi-te iru to iu no? (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>愛<rt>あい</rt></ruby>しているというの？) — "are you saying you love me?"
• mata aenai to iu no? (また<ruby>会<rt>あ</rt></ruby>えないというの？) — "are you saying we won't meet?"
• kanji wo dare mo wakaranai to iu no? (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>誰<rt>だれ</rt></ruby>も<ruby>分<rt>わ</rt></ruby>からないというの？) — "are you saying no one understands kanji?"
• tatakau to iu no? (<ruby>戦<rt>たたか</rt></ruby>うというの？) — "are you saying you'll fight?"

${MARKER}`,

  "f376a137": `〜toka 〜toka (〜とか〜とか) is a casual listing construction. Attaches to nouns or V-dictionary forms. Means 'things like X and Y / X, Y, and so on'. Less formal than 〜nado, more casual than 〜tari 〜tari. Very common in spoken Japanese for non-exhaustive examples. ramen toka sushi toka (ラーメンとか<ruby>寿司<rt>すし</rt></ruby>とか) 'things like ramen and sushi'.

Often used for hedged descriptions or vague enumerations: gakkou de benkyou toka asobi toka (<ruby>学校<rt>がっこう</rt></ruby>で<ruby>勉強<rt>べんきょう</rt></ruby>とか<ruby>遊<rt>あそ</rt></ruby>びとか) 'studying and playing and stuff at school'. Sometimes a single 〜toka appears alone with implied 'etc.': eiga toka mireba ii (<ruby>映画<rt>えいが</rt></ruby>とか<ruby>見<rt>み</rt></ruby>ればいい) 'maybe watch a movie or something'.

Compare with 〜tari 〜tari (verbs only, batch3a), 〜nado (formal etc), 〜ya (formal listing). 〜toka 〜toka is the everyday casual listing — friendly, hedged, exemplary. In songs and conversation, signals 'these examples and similar'.

• ramen toka sushi toka (ラーメンとか<ruby>寿司<rt>すし</rt></ruby>とか) — 'things like ramen and sushi'
• benkyou toka asobi toka (<ruby>勉強<rt>べんきょう</rt></ruby>とか<ruby>遊<rt>あそ</rt></ruby>びとか) — 'studying and playing'
• warau toka naku toka (<ruby>笑<rt>わら</rt></ruby>うとか<ruby>泣<rt>な</rt></ruby>くとか) — 'laughing and crying and such'
• ai toka yume toka (<ruby>愛<rt>あい</rt></ruby>とか<ruby>夢<rt>ゆめ</rt></ruby>とか) — 'love and dreams and so on'
• kanji toka hiragana toka (<ruby>漢字<rt>かんじ</rt></ruby>とかひらがなとか) — 'kanji and hiragana and so on'
• shippai toka seikou toka (<ruby>失敗<rt>しっぱい</rt></ruby>とか<ruby>成功<rt>せいこう</rt></ruby>とか) — 'failure and success and such'
• kazoku toka tomodachi toka (<ruby>家族<rt>かぞく</rt></ruby>とか<ruby>友達<rt>ともだち</rt></ruby>とか) — 'family and friends and so on'
• eiga toka mireba ii (<ruby>映画<rt>えいが</rt></ruby>とか<ruby>見<rt>み</rt></ruby>ればいい) — 'maybe watch a movie or something'
• haru toka aki toka (<ruby>春<rt>はる</rt></ruby>とか<ruby>秋<rt>あき</rt></ruby>とか) — 'spring and autumn and so on'
• boku toka kimi toka (<ruby>僕<rt>ぼく</rt></ruby>とか<ruby>君<rt>きみ</rt></ruby>とか) — 'people like me and you'
• tsukareta toka kanashii toka (<ruby>疲<rt>つか</rt></ruby>れたとか<ruby>悲<rt>かな</rt></ruby>しいとか) — 'tired and sad and stuff'
• namida toka warai toka (<ruby>涙<rt>なみだ</rt></ruby>とか<ruby>笑<rt>わら</rt></ruby>いとか) — 'tears and laughter and so on'
• yorokobi toka kanashimi toka (<ruby>喜<rt>よろこ</rt></ruby>びとか<ruby>悲<rt>かな</rt></ruby>しみとか) — 'joy and sorrow and such'
• mukashi toka ima toka (<ruby>昔<rt>むかし</rt></ruby>とか<ruby>今<rt>いま</rt></ruby>とか) — 'past and present and so on'
• kotae toka shitsumon toka (<ruby>答<rt>こた</rt></ruby>えとか<ruby>質問<rt>しつもん</rt></ruby>とか) — 'answers and questions and so on'

${MARKER}`,

  "4cff93ad": `〜to shite (〜として) attaches to nouns. Means 'as / in the capacity of X / treating as X'. Marks a role or perspective: gakusei to shite (<ruby>学生<rt>がくせい</rt></ruby>として) 'as a student'. shujinkou to shite (<ruby>主人公<rt>しゅじんこう</rt></ruby>として) 'as the protagonist'. Defines the speaker's standpoint or the role of the subject.

Used in formal speech, professional contexts, and abstract perspective-taking. Often paired with hito, hitori, mono: hitori to shite (<ruby>一人<rt>ひとり</rt></ruby>として) 'as an individual'. Combined with 〜mo + negative produces 'not even one X' — hitori to shite inai (<ruby>一人<rt>ひとり</rt></ruby>として いない) 'not a single person is here'.

Compare with 〜da kara (because — reason), 〜tame ni (in order to / for the sake of, batch2 — purpose), 〜to shite mo (even supposing, batch3b — concession). 〜to shite is the role / capacity marker — 'in the role of X, the action proceeds'.

• gakusei to shite (<ruby>学生<rt>がくせい</rt></ruby>として) — 'as a student'
• otona to shite (<ruby>大人<rt>おとな</rt></ruby>として) — 'as an adult'
• tomodachi to shite (<ruby>友達<rt>ともだち</rt></ruby>として) — 'as a friend'
• kazoku to shite (<ruby>家族<rt>かぞく</rt></ruby>として) — 'as family'
• hitori to shite (<ruby>一人<rt>ひとり</rt></ruby>として) — 'as an individual'
• boku to shite wa (<ruby>僕<rt>ぼく</rt></ruby>としては) — 'as for me / from my perspective'
• kekka to shite (<ruby>結果<rt>けっか</rt></ruby>として) — 'as a result'
• koibito to shite (<ruby>恋人<rt>こいびと</rt></ruby>として) — 'as a lover'
• ningen to shite (<ruby>人間<rt>にんげん</rt></ruby>として) — 'as a human being'
• shujinkou to shite (<ruby>主人公<rt>しゅじんこう</rt></ruby>として) — 'as the protagonist'
• riyuu to shite (<ruby>理由<rt>りゆう</rt></ruby>として) — 'as a reason'
• shouko to shite (<ruby>証拠<rt>しょうこ</rt></ruby>として) — 'as evidence'
• hitori to shite mo wakaranai (<ruby>一人<rt>ひとり</rt></ruby>としても<ruby>分<rt>わ</rt></ruby>からない) — 'not a single person understands'
• boku no kotoba to shite (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>言葉<rt>ことば</rt></ruby>として) — 'as my words'
• kioku to shite nokoru (<ruby>記憶<rt>きおく</rt></ruby>として<ruby>残<rt>のこ</rt></ruby>る) — 'remain as a memory'

${MARKER}`,

  "f22f9bb7": `〜to naru (〜となる) attaches to nouns or noun-equivalents. Means 'become / turn into X' — formal / written equivalent of 〜ni naru. The と here marks the end-state. otona to naru (<ruby>大人<rt>おとな</rt></ruby>となる) 'become an adult'. Conjugates: 〜to natta (past), 〜to naru darou (will probably become).

Distinguished from 〜ni naru (everyday spoken 'become') by register. 〜to naru is preferred in formal writing, news, business prose, song lyrics aiming for weight. The と implies a definite identification or conclusion: kekka to naru (<ruby>結果<rt>けっか</rt></ruby>となる) 'becomes the result'.

Compare with 〜ni naru (everyday become), 〜ni kawaru (change into — batch5b), 〜da to naru (becomes the case that). 〜to naru is the elevated 'becomes' marker — perfect for transitions, conclusions, transformations in formal context.

• otona to naru (<ruby>大人<rt>おとな</rt></ruby>となる) — 'become an adult'
• kekka to naru (<ruby>結果<rt>けっか</rt></ruby>となる) — 'becomes the result'
• mokuteki to naru (<ruby>目的<rt>もくてき</rt></ruby>となる) — 'becomes the goal'
• shimei to naru (<ruby>使命<rt>しめい</rt></ruby>となる) — 'becomes (one's) mission'
• yume to naru (<ruby>夢<rt>ゆめ</rt></ruby>となる) — 'becomes a dream'
• kioku to naru (<ruby>記憶<rt>きおく</rt></ruby>となる) — 'becomes a memory'
• inori to naru (<ruby>祈<rt>いの</rt></ruby>りとなる) — 'becomes a prayer'
• namida to naru (<ruby>涙<rt>なみだ</rt></ruby>となる) — 'becomes tears'
• unmei to naru (<ruby>運命<rt>うんめい</rt></ruby>となる) — 'becomes fate'
• ai to naru (<ruby>愛<rt>あい</rt></ruby>となる) — 'becomes love'
• kotoba to naru (<ruby>言葉<rt>ことば</rt></ruby>となる) — 'becomes words'
• kanashimi to naru (<ruby>悲<rt>かな</rt></ruby>しみとなる) — 'becomes sadness'
• boku no chikara to naru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>力<rt>ちから</rt></ruby>となる) — 'becomes my strength'
• hikari to naru (<ruby>光<rt>ひかり</rt></ruby>となる) — 'becomes light'
• boku-tachi no kioku to naru (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>記憶<rt>きおく</rt></ruby>となる) — 'becomes our memory'

${MARKER}`,

  "bbd3bfb6": `〜to iu (〜と<ruby>言<rt>い</rt></ruby>う / 〜という) is the basic quotative — と (quotative particle) + iu (to say). Differs from batch3a's flexibly-grammaticalised 〜to iu (called / the fact that) by being the LITERAL 'said X'. boku ga itta to iu (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>言<rt>い</rt></ruby>ったと<ruby>言<rt>い</rt></ruby>う) "(they) said that I said".

Used to report speech, write down quotes, attribute statements. Often appears in news, formal writing, narrative: yamada-san ga sou itta to iu (<ruby>山田<rt>やまだ</rt></ruby>さんがそう<ruby>言<rt>い</rt></ruby>ったと<ruby>言<rt>い</rt></ruby>う) 'Yamada said so (it is reported)'. Casual contraction: 〜tte iu / 〜tte (batch4a).

Compare with 〜to iu (the connector / definitional, batch3a), 〜tte (casual, batch4a), 〜da to (quoted assertion). 〜to iu in this literal sense is the 'reported speech' marker — what someone said, transmitted to a third party.

• yamada-san ga sou itta to iu (<ruby>山田<rt>やまだ</rt></ruby>さんがそう<ruby>言<rt>い</rt></ruby>ったと<ruby>言<rt>い</rt></ruby>う) — 'Yamada said so'
• ame ga futta to iu (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ったと<ruby>言<rt>い</rt></ruby>う) — '(it is reported) it rained'
• kekkon shita to iu (<ruby>結婚<rt>けっこん</rt></ruby>したと<ruby>言<rt>い</rt></ruby>う) — '(I hear they) got married'
• kanji ga muzukashii to iu (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>難<rt>むずか</rt></ruby>しいと<ruby>言<rt>い</rt></ruby>う) — '(some say) kanji is hard'
• boku ga warui to iu (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>悪<rt>わる</rt></ruby>いと<ruby>言<rt>い</rt></ruby>う) — '(they) say I'm at fault'
• shinjite iru to iu (<ruby>信<rt>しん</rt></ruby>じていると<ruby>言<rt>い</rt></ruby>う) — '(they) say (they) believe'
• ai shi-te iru to iu (<ruby>愛<rt>あい</rt></ruby>していると<ruby>言<rt>い</rt></ruby>う) — '(they) say (they) love (me)'
• yume datta to iu (<ruby>夢<rt>ゆめ</rt></ruby>だったと<ruby>言<rt>い</rt></ruby>う) — '(it is said) it was a dream'
• boku no koto wo wasureta to iu (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れたと<ruby>言<rt>い</rt></ruby>う) — '(they say) (they have) forgotten me'
• mou owatta to iu (もう<ruby>終<rt>お</rt></ruby>わったと<ruby>言<rt>い</rt></ruby>う) — '(it is said) it's already over'
• kuru to iu (<ruby>来<rt>く</rt></ruby>ると<ruby>言<rt>い</rt></ruby>う) — '(they say) they're coming'
• tatakau to iu (<ruby>戦<rt>たたか</rt></ruby>うと<ruby>言<rt>い</rt></ruby>う) — '(they say) (they will) fight'
• shitte iru to iu (<ruby>知<rt>し</rt></ruby>っていると<ruby>言<rt>い</rt></ruby>う) — '(they say they) know'
• kotaeru to iu (<ruby>答<rt>こた</rt></ruby>えると<ruby>言<rt>い</rt></ruby>う) — '(they say they) will answer'
• mata aeru to iu (また<ruby>会<rt>あ</rt></ruby>えると<ruby>言<rt>い</rt></ruby>う) — '(they say) we will meet again'

${MARKER}`,

  "a39935db": `〜nai you ni (〜ないように) attaches to a verb's nai-stem + you ni (so that, batch2 purpose sense). Means 'so that X doesn't happen / so as not to X'. The negative purpose marker — opposite of bare 〜you ni (so that X happens). wasure-nai you ni (<ruby>忘<rt>わす</rt></ruby>れないように) 'so as not to forget'.

Used heavily in rules, instructions, songs about preservation: nakusanai you ni (<ruby>無<rt>な</rt></ruby>くさないように) 'so as not to lose (it)'. The 〜nai stem provides the negation; you ni provides the purpose / hope marker. Combinable with kudasai for polite request: 〜nai you ni shite kudasai 'please make sure not to'.

Compare with batch2's 〜you ni (positive purpose / hope), batch3a's 〜you ni (manner / simile), and 〜nai de (gentle 'please don't' — request, batch4b). 〜nai you ni is for INTENT to PREVENT — 'I'm doing X so Y won't happen'.

• wasure-nai you ni (<ruby>忘<rt>わす</rt></ruby>れないように) — 'so as not to forget'
• naka-nai you ni (<ruby>泣<rt>な</rt></ruby>かないように) — 'so as not to cry'
• ushinawa-nai you ni (<ruby>失<rt>うしな</rt></ruby>わないように) — 'so as not to lose'
• mienakunaranai you ni (<ruby>見<rt>み</rt></ruby>えなくならないように) — 'so as not to vanish'
• koware-nai you ni (<ruby>壊<rt>こわ</rt></ruby>れないように) — 'so as not to break'
• shippai shi-nai you ni (<ruby>失敗<rt>しっぱい</rt></ruby>しないように) — 'so as not to fail'
• osokunaranai you ni (<ruby>遅<rt>おそ</rt></ruby>くならないように) — 'so as not to be late'
• kanashima-nai you ni (<ruby>悲<rt>かな</rt></ruby>しまないように) — 'so as not to grieve'
• mienai you ni kakushita (<ruby>見<rt>み</rt></ruby>えないように<ruby>隠<rt>かく</rt></ruby>した) — 'hid (it) so as not to be seen'
• kikoenai you ni hanashita (<ruby>聞<rt>き</rt></ruby>こえないように<ruby>話<rt>はな</rt></ruby>した) — 'spoke so as not to be heard'
• boku no koto wo wasure-nai you ni (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れないように) — 'so as not to forget about me'
• kowareru-nai you ni dakishimeru (<ruby>壊<rt>こわ</rt></ruby>れないように<ruby>抱<rt>だ</rt></ruby>きしめる) — 'hold tight so as not to break'
• kanashima-senai you ni shi-tai (<ruby>悲<rt>かな</rt></ruby>しませないようにしたい) — 'I want to make sure (you) don't grieve'
• yume ga sa-menai you ni (<ruby>夢<rt>ゆめ</rt></ruby>がさめないように) — 'so the dream doesn't end'
• hanare-nai you ni te wo nigiru (<ruby>離<rt>はな</rt></ruby>れないように<ruby>手<rt>て</rt></ruby>を<ruby>握<rt>にぎ</rt></ruby>る) — 'hold hands so as not to part'

${MARKER}`,

  "84ad8647": `〜nagara mo (〜ながらも) extends 〜nagara (while doing, batch2) with mo (even/also). Means 'even while X / despite X / although X'. The 〜mo adds concessive flavour to the simultaneous action — the second clause happens in CONTRAST to the first. naki-nagara mo waratta (<ruby>泣<rt>な</rt></ruby>きながらも<ruby>笑<rt>わら</rt></ruby>った) 'laughed even while crying'.

Stronger than bare 〜nagara (just simultaneity) by adding the 'against expectation' nuance. Common in songs and emotional speech for paradoxical states: yowaki nagara mo tsuyoku ikiru (<ruby>弱<rt>よわ</rt></ruby>き ながらも<ruby>強<rt>つよ</rt></ruby>く<ruby>生<rt>い</rt></ruby>きる) 'living strongly even while weak'.

Compare with batch2's 〜nagara (simultaneity), 〜noni (despite — for actual contradiction, batch2), tatoe〜demo (strong concession, batch3b). 〜nagara mo combines simultaneity with concession — 'these two states coexist when you wouldn't expect them to'.

• naki-nagara mo waratta (<ruby>泣<rt>な</rt></ruby>きながらも<ruby>笑<rt>わら</rt></ruby>った) — 'laughed while crying'
• tsukare-nagara mo aruita (<ruby>疲<rt>つか</rt></ruby>れながらも<ruby>歩<rt>ある</rt></ruby>いた) — 'walked even while tired'
• mayoi-nagara mo eranda (<ruby>迷<rt>まよ</rt></ruby>いながらも<ruby>選<rt>えら</rt></ruby>んだ) — 'chose even while hesitating'
• yowaki-nagara mo tsuyoku ikiru (<ruby>弱<rt>よわ</rt></ruby>きながらも<ruby>強<rt>つよ</rt></ruby>く<ruby>生<rt>い</rt></ruby>きる) — 'live strongly even while weak'
• furue-nagara mo tachi-agatta (<ruby>震<rt>ふる</rt></ruby>えながらも<ruby>立<rt>た</rt></ruby>ち<ruby>上<rt>あ</rt></ruby>がった) — 'stood up even while trembling'
• shitte i-nagara mo iwa-nakatta (<ruby>知<rt>し</rt></ruby>っていながらも<ruby>言<rt>い</rt></ruby>わなかった) — "didn't say it even though knew"
• warai-nagara mo namida ga deta (<ruby>笑<rt>わら</rt></ruby>いながらも<ruby>涙<rt>なみだ</rt></ruby>が<ruby>出<rt>で</rt></ruby>た) — 'tears came even while smiling'
• kanashimi-nagara mo mae ni susunda (<ruby>悲<rt>かな</rt></ruby>しみながらも<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>んだ) — 'moved forward even while grieving'
• yowari-nagara mo akiramenai (<ruby>弱<rt>よわ</rt></ruby>りながらも<ruby>諦<rt>あきら</rt></ruby>めない) — "won't give up even while weakening"
• mienai-nagara mo shinjiru (<ruby>見<rt>み</rt></ruby>えないながらも<ruby>信<rt>しん</rt></ruby>じる) — 'believe even while unable to see'
• shaberi-nagara mo kanjite ita (しゃべりながらも<ruby>感<rt>かん</rt></ruby>じていた) — 'felt it even while talking'
• naite-nagara mo aruite-iru (<ruby>泣<rt>な</rt></ruby>いてながらも<ruby>歩<rt>ある</rt></ruby>いている) — 'walking even while crying'
• onaji nagara mo chigau (<ruby>同<rt>おな</rt></ruby>じながらも<ruby>違<rt>ちが</rt></ruby>う) — 'same and yet different'
• boku-tachi de ari-nagara mo (<ruby>僕<rt>ぼく</rt></ruby>たちでありながらも) — 'even while being us'
• yume mi-nagara mo genjitsu wo shitte iru (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>ながらも<ruby>現実<rt>げんじつ</rt></ruby>を<ruby>知<rt>し</rt></ruby>っている) — 'know reality even while dreaming'

${MARKER}`,

  "9dff88d4": `〜nakya yokatta (〜なきゃよかった) combines 〜nakya (casual must-not, batch3b) + yokatta (was good — past of ii). Means "wish I hadn't / shouldn't have / it would have been better not to". A retrospective regret — looking back at an action that should not have been taken. iwa-nakya yokatta (<ruby>言<rt>い</rt></ruby>わなきゃよかった) "I shouldn't have said that".

The structure literally reads "if I had not (X), it would have been good" → "I wish I hadn't X-ed". Carries strong regret, second-guessing, rumination. Common in songs of heartbreak, mistakes, or impulsive actions: shi-nakya yokatta (<ruby>知<rt>し</rt></ruby>らなきゃよかった) "I wish I hadn't known".

Compare with 〜tara yokatta (would have been good if), 〜beki datta (should have done), 〜tsumori datta (had intended to). 〜nakya yokatta is the unique 'wish I hadn't' marker — purely regretful, often left dangling at sentence end.

• iwa-nakya yokatta (<ruby>言<rt>い</rt></ruby>わなきゃよかった) — "shouldn't have said that"
• ika-nakya yokatta (<ruby>行<rt>い</rt></ruby>かなきゃよかった) — "shouldn't have gone"
• mira-nakya yokatta (<ruby>見<rt>み</rt></ruby>らなきゃよかった) — "shouldn't have seen"
• shira-nakya yokatta (<ruby>知<rt>し</rt></ruby>らなきゃよかった) — "wish I hadn't known"
• ai-sa-nakya yokatta (<ruby>愛<rt>あい</rt></ruby>さなきゃよかった) — "wish I hadn't loved"
• yamenakya yokatta (やめなきゃよかった) — "shouldn't have quit"
• kaera-nakya yokatta (<ruby>帰<rt>かえ</rt></ruby>らなきゃよかった) — "shouldn't have gone home"
• ika-naseyokatta wa nigashita (<ruby>行<rt>い</rt></ruby>かなせよかったは<ruby>逃<rt>に</rt></ruby>がした) — wait
• kotaenakya yokatta (<ruby>答<rt>こた</rt></ruby>えなきゃよかった) — "shouldn't have answered"
• shinjinakya yokatta (<ruby>信<rt>しん</rt></ruby>じなきゃよかった) — "wish I hadn't believed"
• tsutaenakya yokatta (<ruby>伝<rt>つた</rt></ruby>えなきゃよかった) — "shouldn't have conveyed (it)"
• matanakya yokatta (<ruby>待<rt>ま</rt></ruby>たなきゃよかった) — "shouldn't have waited"
• damasarenakya yokatta (<ruby>騙<rt>だま</rt></ruby>されなきゃよかった) — "shouldn't have been deceived"
• boku no koto wo wasurenakya yokatta (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れなきゃよかった) — "(you) shouldn't have forgotten me"
• atta toki ni iwa-nakya yokatta (<ruby>会<rt>あ</rt></ruby>った<ruby>時<rt>とき</rt></ruby>に<ruby>言<rt>い</rt></ruby>わなきゃよかった) — "shouldn't have said it when we met"

${MARKER}`,

  "ffee1e24": `〜nari ni (〜なりに) attaches to a noun + nari + ni. Means 'in one's own way / in keeping with X / according to X'. Marks a personal, contextual approach: jibun nari ni (<ruby>自分<rt>じぶん</rt></ruby>なりに) "in my own way". The structure acknowledges that the manner of action is shaped by the subject's nature or circumstances.

Often used to soften claims or acknowledge limitations: kodomo nari ni shinpai shi-te ita (<ruby>子供<rt>こども</rt></ruby>なりに<ruby>心配<rt>しんぱい</rt></ruby>していた) "(I/the child) was worrying in (their) own way". Implies authenticity and effort within constraints.

Compare with 〜you ni (in the manner of, batch3a), 〜furu (act-as-if, batch4b), 〜rashii (apparently / characteristic). 〜nari ni is uniquely about ONE'S OWN MANNER — used heavily in introspective lyrics and humble self-descriptions.

• jibun nari ni (<ruby>自分<rt>じぶん</rt></ruby>なりに) — 'in my own way'
• boku nari ni (<ruby>僕<rt>ぼく</rt></ruby>なりに) — 'in my own way'
• kanji nari ni oboeta (<ruby>漢字<rt>かんじ</rt></ruby>なりに<ruby>覚<rt>おぼ</rt></ruby>えた) — 'memorised kanji in my own way'
• kodomo nari ni kanji-te ita (<ruby>子供<rt>こども</rt></ruby>なりに<ruby>感<rt>かん</rt></ruby>じていた) — '(the child) felt it in their own way'
• otona nari ni (<ruby>大人<rt>おとな</rt></ruby>なりに) — 'in (an) adult's own way'
• gakusei nari ni (<ruby>学生<rt>がくせい</rt></ruby>なりに) — 'in (a) student's own way'
• hitori nari ni (<ruby>一人<rt>ひとり</rt></ruby>なりに) — 'in one's own solo way'
• boku nari ni ganbatte iru (<ruby>僕<rt>ぼく</rt></ruby>なりに<ruby>頑張<rt>がんば</rt></ruby>っている) — 'trying in my own way'
• kazoku nari ni atatakai (<ruby>家族<rt>かぞく</rt></ruby>なりに<ruby>暖<rt>あたた</rt></ruby>かい) — 'family-like and warm in (its) own way'
• boku nari ni ai shi-te iru (<ruby>僕<rt>ぼく</rt></ruby>なりに<ruby>愛<rt>あい</rt></ruby>している) — "loving in my own way"
• boku nari ni mamoru (<ruby>僕<rt>ぼく</rt></ruby>なりに<ruby>守<rt>まも</rt></ruby>る) — "I'll protect in my own way"
• jibun nari no kotaae (<ruby>自分<rt>じぶん</rt></ruby>なりの<ruby>答<rt>こた</rt></ruby>え) — "an answer in my own way"
• boku nari no shiawase (<ruby>僕<rt>ぼく</rt></ruby>なりの<ruby>幸<rt>しあわ</rt></ruby>せ) — "happiness in my own way"
• kimi nari ni shinjite (<ruby>君<rt>きみ</rt></ruby>なりに<ruby>信<rt>しん</rt></ruby>じて) — "believe in your own way"
• boku nari no yume (<ruby>僕<rt>ぼく</rt></ruby>なりの<ruby>夢<rt>ゆめ</rt></ruby>) — "a dream all my own"

${MARKER}`,

  "12f9c2c6": `〜ni shika 〜nai (〜にしか〜ない) is a paired construction. に (target / location particle) + しか (only — used with negative, batch4a) + 〜ない (negative). Means 'only X (can / has) / only to X / nowhere except X'. boku ni shika dekinai (<ruby>僕<rt>ぼく</rt></ruby>にしかできない) "only I can do it".

The structure exclusively limits the agent / target / location of an action. Common in lyrics of unique commitment: boku ni shika kikoenai koe (<ruby>僕<rt>ぼく</rt></ruby>にしか<ruby>聞<rt>き</rt></ruby>こえない<ruby>声<rt>こえ</rt></ruby>) 'a voice only I can hear'. Often emphasises specialness or solitude.

Compare with 〜shika nai (just 'only X exists', batch4a), 〜dake (neutral 'only', batch3b), 〜nomi (formal 'only'). 〜ni shika 〜nai is the location/target-specific 'only' — emphasises that the unique scope falls on a particular agent or recipient.

• boku ni shika dekinai (<ruby>僕<rt>ぼく</rt></ruby>にしかできない) — "only I can do it"
• kimi ni shika ie-nai (<ruby>君<rt>きみ</rt></ruby>にしか<ruby>言<rt>い</rt></ruby>えない) — "only to you can I say"
• boku ni shika kikoenai koe (<ruby>僕<rt>ぼく</rt></ruby>にしか<ruby>聞<rt>き</rt></ruby>こえない<ruby>声<rt>こえ</rt></ruby>) — "a voice only I can hear"
• koko ni shika nai (ここにしかない) — "exists only here"
• boku ni shika wakaranai (<ruby>僕<rt>ぼく</rt></ruby>にしか<ruby>分<rt>わ</rt></ruby>からない) — "only I understand"
• kimi ni shika tsutawaranai (<ruby>君<rt>きみ</rt></ruby>にしか<ruby>伝<rt>つた</rt></ruby>わらない) — "reaches only you"
• ima ni shika dekinai (<ruby>今<rt>いま</rt></ruby>にしかできない) — "can only be done now"
• boku-tachi ni shika nai (<ruby>僕<rt>ぼく</rt></ruby>たちにしかない) — "only we have it"
• kimi ni shika mienai (<ruby>君<rt>きみ</rt></ruby>にしか<ruby>見<rt>み</rt></ruby>えない) — "only you can see"
• boku ni shika kanjinai (<ruby>僕<rt>ぼく</rt></ruby>にしか<ruby>感<rt>かん</rt></ruby>じない) — "only I feel"
• kazoku ni shika ie-nai (<ruby>家族<rt>かぞく</rt></ruby>にしか<ruby>言<rt>い</rt></ruby>えない) — "only to family can I say"
• boku ni shika kanaerare-nai yume (<ruby>僕<rt>ぼく</rt></ruby>にしか<ruby>叶<rt>かな</rt></ruby>えられない<ruby>夢<rt>ゆめ</rt></ruby>) — "a dream only I can fulfill"
• kimi ni shika mamore-nai (<ruby>君<rt>きみ</rt></ruby>にしか<ruby>守<rt>まも</rt></ruby>れない) — "only you can protect"
• boku-tachi ni shika kakenai uta (<ruby>僕<rt>ぼく</rt></ruby>たちにしか<ruby>書<rt>か</rt></ruby>けない<ruby>歌<rt>うた</rt></ruby>) — "a song only we can write"
• kimi ni shika ai-sa-rena nai (<ruby>君<rt>きみ</rt></ruby>にしか<ruby>愛<rt>あい</rt></ruby>されない) — "loved only by you"

${MARKER}`,

  "9ed3eebc": `〜ni suru (〜にする) attaches to nouns or noun-equivalents + ni + suru ('to do / make'). Two main uses: (a) Make / turn into X — 'make (something) (be) X' — kirei ni suru (<ruby>綺麗<rt>きれい</rt></ruby>にする) 'make pretty / clean up'. (b) Decide on / choose X — 'I'll go with X' — koohi ni suru (コーヒーにする) "I'll have coffee".

The 'decide on' use is everyday at restaurants and decision points. The 'make / turn into' use is more transformative — the speaker (or actor) imposes a state or condition on something. Past form 〜ni shita (decided on / made into), volitional 〜ni shiyou (let's go with X).

Compare with 〜ni naru (become — neutral, no agency), 〜ni kawaru (change into — passive transformation, batch5b), 〜to suru (treat as — formal, batch5b). 〜ni suru is the active transformation / decision marker — the speaker is the decider or causer.

• koohi ni suru (コーヒーにする) — "I'll have coffee"
• kirei ni suru (<ruby>綺麗<rt>きれい</rt></ruby>にする) — 'make pretty / clean up'
• shizuka ni suru (<ruby>静<rt>しず</rt></ruby>かにする) — 'be quiet'
• boku no mono ni suru (<ruby>僕<rt>ぼく</rt></ruby>のものにする) — 'make (it) mine'
• kimi no soba ni suru (<ruby>君<rt>きみ</rt></ruby>のそばにする) — wait — "kimi no soba ni iru" is more natural; let me give "boku no inochi ni suru" instead
• boku no namae wo himitsu ni suru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>を<ruby>秘密<rt>ひみつ</rt></ruby>にする) — 'make my name a secret'
• genki ni suru (<ruby>元気<rt>げんき</rt></ruby>にする) — 'cheer (someone) up'
• shiawase ni suru (<ruby>幸<rt>しあわ</rt></ruby>せにする) — 'make (someone) happy'
• boku-tachi no yakusoku ni suru (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>約束<rt>やくそく</rt></ruby>にする) — 'make it our promise'
• yume wo genjitsu ni suru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>現実<rt>げんじつ</rt></ruby>にする) — 'make the dream a reality'
• kotae wo hitotsu ni suru (<ruby>答<rt>こた</rt></ruby>えを<ruby>一<rt>ひと</rt></ruby>つにする) — 'unite the answers'
• boku no kokoro wo karu ni shita (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>を<ruby>軽<rt>かる</rt></ruby>くにした) — 'lightened my heart'
• kimi to issho ni iku koto ni shita (<ruby>君<rt>きみ</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>行<rt>い</rt></ruby>くことにした) — "decided to go with you"
• mou yameru koto ni suru (もうやめることにする) — "I've decided to quit"
• boku no kotae wa hitori-bocchi ni suru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>答<rt>こた</rt></ruby>えは<ruby>一人<rt>ひとり</rt></ruby>ぼっちにする) — "I'll keep my answer to myself"

${MARKER}`,

  "161d00ad": `〜ni datte (〜にだって) extends に (target / location particle) with 〜datte (even, batch2). Means 'even to / even by / even at X'. The 〜datte makes the targeted noun emphatic — even reaching / affecting X is unexpected. boku ni datte wakaru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>分<rt>わ</rt></ruby>かる) "even I get it / I, of all people, understand".

The casual stack の + に + datte produces emphatic targets in ways formal Japanese doesn't allow. Often used with the implication that the speaker is the surprising one in scope: boku ni datte yume ga aru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>夢<rt>ゆめ</rt></ruby>がある) "even I have dreams".

Compare with 〜ni mo (even to — neutral), 〜sae (formal even, batch2), 〜sura (literary even, batch4b), 〜ni datte (this — casual, emphatic). 〜ni datte is the conversational 'even (to / by) X' — used when the target is emotionally or pragmatically surprising.

• boku ni datte wakaru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>分<rt>わ</rt></ruby>かる) — "even I get it"
• kodomo ni datte dekiru (<ruby>子供<rt>こども</rt></ruby>にだってできる) — 'even a child can do it'
• boku ni datte yume ga aru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>夢<rt>ゆめ</rt></ruby>がある) — "even I have dreams"
• kimi ni datte tsutaeru (<ruby>君<rt>きみ</rt></ruby>にだって<ruby>伝<rt>つた</rt></ruby>える) — "I'll convey it even to you"
• boku ni datte tsuzuke-rareru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>続<rt>つづ</rt></ruby>けられる) — "even I can keep going"
• boku ni datte mae ga aru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>前<rt>まえ</rt></ruby>がある) — "even I have a past"
• gakusei ni datte chikara aru (<ruby>学生<rt>がくせい</rt></ruby>にだって<ruby>力<rt>ちから</rt></ruby>ある) — 'even students have power'
• boku ni datte kotae ga hitsuyou (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>答<rt>こた</rt></ruby>えが<ruby>必要<rt>ひつよう</rt></ruby>) — 'even I need an answer'
• ame ni datte makenai (<ruby>雨<rt>あめ</rt></ruby>にだって<ruby>負<rt>ま</rt></ruby>けない) — "won't lose even to rain"
• boku ni datte zutto issho ni iru (<ruby>僕<rt>ぼく</rt></ruby>にだってずっと<ruby>一緒<rt>いっしょ</rt></ruby>にいる) — "even I will always be together"
• boku ni datte kanjirareru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>感<rt>かん</rt></ruby>じられる) — "even I can feel it"
• boku ni datte ai-saretai (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>愛<rt>あい</rt></ruby>されたい) — "even I want to be loved"
• kimi ni datte mienai mono ga aru (<ruby>君<rt>きみ</rt></ruby>にだって<ruby>見<rt>み</rt></ruby>えないものがある) — "even you have things you can't see"
• kanji ni datte kokoro ga aru (<ruby>漢字<rt>かんじ</rt></ruby>にだって<ruby>心<rt>こころ</rt></ruby>がある) — "even kanji has heart"
• boku ni datte yasashi-sa ga aru (<ruby>僕<rt>ぼく</rt></ruby>にだって<ruby>優<rt>やさ</rt></ruby>しさがある) — "even I have kindness"

${MARKER}`,

  "e2efd972": `〜ni de mo nareru (〜にでもなれる) is a layered structure: に (target) + でも (or even) + nareru (potential of naru, can become). Means 'can even become X / can turn into X if needed'. Marks a hypothetical capability for transformation. nan ni de mo nareru (<ruby>何<rt>なに</rt></ruby>にでもなれる) "can become anything".

The 〜demo here is the casual concessive ('or whatever / even'), making the target broad: dare ni de mo nareru (<ruby>誰<rt>だれ</rt></ruby>にでもなれる) "can become anyone". Often inspirational or empowering — emphasises latent potential.

Compare with 〜ni naru (becomes — actual transition), 〜ni nareru (can become — potential), and the broader 〜demo (or whatever — hedge particle). 〜ni de mo nareru is the transformation-potential marker — common in songs about dreams, identity, possibility.

• nan ni de mo nareru (<ruby>何<rt>なに</rt></ruby>にでもなれる) — "can become anything"
• dare ni de mo nareru (<ruby>誰<rt>だれ</rt></ruby>にでもなれる) — "can become anyone"
• tsuyoku ni de mo nareru (<ruby>強<rt>つよ</rt></ruby>くにでもなれる) — "can become even strong"
• boku ni de mo nareru (<ruby>僕<rt>ぼく</rt></ruby>にでもなれる) — "can even become me"
• tomodachi ni de mo nareru (<ruby>友達<rt>ともだち</rt></ruby>にでもなれる) — "can even become friends"
• otona ni de mo nareru (<ruby>大人<rt>おとな</rt></ruby>にでもなれる) — "can even become an adult"
• shiawase ni de mo nareru (<ruby>幸<rt>しあわ</rt></ruby>せにでもなれる) — "can even become happy"
• jiyuu ni de mo nareru (<ruby>自由<rt>じゆう</rt></ruby>にでもなれる) — "can even become free"
• hito ni de mo nareru (<ruby>人<rt>ひと</rt></ruby>にでもなれる) — "can even become a person"
• yume ni de mo nareru (<ruby>夢<rt>ゆめ</rt></ruby>にでもなれる) — "can even become a dream"
• tori ni de mo nareru (<ruby>鳥<rt>とり</rt></ruby>にでもなれる) — "can even become a bird"
• kaze ni de mo nareru (<ruby>風<rt>かぜ</rt></ruby>にでもなれる) — "can even become the wind"
• namida ni de mo nareru (<ruby>涙<rt>なみだ</rt></ruby>にでもなれる) — "can even become tears"
• boku ga kimi no inori ni de mo nareru (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>君<rt>きみ</rt></ruby>の<ruby>祈<rt>いの</rt></ruby>りにでもなれる) — "I can even become your prayer"
• mukoumukashi ni de mo nareru (<ruby>無口<rt>むこう</rt></ruby>むかしにでもなれる) — "can even become the long-ago"

${MARKER}`,

  "4aa667f2": `〜ni mo 〜nai (〜にも〜ない) is a paired construction. に (target) + も (even / also) + 〜ない (negative). Means 'not even to X / no one (X) can'. The 〜mo extends the negative scope to surprising targets. dare ni mo wakaranai (<ruby>誰<rt>だれ</rt></ruby>にも<ruby>分<rt>わ</rt></ruby>からない) "no one understands".

Often paired with question words (dare, doko, nani) for universal negation: dare ni mo (no one), doko ni mo (nowhere), nani ni mo (nothing). Stronger than bare 〜nai because of the universal scope. Common in lyrics for despair or absolute claims.

Compare with batch4b's question word + も + negative (general universal negation), 〜ni shika 〜nai (only X — opposite, batch5b), 〜sae 〜nai (not even, formal). 〜ni mo 〜nai is the everyday 'not (even) to / by anyone' marker — paired construction extending negation across all possible targets.

• dare ni mo wakaranai (<ruby>誰<rt>だれ</rt></ruby>にも<ruby>分<rt>わ</rt></ruby>からない) — "no one understands"
• doko ni mo iku tokoro ga nai (どこにも<ruby>行<rt>い</rt></ruby>くところがない) — "nowhere to go"
• boku ni mo dekinai (<ruby>僕<rt>ぼく</rt></ruby>にもできない) — "even I can't do it"
• dare ni mo iena nai (<ruby>誰<rt>だれ</rt></ruby>にも<ruby>言<rt>い</rt></ruby>えない) — "can't tell anyone"
• boku ni mo mienai (<ruby>僕<rt>ぼく</rt></ruby>にも<ruby>見<rt>み</rt></ruby>えない) — "I can't see it either"
• dare ni mo todokanai (<ruby>誰<rt>だれ</rt></ruby>にも<ruby>届<rt>とど</rt></ruby>かない) — "won't reach anyone"
• doko ni mo nigerarenai (どこにも<ruby>逃<rt>に</rt></ruby>げられない) — "can't escape anywhere"
• boku ni mo wakara-nai kotoba (<ruby>僕<rt>ぼく</rt></ruby>にも<ruby>分<rt>わ</rt></ruby>からない<ruby>言葉<rt>ことば</rt></ruby>) — "words even I don't understand"
• dare ni mo kikarenai (<ruby>誰<rt>だれ</rt></ruby>にも<ruby>聞<rt>き</rt></ruby>かれない) — "won't be heard by anyone"
• boku ni mo kotaeru kotoga dekinai (<ruby>僕<rt>ぼく</rt></ruby>にも<ruby>答<rt>こた</rt></ruby>えることができない) — "even I can't answer"
• doko ni mo basho ga nai (どこにも<ruby>場所<rt>ばしょ</rt></ruby>がない) — "no place anywhere"
• kimi ni mo iwa-nai (<ruby>君<rt>きみ</rt></ruby>にも<ruby>言<rt>い</rt></ruby>わない) — "won't say even to you"
• boku ni mo mamore nai (<ruby>僕<rt>ぼく</rt></ruby>にも<ruby>守<rt>まも</rt></ruby>れない) — "even I can't protect"
• dare ni mo wasurerare-nai (<ruby>誰<rt>だれ</rt></ruby>にも<ruby>忘<rt>わす</rt></ruby>れられない) — "can't be forgotten by anyone"
• boku ni mo todoka-nai omoi (<ruby>僕<rt>ぼく</rt></ruby>にも<ruby>届<rt>とど</rt></ruby>かない<ruby>想<rt>おも</rt></ruby>い) — "feelings (that even I can't reach)"

${MARKER}`,

  "b5402ad0": `〜ni mo makezu (〜にも<ruby>負<rt>ま</rt></ruby>けず) is a fixed-expression construction from Miyazawa Kenji's famous poem "Ame ni mo makezu" (1931): not losing to rain, not losing to wind, etc. Means 'without losing to / undaunted by / not yielding to X'. Combines に (target) + も (even) + makezu (not losing — classical negative continuative of makeru).

While derived from a specific poem, the pattern is now widely productive — used in lyrics, rallying speeches, expressions of resilience: kanashimi ni mo makezu (<ruby>悲<rt>かな</rt></ruby>しみにも<ruby>負<rt>ま</rt></ruby>けず) 'undaunted by sadness'. The classical 〜zu form (batch4a) gives it weight and an archaic / poetic register.

Compare with batch4b's 〜ni mo 〜nai (negative target — general), 〜ni katsu (defeating X), and 〜ni makenai (won't lose to — modern). 〜ni mo makezu is uniquely the Miyazawa-rooted fixed-expression — used as cultural quote, idiom, or song-lyric trope for unyielding endurance.

• ame ni mo makezu (<ruby>雨<rt>あめ</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by rain'
• kaze ni mo makezu (<ruby>風<rt>かぜ</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by wind'
• yuki ni mo makezu (<ruby>雪<rt>ゆき</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by snow'
• kanashimi ni mo makezu (<ruby>悲<rt>かな</rt></ruby>しみにも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by sadness'
• kurushimi ni mo makezu (<ruby>苦<rt>くる</rt></ruby>しみにも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by suffering'
• namida ni mo makezu (<ruby>涙<rt>なみだ</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by tears'
• osoroshi-sa ni mo makezu (<ruby>恐<rt>おそろ</rt></ruby>しさにも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by fear'
• shippai ni mo makezu (<ruby>失敗<rt>しっぱい</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by failure'
• taiyou ni mo makezu (<ruby>太陽<rt>たいよう</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by the sun'
• tsumetai sekai ni mo makezu (<ruby>冷<rt>つめ</rt></ruby>たい<ruby>世界<rt>せかい</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by a cold world'
• boku no yowasa ni mo makezu (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>弱<rt>よわ</rt></ruby>さにも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by my weakness'
• unmei ni mo makezu (<ruby>運命<rt>うんめい</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by fate'
• jikan ni mo makezu (<ruby>時間<rt>じかん</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by time'
• boku-tachi no kako ni mo makezu (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>過去<rt>かこ</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by our past'
• boku no namida ni mo makezu (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>涙<rt>なみだ</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by my tears'

${MARKER}`,

  "21288264": `〜ni kawaru (〜に<ruby>変<rt>か</rt></ruby>わる) attaches に (target) + kawaru (to change). Means 'change into / turn into X / be replaced by X'. Marks transformation from one state to another. namida ga ame ni kawaru (<ruby>涙<rt>なみだ</rt></ruby>が<ruby>雨<rt>あめ</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) 'tears turn into rain'.

Distinguished from 〜to naru (formal become, batch5b) by emphasising actual transformation rather than identity-claim. 〜ni kawaru implies a process; 〜to naru implies a conclusion. Past form 〜ni kawatta (changed into).

Compare with 〜ni naru (become — neutral state-change), 〜ni suru (decide on / make into — agentive, batch5b), 〜to naru (formal become, batch5b). 〜ni kawaru is the natural-transformation marker — perfect for lyrical metamorphosis: ai ga kanashimi ni kawaru (<ruby>愛<rt>あい</rt></ruby>が<ruby>悲<rt>かな</rt></ruby>しみに<ruby>変<rt>か</rt></ruby>わる) 'love turns into sadness'.

• namida ga ame ni kawaru (<ruby>涙<rt>なみだ</rt></ruby>が<ruby>雨<rt>あめ</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'tears turn into rain'
• ai ga kanashimi ni kawaru (<ruby>愛<rt>あい</rt></ruby>が<ruby>悲<rt>かな</rt></ruby>しみに<ruby>変<rt>か</rt></ruby>わる) — 'love turns into sadness'
• yume ga genjitsu ni kawaru (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>現実<rt>げんじつ</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'a dream turns into reality'
• kotoba ga uta ni kawaru (<ruby>言葉<rt>ことば</rt></ruby>が<ruby>歌<rt>うた</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'words turn into a song'
• kage ga hikari ni kawaru (<ruby>影<rt>かげ</rt></ruby>が<ruby>光<rt>ひかり</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'shadows turn into light'
• kanashimi ga chikara ni kawaru (<ruby>悲<rt>かな</rt></ruby>しみが<ruby>力<rt>ちから</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'sadness turns into strength'
• kioku ga uta ni kawaru (<ruby>記憶<rt>きおく</rt></ruby>が<ruby>歌<rt>うた</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'memories turn into song'
• yoru ga asa ni kawaru (<ruby>夜<rt>よる</rt></ruby>が<ruby>朝<rt>あさ</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'night turns into morning'
• fuyu ga haru ni kawaru (<ruby>冬<rt>ふゆ</rt></ruby>が<ruby>春<rt>はる</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'winter turns into spring'
• namida wa egao ni kawaru (<ruby>涙<rt>なみだ</rt></ruby>は<ruby>笑顔<rt>えがお</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'tears turn into smiles'
• boku ga otona ni kawaru (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>大人<rt>おとな</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — "I turn into an adult"
• kanji ga kotoba ni kawaru (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>言葉<rt>ことば</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'kanji turns into words'
• shippai ga kyoukun ni kawaru (<ruby>失敗<rt>しっぱい</rt></ruby>が<ruby>教訓<rt>きょうくん</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'failure turns into a lesson'
• tsumetai kaze ga atatakai kaze ni kawaru (<ruby>冷<rt>つめ</rt></ruby>たい<ruby>風<rt>かぜ</rt></ruby>が<ruby>暖<rt>あたた</rt></ruby>かい<ruby>風<rt>かぜ</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'cold wind turns into warm wind'
• nanige nai hibi ga takaramono ni kawaru (<ruby>何気<rt>なにげ</rt></ruby>ない<ruby>日々<rt>ひび</rt></ruby>が<ruby>宝物<rt>たからもの</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'casual days turn into treasure'

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
