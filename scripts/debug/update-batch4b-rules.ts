/**
 * Batch 4b — 20 v2 grammar rule explanations (final batch of the 40-rule run).
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "45d1f1c9": "〜no darou (〜のだろう) — speculative wonder (formal)",
  "746c737e": "〜ba ii (〜ばいい) — just do / it's enough to / should",
  "deb06140": "〜ya shinai (〜やしない) — emphatic negative (won't even)",
  "b5e73cf5": "〜you to (〜ようと) — no matter what / regardless",
  "00bcaffb": "〜furi wo suru (〜フリをする / 〜ふりをする) — to pretend / act as if",
  "d30cf78c": "kesshite 〜nai (けして〜ない / 決して〜ない) — never / by no means",
  "1a53d7f9": "Adjective stem + sa (〜さ) — -ness nominaliser",
  "adec69fe": "Casual masculine particles zo / ze (ぞ / ぜ) — emphatic assertion",
  "1074fd8a": "Classical attributive 〜ki (〜き) — literary 〜i",
  "486507b7": "Emphatic prefix ma〜 (真っ〜) — intensified adjective",
  "f3b50770": "Emphatic ha (は) in negative (〜ku wa nai) — softened 'not even'",
  "0d5ce238": "Negative imperative 〜nai de (〜ないで) — please don't",
  "3eb9c806": "Question word + mo + negative — universal negation",
  "499f3fd9": "Sentence-final sa (〜さ) — masculine assertive softener",
  "88fa7efc": "Verb-stem + ni + iku / kuru (〜に行く / 〜に来る) — go / come to do X",
  "afbf25e7": "〜kashira (〜かしら) — I wonder (feminine)",
  "805d6df1": "〜ga mama ni (〜がままに) — as one pleases / freely",
  "92c0b989": "〜koto ga dekiru (〜ことができる) — be able to do (analytic potential)",
  "7c4e4800": "〜janai ka (〜じゃないか) — isn't it? / how about",
  "29df37ff": "〜sura (〜すら) — even (formal emphatic)",
};

const REWRITES: Record<string, string> = {
  "45d1f1c9": `〜no darou (〜のだろう / 〜んだろう casual) attaches to plain-form sentences. Combines the explanatory particle 〜no with conjectural 〜darou (batch3a). Means 'I wonder why / I suppose that X (for some reason)' — speculative reasoning made audible. Less casual than the contracted 〜ndarou (batch3b). Used for reflective questions to oneself, often without expecting an answer.

The 〜no provides explanatory grounding ('the reason / situation is X'); 〜darou adds conjecture. Together: 'I'm pondering why X is the case'. Sentence-finally as a hanging wonder: naze konna ni kanashii no darou (なぜこんなに<ruby>悲<rt>かな</rt></ruby>しいのだろう) "I wonder why I'm this sad". Common in lyrics and reflective monologues.

Compare with batch3b's 〜n darou (more colloquial), 〜hazu (high-confidence inference), 〜kana (lighter wondering, batch3b). 〜no darou is the formal-poetic register for self-questioning. Often paired with naze (なぜ, why) or dou shite (どうして, why) at the front of the clause.

• naze konna ni kanashii no darou (なぜこんなに<ruby>悲<rt>かな</rt></ruby>しいのだろう) — "I wonder why I'm this sad"
• dou shite naita no darou (どうして<ruby>泣<rt>な</rt></ruby>いたのだろう) — "I wonder why I cried"
• ai to wa nan na no darou (<ruby>愛<rt>あい</rt></ruby>とは<ruby>何<rt>なん</rt></ruby>なのだろう) — "I wonder what love is"
• boku wa naze koko ni iru no darou (<ruby>僕<rt>ぼく</rt></ruby>はなぜここにいるのだろう) — "why am I here, I wonder"
• mata aeru no darou ka (また<ruby>会<rt>あ</rt></ruby>えるのだろうか) — "I wonder if we'll meet again"
• tsutawatte iru no darou (<ruby>伝<rt>つた</rt></ruby>わっているのだろう) — "I wonder if it's getting through"
• kawatte iru no darou (<ruby>変<rt>か</rt></ruby>わっているのだろう) — "I wonder if (I'm/it's) changing"
• shinjite kureteru no darou (<ruby>信<rt>しん</rt></ruby>じてくれてるのだろう) — "I wonder if (you) believe (in me)"
• kanji wa naze konna ni muzukashii no darou (<ruby>漢字<rt>かんじ</rt></ruby>はなぜこんなに<ruby>難<rt>むずか</rt></ruby>しいのだろう) — "why is kanji so hard, I wonder"
• kimi mo onaji ki mochi na no darou (<ruby>君<rt>きみ</rt></ruby>も<ruby>同<rt>おな</rt></ruby>じ<ruby>気持<rt>きも</rt></ruby>ちなのだろう) — "I wonder if you feel the same"
• yume na no darou ka (<ruby>夢<rt>ゆめ</rt></ruby>なのだろうか) — "I wonder if it's a dream"
• kotaeru wake ni wa ikanai no darou (<ruby>答<rt>こた</rt></ruby>えるわけにはいかないのだろう) — "I suppose they can't answer"
• namida wa naze tomara nai no darou (<ruby>涙<rt>なみだ</rt></ruby>はなぜ<ruby>止<rt>と</rt></ruby>まらないのだろう) — "why won't the tears stop, I wonder"
• shinjirareru no darou ka (<ruby>信<rt>しん</rt></ruby>じられるのだろうか) — "I wonder if I can believe (it)"
• mou owatte shimatta no darou (もう<ruby>終<rt>お</rt></ruby>わってしまったのだろう) — "I suppose it's already over"

${MARKER}`,

  "746c737e": `〜ba ii (〜ばいい) attaches the 〜ba conditional (batch1) to the i-adjective ii (good). Means 'should X / it would be enough to X / just do X'. Frame: the speaker offers a course of action as the simple, sufficient solution. yamereba ii (やめればいい) "just stop". Casual variant: 〜tara ii (batch4a) for the soft wish-or-suggestion sense.

Two readings: (a) Mild suggestion / advice — 'just do X'. (b) Wish — 'I hope (X) / if only (X)'. The wish reading often pairs with noni (のに) for emphasis: katte irebia ii noni (<ruby>勝<rt>か</rt></ruby>っていればいいのに) "if only (they) had won". The suggestion reading is dismissive or relieving: kotaereba ii dake (<ruby>答<rt>こた</rt></ruby>えればいいだけ) 'just have to answer'.

Compare with 〜tara ii (batch4a — softer, often wistful), 〜hou ga ii ('better to', recommendation), 〜nakereba naranai (must — opposite). 〜ba ii is the can-do option suggestion — minimal effort, sufficient solution. With negation (〜nakereba ii) it inverts to 'just don't X / don't have to X'.

• yamereba ii (やめればいい) — "just stop"
• ikeba ii (<ruby>行<rt>い</rt></ruby>けばいい) — "just go"
• tabeba ii (<ruby>食<rt>た</rt></ruby>べばいい) — "just eat"
• kotaerebia ii (<ruby>答<rt>こた</rt></ruby>えればいい) — "just answer"
• kikeba ii (<ruby>聞<rt>き</rt></ruby>けばいい) — "just ask"
• yatte mireba ii (やってみればいい) — "just try"
• mata yari-naoseba ii (またやり<ruby>直<rt>なお</rt></ruby>せばいい) — "just redo it"
• shinjireba ii (<ruby>信<rt>しん</rt></ruby>じればいい) — "just believe"
• ame ga yameba ii (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>めばいい) — "I hope the rain stops"
• boku ga inakereba ii (<ruby>僕<rt>ぼく</rt></ruby>がいなければいい) — "if only I weren't here"
• kanji nado wasureru shinjireba ii (<ruby>漢字<rt>かんじ</rt></ruby>など<ruby>忘<rt>わす</rt></ruby>れる<ruby>信<rt>しん</rt></ruby>じればいい) — 'just believe (you can) forget kanji'
• kanaereba ii dake (<ruby>叶<rt>かな</rt></ruby>えればいいだけ) — 'just have to make it come true'
• mou nigerareba ii (もう<ruby>逃<rt>に</rt></ruby>げられればいい) — "if only I could escape"
• damarereba ii noni (<ruby>黙<rt>だま</rt></ruby>れればいいのに) — "if only I could stay silent"
• tatakaeba ii (<ruby>戦<rt>たたか</rt></ruby>えばいい) — "just fight"

${MARKER}`,

  "deb06140": `〜ya shinai (〜やしない) is an emphatic negative — equivalent to 〜wa shinai (more formal). Attaches to V-masu-stem + や + しない. Casual / male / spoken contraction with extra punch. naki-ya shinai (<ruby>泣<rt>な</rt></ruby>きやしない) "won't even cry". Carries defiance, denial, or strong dismissal — the action absolutely won't happen.

The literal reading: V-stem + や (emphatic listing particle) + shi-nai ('don't do'). The combination intensifies negation beyond simple 〜nai. Often used for refutation in lyrics and rough male speech: makeyashinai (<ruby>負<rt>ま</rt></ruby>けやしない) "I won't lose". Closely related: 〜mo shinai (〜もしない) with the same emphasising effect via 〜も instead of 〜や.

Compare with bare 〜nai (everyday negative), 〜wake ga nai (no way, batch3b), 〜hazu ga nai (no logical chance, batch3b), 〜tewa nai (more formal denial). 〜ya shinai is the rough emotional emphatic — perfect for shounen anime declarations and rock lyrics.

• naki-ya shinai (<ruby>泣<rt>な</rt></ruby>きやしない) — "won't even cry"
• make-ya shinai (<ruby>負<rt>ま</rt></ruby>けやしない) — "won't lose"
• shini-ya shinai (<ruby>死<rt>し</rt></ruby>にやしない) — "won't die"
• yameya shinai (やめやしない) — "won't stop"
• wakari-ya shinai (<ruby>分<rt>わ</rt></ruby>かりやしない) — "won't understand"
• shi-ya shinai (しやしない) — "won't do"
• mie-ya shinai (<ruby>見<rt>み</rt></ruby>えやしない) — "can't even see"
• ki-ya shinai (<ruby>来<rt>き</rt></ruby>やしない) — "won't even come"
• wasure-ya shinai (<ruby>忘<rt>わす</rt></ruby>れやしない) — "won't forget"
• kanaiya shinai (<ruby>叶<rt>かな</rt></ruby>いやしない) — "won't come true"
• boku ni dekiyashinai (<ruby>僕<rt>ぼく</rt></ruby>にできやしない) — "I can't possibly do it"
• kawari-ya shinai (<ruby>変<rt>か</rt></ruby>わりやしない) — "won't change"
• tomara-ya shinai (<ruby>止<rt>と</rt></ruby>まりやしない) — "won't stop"
• mukaeau koto wa nigeya shinai (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うことは<ruby>逃<rt>に</rt></ruby>げやしない) — "facing it won't run away"
• ai naki-ya shinai (<ruby>愛<rt>あい</rt></ruby><ruby>泣<rt>な</rt></ruby>きやしない) — "love won't cry"

${MARKER}`,

  "b5e73cf5": `〜you to (〜ようと) attaches the volitional form + と. Means 'no matter what / regardless of (X) / whether or not (X)' — emphatic concessive of supposition. Often paired with 〜you to ga / 〜you to mo for further emphasis. nani ga okorou to (<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>ころうと) 'no matter what happens'.

The structure quotes a hypothetical action / event with the volitional and dismisses its consequences. Common in declarations of unwavering commitment: dare ga nan to iou to (<ruby>誰<rt>だれ</rt></ruby>が<ruby>何<rt>なに</rt></ruby>と<ruby>言<rt>い</rt></ruby>おうと) 'no matter what anyone says'. Stronger than simple concessive 〜temo because the volitional adds 'even hypothetically X-ing'.

Compare with 〜temo (basic concession), tatoe〜demo (strong hypothetical concession, batch3b), 〜to shite mo (even supposing, batch3b). 〜you to is the ultimate 'doesn't matter' marker — used to assert that some commitment / situation is invariant under any imagined disturbance.

• nani ga okorou to (<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>ころうと) — 'no matter what happens'
• dare ga nan to iou to (<ruby>誰<rt>だれ</rt></ruby>が<ruby>何<rt>なに</rt></ruby>と<ruby>言<rt>い</rt></ruby>おうと) — 'no matter what anyone says'
• ame ga furou to (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ろうと) — 'whether it rains or not'
• boku ga inakune narou to (<ruby>僕<rt>ぼく</rt></ruby>がいなくなろうと) — 'even if I disappear'
• shinou to (<ruby>死<rt>し</rt></ruby>のうと) — 'even if I die'
• maketou to (<ruby>負<rt>ま</rt></ruby>けようと) — 'even if I lose'
• kawarou to (<ruby>変<rt>か</rt></ruby>わろうと) — 'no matter how I change'
• ushinau-you to (<ruby>失<rt>うしな</rt></ruby>おうと) — 'even if I lose (it)'
• kotaeru-you to (<ruby>答<rt>こた</rt></ruby>えようと) — 'no matter how I answer'
• mata aware-you to (また<ruby>会<rt>あ</rt></ruby>われようと) — 'no matter when we meet'
• donna ni tsurakarou to (どんなに<ruby>辛<rt>つら</rt></ruby>かろうと) — 'no matter how painful'
• yume ga oware-you to (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>終<rt>お</rt></ruby>われようと) — 'even if the dream ends'
• tatoe-bansho-ga kanawa-nakute mo (たとえ<ruby>万<rt>ばん</rt></ruby><ruby>象<rt>しょう</rt></ruby>が<ruby>叶<rt>かな</rt></ruby>わなくても) — 'even if all things aren't realised'
• boku no kimochi wa kawaru-you to nai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>気持<rt>きも</rt></ruby>ちは<ruby>変<rt>か</rt></ruby>わろうとない) — "my feelings won't change no matter what"
• donna ni naita-tte mukaeau-you to omou (どんなに<ruby>泣<rt>な</rt></ruby>いたって<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>おうと<ruby>思<rt>おも</rt></ruby>う) — "no matter how much I cry, I'll face it"

${MARKER}`,

  "00bcaffb": `〜furi wo suru (〜フリをする / 〜<ruby>振<rt>ふ</rt></ruby>りをする) attaches to plain-form verbs, adjectives, or noun + no. Means 'pretend to / act as if X / put on the appearance of X'. wakatta furi wo suru (<ruby>分<rt>わ</rt></ruby>かったフリをする) "pretend to understand". furi (フリ) is a noun meaning 'gesture / pretense / act'.

The structure exposes the gap between appearance and reality — the speaker (or subject) is performing X without actually being / doing X. Common in emotional contexts where someone hides true feelings: heiki na furi wo suru (<ruby>平気<rt>へいき</rt></ruby>なフリをする) "pretend to be okay" — a J-pop staple.

Compare with 〜you ni miseru (make appear like, more deliberate), 〜tsumori (intent — different concept), and 〜rashii (apparently — evidential, not pretense). 〜furi wo suru is specifically about INTENTIONAL FAKING. Often spelled in katakana (フリ) for emphasis or kanji (振り) for formal contexts. The negative 〜furi wo shi nai means 'don't pretend / be honest about'.

• wakatta furi wo suru (<ruby>分<rt>わ</rt></ruby>かったフリをする) — "pretend to understand"
• shiranai furi wo suru (<ruby>知<rt>し</rt></ruby>らないフリをする) — "pretend not to know"
• heiki na furi wo suru (<ruby>平気<rt>へいき</rt></ruby>なフリをする) — "pretend to be okay"
• naite nai furi wo suru (<ruby>泣<rt>な</rt></ruby>いてないフリをする) — "pretend not to be crying"
• kikoenai furi wo suru (<ruby>聞<rt>き</rt></ruby>こえないフリをする) — "pretend not to hear"
• mite nai furi wo suru (<ruby>見<rt>み</rt></ruby>てないフリをする) — "pretend not to see"
• genki na furi wo suru (<ruby>元気<rt>げんき</rt></ruby>なフリをする) — "pretend to be cheerful"
• tsuyoi furi wo suru (<ruby>強<rt>つよ</rt></ruby>いフリをする) — "pretend to be strong"
• shiawase no furi wo suru (<ruby>幸<rt>しあわ</rt></ruby>せのフリをする) — "pretend to be happy"
• kazoku ja nai furi wo suru (<ruby>家族<rt>かぞく</rt></ruby>じゃないフリをする) — "pretend not to be family"
• damatta furi wo suru (<ruby>黙<rt>だま</rt></ruby>ったフリをする) — "pretend to have been silent"
• boku no koto wo wasureta furi wo suru (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れたフリをする) — "pretend to have forgotten me"
• warau furi wo shite naita (<ruby>笑<rt>わら</rt></ruby>うフリをして<ruby>泣<rt>な</rt></ruby>いた) — "cried while pretending to laugh"
• otona no furi wo suru (<ruby>大人<rt>おとな</rt></ruby>のフリをする) — "pretend to be an adult"
• ai shi-te nai furi wo shi-tsuzukeru (<ruby>愛<rt>あい</rt></ruby>してないフリをし<ruby>続<rt>つづ</rt></ruby>ける) — "keep pretending not to love"

${MARKER}`,

  "d30cf78c": `kesshite 〜nai (けして〜ない / <ruby>決<rt>けっ</rt></ruby>して〜ない) is a paired construction — the adverb kesshite (けして / 決して, 'never / by no means') at the front of a clause, paired with a negative predicate at the end. Strong emphatic denial — 'will absolutely never X / under no circumstances'. kesshite wasure-nai (<ruby>決<rt>けっ</rt></ruby>して<ruby>忘<rt>わす</rt></ruby>れない) "I will never forget".

The kesshite at the front signals 'a strong negation is coming'; the predicate at the end must be negative. Stronger than simple 〜nai because of the adverb's absolute force. Common in vows, declarations, and emotional commitments: kesshite ushinau koto wa nai (<ruby>決<rt>けっ</rt></ruby>して<ruby>失<rt>うしな</rt></ruby>うことはない) 'will never be lost'.

Compare with batch3b's 〜wake ga nai (no way — emotional denial), 〜hazu ga nai (no logical possibility), and zettai ni 〜nai (<ruby>絶対<rt>ぜったい</rt></ruby>に〜ない, 'absolutely not'). kesshite is the most literary / weighted of the absolute-negation adverbs. In song lyrics it's the marker of unbreakable promises.

• kesshite wasure-nai (<ruby>決<rt>けっ</rt></ruby>して<ruby>忘<rt>わす</rt></ruby>れない) — "will never forget"
• kesshite akiramenai (<ruby>決<rt>けっ</rt></ruby>して<ruby>諦<rt>あきら</rt></ruby>めない) — "will never give up"
• kesshite ushinawanai (<ruby>決<rt>けっ</rt></ruby>して<ruby>失<rt>うしな</rt></ruby>わない) — "will never lose"
• kesshite hanare-nai (<ruby>決<rt>けっ</rt></ruby>して<ruby>離<rt>はな</rt></ruby>れない) — "will never part"
• kesshite uragiranai (<ruby>決<rt>けっ</rt></ruby>して<ruby>裏切<rt>うらぎ</rt></ruby>らない) — "will never betray"
• kesshite kawaranai (<ruby>決<rt>けっ</rt></ruby>して<ruby>変<rt>か</rt></ruby>わらない) — "will never change"
• kesshite tomaranai (<ruby>決<rt>けっ</rt></ruby>して<ruby>止<rt>と</rt></ruby>まらない) — "will never stop"
• kesshite nigenai (<ruby>決<rt>けっ</rt></ruby>して<ruby>逃<rt>に</rt></ruby>げない) — "will never run"
• kesshite yurusanai (<ruby>決<rt>けっ</rt></ruby>して<ruby>許<rt>ゆる</rt></ruby>さない) — "will never forgive"
• kesshite makenai (<ruby>決<rt>けっ</rt></ruby>して<ruby>負<rt>ま</rt></ruby>けない) — "will never lose"
• kesshite shinjirenai (<ruby>決<rt>けっ</rt></ruby>して<ruby>信<rt>しん</rt></ruby>じれない) — "will never be able to believe"
• kesshite koware-nai yume (<ruby>決<rt>けっ</rt></ruby>して<ruby>壊<rt>こわ</rt></ruby>れない<ruby>夢<rt>ゆめ</rt></ruby>) — "a dream that will never break"
• kesshite kie-nai hikari (<ruby>決<rt>けっ</rt></ruby>して<ruby>消<rt>き</rt></ruby>えない<ruby>光<rt>ひかり</rt></ruby>) — "a light that will never fade"
• kesshite ie-nai kotoba (<ruby>決<rt>けっ</rt></ruby>して<ruby>言<rt>い</rt></ruby>えない<ruby>言葉<rt>ことば</rt></ruby>) — "words I can never say"
• kesshite kimi wo hitori ni shi-nai (<ruby>決<rt>けっ</rt></ruby>して<ruby>君<rt>きみ</rt></ruby>を<ruby>一人<rt>ひとり</rt></ruby>にしない) — "I'll never leave you alone"

${MARKER}`,

  "1a53d7f9": `Adjective stem + 〜sa (〜さ) is a productive nominaliser — turn an adjective into an abstract noun expressing 'X-ness'. For i-adjectives: drop the final 〜i, add 〜さ. takai → takasa (<ruby>高<rt>たか</rt></ruby>さ, 'height / expensiveness'). For na-adjectives: drop the な, add 〜さ. shizuka → shizukasa (<ruby>静<rt>しず</rt></ruby>かさ, 'quietness').

The 〜sa nominaliser produces measurable, objective abstractions — a property treated as a quantity. Useful in description, comparison, and song lyrics: kanashisa (<ruby>悲<rt>かな</rt></ruby>しさ) 'sadness' as a felt quantity. Compare with 〜mi (〜<ruby>味<rt>み</rt></ruby>) — produces subjective / felt nouns: kanashimi (<ruby>悲<rt>かな</rt></ruby>しみ) 'sadness as inner experience'. Both are productive but different in feel.

Other nominalisers: 〜koto (〜こと, abstract 'the act / fact of'), 〜no (verb-nominalised), 〜sa (this entry). 〜sa is the universal adjective-to-noun bridge — it works on almost any adjective. Critical for any descriptive Japanese; nearly impossible to avoid in song lyrics about emotion and quality.

• takasa (<ruby>高<rt>たか</rt></ruby>さ) — 'height / cost'
• fukasa (<ruby>深<rt>ふか</rt></ruby>さ) — 'depth'
• tsuyoi-sa (<ruby>強<rt>つよ</rt></ruby>さ) — 'strength'
• yowasa (<ruby>弱<rt>よわ</rt></ruby>さ) — 'weakness'
• kanashisa (<ruby>悲<rt>かな</rt></ruby>しさ) — 'sadness (as quality)'
• ureshi-sa (<ruby>嬉<rt>うれ</rt></ruby>しさ) — 'joy (as quality)'
• atatakasa (<ruby>暖<rt>あたた</rt></ruby>かさ) — 'warmth'
• samusa (<ruby>寒<rt>さむ</rt></ruby>さ) — 'coldness'
• shizukasa (<ruby>静<rt>しず</rt></ruby>かさ) — 'quietness'
• yasashisa (<ruby>優<rt>やさ</rt></ruby>しさ) — 'kindness'
• kawaisa (<ruby>可愛<rt>かわい</rt></ruby>さ) — 'cuteness'
• taisetsusa (<ruby>大切<rt>たいせつ</rt></ruby>さ) — 'importance'
• samishisa (<ruby>寂<rt>さび</rt></ruby>しさ) — 'loneliness'
• toosa (<ruby>遠<rt>とお</rt></ruby>さ) — 'distance / how far'
• atarashisa (<ruby>新<rt>あたら</rt></ruby>しさ) — 'newness'

${MARKER}`,

  "adec69fe": `Casual masculine particles 〜zo (〜ぞ) and 〜ze (〜ぜ) are sentence-final markers expressing assertion or emphasis. Both stereotypically male — women rarely use them outside fiction / role-play. 〜zo tilts toward self-directed inner monologue ('I'm gonna X!'); 〜ze tilts toward outward assertion / rallying cry ('let's X!' / 'X, you know!'). See batch4a entry on 〜ze for the latter.

〜zo: gambaru zo (<ruby>頑張<rt>がんば</rt></ruby>るぞ) "I'm gonna give it my all". Self-pep-talk, declaration of intent. Less harsh than 〜ze, more contemplative or determined. Pairs with verbs of resolve (yaru, ganbaru, ikiru). Common in protagonist monologue in shounen anime, sports drama, and any rallying-self moment.

〜ze: more outward, more confident, more public. iku ze (<ruby>行<rt>い</rt></ruby>くぜ) "let's go!" — addressing companions. The two often appear paired in dialogue: yaru zo! / ikuze! ('I'll do it' / 'let's go'). Compare with neutral 〜yo (assertion to listener), 〜sa (masculine softener), 〜wa (feminine assertion or Kansai male). Use 〜zo / 〜ze sparingly in real conversation — overuse signals affect or anime-speak.

• ganbaru zo (<ruby>頑張<rt>がんば</rt></ruby>るぞ) — "I'm gonna give it my all"
• yaru zo (やるぞ) — "I'm doing it"
• iku zo (<ruby>行<rt>い</rt></ruby>くぞ) — "I'm going!"
• kachi-tai zo (<ruby>勝<rt>か</rt></ruby>ちたいぞ) — "I wanna win!"
• mata aerukara ne, ze (またあえるからね、ぜ) — "we'll meet again — for sure"
• abunai zo (<ruby>危<rt>あぶ</rt></ruby>ないぞ) — "watch out!"
• mou matenai ze (もう<ruby>待<rt>ま</rt></ruby>てないぜ) — "I can't wait any longer!"
• mada hashireru zo (まだ<ruby>走<rt>はし</rt></ruby>れるぞ) — "I can still run"
• kakatte koi ze (かかってこいぜ) — "bring it on!"
• kachi-toru ze (<ruby>勝<rt>か</rt></ruby>ち<ruby>取<rt>と</rt></ruby>るぜ) — "I'll win it!"
• mada owaranai zo (まだ<ruby>終<rt>お</rt></ruby>わらないぞ) — "this isn't over!"
• mata aou ze (また<ruby>会<rt>あ</rt></ruby>おうぜ) — "let's meet again!"
• tsuyokunaru zo (<ruby>強<rt>つよ</rt></ruby>くなるぞ) — "I'll get stronger"
• mamoru zo (<ruby>守<rt>まも</rt></ruby>るぞ) — "I'll protect (them)"
• yume wo kanaeru zo (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>叶<rt>かな</rt></ruby>えるぞ) — "I'll make the dream come true!"

${MARKER}`,

  "1074fd8a": `Classical attributive 〜ki (〜き) is the literary equivalent of modern 〜i (〜い) in i-adjective attributive position. Modifies a following noun: utsukushiki hito (<ruby>美<rt>うつく</rt></ruby>しき<ruby>人<rt>ひと</rt></ruby>) 'a beautiful person' (modern: utsukushii hito). Survives in poetry, song lyrics, formal / archaic prose, and idiomatic / classical compounds: kanashiki sadame (<ruby>悲<rt>かな</rt></ruby>しき<ruby>定<rt>さだ</rt></ruby>め) 'a sad fate'.

The classical paradigm split adjective forms into predicative (sentence-final, 〜shi) and attributive (modifying a noun, 〜ki). Modern Japanese collapses both into 〜i. The classical 〜ki is purely a register marker now — using it signals literary / archaic / song-like style.

Compare with classical 〜nu (negative predicative, batch3b), 〜zu (negative continuative, batch4a), 〜naki (negative attributive, batch4a). All are part of the surviving classical paradigm. 〜ki is one of the most commonly encountered in song titles and lyrics: utsukushiki hibi (beautiful days), kanashiki yoru (sad night). Recognising it as 'just literary 〜i' unlocks much of song-lyric reading.

• utsukushiki (<ruby>美<rt>うつく</rt></ruby>しき) — 'beautiful (lit.)'
• kanashiki (<ruby>悲<rt>かな</rt></ruby>しき) — 'sad (lit.)'
• yasashiki (<ruby>優<rt>やさ</rt></ruby>しき) — 'kind / gentle (lit.)'
• tsuyoki (<ruby>強<rt>つよ</rt></ruby>き) — 'strong (lit.)'
• osoroshiki (<ruby>恐<rt>おそろ</rt></ruby>しき) — 'terrible / fearsome (lit.)'
• atatakaki (<ruby>暖<rt>あたた</rt></ruby>かき) — 'warm (lit.)'
• fukaki kawa (<ruby>深<rt>ふか</rt></ruby>き<ruby>川<rt>かわ</rt></ruby>) — 'a deep river (lit.)'
• kanashiki yoru (<ruby>悲<rt>かな</rt></ruby>しき<ruby>夜<rt>よる</rt></ruby>) — 'a sad night (lit.)'
• yasashiki kokoro (<ruby>優<rt>やさ</rt></ruby>しき<ruby>心<rt>こころ</rt></ruby>) — 'a gentle heart (lit.)'
• tsuyoki ishi (<ruby>強<rt>つよ</rt></ruby>き<ruby>意志<rt>いし</rt></ruby>) — 'a strong will (lit.)'
• utsukushiki hibi (<ruby>美<rt>うつく</rt></ruby>しき<ruby>日々<rt>ひび</rt></ruby>) — 'beautiful days (lit.)'
• tooki tabi (<ruby>遠<rt>とお</rt></ruby>き<ruby>旅<rt>たび</rt></ruby>) — 'a far journey (lit.)'
• yawaraka-ki yume (<ruby>柔<rt>やわ</rt></ruby>らかき<ruby>夢<rt>ゆめ</rt></ruby>) — 'a soft dream (lit.)'
• kanashiki sadame (<ruby>悲<rt>かな</rt></ruby>しき<ruby>定<rt>さだ</rt></ruby>め) — 'a sorrowful fate (lit.)'
• atarashiki yoake (<ruby>新<rt>あたら</rt></ruby>しき<ruby>夜明<rt>よあ</rt></ruby>け) — 'a new dawn (lit.)'

${MARKER}`,

  "486507b7": `Emphatic prefix 〜ma (真っ〜 / まっ〜) attaches to color and intensity adjectives or nouns to mean 'pure / completely / absolutely X'. Most common with colors: makka (<ruby>真<rt>まっ</rt></ruby><ruby>赤<rt>か</rt></ruby>) 'bright red / crimson'. masshiro (<ruby>真<rt>まっ</rt></ruby><ruby>白<rt>しろ</rt></ruby>) 'pure white'. Also with darkness, brightness, and other absolutes: makura (<ruby>真<rt>まっ</rt></ruby><ruby>暗<rt>くら</rt></ruby>) 'pitch dark', massaki (<ruby>真<rt>まっ</rt></ruby><ruby>先<rt>さき</rt></ruby>) 'foremost'.

The 真 (ma, 'true / pure') prefix intensifies — the modified property is at its absolute maximum. Often attaches with the small っ (sokuon) for euphonic emphasis: ma+ + akai → makka. Treats the whole compound as a na-adjective: makka na sora (<ruby>真<rt>まっ</rt></ruby><ruby>赤<rt>か</rt></ruby>な<ruby>空<rt>そら</rt></ruby>) 'a crimson sky'.

Common compounds (mostly fixed): makka, masshiro, makkuro (<ruby>真<rt>まっ</rt></ruby><ruby>黒<rt>くろ</rt></ruby> 'jet black'), maaomi or massao (<ruby>真<rt>まっ</rt></ruby><ruby>青<rt>さお</rt></ruby> 'deep blue / pale'), masuguru (<ruby>真<rt>まっ</rt></ruby><ruby>直<rt>す</rt></ruby>ぐ 'straight'), maatarashii (<ruby>真<rt>ま</rt></ruby><ruby>新<rt>あたら</rt></ruby>しい 'brand new'). Beloved in lyrics for vivid imagery: makka na sora at sunset, masshiro na yuki (pure white snow). Compare with prefix 〜chou (<ruby>超<rt>ちょう</rt></ruby>, 'super', casual) and 〜oo (<ruby>大<rt>おお</rt></ruby>, 'great').

• makka (<ruby>真<rt>まっ</rt></ruby><ruby>赤<rt>か</rt></ruby>) — 'crimson / bright red'
• masshiro (<ruby>真<rt>まっ</rt></ruby><ruby>白<rt>しろ</rt></ruby>) — 'pure white'
• makkuro (<ruby>真<rt>まっ</rt></ruby><ruby>黒<rt>くろ</rt></ruby>) — 'jet black'
• massao (<ruby>真<rt>まっ</rt></ruby><ruby>青<rt>さお</rt></ruby>) — 'deep blue / pale'
• makura (<ruby>真<rt>まっ</rt></ruby><ruby>暗<rt>くら</rt></ruby>) — 'pitch dark'
• massugu (<ruby>真<rt>まっ</rt></ruby><ruby>直<rt>す</rt></ruby>ぐ) — 'straight / direct'
• maatarashii (<ruby>真<rt>ま</rt></ruby><ruby>新<rt>あたら</rt></ruby>しい) — 'brand new'
• massaki (<ruby>真<rt>まっ</rt></ruby><ruby>先<rt>さき</rt></ruby>) — 'foremost / first'
• maushiro (<ruby>真<rt>ま</rt></ruby><ruby>後<rt>うし</rt></ruby>ろ) — 'directly behind'
• mahiru (<ruby>真<rt>ま</rt></ruby><ruby>昼<rt>ひる</rt></ruby>) — 'broad daylight'
• mayonaka (<ruby>真夜中<rt>まよなか</rt></ruby>) — 'middle of the night'
• makka na sora (<ruby>真<rt>まっ</rt></ruby><ruby>赤<rt>か</rt></ruby>な<ruby>空<rt>そら</rt></ruby>) — 'a crimson sky'
• masshiro na yuki (<ruby>真<rt>まっ</rt></ruby><ruby>白<rt>しろ</rt></ruby>な<ruby>雪<rt>ゆき</rt></ruby>) — 'pure white snow'
• makka na bara (<ruby>真<rt>まっ</rt></ruby><ruby>赤<rt>か</rt></ruby>な<ruby>薔薇<rt>ばら</rt></ruby>) — 'a crimson rose'
• makura na sekai (<ruby>真<rt>まっ</rt></ruby><ruby>暗<rt>くら</rt></ruby>な<ruby>世界<rt>せかい</rt></ruby>) — 'a pitch-dark world'

${MARKER}`,

  "f3b50770": `Emphatic 〜は (〜は) inserted into a negative construction softens or focuses the negation. Most commonly seen as 〜ku wa nai (〜くはない) or 〜taku wa nai (〜たくはない), where 〜は precedes the nai. takunai (don't want to) → tabe-taku wa nai (<ruby>食<rt>た</rt></ruby>べたくはない) 'I don't necessarily want to eat (it)'. The 〜は makes the negation contrastive — implying 'not X, but something else / not exactly X'.

The structure introduces nuance: with 〜は, the negation becomes scoped, qualified, or contrastive. Compare bare 〜nai (flat denial) with 〜wa nai (focused denial): kanashii — 'sad'; kanashi-ku-wa-nai — 'not sad (per se / not in the way you might think)'. Often paired with 〜ga (but) for explicit contrast: takunai ga, tabenakute mo ii (don't necessarily want to eat, but it's fine not to).

Compare with 〜ja nai (negative copula), 〜nai de (without doing), and the simple 〜nai. Emphatic は is a subtle but characteristic Japanese grammatical move — the kind of nuance that distinguishes intermediate from beginner-level Japanese. Used heavily in lyrics, novels, and any context wanting hedged or scoped denial.

• tabe-taku wa nai (<ruby>食<rt>た</rt></ruby>べたくはない) — "don't necessarily want to eat"
• ikitaku wa nai (<ruby>行<rt>い</rt></ruby>きたくはない) — "don't really want to go"
• shiritakunai wa nai (<ruby>知<rt>し</rt></ruby>りたくはない) — "don't really want to know"
• ureshikunai wa nai (<ruby>嬉<rt>うれ</rt></ruby>しくはない) — "not exactly happy"
• kanashikunai wa nai (<ruby>悲<rt>かな</rt></ruby>しくはない) — "not exactly sad"
• kirei dewa nai (<ruby>綺麗<rt>きれい</rt></ruby>ではない) — "not exactly pretty"
• shippai dewa nai (<ruby>失敗<rt>しっぱい</rt></ruby>ではない) — "not (necessarily) a failure"
• boku no sei dewa nai (<ruby>僕<rt>ぼく</rt></ruby>のせいではない) — "not exactly my fault"
• yume dewa nai (<ruby>夢<rt>ゆめ</rt></ruby>ではない) — "not (just) a dream"
• kawatta wake dewa nai (<ruby>変<rt>か</rt></ruby>わったわけではない) — "not exactly that I've changed"
• ai shi-takunai wa nai (<ruby>愛<rt>あい</rt></ruby>したくはない) — "don't (necessarily) want to love"
• mienakunai wa nai (<ruby>見<rt>み</rt></ruby>えなくはない) — "not exactly invisible"
• shitte iru wake dewa nai (<ruby>知<rt>し</rt></ruby>っているわけではない) — "not that I exactly know"
• kotaeranakute wa nai (<ruby>答<rt>こた</rt></ruby>えれなくてはない) — "it's not that I can't answer"
• tsuyokunai wa nai (<ruby>強<rt>つよ</rt></ruby>くはない) — "not exactly strong"

${MARKER}`,

  "0d5ce238": `Negative imperative 〜nai de (〜ないで) attaches to a verb's nai-stem to express a soft prohibition or polite negative request — 'please don't X'. Distinct from the rough 〜na imperative (batch4a, 'don't!'), 〜nai de carries gentleness and request flavour. naka-nai de (<ruby>泣<rt>な</rt></ruby>かないで) "please don't cry". Polite extension: 〜nai de kudasai (please don't, formally).

Two readings: (a) Soft prohibition / request — most common, used in songs, gentle commands, intimate speech. (b) Manner / accompaniment — 'without doing X' — kakanai de henji shita (<ruby>書<rt>か</rt></ruby>かないで<ruby>返事<rt>へんじ</rt></ruby>した) 'replied without writing'. Context disambiguates; the soft-imperative reading often ends a sentence, the 'without' reading connects clauses.

Compare with 〜zu ni (literary 'without doing', batch1), 〜na (rough imperative, batch4a), 〜nakute (negative te-form connector), and 〜nai de kudasai (polite formal request). 〜nai de is the everyday gentle prohibition — a J-pop staple for vulnerable pleas: ika nai de (don't go), wasure nai de (don't forget).

• naka-nai de (<ruby>泣<rt>な</rt></ruby>かないで) — "please don't cry"
• ika-nai de (<ruby>行<rt>い</rt></ruby>かないで) — "please don't go"
• wasure-nai de (<ruby>忘<rt>わす</rt></ruby>れないで) — "please don't forget"
• mire-nai de (<ruby>見<rt>み</rt></ruby>ないで) — "please don't look"
• kie-nai de (<ruby>消<rt>き</rt></ruby>えないで) — "please don't disappear"
• hanare-nai de (<ruby>離<rt>はな</rt></ruby>れないで) — "please don't leave"
• kotae-nai de (<ruby>答<rt>こた</rt></ruby>えないで) — "please don't answer"
• shinji-nai de (<ruby>信<rt>しん</rt></ruby>じないで) — "please don't believe"
• yamenai de (やめないで) — "please don't stop"
• damaranai de (<ruby>黙<rt>だま</rt></ruby>らないで) — "please don't stay silent"
• boku no koto wo wasure-nai de (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れないで) — "please don't forget about me"
• tsuyogarana-i de (<ruby>強<rt>つよ</rt></ruby>がらないで) — "please don't act tough"
• damasa-nai de (<ruby>騙<rt>だま</rt></ruby>さないで) — "please don't deceive (me)"
• kanashima-nai de (<ruby>悲<rt>かな</rt></ruby>しまないで) — "please don't be sad"
• naka-nai de kudasai (<ruby>泣<rt>な</rt></ruby>かないでください) — "please don't cry (formal)"

${MARKER}`,

  "3eb9c806": `Question word + も + negative is a paired construction expressing universal negation — 'no(thing) / no one / never / nowhere'. The question word marks the universal scope; mo (も, 'also / even') extends it to all instances; the negative predicate denies them all. dare mo inai (<ruby>誰<rt>だれ</rt></ruby>もいない) 'no one is here'. nani mo nai (<ruby>何<rt>なに</rt></ruby>もない) 'there's nothing'.

Question words and their universal-negation expansions: dare mo (no one), nani mo (nothing), doko mo (nowhere), itsu mo (used in negative for 'never'... actually itsu mo means 'always'; for 'never' use itsu mo 〜nai or kesshite 〜nai), donna 〜mo (no kind of), dochira mo (neither). The negation MUST be at the end — without it, the same surface forms mean 'everyone / everything / everywhere'.

Compare with bare 〜nai, kesshite (batch4b — 'never' adverb), zenzen 〜nai (not at all). The question-word + も + negative pattern is the most productive way to express universal absence in Japanese. Mastery is essential — many beginner errors come from forgetting that mo + negative means 'NONE' rather than 'all'.

• dare mo inai (<ruby>誰<rt>だれ</rt></ruby>もいない) — "no one is here"
• nani mo nai (<ruby>何<rt>なに</rt></ruby>もない) — "there's nothing"
• doko mo iku tokoro ga nai (どこも<ruby>行<rt>い</rt></ruby>くところがない) — "nowhere to go"
• dochira mo erabenai (どちらも<ruby>選<rt>えら</rt></ruby>べない) — "can't choose either"
• donna koto mo deki nai (どんなこともできない) — "can't do any sort of thing"
• ittai dare mo wakaranai (<ruby>一体<rt>いったい</rt></ruby><ruby>誰<rt>だれ</rt></ruby>も<ruby>分<rt>わ</rt></ruby>からない) — "no one understands at all"
• ima made dare mo aishite konakatta (<ruby>今<rt>いま</rt></ruby>まで<ruby>誰<rt>だれ</rt></ruby>も<ruby>愛<rt>あい</rt></ruby>してこなかった) — "I've loved no one until now"
• nani mo iwanaide (<ruby>何<rt>なに</rt></ruby>も<ruby>言<rt>い</rt></ruby>わないで) — "don't say anything"
• doko mo itakunai (どこも<ruby>痛<rt>いた</rt></ruby>くない) — "nothing hurts anywhere"
• nani mo mienai (<ruby>何<rt>なに</rt></ruby>も<ruby>見<rt>み</rt></ruby>えない) — "I can't see anything"
• dare mo shiranai (<ruby>誰<rt>だれ</rt></ruby>も<ruby>知<rt>し</rt></ruby>らない) — "no one knows"
• dochira mo ikitakunai (どちらも<ruby>行<rt>い</rt></ruby>きたくない) — "I don't want to go to either"
• nani mo kotaezu (<ruby>何<rt>なに</rt></ruby>も<ruby>答<rt>こた</rt></ruby>えず) — "without answering anything"
• donna ame mo komaranai (どんな<ruby>雨<rt>あめ</rt></ruby>も<ruby>困<rt>こま</rt></ruby>らない) — "no rain bothers me"
• doko ni mo ikenai (どこにも<ruby>行<rt>い</rt></ruby>けない) — "can't go anywhere"

${MARKER}`,

  "499f3fd9": `Sentence-final 〜sa (〜さ) is a masculine assertive softener / reflective marker. Attaches to plain-form sentences. Means 'X, you know / X, that's the thing'. Less aggressive than 〜zo / 〜ze; more reflective and conversational. wakaru sa (<ruby>分<rt>わ</rt></ruby>かるさ) "I get it (don't worry)". Often used to console or to assert with quiet confidence.

Stereotypically male in modern Japanese, though some women use it in casual / friendly speech. The 〜sa softens an assertion that would otherwise be flat or harsh. Often paired with self-pep-talk verbs: daijoubu sa (<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>さ) "it's fine, you know". Sometimes attaches to nouns / na-adjectives: yume sa (<ruby>夢<rt>ゆめ</rt></ruby>さ) "it's a dream, see".

Compare with 〜zo (self-pep), 〜ze (outward rallying), 〜yo (neutral assertion), 〜no sa (explanatory + sa, batch4a). Sentence-final 〜sa sits in the gentle-masculine reflective zone. In ballads and slow songs, it adds quiet self-knowledge. In dialogue, it tells the listener 'this is how it is, don't worry / I'm sure'.

• wakaru sa (<ruby>分<rt>わ</rt></ruby>かるさ) — "I get it"
• daijoubu sa (<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>さ) — "it's fine"
• shitte iru sa (<ruby>知<rt>し</rt></ruby>っているさ) — "I know"
• yume sa (<ruby>夢<rt>ゆめ</rt></ruby>さ) — "it's a dream"
• ai sa (<ruby>愛<rt>あい</rt></ruby>さ) — "it's love"
• boku no koto sa (<ruby>僕<rt>ぼく</rt></ruby>のことさ) — "it's about me"
• tsuyoku naru sa (<ruby>強<rt>つよ</rt></ruby>くなるさ) — "I'll get stronger"
• mata aeru sa (また<ruby>会<rt>あ</rt></ruby>えるさ) — "we'll meet again"
• shinjite iru sa (<ruby>信<rt>しん</rt></ruby>じているさ) — "I'm believing"
• boku-tachi nara dekiru sa (<ruby>僕<rt>ぼく</rt></ruby>たちならできるさ) — "we can do it"
• kanaru sa (<ruby>叶<rt>かな</rt></ruby>うさ) — "it'll come true"
• mada hashireru sa (まだ<ruby>走<rt>はし</rt></ruby>れるさ) — "I can still run"
• kanji wo zenbu oboerareru sa (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>覚<rt>おぼ</rt></ruby>えられるさ) — "I can memorise all kanji"
• shiawase ni nareru sa (<ruby>幸<rt>しあわ</rt></ruby>せになれるさ) — "I can be happy"
• kawaru sa (<ruby>変<rt>か</rt></ruby>わるさ) — "things'll change"

${MARKER}`,

  "88fa7efc": `Verb-stem + ni + iku / kuru (〜に<ruby>行<rt>い</rt></ruby>く / 〜に<ruby>来<rt>く</rt></ruby>る) attaches the masu-stem of a verb + に + a motion verb (行く 'go' or 来る 'come') to express purpose of motion — 'go / come (in order) to do X'. tabe ni iku (<ruby>食<rt>た</rt></ruby>べに<ruby>行<rt>い</rt></ruby>く) 'go to eat'. au ni kuru (<ruby>会<rt>あ</rt></ruby>いに<ruby>来<rt>く</rt></ruby>る) 'come to meet'.

Distinct from 〜tame ni (in order to, batch2 — abstract purpose) and 〜you to suru (try to, batch4a — effortful intent). 〜ni iku / 〜ni kuru is specifically about MOVEMENT plus purpose. The motion verb specifies direction (away from / toward speaker).

Also accepts noun + ni + iku for shopping / events: kaimono ni iku (<ruby>買<rt>か</rt></ruby>い<ruby>物<rt>もの</rt></ruby>に<ruby>行<rt>い</rt></ruby>く) 'go shopping', tabe ni iku (go to eat), see ni iku (go to look). Verbs of leisure / errand / meeting are most common. Past forms 〜ni itta / 〜ni kita carry the same purpose meaning. Compare with 〜te kuru ('come having done X' — done elsewhere then return).

• tabe ni iku (<ruby>食<rt>た</rt></ruby>べに<ruby>行<rt>い</rt></ruby>く) — 'go to eat'
• mi ni iku (<ruby>見<rt>み</rt></ruby>に<ruby>行<rt>い</rt></ruby>く) — 'go to see / watch'
• kai ni iku (<ruby>買<rt>か</rt></ruby>いに<ruby>行<rt>い</rt></ruby>く) — 'go to buy'
• ai ni kuru (<ruby>会<rt>あ</rt></ruby>いに<ruby>来<rt>く</rt></ruby>る) — 'come to meet'
• mukae ni iku (<ruby>迎<rt>むか</rt></ruby>えに<ruby>行<rt>い</rt></ruby>く) — 'go to pick up'
• mukae ni kuru (<ruby>迎<rt>むか</rt></ruby>えに<ruby>来<rt>く</rt></ruby>る) — 'come to pick up'
• benkyou shi ni iku (<ruby>勉強<rt>べんきょう</rt></ruby>しに<ruby>行<rt>い</rt></ruby>く) — 'go to study'
• asobi ni iku (<ruby>遊<rt>あそ</rt></ruby>びに<ruby>行<rt>い</rt></ruby>く) — 'go to hang out'
• kao wo mise ni iku (<ruby>顔<rt>かお</rt></ruby>を<ruby>見<rt>み</rt></ruby>せに<ruby>行<rt>い</rt></ruby>く) — 'go to show one's face'
• tasuke ni iku (<ruby>助<rt>たす</rt></ruby>けに<ruby>行<rt>い</rt></ruby>く) — 'go to help'
• mitsuke ni iku (<ruby>見<rt>み</rt></ruby>つけに<ruby>行<rt>い</rt></ruby>く) — 'go to find'
• ai wo tsutae ni iku (<ruby>愛<rt>あい</rt></ruby>を<ruby>伝<rt>つた</rt></ruby>えに<ruby>行<rt>い</rt></ruby>く) — 'go to convey love'
• mata ai ni kuru kara (また<ruby>会<rt>あ</rt></ruby>いに<ruby>来<rt>く</rt></ruby>るから) — "I'll come to meet (you) again"
• wasure-mono wo tori ni kaeru (<ruby>忘<rt>わす</rt></ruby>れ<ruby>物<rt>もの</rt></ruby>を<ruby>取<rt>と</rt></ruby>りに<ruby>帰<rt>かえ</rt></ruby>る) — 'go back to fetch what was forgotten'
• kanji wo narai ni iku (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>習<rt>なら</rt></ruby>いに<ruby>行<rt>い</rt></ruby>く) — 'go to learn kanji'

${MARKER}`,

  "afbf25e7": `〜kashira (〜かしら) is the feminine equivalent of 〜kana (batch3b, 'I wonder'). Attaches to plain-form sentences. Self-directed pondering with feminine softness. ame ga furu kashira (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るかしら) "I wonder if it'll rain". Stereotypically female; men using it sound playful / archaic / character-affected.

Same functional range as 〜kana: self-wonder, soft request, soft suggestion. Combined with 〜nai for wishful tone: konai kashira (<ruby>来<rt>こ</rt></ruby>ないかしら) 'I wonder if (X won't come) / I hope (X comes)'. Slightly more reserved / elegant register than 〜kana — appears in older female speech, romantic / nostalgic songs, and feminine literary voice.

Compare with 〜kana (neutral / male / female), 〜n darou (more direct conjecture, batch3b), 〜darou ka (formal 'I wonder'). 〜kashira is the feminine wonder marker — using it characterises the speaker as female (especially older or refined). In modern young female speech, 〜kana has largely replaced it.

• ame ga furu kashira (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るかしら) — "I wonder if it'll rain"
• kuru kashira (<ruby>来<rt>く</rt></ruby>るかしら) — "I wonder if they'll come"
• dare kashira (<ruby>誰<rt>だれ</rt></ruby>かしら) — "I wonder who"
• naze kashira (なぜかしら) — "I wonder why"
• ii kashira (いいかしら) — "I wonder if it's okay"
• boku no koto wo oboeteru kashira (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>覚<rt>おぼ</rt></ruby>えてるかしら) — "I wonder if (you) remember me"
• mata aeru kashira (また<ruby>会<rt>あ</rt></ruby>えるかしら) — "I wonder if we'll meet again"
• shitte iru kashira (<ruby>知<rt>し</rt></ruby>っているかしら) — "I wonder if (they) know"
• haru ga konai kashira (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>こ</rt></ruby>ないかしら) — "I hope spring comes"
• tetsudatte kureru kashira (<ruby>手伝<rt>てつだ</rt></ruby>ってくれるかしら) — "I wonder if (you'd) help"
• yume kashira (<ruby>夢<rt>ゆめ</rt></ruby>かしら) — "I wonder if it's a dream"
• ano hito kashira (あの<ruby>人<rt>ひと</rt></ruby>かしら) — "I wonder if it's that person"
• kawaranai kashira (<ruby>変<rt>か</rt></ruby>わらないかしら) — "I wonder if (it'll) stay the same"
• sayonara kashira (さよならかしら) — "I wonder if it's goodbye"
• boku ni dekiru kashira (<ruby>僕<rt>ぼく</rt></ruby>にできるかしら) — "I wonder if I can do it"

${MARKER}`,

  "805d6df1": `〜ga mama ni (〜がままに) attaches to a plain-form verb (often non-volitional or passive). Means 'as one pleases / freely / left to itself'. omou ga mama ni (<ruby>思<rt>おも</rt></ruby>うがままに) 'as one wishes / as the heart pleases'. The 〜ga marks the subject of the action; mama (まま, 'state / as is', batch2) is preserved as a noun-like marker; ni (に) makes it adverbial.

Highly literary / formal — common in songs, prose, and elevated speech. Carries connotations of unrestrained naturalness or destiny: kaze no fuku ga mama ni (<ruby>風<rt>かぜ</rt></ruby>の<ruby>吹<rt>ふ</rt></ruby>くがままに) 'as the wind blows / wherever the wind takes us'. Often used to express surrender to natural forces or one's own desires.

Compare with batch2's 〜mama (state-preserving 'as is'), 〜jiyuu ni (freely — neutral adverb), and 〜you ni (manner / purpose, batch3a / batch2). 〜ga mama ni is the elevated 'as it wills' marker — in lyrics, evokes flow, destiny, or the surrender of agency. Pairs well with verbs of natural motion (kaze ga fuku, mizu ga nagareru).

• omou ga mama ni (<ruby>思<rt>おも</rt></ruby>うがままに) — 'as one wishes'
• kaze no fuku ga mama ni (<ruby>風<rt>かぜ</rt></ruby>の<ruby>吹<rt>ふ</rt></ruby>くがままに) — 'as the wind blows'
• kokoro no omomuku ga mama ni (<ruby>心<rt>こころ</rt></ruby>の<ruby>赴<rt>おもむ</rt></ruby>くがままに) — 'as the heart leads'
• unmei no mama ni (<ruby>運命<rt>うんめい</rt></ruby>のままに) — 'as fate dictates'
• nagareru mama ni (<ruby>流<rt>なが</rt></ruby>れるままに) — 'as it flows / drifting'
• shitagau ga mama ni (<ruby>従<rt>したが</rt></ruby>うがままに) — 'as one obeys / submissively'
• jiyuu ga mama ni (<ruby>自由<rt>じゆう</rt></ruby>がままに) — 'freely'
• kanjiru ga mama ni (<ruby>感<rt>かん</rt></ruby>じるがままに) — 'as one feels'
• yume miru ga mama ni (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>るがままに) — 'as one dreams'
• ai shi-tsuzukeru mama ni (<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>けるままに) — 'continuing to love (freely)'
• arugamama ni (あるがままに) — 'just as it is'
• kotoba no nagareru ga mama ni (<ruby>言葉<rt>ことば</rt></ruby>の<ruby>流<rt>なが</rt></ruby>れるがままに) — 'as the words flow'
• namida no koboreru ga mama ni (<ruby>涙<rt>なみだ</rt></ruby>のこぼれるがままに) — 'as the tears fall'
• kokoro no naku ga mama ni (<ruby>心<rt>こころ</rt></ruby>の<ruby>泣<rt>な</rt></ruby>くがままに) — 'as the heart cries'
• jiyuu naru tamashii no omou ga mama ni (<ruby>自由<rt>じゆう</rt></ruby>なる<ruby>魂<rt>たましい</rt></ruby>の<ruby>思<rt>おも</rt></ruby>うがままに) — 'as the free soul wishes'

${MARKER}`,

  "92c0b989": `〜koto ga dekiru (〜ことができる) is the analytic potential — alternative to the morphological potential form (kanoukei, batch4a). Attach to V-dictionary form + koto + ga dekiru. taberu koto ga dekiru (<ruby>食<rt>た</rt></ruby>べることができる) 'be able to eat'. The structure literally reads 'the act of eating is possible'.

More formal and analytical than the synthetic potential form (taberareru). Often preferred in writing, polite speech, and contexts where the action is a discrete capability rather than a concrete instance: nihongo wo hanasu koto ga dekiru ('be able to speak Japanese') vs. nihongo ga hanaseru (same meaning, more conversational).

Conjugates as a regular ichidan-like verb: 〜koto ga dekita (was able), 〜koto ga deki nai (cannot), 〜koto ga dekire ba (if able). The negative form is widely used in lyrics for impossibility expressions: tsutaeru koto ga deki nai (<ruby>伝<rt>つた</rt></ruby>えることができない) "cannot convey". Compare with synthetic potential (batch4a — concise, conversational), 〜eru / 〜rareru (same).

• taberu koto ga dekiru (<ruby>食<rt>た</rt></ruby>べることができる) — 'able to eat'
• yomu koto ga dekiru (<ruby>読<rt>よ</rt></ruby>むことができる) — 'able to read'
• hashiru koto ga dekiru (<ruby>走<rt>はし</rt></ruby>ることができる) — 'able to run'
• tsutaeru koto ga dekiru (<ruby>伝<rt>つた</rt></ruby>えることができる) — 'able to convey'
• mamoreru koto ga dekiru (<ruby>守<rt>まも</rt></ruby>れることができる) — 'able to protect'
• ai suru koto ga dekiru (<ruby>愛<rt>あい</rt></ruby>することができる) — 'able to love'
• ikiru koto ga dekiru (<ruby>生<rt>い</rt></ruby>きることができる) — 'able to live'
• kotaeru koto ga dekita (<ruby>答<rt>こた</rt></ruby>えることができた) — 'was able to answer'
• tsutaeru koto ga deki-nai (<ruby>伝<rt>つた</rt></ruby>えることができない) — 'cannot convey'
• wasureru koto ga deki-nai (<ruby>忘<rt>わす</rt></ruby>れることができない) — 'cannot forget'
• mata aeru koto ga dekire-ba (また<ruby>会<rt>あ</rt></ruby>えることができれば) — 'if we could meet again'
• shinjiru koto ga dekiru (<ruby>信<rt>しん</rt></ruby>じることができる) — 'able to believe'
• hanareru koto ga dekinai (<ruby>離<rt>はな</rt></ruby>れることができない) — 'cannot leave / part'
• kanaeru koto ga dekiru (<ruby>叶<rt>かな</rt></ruby>えることができる) — 'able to make come true'
• boku ni dekiru koto ga aru (<ruby>僕<rt>ぼく</rt></ruby>にできることがある) — 'there is something I can do'

${MARKER}`,

  "7c4e4800": `〜janai ka (〜じゃないか) attaches to plain-form sentences. Combines the negative copula 〜janai with the question particle 〜ka. Means "isn't it? / X, right? / how about X?". Used both for confirmation-seeking ('X, right?') and for offering / suggesting ('how about X?'). ii janai ka (いいじゃないか) "isn't it fine?".

Two main flavours: (a) Confirmation — softer 'isn't it?' than direct asking, often inviting agreement. wakatta janai ka (<ruby>分<rt>わ</rt></ruby>かったじゃないか) "you understood, right?". (b) Suggestion / invitation — 'why not X / how about X' — yatte miyou janai ka (やってみようじゃないか) "let's try, why not". Stereotypically male in modern speech but used by all genders in casual contexts.

Polite form: 〜janai desu ka (〜じゃないですか). Casual contractions: 〜jan (〜じゃん, very casual), 〜janee ka (〜じゃねえか, rough male). Compare with 〜darou (probably / right?, batch3a), 〜yo ne (gentle agreement-seeking), 〜deshou (polite seeking confirmation). 〜janai ka is the warm 'isn't it?' — slightly softer than direct interrogation, often friendly.

• ii janai ka (いいじゃないか) — "isn't it fine?"
• wakatta janai ka (<ruby>分<rt>わ</rt></ruby>かったじゃないか) — "you understood, right?"
• kuru janai ka (<ruby>来<rt>く</rt></ruby>るじゃないか) — "they're coming, aren't they?"
• boku no koto janai ka (<ruby>僕<rt>ぼく</rt></ruby>のことじゃないか) — "isn't it about me?"
• kawatta janai ka (<ruby>変<rt>か</rt></ruby>わったじゃないか) — "you've changed, haven't you?"
• yatte miyou janai ka (やってみようじゃないか) — "let's try, why not"
• issho ni ikou janai ka (<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>行<rt>い</rt></ruby>こうじゃないか) — "let's go together, how about"
• tsuyoku natta janai ka (<ruby>強<rt>つよ</rt></ruby>くなったじゃないか) — "you've gotten stronger, haven't you"
• kanji ga muzukashii janai ka (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>難<rt>むずか</rt></ruby>しいじゃないか) — "kanji is hard, isn't it"
• shinjite mireba ii janai ka (<ruby>信<rt>しん</rt></ruby>じてみればいいじゃないか) — "why not just believe?"
• ai janai ka (<ruby>愛<rt>あい</rt></ruby>じゃないか) — "isn't this love?"
• mata aeru janai ka (また<ruby>会<rt>あ</rt></ruby>えるじゃないか) — "we can meet again, can't we?"
• yume janai ka (<ruby>夢<rt>ゆめ</rt></ruby>じゃないか) — "isn't it a dream?"
• ki ni shinakute mo ii janai ka (<ruby>気<rt>き</rt></ruby>にしなくてもいいじゃないか) — "no need to worry, right?"
• boku ga iru janai ka (<ruby>僕<rt>ぼく</rt></ruby>がいるじゃないか) — "I'm here, aren't I?"

${MARKER}`,

  "29df37ff": `〜sura (〜すら) attaches to nouns to mean 'even (X) / not even X'. Formal / written / emphatic 'even', stronger than 〜mo (も) and 〜sae (さえ, batch2). The implication is 'X is unexpected at this level / X is the most extreme case'. kodomo sura wakaru (<ruby>子供<rt>こども</rt></ruby>すら<ruby>分<rt>わ</rt></ruby>かる) 'even a child gets it'.

Distinct from 〜sae (batch2) by register: 〜sura is more literary / formal / dramatic; 〜sae is everyday / colloquial. Both express 'even', but 〜sura is reserved for stronger emphasis or written contexts. Often paired with negation for 'not even': namida sura denai (<ruby>涙<rt>なみだ</rt></ruby>すら<ruby>出<rt>で</rt></ruby>ない) 'not even tears come'.

Compare with 〜sae (everyday 'even'), 〜made (even / going so far as, batch3a), 〜datte (casual 'even', batch2). 〜sura is the high-register 'even' marker — perfect for elevated lyrics, formal claims, and any context wanting weighty emphasis. In song lyrics it's used for dramatic emphasis: kotoba sura mou ie nai (<ruby>言葉<rt>ことば</rt></ruby>すらもう<ruby>言<rt>い</rt></ruby>えない) 'I can't even speak words anymore'.

• kodomo sura wakaru (<ruby>子供<rt>こども</rt></ruby>すら<ruby>分<rt>わ</rt></ruby>かる) — 'even a child gets it'
• boku sura shiranai (<ruby>僕<rt>ぼく</rt></ruby>すら<ruby>知<rt>し</rt></ruby>らない) — "even I don't know"
• kotoba sura denai (<ruby>言葉<rt>ことば</rt></ruby>すら<ruby>出<rt>で</rt></ruby>ない) — "even words don't come"
• namida sura denai (<ruby>涙<rt>なみだ</rt></ruby>すら<ruby>出<rt>で</rt></ruby>ない) — "not even tears come"
• kao sura mire-nai (<ruby>顔<rt>かお</rt></ruby>すら<ruby>見<rt>み</rt></ruby>れない) — "can't even see (their) face"
• namae sura wasureta (<ruby>名前<rt>なまえ</rt></ruby>すら<ruby>忘<rt>わす</rt></ruby>れた) — "I've forgotten even (their) name"
• yume sura mire-nai (<ruby>夢<rt>ゆめ</rt></ruby>すら<ruby>見<rt>み</rt></ruby>れない) — "can't even dream"
• ichi-byou sura mu-da ni shi-nai (<ruby>一秒<rt>いちびょう</rt></ruby>すら<ruby>無<rt>む</rt></ruby><ruby>駄<rt>だ</rt></ruby>にしない) — "won't waste even a second"
• kanaru sura yurusare-nai (<ruby>叶<rt>かな</rt></ruby>うすら<ruby>許<rt>ゆる</rt></ruby>されない) — "not even allowed to come true"
• ai sura wakaranai (<ruby>愛<rt>あい</rt></ruby>すら<ruby>分<rt>わ</rt></ruby>からない) — "I don't even understand love"
• ima sura tooku ni kanjiru (<ruby>今<rt>いま</rt></ruby>すら<ruby>遠<rt>とお</rt></ruby>くに<ruby>感<rt>かん</rt></ruby>じる) — "even now feels far away"
• kotoba sura mou ie nai (<ruby>言葉<rt>ことば</rt></ruby>すらもう<ruby>言<rt>い</rt></ruby>えない) — "I can't even speak words anymore"
• boku no namae sura kikoenai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>すら<ruby>聞<rt>き</rt></ruby>こえない) — "can't even hear my name"
• te wo nigiru koto sura yurusarenai (<ruby>手<rt>て</rt></ruby>を<ruby>握<rt>にぎ</rt></ruby>ることすら<ruby>許<rt>ゆる</rt></ruby>されない) — "not even allowed to hold (your) hand"
• kanji sura kakenai (<ruby>漢字<rt>かんじ</rt></ruby>すら<ruby>書<rt>か</rt></ruby>けない) — "can't even write kanji"

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
    if (!fullId) { console.warn(`rule ${partialId} not found; skipping`); continue; }
    if (!newName) { console.error(`no NAME_REWRITES for ${partialId}`); continue; }

    const before = await db.execute(sql.raw(`SELECT name, jlpt_reference FROM grammar_rules WHERE id = '${fullId}'::uuid`));
    const beforeRows = (before.rows ?? before) as Array<{ name: string; jlpt_reference: string }>;
    if (beforeRows.length === 0) continue;
    const newJlpt = beforeRows[0].jlpt_reference;

    await db.execute(sql`UPDATE grammar_rules SET explanation = ${JSON.stringify({ en })}::jsonb, name = ${newName}, updated_at = NOW() WHERE id = ${fullId}::uuid`);
    oldToNew[partialId] = { oldName: beforeRows[0].name, newName, oldJlpt: beforeRows[0].jlpt_reference, newJlpt, fullId };
    rulesUpdated++;
  }
  console.log(`updated ${rulesUpdated}/${Object.keys(REWRITES).length} grammar_rules`);

  const fullIds = Object.values(oldToNew).map((o) => o.fullId);
  if (fullIds.length === 0) { console.log("no IDs to propagate"); return; }
  const idList = fullIds.map((id) => `'${id}'::uuid`).join(",");
  const versionRes = await db.execute(sql.raw(`
    SELECT sv.id, sv.lesson FROM song_versions sv
    JOIN song_version_grammar_rules svgr ON svgr.song_version_id = sv.id
    WHERE svgr.grammar_rule_id IN (${idList})`));
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
