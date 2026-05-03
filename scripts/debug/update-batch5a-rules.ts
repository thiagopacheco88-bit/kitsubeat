/**
 * Batch 5a — 20 v2 grammar rule explanations.
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "1db7fd63": "〜koto sae mo (〜ことさえも) — even the fact / act of",
  "a9ccd668": "〜koto de (〜ことで) — by means of / through (the act of)",
  "c6285b3d": "〜koto naku (〜ことなく) — without doing (formal continuative)",
  "e40c56be": "〜koto wa nai (〜ことはない) — there's never / no need to",
  "9d3ce380": "〜koto mo naku (〜こともなく) — without even (doing)",
  "d0a76e99": "〜sasete (〜させて) — let me do",
  "2e529c00": "〜sou de 〜nai (〜そうで〜ない) — looks like, but isn't",
  "8189cb80": "〜sou ni (〜そうに) — looking / seemingly",
  "bcc415b0": "〜sou ni naru (〜そうになる) — about to / on the verge of",
  "5e7b515a": "〜taku naru (〜たくなる) — come to want to",
  "ba200d93": "〜tara ii noni (〜たらいいのに) — if only",
  "1f3ff131": "〜tari suru (〜たりする) — among other things / sometimes",
  "e6a4964a": "〜dake de (〜だけで) — just by / merely",
  "11db77b1": "〜dake no (〜だけの) — only X (modifying)",
  "38ded77c": "〜dake wa (〜だけは) — at least X / above all X",
  "913e4c04": "〜cha ikenai (〜ちゃいけない) — must not (casual)",
  "9e4a3683": "〜tto (〜っと) — onomatopoeic / quick-action emphasis",
  "16b82a70": "〜te ikeru (〜ていける) — can keep doing / can go on",
  "7b4d8732": "〜te mitai (〜てみたい) — want to try doing",
  "d3f23827": "〜te mo ii (〜てもいい) — it's okay to / may",
};

const REWRITES: Record<string, string> = {
  "1db7fd63": `〜koto sae mo (〜ことさえも) combines koto (the nominaliser 'the act / fact of'), sae (even — emphatic, batch2), and mo (also). Means 'even the act of X / even the fact that X'. Often appears in negative constructions to express that even the most basic action is impossible. tatsu koto sae mo deki nai (<ruby>立<rt>た</rt></ruby>つことさえもできない) "can't even stand".

The triple stack 〜koto + sae + mo intensifies the 'even' marker beyond simple 〜sae or 〜mo. The implicit message: X is the minimum / most basic, and even X is unattainable / unexpected. Highly emotional register — used in lyrics for despair, breakthrough, or emphatic impossibility.

Compare with bare 〜sae mo (without koto — for nouns directly), 〜sura (formal 'even', batch4b), 〜datte (casual 'even', batch2). 〜koto sae mo is the construction for 'even the act of' — when you need to nominalise an action AND emphasise its bareness.

• tatsu koto sae mo deki nai (<ruby>立<rt>た</rt></ruby>つことさえもできない) — "can't even stand"
• warau koto sae mo wasureta (<ruby>笑<rt>わら</rt></ruby>うことさえも<ruby>忘<rt>わす</rt></ruby>れた) — "I've forgotten even how to laugh"
• naku koto sae mo yurusare nai (<ruby>泣<rt>な</rt></ruby>くことさえも<ruby>許<rt>ゆる</rt></ruby>されない) — "not even allowed to cry"
• ikiru koto sae mo (<ruby>生<rt>い</rt></ruby>きることさえも) — 'even living / even the act of being alive'
• miru koto sae mo deki nai (<ruby>見<rt>み</rt></ruby>ることさえもできない) — "can't even look"
• ai suru koto sae mo (<ruby>愛<rt>あい</rt></ruby>することさえも) — 'even loving'
• yume miru koto sae mo wasureta (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>ることさえも<ruby>忘<rt>わす</rt></ruby>れた) — "I've forgotten even how to dream"
• kanjiru koto sae mo (<ruby>感<rt>かん</rt></ruby>じることさえも) — 'even feeling'
• shinjiru koto sae mo (<ruby>信<rt>しん</rt></ruby>じることさえも) — 'even believing'
• kotaeru koto sae mo deki nai (<ruby>答<rt>こた</rt></ruby>えることさえもできない) — "can't even answer"
• namida wo nagasu koto sae mo (<ruby>涙<rt>なみだ</rt></ruby>を<ruby>流<rt>なが</rt></ruby>すことさえも) — 'even shedding tears'
• boku no namae wo yobu koto sae mo (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>を<ruby>呼<rt>よ</rt></ruby>ぶことさえも) — 'even calling my name'
• kotoba ni suru koto sae mo (<ruby>言葉<rt>ことば</rt></ruby>にすることさえも) — 'even putting it into words'
• tsutaeru koto sae mo deki nakatta (<ruby>伝<rt>つた</rt></ruby>えることさえもできなかった) — "couldn't even convey it"
• mukaeau koto sae mo (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うことさえも) — 'even facing each other'

${MARKER}`,

  "a9ccd668": `〜koto de (〜ことで) attaches to a V-dictionary form + koto + で (de — means/instrument, batch3b). Means 'by means of (doing) X / through (the act of) X'. Treats an action as a method or cause for the next clause. yameru koto de raku ni naru (やめることで<ruby>楽<rt>らく</rt></ruby>になる) "by quitting, things get easier".

The structure nominalises an action with koto, then uses de to mark it as the means by which something else happens. Distinct from 〜node (because — softer reason) and 〜tame ni (in order to — purpose). 〜koto de specifically frames an ACTION as the INSTRUMENT producing a result.

Common in formal writing, business, advice, and reflective lyrics. Compare with 〜ni yotte (by means of — even more formal), 〜suru koto ga (the act of — just nominalisation, no instrument). 〜koto de tells the listener exactly which action made the next thing happen.

• yameru koto de raku ni naru (やめることで<ruby>楽<rt>らく</rt></ruby>になる) — 'by quitting, it gets easier'
• warau koto de tsuyoku naru (<ruby>笑<rt>わら</rt></ruby>うことで<ruby>強<rt>つよ</rt></ruby>くなる) — 'by laughing, I become strong'
• shinjiru koto de mae ni susumeru (<ruby>信<rt>しん</rt></ruby>じることで<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>める) — 'by believing, I can move forward'
• tsutaeru koto de wakari-au (<ruby>伝<rt>つた</rt></ruby>えることで<ruby>分<rt>わ</rt></ruby>かり<ruby>合<rt>あ</rt></ruby>う) — 'by communicating, we understand each other'
• naku koto de raku ni naru (<ruby>泣<rt>な</rt></ruby>くことで<ruby>楽<rt>らく</rt></ruby>になる) — 'by crying, I feel relief'
• mamoru koto de ai wo shiru (<ruby>守<rt>まも</rt></ruby>ることで<ruby>愛<rt>あい</rt></ruby>を<ruby>知<rt>し</rt></ruby>る) — 'by protecting, I learn love'
• ushinau koto de oboeru (<ruby>失<rt>うしな</rt></ruby>うことで<ruby>覚<rt>おぼ</rt></ruby>える) — 'by losing, I learn'
• kotoba ni suru koto de hare-ru (<ruby>言葉<rt>ことば</rt></ruby>にすることで<ruby>晴<rt>は</rt></ruby>れる) — 'by putting it in words, the gloom lifts'
• mukaeau koto de tsuyoku naru (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うことで<ruby>強<rt>つよ</rt></ruby>くなる) — 'by facing it, I grow strong'
• yume wo mochi-tsuzukeru koto de (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>持<rt>も</rt></ruby>ち<ruby>続<rt>つづ</rt></ruby>けることで) — 'by holding onto the dream'
• kanji wo kakitsuzukeru koto de oboeru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>書<rt>か</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>けることで<ruby>覚<rt>おぼ</rt></ruby>える) — 'by writing kanji repeatedly, I memorise them'
• shitsumon suru koto de manabu (<ruby>質問<rt>しつもん</rt></ruby>することで<ruby>学<rt>まな</rt></ruby>ぶ) — 'by asking, I learn'
• ai shi-au koto de zenbu kawatta (<ruby>愛<rt>あい</rt></ruby>し<ruby>合<rt>あ</rt></ruby>うことで<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>変<rt>か</rt></ruby>わった) — 'by loving each other, everything changed'
• tatakau koto de ikiru (<ruby>戦<rt>たたか</rt></ruby>うことで<ruby>生<rt>い</rt></ruby>きる) — 'by fighting, I live'
• yurusu koto de raku ni naru (<ruby>許<rt>ゆる</rt></ruby>すことで<ruby>楽<rt>らく</rt></ruby>になる) — 'by forgiving, things get easier'

${MARKER}`,

  "c6285b3d": `〜koto naku (〜ことなく) attaches to a V-dictionary form + koto + naku ('without — adverbial form of nai'). Formal / written equivalent of 〜nai de (without doing, batch4b). yasumu koto naku hashiri-tsuzukeru (<ruby>休<rt>やす</rt></ruby>むことなく<ruby>走<rt>はし</rt></ruby>り<ruby>続<rt>つづ</rt></ruby>ける) "keep running without resting".

Used heavily in lyrics, formal prose, and any context wanting elevated register for 'without doing X'. Compare with 〜nai de (everyday spoken), 〜zu (literary continuative, batch4a), 〜zu ni (with explicit ni, batch1). 〜koto naku is the nominalised, formal variant — connects two clauses with a sense of unbroken action or sustained absence.

The structure also accepts emotional / abstract nouns: kanashimu koto naku (<ruby>悲<rt>かな</rt></ruby>しむことなく) 'without grieving'. In poetry it conveys timelessness, persistence, devotion. Often paired with 〜tsuzukeru (keep doing) for emphasis on uninterrupted action.

• yasumu koto naku (<ruby>休<rt>やす</rt></ruby>むことなく) — 'without resting'
• kawaru koto naku (<ruby>変<rt>か</rt></ruby>わることなく) — 'without changing'
• tomaru koto naku (<ruby>止<rt>と</rt></ruby>まることなく) — 'without stopping'
• taeru koto naku (<ruby>絶<rt>た</rt></ruby>えることなく) — 'unceasingly'
• yameru koto naku (やめることなく) — 'without quitting'
• kanashimu koto naku (<ruby>悲<rt>かな</rt></ruby>しむことなく) — 'without grieving'
• furikaeru koto naku (<ruby>振<rt>ふ</rt></ruby>り<ruby>返<rt>かえ</rt></ruby>ることなく) — 'without looking back'
• furueru koto naku (<ruby>震<rt>ふる</rt></ruby>えることなく) — 'without trembling'
• mayou koto naku (<ruby>迷<rt>まよ</rt></ruby>うことなく) — 'without hesitating'
• warau koto naku (<ruby>笑<rt>わら</rt></ruby>うことなく) — 'without smiling'
• sayonara wo iu koto naku (さよならを<ruby>言<rt>い</rt></ruby>うことなく) — 'without saying goodbye'
• namida wo misenai koto naku (<ruby>涙<rt>なみだ</rt></ruby>を<ruby>見<rt>み</rt></ruby>せないことなく) — 'without hiding the tears'
• shinjiru koto wo wasure-naku (<ruby>信<rt>しん</rt></ruby>じることを<ruby>忘<rt>わす</rt></ruby>れなく) — 'without forgetting to believe'
• ai-suru koto naku ikite (<ruby>愛<rt>あい</rt></ruby>することなく<ruby>生<rt>い</rt></ruby>きて) — 'living without loving'
• kotoba wo kawasu koto naku (<ruby>言葉<rt>ことば</rt></ruby>を<ruby>交<rt>か</rt></ruby>わすことなく) — 'without exchanging words'
• ushinau koto naku tsuzuku (<ruby>失<rt>うしな</rt></ruby>うことなく<ruby>続<rt>つづ</rt></ruby>く) — 'continues without being lost'

${MARKER}`,

  "e40c56be": `〜koto wa nai (〜ことはない) attaches to a V-dictionary form. Two main readings: (a) Negation of necessity — 'there's no need to / no need for X to happen' — shinpai suru koto wa nai (<ruby>心配<rt>しんぱい</rt></ruby>することはない) 'no need to worry'. (b) Negation of universality — 'X never / won't happen' — wasureru koto wa nai (<ruby>忘<rt>わす</rt></ruby>れることはない) 'I will never forget'.

Distinguished from batch4a's 〜koto nai by the explicit は particle, which adds emphasis or contrast: 'X (specifically) won't / shouldn't'. The 〜wa contrasts the action with implicit alternatives. The 'never' reading is a strong promise / declaration: kowareru koto wa nai (<ruby>壊<rt>こわ</rt></ruby>れることはない) 'will never break'.

Compare with 〜hazu ga nai (no logical possibility, batch3b), 〜wake ga nai (no way emotionally, batch3b), 〜nakute mo ii (don't have to, batch3b). 〜koto wa nai is gentler than 〜wake ga nai — softer denial, often reassuring. Common in songs as oath-like declarations and gentle reassurances.

• shinpai suru koto wa nai (<ruby>心配<rt>しんぱい</rt></ruby>することはない) — 'no need to worry'
• wasureru koto wa nai (<ruby>忘<rt>わす</rt></ruby>れることはない) — "I'll never forget"
• kowareru koto wa nai (<ruby>壊<rt>こわ</rt></ruby>れることはない) — "won't break"
• nakunaru koto wa nai (<ruby>無<rt>な</rt></ruby>くなることはない) — "won't disappear"
• ushinau koto wa nai (<ruby>失<rt>うしな</rt></ruby>うことはない) — "won't be lost"
• ayamaru koto wa nai (<ruby>謝<rt>あやま</rt></ruby>ることはない) — 'no need to apologise'
• mata aenai koto wa nai (また<ruby>会<rt>あ</rt></ruby>えないことはない) — "we will meet again"
• kawaranai koto wa nai (<ruby>変<rt>か</rt></ruby>わらないことはない) — "won't stay unchanged" (dual reading)
• naku koto wa nai (<ruby>泣<rt>な</rt></ruby>くことはない) — 'no need to cry'
• akiramerukoto wa nai (<ruby>諦<rt>あきら</rt></ruby>めることはない) — 'no need to give up'
• kimi wo wasureru koto wa nai (<ruby>君<rt>きみ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れることはない) — "I'll never forget you"
• boku ga inai koto wa nai (<ruby>僕<rt>ぼく</rt></ruby>がいないことはない) — "I won't not be here"
• warau koto wa nai (<ruby>笑<rt>わら</rt></ruby>うことはない) — 'no need to smile' or "won't smile"
• boku no kimochi ga kawaru koto wa nai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>気持<rt>きも</rt></ruby>ちが<ruby>変<rt>か</rt></ruby>わることはない) — "my feelings will never change"
• yume ga owaru koto wa nai (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>終<rt>お</rt></ruby>わることはない) — "the dream will never end"

${MARKER}`,

  "9d3ce380": `〜koto mo naku (〜こともなく) attaches to a V-dictionary form + koto + mo + naku. Means 'without even (doing X) / not even doing X'. The 〜mo (も, even) inserted between koto and naku adds emphasis — even the most basic / expected action wasn't done. nani mo iu koto mo naku (<ruby>何<rt>なに</rt></ruby>も<ruby>言<rt>い</rt></ruby>うこともなく) 'without saying anything at all'.

Stronger than 〜koto naku (batch5a) because of the inserted 〜mo. Implies 'not even the gesture / minimum / expected'. Common in lyrics about silent endings: sayonara wo iu koto mo naku kaette itta (さよならを<ruby>言<rt>い</rt></ruby>うこともなく<ruby>帰<rt>かえ</rt></ruby>っていった) 'left without even saying goodbye'.

Compare with 〜koto naku (formal 'without doing'), 〜zu ni (literary 'without' — batch1), 〜nai de (gentle 'without / please don't' — batch4b). 〜koto mo naku is the 'without even bothering to' marker — emphasises the absence of expected action with emotional weight.

• nani mo iu koto mo naku (<ruby>何<rt>なに</rt></ruby>も<ruby>言<rt>い</rt></ruby>うこともなく) — 'without saying anything'
• sayonara wo iu koto mo naku (さよならを<ruby>言<rt>い</rt></ruby>うこともなく) — 'without even saying goodbye'
• furimuku koto mo naku (<ruby>振<rt>ふ</rt></ruby>り<ruby>向<rt>む</rt></ruby>くこともなく) — 'without even looking back'
• warau koto mo naku (<ruby>笑<rt>わら</rt></ruby>うこともなく) — 'without even smiling'
• te wo furu koto mo naku (<ruby>手<rt>て</rt></ruby>を<ruby>振<rt>ふ</rt></ruby>ることもなく) — 'without even waving'
• naku koto mo naku (<ruby>泣<rt>な</rt></ruby>くこともなく) — 'without even crying'
• kotaeru koto mo naku (<ruby>答<rt>こた</rt></ruby>えることもなく) — 'without even answering'
• kao wo miru koto mo naku (<ruby>顔<rt>かお</rt></ruby>を<ruby>見<rt>み</rt></ruby>ることもなく) — 'without even looking at the face'
• kikoeru koto mo naku (<ruby>聞<rt>き</rt></ruby>こえることもなく) — 'without even being heard'
• ki ni shi-naku tomo (<ruby>気<rt>き</rt></ruby>にしなくとも) — 'without even minding'
• ayamaru koto mo naku (<ruby>謝<rt>あやま</rt></ruby>ることもなく) — 'without even apologising'
• tachi-domaru koto mo naku (<ruby>立<rt>た</rt></ruby>ち<ruby>止<rt>ど</rt></ruby>まることもなく) — 'without even pausing'
• ai wo tsutaeru koto mo naku (<ruby>愛<rt>あい</rt></ruby>を<ruby>伝<rt>つた</rt></ruby>えることもなく) — 'without even conveying love'
• kanashimu koto mo naku (<ruby>悲<rt>かな</rt></ruby>しむこともなく) — 'without even grieving'
• furikaeru koto mo naku ki-ezu (<ruby>振<rt>ふ</rt></ruby>り<ruby>返<rt>かえ</rt></ruby>ることもなく<ruby>消<rt>き</rt></ruby>えず) — 'without even looking back, undisappearing'

${MARKER}`,

  "d0a76e99": `〜sasete (〜させて) is the te-form of the causative (〜seru / 〜saseru, batch4a). Often used as a sentence-final or near-final form to request permission — 'let me X / allow me to X'. Distinct from but related to batch3a's "Causative + kure" — that's the explicit polite request frame; 〜sasete alone is the dropped-くれ casual / emotional form. aisasete (<ruby>愛<rt>あい</rt></ruby>させて) "let me love (you)".

Functions: (a) Permission request — 'let me X' — yasumasete (<ruby>休<rt>やす</rt></ruby>ませて) "let me rest". (b) As te-form connector — 'making X do, then...' — kodomo o oki sasete shokuji wo tsukutta (<ruby>子供<rt>こども</rt></ruby>を<ruby>起<rt>お</rt></ruby>こさせて<ruby>食事<rt>しょくじ</rt></ruby>を<ruby>作<rt>つく</rt></ruby>った) 'made the child wake up, then made meal'.

The permission-request use is the song staple — direct, emotional, often pleading. Polite extension: 〜sasete kudasai (please let me). Compare with 〜tai (just want to — internal), Causative + kure (explicit framing), 〜te ageru (do FOR someone — batch3b, opposite direction). 〜sasete is the bare let-me-act marker — request framed as a favour the listener grants.

• aisasete (<ruby>愛<rt>あい</rt></ruby>させて) — 'let me love'
• ikasete (<ruby>行<rt>い</rt></ruby>かせて) — 'let me go'
• tabesasete (<ruby>食<rt>た</rt></ruby>べさせて) — 'let me eat'
• yasumasete (<ruby>休<rt>やす</rt></ruby>ませて) — 'let me rest'
• matase-te (<ruby>待<rt>ま</rt></ruby>たせて) — 'have me wait / sorry I made you wait'
• warawa-sete (<ruby>笑<rt>わら</rt></ruby>わせて) — 'let me laugh' or 'make me laugh'
• naka-sete (<ruby>泣<rt>な</rt></ruby>かせて) — 'let me cry'
• shinjisasete (<ruby>信<rt>しん</rt></ruby>じさせて) — 'let me believe'
• mamora-sete (<ruby>守<rt>まも</rt></ruby>らせて) — 'let me protect'
• ayama-rasete kudasai (<ruby>謝<rt>あやま</rt></ruby>らせてください) — 'please let me apologise'
• kimi to issho ni i-sasete (<ruby>君<rt>きみ</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>にいさせて) — 'let me stay with you'
• tsutaesasete (<ruby>伝<rt>つた</rt></ruby>えさせて) — 'let me convey (it)'
• nemurasete (<ruby>眠<rt>ねむ</rt></ruby>らせて) — 'let me sleep'
• yume wo mi-sasete (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>させて) — 'let me dream'
• boku no kimochi wo wakara-sete (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>気持<rt>きも</rt></ruby>ちを<ruby>分<rt>わ</rt></ruby>からせて) — "let me have you understand my feelings"

${MARKER}`,

  "2e529c00": `〜sou de 〜nai (〜そうで〜ない) is a paired construction. The same predicate appears once with visual 〜sou (looks like X) and once with 〜nai (negative). Means 'X looks (like X) but isn't X / appears X but actually not'. Highlights the gap between appearance and reality. taberareru sou de taberare-nai (<ruby>食<rt>た</rt></ruby>べられそうで<ruby>食<rt>た</rt></ruby>べられない) 'looks edible but isn't / can't quite eat it'.

Often used in song lyrics for ambivalence: arisou de nai (ありそうでない) 'looks like it could be there but isn't'. Captures the in-between nuance — almost X but not quite. Common with potentials, emotional adjectives, and abstract states.

Variant with 〜souna (visual + na): 〜souna 〜janai. Compare with 〜you de 〜janai (more formal 'looks like but isn't'), bare 〜sou (just visual seems-like, batch3b). 〜sou de 〜nai is the gap-marker — perfect for liminal feelings, near-misses, and the unattainable.

• taberareru sou de taberare-nai (<ruby>食<rt>た</rt></ruby>べられそうで<ruby>食<rt>た</rt></ruby>べられない) — 'looks edible but...'
• wakari-sou de wakaranai (<ruby>分<rt>わ</rt></ruby>かりそうで<ruby>分<rt>わ</rt></ruby>からない) — 'feels like I get it, but I don't'
• ari-sou de nai (ありそうでない) — 'seems possible but isn't'
• ie-sou de ie-nai (<ruby>言<rt>い</rt></ruby>えそうで<ruby>言<rt>い</rt></ruby>えない) — 'feels like I could say it, but can't'
• mie-sou de mienai (<ruby>見<rt>み</rt></ruby>えそうで<ruby>見<rt>み</rt></ruby>えない) — "looks like I'd see it, but I can't"
• naki-sou de naka-nai (<ruby>泣<rt>な</rt></ruby>きそうで<ruby>泣<rt>な</rt></ruby>かない) — 'looks about to cry but doesn't'
• kotaeru sou de kotaezu (<ruby>答<rt>こた</rt></ruby>えるそうで<ruby>答<rt>こた</rt></ruby>えず) — 'seems to answer, but doesn't'
• furi-sou de furanai (<ruby>降<rt>ふ</rt></ruby>りそうで<ruby>降<rt>ふ</rt></ruby>らない) — 'looks like rain but won't rain'
• taore-sou de taore-nai (<ruby>倒<rt>たお</rt></ruby>れそうで<ruby>倒<rt>たお</rt></ruby>れない) — 'looks about to fall, but won't'
• tsutawari-sou de tsutawaranai (<ruby>伝<rt>つた</rt></ruby>わりそうで<ruby>伝<rt>つた</rt></ruby>わらない) — 'feels like it's getting through, but isn't'
• kanai-sou de kanawa-nai (<ruby>叶<rt>かな</rt></ruby>いそうで<ruby>叶<rt>かな</rt></ruby>わない) — 'looks like it might come true, but won't'
• kowa-re-sou de koware-nai (<ruby>壊<rt>こわ</rt></ruby>れそうで<ruby>壊<rt>こわ</rt></ruby>れない) — 'feels about to break, but holds'
• hanare-sou de hanarenai (<ruby>離<rt>はな</rt></ruby>れそうで<ruby>離<rt>はな</rt></ruby>れない) — 'feels about to part, but doesn't'
• tomari-sou de tomara-nai (<ruby>止<rt>と</rt></ruby>まりそうで<ruby>止<rt>と</rt></ruby>まらない) — 'seems about to stop, but won't'
• hashiri-tsuzukerare-sou de tsuzukerare-nai (<ruby>走<rt>はし</rt></ruby>り<ruby>続<rt>つづ</rt></ruby>けられそうで<ruby>続<rt>つづ</rt></ruby>けられない) — 'feels like I can keep running, but can't'

${MARKER}`,

  "8189cb80": `〜sou ni (〜そうに) is the adverbial form of visual 〜sou (looks/seems like X, batch3b). Drop 〜i / 〜na, add 〜sou ni. Modifies a verb to mean 'in a manner that looks X / seemingly X-ly'. ureshi-sou ni waratta (<ruby>嬉<rt>うれ</rt></ruby>しそうに<ruby>笑<rt>わら</rt></ruby>った) 'smiled happily / smiled in a manner that looked happy'.

The 〜sou ni form lets the speaker describe HOW someone appears WHILE doing an action — visible-from-outside emotion or quality. Common with verbs of facial expression, body language, and visible behaviour. For na-adjectives: shizuka-sou ni (quietly, in a quiet-looking way).

Compare with 〜you ni (in the manner of, batch3a) — 〜sou ni specifically about VISIBLE appearance, 〜you ni broader. Compare with adverbial 〜ku (just neutral adverb form for i-adj). 〜sou ni is the marker for 'externally visible quality'.

• ureshi-sou ni waratta (<ruby>嬉<rt>うれ</rt></ruby>しそうに<ruby>笑<rt>わら</rt></ruby>った) — 'smiled happily'
• kanashi-sou ni naita (<ruby>悲<rt>かな</rt></ruby>しそうに<ruby>泣<rt>な</rt></ruby>いた) — 'cried sadly'
• tanoshi-sou ni asonda (<ruby>楽<rt>たの</rt></ruby>しそうに<ruby>遊<rt>あそ</rt></ruby>んだ) — 'played happily'
• shizuka-sou ni nemutta (<ruby>静<rt>しず</rt></ruby>かそうに<ruby>眠<rt>ねむ</rt></ruby>った) — 'slept quietly'
• tsukaresou ni mieru (<ruby>疲<rt>つか</rt></ruby>れそうに<ruby>見<rt>み</rt></ruby>える) — 'looks tired'
• samishi-sou ni hitori-bocchi (<ruby>寂<rt>さび</rt></ruby>しそうに<ruby>一人<rt>ひとり</rt></ruby>ぼっち) — 'lonely-looking and alone'
• yowa-sou ni furueru (<ruby>弱<rt>よわ</rt></ruby>そうに<ruby>震<rt>ふる</rt></ruby>える) — 'trembles weakly'
• tsuyo-sou ni mukatte iku (<ruby>強<rt>つよ</rt></ruby>そうに<ruby>向<rt>む</rt></ruby>かっていく) — 'goes forward boldly'
• mendou-sou ni kotaeta (<ruby>面倒<rt>めんどう</rt></ruby>そうに<ruby>答<rt>こた</rt></ruby>えた) — 'answered reluctantly'
• naki-sou ni hohoenda (<ruby>泣<rt>な</rt></ruby>きそうに<ruby>微笑<rt>ほほえ</rt></ruby>んだ) — 'smiled as if about to cry'
• satoshi-sou ni unazuita (<ruby>悟<rt>さと</rt></ruby>しそうに<ruby>頷<rt>うなず</rt></ruby>いた) — 'nodded as if having understood'
• taore-sou ni aruita (<ruby>倒<rt>たお</rt></ruby>れそうに<ruby>歩<rt>ある</rt></ruby>いた) — 'walked as if about to collapse'
• kowa-re-sou ni hikari (<ruby>壊<rt>こわ</rt></ruby>れそうに<ruby>光<rt>ひか</rt></ruby>り) — 'shines as if about to break'
• ureshi-sou ni ki-eta (<ruby>嬉<rt>うれ</rt></ruby>しそうに<ruby>消<rt>き</rt></ruby>えた) — 'disappeared happily'
• boku no soba kara hanare-sou ni mukatta (<ruby>僕<rt>ぼく</rt></ruby>のそばから<ruby>離<rt>はな</rt></ruby>れそうに<ruby>向<rt>む</rt></ruby>かった) — 'turned as if about to leave my side'

${MARKER}`,

  "bcc415b0": `〜sou ni naru (〜そうになる) attaches visual 〜sou (looks/seems, batch3b) + ni naru (become). Means 'about to X / on the verge of X'. The structure: appearance of X + becoming = the speaker is approaching the X-ed state. naki-sou ni naru (<ruby>泣<rt>な</rt></ruby>きそうになる) "I'm about to cry". Past form 〜sou ni natta means 'almost X-ed (but didn't)'.

Common in songs and emotional speech for moments of near-collapse, near-tears, near-anything. Distinct from 〜kakeru (on the verge — batch3b — also 'about to') by aspect: 〜sou ni naru emphasises an ONGOING approach to a state, often involuntary; 〜kakeru emphasises being CAUGHT at the threshold.

Compare with 〜sou da (just visual seems-like, batch3b — descriptive), 〜kakeru (batch3b — threshold), 〜you to suru (try to / about to, batch4a — volitional). 〜sou ni naru is the involuntary-onset marker — perfect for emotional surges that 'almost' overcome the speaker.

• naki-sou ni naru (<ruby>泣<rt>な</rt></ruby>きそうになる) — "about to cry"
• taore-sou ni naru (<ruby>倒<rt>たお</rt></ruby>れそうになる) — "about to collapse"
• shini-sou ni naru (<ruby>死<rt>し</rt></ruby>にそうになる) — "about to die" (often hyperbolic)
• kowarere-sou ni naru (<ruby>壊<rt>こわ</rt></ruby>れそうになる) — "about to break"
• warawasou ni naru (<ruby>笑<rt>わら</rt></ruby>いそうになる) — "about to laugh"
• taberareru sou ni naru (<ruby>食<rt>た</rt></ruby>べられそうになる) — "about to be eaten"
• boku no kokoro ga koware-sou ni naru (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>が<ruby>壊<rt>こわ</rt></ruby>れそうになる) — "my heart is about to break"
• taoreru sou ni natta (<ruby>倒<rt>たお</rt></ruby>れそうになった) — 'almost collapsed'
• namida ga koboreru sou ni naru (<ruby>涙<rt>なみだ</rt></ruby>がこぼれそうになる) — 'tears about to spill'
• shinjirenai sou ni naru (<ruby>信<rt>しん</rt></ruby>じれないそうになる) — "about to lose faith"
• boku ga kie-sou ni naru (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>消<rt>き</rt></ruby>えそうになる) — "I feel about to disappear"
• mou makeru sou ni naru (もう<ruby>負<rt>ま</rt></ruby>けるそうになる) — "about to lose"
• hanarere-sou ni naru (<ruby>離<rt>はな</rt></ruby>れそうになる) — "about to part"
• kotoba ga koboreru sou ni naru (<ruby>言葉<rt>ことば</rt></ruby>がこぼれそうになる) — "words about to spill out"
• yume ga sake-sou ni naru (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>裂<rt>さ</rt></ruby>けそうになる) — "the dream about to tear"

${MARKER}`,

  "5e7b515a": `〜taku naru (〜たくなる) attaches the desire suffix 〜tai (batch1, want to) + ku + naru (become). Means 'come to want to X / start wanting to X'. Marks an ARISING desire — internal change from neutral to wanting. tabe-taku naru (<ruby>食<rt>た</rt></ruby>べたくなる) "I'm starting to feel like eating".

Distinct from bare 〜tai (existing want, batch1) — 〜taku naru emphasises the BECOMING. Past form 〜taku natta means 'came to want / started wanting'. Useful for describing the onset of cravings, urges, emotional shifts: aitaku naru (<ruby>会<rt>あ</rt></ruby>いたくなる) "I'm starting to want to see (you)".

Compare with 〜tai (already wanting), 〜takunai (don't want, batch3b), 〜yo to suru (try to / set out to, batch4a). 〜taku naru fits any context describing emerging desire — physical, emotional, abstract. In songs, it conveys vulnerability or longing onset.

• tabe-taku naru (<ruby>食<rt>た</rt></ruby>べたくなる) — "starting to feel like eating"
• naki-taku naru (<ruby>泣<rt>な</rt></ruby>きたくなる) — "starting to want to cry"
• ai-taku naru (<ruby>会<rt>あ</rt></ruby>いたくなる) — "starting to want to see (you)"
• hashiri-taku naru (<ruby>走<rt>はし</rt></ruby>りたくなる) — "starting to want to run"
• ie-taku naru (<ruby>言<rt>い</rt></ruby>いたくなる) — "starting to want to say"
• shini-taku naru (<ruby>死<rt>し</rt></ruby>にたくなる) — "starting to want to die" (heavy)
• warai-taku naru (<ruby>笑<rt>わら</rt></ruby>いたくなる) — "starting to want to laugh"
• ushinai-taku naru (<ruby>失<rt>うしな</rt></ruby>いたくなる) — "starting to want to lose"
• mukaeau-taku naru (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>いたくなる) — "starting to want to face it"
• yume wo miru taku naru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>るたくなる) — "starting to want to dream"
• ai-shi-taku naru (<ruby>愛<rt>あい</rt></ruby>したくなる) — "starting to want to love"
• mata aitaku natta (また<ruby>会<rt>あ</rt></ruby>いたくなった) — "I started wanting to see (you) again"
• tsutaetaku naru (<ruby>伝<rt>つた</rt></ruby>えたくなる) — "starting to want to convey"
• kanji wo benkyou shi-taku naru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>したくなる) — "starting to want to study kanji"
• mamori-taku naru (<ruby>守<rt>まも</rt></ruby>りたくなる) — "starting to want to protect"

${MARKER}`,

  "ba200d93": `〜tara ii noni (〜たらいいのに) extends batch4a's 〜tara ii (it would be nice if / should) with 〜noni (despite, batch2). Means 'if only X (would happen) / I wish X'. The 〜noni adds wistful regret — 'X would be nice, but it's not the case / won't happen'. ame ga yandara ii noni (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>んだらいいのに) "if only the rain would stop".

Stronger wish than bare 〜tara ii — the 〜noni implies 'and yet it doesn't / won't / hasn't'. Emotional, often left dangling at sentence-end as a sigh of regret. Common in lyrics for unattainable wishes, lost time, missed chances.

Compare with 〜tara ii (lighter wish / suggestion, batch4a), 〜eba ii noni (just 'if only' with 〜ba conditional), 〜hoshii noni (want X but...). 〜tara ii noni is the most emotionally loaded 'if only' construction — perfect for songs about loss, longing, and roads not taken.

• ame ga yandara ii noni (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>んだらいいのに) — "if only the rain would stop"
• haru ga kitara ii noni (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>き</rt></ruby>たらいいのに) — "if only spring would come"
• boku ga inakattara ii noni (<ruby>僕<rt>ぼく</rt></ruby>がいなかったらいいのに) — "if only I weren't here"
• mata aetara ii noni (また<ruby>会<rt>あ</rt></ruby>えたらいいのに) — "if only we could meet again"
• yume nara samenakattara ii noni (<ruby>夢<rt>ゆめ</rt></ruby>ならさめなかったらいいのに) — "if only this dream wouldn't end"
• kanji wo wasureretara ii noni (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れれたらいいのに) — "if only I could forget kanji"
• shinjireba dare mo ushinau koto ga nakattara ii noni (<ruby>信<rt>しん</rt></ruby>じれば<ruby>誰<rt>だれ</rt></ruby>も<ruby>失<rt>うしな</rt></ruby>うことがなかったらいいのに) — "if only no one would be lost when we believe"
• boku ga tsuyokattara ii noni (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>強<rt>つよ</rt></ruby>かったらいいのに) — "if only I were strong"
• kotoba ni dekita ra ii noni (<ruby>言葉<rt>ことば</rt></ruby>にできたらいいのに) — "if only I could put it in words"
• kimi ga koko ni itara ii noni (<ruby>君<rt>きみ</rt></ruby>がここにいたらいいのに) — "if only you were here"
• ima sugu aetara ii noni (<ruby>今<rt>いま</rt></ruby>すぐ<ruby>会<rt>あ</rt></ruby>えたらいいのに) — "if only we could meet right now"
• mou modoretara ii noni (もう<ruby>戻<rt>もど</rt></ruby>れたらいいのに) — "if only I could go back"
• onaji kimochi dattara ii noni (<ruby>同<rt>おな</rt></ruby>じ<ruby>気持<rt>きも</rt></ruby>ちだったらいいのに) — "if only you felt the same way"
• jikan ga tomattara ii noni (<ruby>時間<rt>じかん</rt></ruby>が<ruby>止<rt>と</rt></ruby>まったらいいのに) — "if only time would stop"
• boku no koe ga todoita ra ii noni (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>が<ruby>届<rt>とど</rt></ruby>いたらいいのに) — "if only my voice would reach (you)"

${MARKER}`,

  "1f3ff131": `〜tari suru (〜たりする) is a single-listing variant of the 〜tari 〜tari pattern (batch3a). Attach 〜tari to one verb's past form + suru. Means 'doing things like X (and similar / among other things) / sometimes X'. The single 〜tari implies 'this is one example among unspecified others'. naitari shite ita (<ruby>泣<rt>な</rt></ruby>いたりしていた) 'doing things like crying'.

The implicit 'and other similar things' is the key nuance — the speaker mentions one action but signals more without listing them. Often softens or hedges: 'I sometimes do X (and you can imagine similar things)'. Distinct from 〜tari 〜tari (multiple listed) by being a single example with implied alternatives.

Compare with batch3a's 〜tari 〜tari (multiple listed actions), 〜nado (etc — formal listing), 〜toka (casual listing). 〜tari suru on its own is the ONE-EXAMPLE-WITH-ETCETERA marker — common in casual speech for hedged disclosures and song lyrics for representative emotional gestures.

• nai-tari shite ita (<ruby>泣<rt>な</rt></ruby>いたりしていた) — 'doing things like crying'
• warai-tari suru (<ruby>笑<rt>わら</rt></ruby>ったりする) — 'sometimes laughing (and similar)'
• tabe-tari suru (<ruby>食<rt>た</rt></ruby>べたりする) — 'eating things (occasionally)'
• mukaeau-tari (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>ったり) — 'facing each other (sometimes)'
• ushinau-tari (<ruby>失<rt>うしな</rt></ruby>ったり) — 'losing things (among other)'
• shippai shi-tari suru (<ruby>失敗<rt>しっぱい</rt></ruby>したりする) — 'sometimes failing'
• tsumazui-tari shitemo (つまずいたりしても) — 'even if I stumble (or similar)'
• furikaeru-tari suru (<ruby>振<rt>ふ</rt></ruby>り<ruby>返<rt>かえ</rt></ruby>ったりする) — 'sometimes looking back'
• damatte-tari (<ruby>黙<rt>だま</rt></ruby>ってたり) — 'staying silent at times'
• ai shitari ushinattari (<ruby>愛<rt>あい</rt></ruby>したり<ruby>失<rt>うしな</rt></ruby>ったり) — 'loving and losing' (paired)
• mukaeai-tari nigeru-tari (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>ったり<ruby>逃<rt>に</rt></ruby>げたり) — 'facing it and running'
• ame ga futtari shi-te (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ったりして) — 'rain falling (and other things)'
• kanji wo wasure-tari suru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れたりする) — 'sometimes forgetting kanji'
• kotoba ga tarinai-tari suru (<ruby>言葉<rt>ことば</rt></ruby>が<ruby>足<rt>た</rt></ruby>りなかったりする) — 'words sometimes failing me'
• yumemireru-tari (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>れたり) — 'getting to dream sometimes'

${MARKER}`,

  "e6a4964a": `〜dake de (〜だけで) attaches 〜dake (only, batch3b) + で (means/instrument particle, batch3b). Means 'just by X-ing / merely X-ing'. Frames an action as the SUFFICIENT means for an outcome. miru dake de wakaru (<ruby>見<rt>み</rt></ruby>るだけで<ruby>分<rt>わ</rt></ruby>かる) 'just by looking, I get it'.

Common in advertising, advice, and song lyrics — emphasises that minimal effort produces the result. kimi to iru dake de shiawase (<ruby>君<rt>きみ</rt></ruby>といるだけで<ruby>幸<rt>しあわ</rt></ruby>せ) "just being with you makes me happy". The 〜dake limits the means; the で makes it instrumental.

Compare with 〜koto de (by means of, batch5a — broader), 〜nakute mo (without doing — opposite, batch3b), 〜sae 〜ba (even just — emphatic). 〜dake de is the everyday 'just by X' marker for sufficient causes.

• miru dake de wakaru (<ruby>見<rt>み</rt></ruby>るだけで<ruby>分<rt>わ</rt></ruby>かる) — 'just by looking, I get it'
• kiku dake de (<ruby>聞<rt>き</rt></ruby>くだけで) — 'just by listening'
• warau dake de (<ruby>笑<rt>わら</rt></ruby>うだけで) — 'just by smiling'
• kimi to iru dake de shiawase (<ruby>君<rt>きみ</rt></ruby>といるだけで<ruby>幸<rt>しあわ</rt></ruby>せ) — "just being with you makes me happy"
• shinjiru dake de (<ruby>信<rt>しん</rt></ruby>じるだけで) — 'just by believing'
• namae wo yobu dake de (<ruby>名前<rt>なまえ</rt></ruby>を<ruby>呼<rt>よ</rt></ruby>ぶだけで) — 'just by calling (your) name'
• miru dake de namida ga koboreru (<ruby>見<rt>み</rt></ruby>るだけで<ruby>涙<rt>なみだ</rt></ruby>がこぼれる) — 'just looking, tears spill'
• tsutaeru dake de raku ni naru (<ruby>伝<rt>つた</rt></ruby>えるだけで<ruby>楽<rt>らく</rt></ruby>になる) — 'just conveying makes it easier'
• te wo nigiru dake de (<ruby>手<rt>て</rt></ruby>を<ruby>握<rt>にぎ</rt></ruby>るだけで) — 'just by holding hands'
• boku no soba ni iru dake de (<ruby>僕<rt>ぼく</rt></ruby>のそばにいるだけで) — 'just by being beside me'
• issho ni iru dake de tsuyoku naru (<ruby>一緒<rt>いっしょ</rt></ruby>にいるだけで<ruby>強<rt>つよ</rt></ruby>くなる) — 'just being together makes me strong'
• warai-kakeru dake de iyasareru (<ruby>笑<rt>わら</rt></ruby>いかけるだけで<ruby>癒<rt>いや</rt></ruby>される) — 'just smiling at me heals me'
• kanji wo miru dake de wakaru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>見<rt>み</rt></ruby>るだけで<ruby>分<rt>わ</rt></ruby>かる) — 'understands just by looking at the kanji'
• issho ni utau dake de (<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>歌<rt>うた</rt></ruby>うだけで) — 'just by singing together'
• yume miru dake de tsuyoku ireru (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>るだけで<ruby>強<rt>つよ</rt></ruby>くいれる) — 'just by dreaming I can stay strong'

${MARKER}`,

  "11db77b1": `〜dake no (〜だけの) attaches 〜dake (only, batch3b) + の (attributive linker). Modifies a following noun to mean 'only X / X-only / X-worth-of'. boku-tachi dake no sekai (<ruby>僕<rt>ぼく</rt></ruby>たちだけの<ruby>世界<rt>せかい</rt></ruby>) 'a world only for us'. Two specific senses: (a) Exclusive to / reserved for X. (b) Sufficient amount / extent of X.

The first sense is the song-staple — futari dake no jikan (<ruby>二人<rt>ふたり</rt></ruby>だけの<ruby>時間<rt>じかん</rt></ruby>) 'time just for the two of us'. Romantic / intimate framing. The second sense is more practical: ikiteru dake no kane (<ruby>生<rt>い</rt></ruby>きてるだけの<ruby>金<rt>かね</rt></ruby>) 'enough money to live on'.

Compare with 〜dake de (just by, batch5a), 〜dake wa (at least, batch5a), 〜nomi no (formal 'only'), 〜hodo no (to the extent of). 〜dake no is the everyday exclusive/sufficiency modifier — appears in any noun phrase wanting to express 'only-ness' attributively.

• boku-tachi dake no sekai (<ruby>僕<rt>ぼく</rt></ruby>たちだけの<ruby>世界<rt>せかい</rt></ruby>) — 'a world just for us'
• kimi dake no boku (<ruby>君<rt>きみ</rt></ruby>だけの<ruby>僕<rt>ぼく</rt></ruby>) — "yours alone"
• ima dake no jikan (<ruby>今<rt>いま</rt></ruby>だけの<ruby>時間<rt>じかん</rt></ruby>) — 'time only for now'
• boku dake no yume (<ruby>僕<rt>ぼく</rt></ruby>だけの<ruby>夢<rt>ゆめ</rt></ruby>) — 'a dream only mine'
• sukoshi dake no shiawase (<ruby>少<rt>すこ</rt></ruby>しだけの<ruby>幸<rt>しあわ</rt></ruby>せ) — 'a small portion of happiness'
• kazoku dake no himitsu (<ruby>家族<rt>かぞく</rt></ruby>だけの<ruby>秘密<rt>ひみつ</rt></ruby>) — 'a family-only secret'
• futari-bocchi dake no yoru (<ruby>二人<rt>ふたり</rt></ruby>ぼっちだけの<ruby>夜<rt>よる</rt></ruby>) — 'a night just for two'
• ai dake no kotoba (<ruby>愛<rt>あい</rt></ruby>だけの<ruby>言葉<rt>ことば</rt></ruby>) — 'words only of love'
• shinjiru dake no chikara (<ruby>信<rt>しん</rt></ruby>じるだけの<ruby>力<rt>ちから</rt></ruby>) — 'enough power to believe'
• tsutaeru dake no kotoba (<ruby>伝<rt>つた</rt></ruby>えるだけの<ruby>言葉<rt>ことば</rt></ruby>) — 'enough words to convey'
• kotaeru dake no kakugo (<ruby>答<rt>こた</rt></ruby>えるだけの<ruby>覚悟<rt>かくご</rt></ruby>) — 'enough resolve to answer'
• mukaeau dake no yuuki (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うだけの<ruby>勇気<rt>ゆうき</rt></ruby>) — 'enough courage to face it'
• boku dake no melodi (<ruby>僕<rt>ぼく</rt></ruby>だけのメロディー) — 'a melody only for me'
• kimi dake no koe (<ruby>君<rt>きみ</rt></ruby>だけの<ruby>声<rt>こえ</rt></ruby>) — "your voice alone"
• boku-tachi dake no kioku (<ruby>僕<rt>ぼく</rt></ruby>たちだけの<ruby>記憶<rt>きおく</rt></ruby>) — 'memories just for us'

${MARKER}`,

  "38ded77c": `〜dake wa (〜だけは) attaches 〜dake (only, batch3b) + は (contrastive topic marker). Means 'at least X / above all X / X if nothing else'. The は contrasts X with implicit alternatives — 'whatever else, at least X is the case'. kimi dake wa wasurenai (<ruby>君<rt>きみ</rt></ruby>だけは<ruby>忘<rt>わす</rt></ruby>れない) "I won't forget you at least / no matter what, not you".

Carries strong commitment or emphatic limit. Common in song declarations of unwavering loyalty: kore dake wa iitai (これだけは<ruby>言<rt>い</rt></ruby>いたい) "this much, at least, I want to say". The 〜dake limits scope; 〜は marks the limit as the speaker's emphatic minimum.

Compare with 〜dake no (only X — modifying, batch5a), 〜dake de (just by, batch5a), 〜nomi (formal only). 〜dake wa is the emotional 'at-least / above-all' marker — used when the speaker carves out an exception to a broader concession.

• kimi dake wa wasurenai (<ruby>君<rt>きみ</rt></ruby>だけは<ruby>忘<rt>わす</rt></ruby>れない) — "I won't forget you, at least"
• boku dake wa shinjite (<ruby>僕<rt>ぼく</rt></ruby>だけは<ruby>信<rt>しん</rt></ruby>じて) — "at least believe in me"
• kore dake wa iitai (これだけは<ruby>言<rt>い</rt></ruby>いたい) — "this much I want to say"
• boku dake wa kawaranai (<ruby>僕<rt>ぼく</rt></ruby>だけは<ruby>変<rt>か</rt></ruby>わらない) — "I, at least, won't change"
• kimi dake wa mamoru (<ruby>君<rt>きみ</rt></ruby>だけは<ruby>守<rt>まも</rt></ruby>る) — "you at least, I'll protect"
• ima dake wa damatte (<ruby>今<rt>いま</rt></ruby>だけは<ruby>黙<rt>だま</rt></ruby>って) — "at least for now, stay quiet"
• kotoba dake wa makenai (<ruby>言葉<rt>ことば</rt></ruby>だけは<ruby>負<rt>ま</rt></ruby>けない) — "in words at least, I won't lose"
• yume dake wa wasure-naide (<ruby>夢<rt>ゆめ</rt></ruby>だけは<ruby>忘<rt>わす</rt></ruby>れないで) — "at least don't forget the dream"
• boku-tachi dake wa shinjite ireru (<ruby>僕<rt>ぼく</rt></ruby>たちだけは<ruby>信<rt>しん</rt></ruby>じていれる) — "we at least can believe"
• kimi dake wa nigatasanai (<ruby>君<rt>きみ</rt></ruby>だけは<ruby>逃<rt>に</rt></ruby>がさない) — "you at least, I won't let escape"
• ai dake wa hontou (<ruby>愛<rt>あい</rt></ruby>だけは<ruby>本当<rt>ほんとう</rt></ruby>) — "the love, at least, is real"
• kanji dake wa hayaku oboeta (<ruby>漢字<rt>かんじ</rt></ruby>だけは<ruby>早<rt>はや</rt></ruby>く<ruby>覚<rt>おぼ</rt></ruby>えた) — "at least kanji I learned fast"
• boku dake wa zutto soba ni iru (<ruby>僕<rt>ぼく</rt></ruby>だけはずっとそばにいる) — "I at least will always be near"
• namida dake wa kakushita (<ruby>涙<rt>なみだ</rt></ruby>だけは<ruby>隠<rt>かく</rt></ruby>した) — "I hid the tears, at least"
• shitsuren dake wa nidoto shi-takunai (<ruby>失恋<rt>しつれん</rt></ruby>だけは<ruby>二度<rt>にど</rt></ruby>とし<ruby>たくない<rt></rt></ruby>) — "I never want to fall heartbroken again"

${MARKER}`,

  "913e4c04": `〜cha ikenai (〜ちゃいけない) is the casual contraction of 〜te wa ikenai. Combines te-form + wa (focus / contrast) + ikenai ('won't go / no good'). Means 'must not X / can't X / shouldn't X'. The 〜cha is the contraction of 〜te wa. tabecha ikenai (<ruby>食<rt>た</rt></ruby>べちゃいけない) "you mustn't eat (it)".

Standard prohibition pattern in casual / spoken Japanese. Variants: 〜cha dame (similar, more emphatic 'no good'), 〜te wa naranai (formal 'must not'), 〜cha ikenakatta (past — 'shouldn't have'). Polite: 〜te wa ikemasen.

Compare with 〜nai de (gentle 'please don't' — request, batch4b), 〜na (rough 'don't!' imperative, batch4a), 〜nai hou ga ii (better not to). 〜cha ikenai is the everyday spoken prohibition — neither aggressive nor pleading, just stating that X is forbidden.

• tabecha ikenai (<ruby>食<rt>た</rt></ruby>べちゃいけない) — "mustn't eat"
• miccha ikenai (<ruby>見<rt>み</rt></ruby>ちゃいけない) — "mustn't look"
• naka-cha ikenai (<ruby>泣<rt>な</rt></ruby>かちゃいけない) — wait — naka should be naite-cha actually. Let me redo: nai-tcha ikenai. But Japanese doesn't form 〜tcha that way. The te-form is naite, so contracted is naite-cha → naichaa? Actually it's: naite + wa = naite wa → naitecha (drop the e and combine). Standard is "naitecha ikenai". Let me use itte-cha.
• itte cha ikenai (<ruby>言<rt>い</rt></ruby>っちゃいけない) — "mustn't say"
• ikicha ikenai (<ruby>行<rt>い</rt></ruby>っちゃいけない) — wait that's "icchya" wrong, the correct te-form is "itte" so "iccha-ikenai" → nope, contracted "itcha-ikenai" works but standard is itte wa ikenai → itcha ikenai
• shi-cha ikenai (しちゃいけない) — "mustn't do"
• wasure-cha ikenai (<ruby>忘<rt>わす</rt></ruby>れちゃいけない) — "mustn't forget"
• yamecha ikenai (やめちゃいけない) — "mustn't quit"
• damacha ikenai (<ruby>黙<rt>だま</rt></ruby>っちゃいけない) — "mustn't stay silent"
• nigecha ikenai (<ruby>逃<rt>に</rt></ruby>げちゃいけない) — "mustn't run"
• akirame-cha ikenai (<ruby>諦<rt>あきら</rt></ruby>めちゃいけない) — "mustn't give up"
• shinji-cha ikenai (<ruby>信<rt>しん</rt></ruby>じちゃいけない) — "mustn't believe"
• ushinau-cha ikenai (<ruby>失<rt>うしな</rt></ruby>っちゃいけない) — "mustn't lose"
• mata kowarecha ikenai (<ruby>壊<rt>こわ</rt></ruby>れちゃいけない) — "mustn't break (again)"
• boku no kimochi wo wasure-cha ikenai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>気持<rt>きも</rt></ruby>ちを<ruby>忘<rt>わす</rt></ruby>れちゃいけない) — "mustn't forget my feelings"
• ai wo ushinau-cha ikenai (<ruby>愛<rt>あい</rt></ruby>を<ruby>失<rt>うしな</rt></ruby>っちゃいけない) — "mustn't lose love"

${MARKER}`,

  "9e4a3683": `〜tto (〜っと) is an onomatopoeic / quick-action emphasis particle. Attaches to verbs (often imperative or volitional), adjectives, or appears at the end of action descriptions. Marks decisive, sudden, or punctuated action. yotto (よっと) — interjection 'oof / there!' on completing an action. mippai-tto (ぐいっと) — 'in one gulp'.

Often attached to manner adverbs (gui, suk, sak, pita, etc.) to form mimetic compounds: pita-tto tomatta (ピタッと<ruby>止<rt>と</rt></ruby>まった) 'stopped sharply'. The 〜tto adds crispness / definitiveness to the action description, almost a sound effect rendered as text.

Compare with bare adverb (without っと, less crisp), 〜to (formal quotative — different role), 〜tte (casual quotative, batch4a). 〜tto is the snap-emphasis marker — common in songs for vivid action imagery and in spoken language for punctuating descriptions.

• gui-tto nomu (グイッと<ruby>飲<rt>の</rt></ruby>む) — 'drink in one gulp'
• pita-tto tomaru (ピタッと<ruby>止<rt>と</rt></ruby>まる) — 'stop sharply'
• suk-tto kokoro ga hareru (スッと<ruby>心<rt>こころ</rt></ruby>が<ruby>晴<rt>は</rt></ruby>れる) — 'heart clears suddenly'
• yotto (よっと) — 'oof / there!'
• kotto (コトッと) — 'with a small clink'
• don-tto okita (ドンッと<ruby>起<rt>お</rt></ruby>きた) — 'jumped up with a thud'
• gyu-tto dakishimeru (ギュッと<ruby>抱<rt>だ</rt></ruby>きしめる) — 'hug tightly'
• pyo-tto deru (ピョッと<ruby>出<rt>で</rt></ruby>る) — 'pop out'
• fu-tto warau (フッと<ruby>笑<rt>わら</rt></ruby>う) — 'chuckle softly'
• cha-tto suru (チャッとする) — 'do it quickly'
• kira-tto kagayaku (キラッと<ruby>輝<rt>かがや</rt></ruby>く) — 'sparkle'
• puchi-tto kireru (プチッと<ruby>切<rt>き</rt></ruby>れる) — 'snap (lose patience)'
• doki-tto suru (ドキッとする) — 'startle / heart skips'
• biku-tto suru (ビクッとする) — 'flinch'
• sat-tto kawaru (サッと<ruby>変<rt>か</rt></ruby>わる) — 'change in a flash'

${MARKER}`,

  "16b82a70": `〜te ikeru (〜ていける) is the potential form of 〜te iku (gradually / onward, batch3a). Combines te-form + ikeru (can go). Means 'can keep doing X / can go on doing X / can manage'. ikite ikeru (<ruby>生<rt>い</rt></ruby>きていける) "I can keep on living". The structure expresses ABILITY to sustain an unfolding action.

Common in songs and personal declarations of capability: kimi to issho ni ayunde ikeru (<ruby>君<rt>きみ</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>歩<rt>あゆ</rt></ruby>んでいける) "I can walk on with you". Negative 〜te ikenai means 'cannot keep doing / cannot go on'.

Compare with 〜te iku (just describes onward action — batch3a, no ability), 〜tsuzukerareru (can keep doing — combinatory), 〜rareru (potential, batch4a). 〜te ikeru is the potential of forward motion — 'I can manage to keep going'. In emotional contexts, declares survivability.

• ikite ikeru (<ruby>生<rt>い</rt></ruby>きていける) — "I can keep on living"
• ayunde ikeru (<ruby>歩<rt>あゆ</rt></ruby>んでいける) — "I can walk on"
• mukatte ikeru (<ruby>向<rt>む</rt></ruby>かっていける) — "I can keep heading toward"
• tsuzukete ikeru (<ruby>続<rt>つづ</rt></ruby>けていける) — "I can keep going"
• mamotte ikeru (<ruby>守<rt>まも</rt></ruby>っていける) — "I can keep protecting"
• shinjite ikeru (<ruby>信<rt>しん</rt></ruby>じていける) — "I can keep believing"
• ai shi-tsuzukete ikeru (<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>けていける) — "I can keep loving"
• kanji wo oboete ikeru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>覚<rt>おぼ</rt></ruby>えていける) — "I can keep memorising kanji"
• nai-naka tsuyoku natte ikeru (なかなか<ruby>強<rt>つよ</rt></ruby>くなっていける) — "I can keep getting stronger"
• kimi to iru kara mae ni susunde ikeru (<ruby>君<rt>きみ</rt></ruby>といるから<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>んでいける) — "with you, I can keep moving forward"
• yume mite ikeru (<ruby>夢<rt>ゆめ</rt></ruby><ruby>見<rt>み</rt></ruby>ていける) — "I can keep dreaming"
• tsutaete ikeru (<ruby>伝<rt>つた</rt></ruby>えていける) — "I can keep conveying"
• egao de ite ikeru (<ruby>笑顔<rt>えがお</rt></ruby>でいていける) — "I can keep smiling"
• kawaranaide ite ikeru (<ruby>変<rt>か</rt></ruby>わらないでいていける) — "I can keep being unchanged"
• boku ga inakute mo ikite ikeru (<ruby>僕<rt>ぼく</rt></ruby>がいなくても<ruby>生<rt>い</rt></ruby>きていける) — "(you) can live on without me"

${MARKER}`,

  "7b4d8732": `〜te mitai (〜てみたい) combines 〜te miru (try doing, batch3b) + 〜tai (want to, batch1). Means 'want to try (doing X)'. itte mitai (<ruby>行<rt>い</rt></ruby>ってみたい) "I want to try going". The structure stacks two auxiliaries — 'do as exploration' + 'desire' = 'want to attempt'.

Common in casual conversation about aspirations, untried things, curiosities: tabete mitai (<ruby>食<rt>た</rt></ruby>べてみたい) "I want to try eating it". Distinguished from bare 〜tai by the EXPLORATORY quality — the speaker is curious about the experience, not just the outcome. Past 〜te mitakatta = 'wanted to try (but didn't / couldn't)'.

Compare with 〜tai (want to — bare, batch1), 〜te miru (try — exploratory, batch3b), 〜you to suru (try to — effortful, batch4a). 〜te mitai is the curiosity-want marker — 'I want to give X a shot'. Polite: 〜te mitai desu.

• itte mitai (<ruby>行<rt>い</rt></ruby>ってみたい) — "want to try going"
• tabete mitai (<ruby>食<rt>た</rt></ruby>べてみたい) — "want to try eating"
• mite mitai (<ruby>見<rt>み</rt></ruby>てみたい) — "want to try seeing"
• yatte mitai (やってみたい) — "want to give it a try"
• kiite mitai (<ruby>聞<rt>き</rt></ruby>いてみたい) — "want to ask / hear"
• yonde mitai (<ruby>読<rt>よ</rt></ruby>んでみたい) — "want to try reading"
• hanashite mitai (<ruby>話<rt>はな</rt></ruby>してみたい) — "want to try talking"
• ai shite mitai (<ruby>愛<rt>あい</rt></ruby>してみたい) — "want to try loving"
• kimi to issho ni iru no wo tameshite mitai (<ruby>君<rt>きみ</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>にいるのを<ruby>試<rt>ため</rt></ruby>してみたい) — "want to try being together with you"
• kanji wo zenbu oboete mitai (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>覚<rt>おぼ</rt></ruby>えてみたい) — "want to try memorising all kanji"
• yume wo kanaete mitai (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>叶<rt>かな</rt></ruby>えてみたい) — "want to try making the dream come true"
• mata aete mitai (また<ruby>会<rt>あ</rt></ruby>えてみたい) — "want to try meeting again"
• tatakatte mitai (<ruby>戦<rt>たたか</rt></ruby>ってみたい) — "want to try fighting"
• shinjite mitai (<ruby>信<rt>しん</rt></ruby>じてみたい) — "want to try believing"
• tsutaete mitai (<ruby>伝<rt>つた</rt></ruby>えてみたい) — "want to try conveying (it)"

${MARKER}`,

  "d3f23827": `〜te mo ii (〜てもいい) attaches the te-form + mo (also/even, batch2's 〜temo) + ii (good). Means 'it's okay to X / may X / X is allowed / X is fine'. Standard permission grant. tabete mo ii (<ruby>食<rt>た</rt></ruby>べてもいい) "you may eat / it's okay to eat". Polite: 〜te mo ii desu / 〜te mo ii desu ka (asking permission).

The 〜te mo ('even if') + ii ('good') literally reads 'even (doing) X is fine'. From this comes the permissive 'okay to X'. The negative 〜te wa ikenai / 〜cha ikenai (batch5a) is its prohibitive counterpart. Also: 〜nakute mo ii (don't have to, batch3b) — different meaning entirely (negation of necessity).

Compare with 〜te mo kamawanai (don't mind X — even more permissive), 〜te kudasai (please do — request, not permission). 〜te mo ii is the everyday permission marker — used to grant or ask whether something is allowed.

• tabete mo ii (<ruby>食<rt>た</rt></ruby>べてもいい) — "may eat / okay to eat"
• itte mo ii (<ruby>行<rt>い</rt></ruby>ってもいい) — "may go"
• mite mo ii (<ruby>見<rt>み</rt></ruby>てもいい) — "may look"
• kaette mo ii (<ruby>帰<rt>かえ</rt></ruby>ってもいい) — "may go home"
• naite mo ii (<ruby>泣<rt>な</rt></ruby>いてもいい) — "it's okay to cry"
• warawa mo ii (<ruby>笑<rt>わら</rt></ruby>っもいい) — "it's okay to laugh"
• tsukatte mo ii (<ruby>使<rt>つか</rt></ruby>ってもいい) — "may use"
• yamemoii (やめもいい) — "it's okay to quit"
• shinjite mo ii (<ruby>信<rt>しん</rt></ruby>じてもいい) — "it's okay to believe"
• ai shite mo ii (<ruby>愛<rt>あい</rt></ruby>してもいい) — "it's okay to love"
• boku ga isho ni ite mo ii? (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>一緒<rt>いっしょ</rt></ruby>にいてもいい？) — "is it okay if I'm with (you)?"
• hanashite mo ii desu ka (<ruby>話<rt>はな</rt></ruby>してもいいですか) — "may I speak?"
• kanji wo wasurete mo ii (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れてもいい) — "it's okay to forget kanji"
• yume wo mite mo ii (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>てもいい) — "it's okay to dream"
• boku no koto wo wasurete mo ii (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れてもいい) — "it's okay to forget about me"

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
