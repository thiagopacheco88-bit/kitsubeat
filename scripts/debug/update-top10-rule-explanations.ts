/**
 * Top-10 canonical grammar rules — v2 format inline rewrite (calibration batch).
 *
 * Test run before scaling to top-50/full catalog. Same script structure as
 * update-hos-rule-explanations.ts: rewrites grammar_rules.{name,explanation}
 * AND propagates the new name+explanation into every song_versions.lesson
 * .grammar_points[] that references the rule.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/update-top10-rule-explanations.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "0588f1da-7292-4efc-bebf-3d103b09b7d6": "〜te mo (〜ても) — even if / no matter",
  "670a043a-cc9c-4e59-958e-60a43313c364": "〜ba (〜ば) — general conditional",
  "28040405-e731-49b2-9bb5-a082bbf34da2": "〜te iru / 〜teru (〜ている / 〜てる) — progressive / state",
  "ebd9bcdf-2acf-4879-a970-50f98346c3cf": "meireikei (命令形) — imperative form",
  "cd6b0ba0-2202-4c5e-8856-db742ca9d2bf": "〜nara (〜なら) — topic-based conditional",
  "2f4bde8c-f15b-43bc-bcfa-191da710a386": "〜tai (〜たい) — want to do",
  "7055ddcc-0f83-4d34-94ca-6b8807abd37e": "〜zu (ni) (〜ず(に)) — without doing",
  "bce4d9cb-0d2c-41fb-a910-7f1a127ba466": "〜tara (〜たら) — sequential / discovery conditional",
  "4d5ffbe9-28ba-475a-a185-d090a30e75a3": "〜te shimau (〜てしまう) — end up doing / regrettably",
  "975331f4-03e3-4703-94a7-100d26eb5145": "〜tsuzukeru (〜続ける) — keep doing",
};

const REWRITES: Record<string, string> = {
  // 〜ても — even if / no matter
  "0588f1da-7292-4efc-bebf-3d103b09b7d6": `Attach 〜te mo (〜ても) to a verb's te-form to mean 'even if (X)' or 'even though (X)'. The condition doesn't change the outcome. With question words, it expands to 'no matter what / when / how': nani o shite mo (<ruby>何<rt>なに</rt></ruby>をしても) — 'no matter what I do'.

For i-adjectives, drop い and add 〜kute mo (〜くても): yasukute mo (<ruby>安<rt>やす</rt></ruby>くても) — 'even if it's cheap'. For nouns and na-adjectives, attach 〜de mo (〜でも): ame de mo (<ruby>雨<rt>あめ</rt></ruby>でも) — 'even if it rains'.

Compare with 〜tara (たら) and 〜ba (ば), which assert that the consequence DOES depend on the condition. 〜te mo asserts the opposite: the consequence holds REGARDLESS. Common in song lyrics for stubborn / resilient stances ('even if X happens, I won't change').

• ame ga futte mo iku (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>っても<ruby>行<rt>い</rt></ruby>く) — 'I'll go even if it rains'
• nani o itte mo muda da (<ruby>何<rt>なに</rt></ruby>を<ruby>言<rt>い</rt></ruby>っても<ruby>無駄<rt>むだ</rt></ruby>だ) — 'no matter what I say, it's pointless'
• donnani osokute mo matsu (どんなに<ruby>遅<rt>おそ</rt></ruby>くても<ruby>待<rt>ま</rt></ruby>つ) — 'I'll wait no matter how late'
• tabete mo onaka ga suku (<ruby>食<rt>た</rt></ruby>べてもお<ruby>腹<rt>なか</rt></ruby>がすく) — 'even after eating, I get hungry'
• doko ni itte mo utsukushii (どこに<ruby>行<rt>い</rt></ruby>っても<ruby>美<rt>うつく</rt></ruby>しい) — 'beautiful no matter where you go'
• shippai shite mo akiramenai (<ruby>失敗<rt>しっぱい</rt></ruby>してもあきらめない) — 'even if I fail, I won't give up'
• yasukute mo kawanai (<ruby>安<rt>やす</rt></ruby>くても<ruby>買<rt>か</rt></ruby>わない) — 'I won't buy it even if it's cheap'
• ame de mo shiai wa aru (<ruby>雨<rt>あめ</rt></ruby>でも<ruby>試合<rt>しあい</rt></ruby>はある) — 'the match is on even if it rains'
• kodomo de mo wakaru (<ruby>子供<rt>こども</rt></ruby>でもわかる) — 'even a child can understand'
• ikutsu negai kanaete mo (いくつ<ruby>願<rt>ねが</rt></ruby>い<ruby>叶<rt>かな</rt></ruby>えても) — 'no matter how many wishes are granted'
• nemurenakute mo asa wa kuru (<ruby>眠<rt>ねむ</rt></ruby>れなくても<ruby>朝<rt>あさ</rt></ruby>は<ruby>来<rt>く</rt></ruby>る) — 'morning comes even if I can't sleep'
• samukute mo soto e deru (<ruby>寒<rt>さむ</rt></ruby>くても<ruby>外<rt>そと</rt></ruby>へ<ruby>出<rt>で</rt></ruby>る) — 'I'll go out even if it's cold'
• dare ga kite mo aenai (<ruby>誰<rt>だれ</rt></ruby>が<ruby>来<rt>き</rt></ruby>ても<ruby>会<rt>あ</rt></ruby>えない) — 'I can't see anyone, no matter who comes'
• takakute mo hoshii (<ruby>高<rt>たか</rt></ruby>くても<ruby>欲<rt>ほ</rt></ruby>しい) — 'I want it even if it's expensive'
• naite mo waratte mo (<ruby>泣<rt>な</rt></ruby>いても<ruby>笑<rt>わら</rt></ruby>っても) — 'whether you cry or laugh' (idiomatic — 'no matter what')

${MARKER}`,

  // 〜ば — general conditional
  "670a043a-cc9c-4e59-958e-60a43313c364": `〜ba (ば) is the general conditional 'if (X)'. For godan (Group 1) verbs, replace -u with -eba: iku → ikeba (<ruby>行<rt>い</rt></ruby>く → <ruby>行<rt>い</rt></ruby>けば). For ichidan (Group 2), drop -ru and add -reba: taberu → tabereba (<ruby>食<rt>た</rt></ruby>べる → <ruby>食<rt>た</rt></ruby>べれば). For i-adjectives, drop い and add ければ: yasui → yasukereba (<ruby>安<rt>やす</rt></ruby>い → <ruby>安<rt>やす</rt></ruby>ければ). Negative is 〜nakereba (〜なければ).

The ば-conditional implies a natural cause-and-effect: 'if A, then naturally B'. It is the most "logical" conditional, often used in proverbs and reasoned statements. In casual speech the negative collapses to 〜nakya (〜なきゃ): isoganakya (<ruby>急<rt>いそ</rt></ruby>がなきゃ) — 'gotta hurry'.

Compare with 〜tara (たら, sequential 'when/if'), 〜nara (なら, topic-based 'if it's the case that'), and 〜to (と, inevitable consequence 'whenever A, then always B'). 〜ba sits in the middle — neutral, logical, slightly formal-feeling vs the others.

• ikeba wakaru (<ruby>行<rt>い</rt></ruby>けばわかる) — 'if you go, you'll understand'
• yasukereba kau (<ruby>安<rt>やす</rt></ruby>ければ<ruby>買<rt>か</rt></ruby>う) — 'I'll buy it if it's cheap'
• ame ga fureba chuushi (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>れば<ruby>中止<rt>ちゅうし</rt></ruby>) — 'if it rains, it's cancelled'
• tabereba genki ni naru (<ruby>食<rt>た</rt></ruby>べれば<ruby>元気<rt>げんき</rt></ruby>になる) — 'if you eat, you'll feel better'
• mireba wakaru (<ruby>見<rt>み</rt></ruby>ればわかる) — 'one look and you'll get it'
• okane ga areba kau (お<ruby>金<rt>かね</rt></ruby>があれば<ruby>買<rt>か</rt></ruby>う) — 'I'll buy it if I have money'
• samukereba uwagi o kite (<ruby>寒<rt>さむ</rt></ruby>ければ<ruby>上着<rt>うわぎ</rt></ruby>を<ruby>着<rt>き</rt></ruby>て) — 'put on a jacket if you're cold'
• doryoku sureba dekiru (<ruby>努力<rt>どりょく</rt></ruby>すればできる) — 'you can do it if you try'
• yomeba omoshiroi (<ruby>読<rt>よ</rt></ruby>めば<ruby>面白<rt>おもしろ</rt></ruby>い) — 'it's interesting once you read it'
• yasumeba naoru (<ruby>休<rt>やす</rt></ruby>めば<ruby>治<rt>なお</rt></ruby>る) — 'rest and you'll get better'
• kikeba kotaeru (<ruby>聞<rt>き</rt></ruby>けば<ruby>答<rt>こた</rt></ruby>える) — 'I'll answer if you ask'
• isogeba ma ni au (<ruby>急<rt>いそ</rt></ruby>げば<ruby>間<rt>ま</rt></ruby>に<ruby>合<rt>あ</rt></ruby>う) — 'I'll make it if I hurry'
• kakeba wakaru (<ruby>書<rt>か</rt></ruby>けばわかる) — 'you'll understand once you write it'
• isoganakya ma ni awanai (<ruby>急<rt>いそ</rt></ruby>がなきゃ<ruby>間<rt>ま</rt></ruby>に<ruby>合<rt>あ</rt></ruby>わない) — 'gotta hurry or I won't make it' (collapsed 〜nakereba)
• kotaerareru hito ga ireba (<ruby>答<rt>こた</rt></ruby>えられる<ruby>人<rt>ひと</rt></ruby>がいれば) — 'if there's someone who can answer'

${MARKER}`,

  // 〜ている / 〜てる — progressive / state
  "28040405-e731-49b2-9bb5-a082bbf34da2": `〜te iru (〜ている) attaches to a verb's te-form to express ongoing action ('is X-ing') OR resulting state ('has X-ed and remains'). In casual speech the い (i) drops, contracting to 〜teru (〜てる): tabeteiru → tabeteru (<ruby>食<rt>た</rt></ruby>べている → <ruby>食<rt>た</rt></ruby>べてる).

Whether 〜te iru reads as progressive or state depends on the verb's lexical aspect. Action verbs (taberu 'eat', hashiru 'run', yomu 'read') become progressive. Change-of-state verbs (shiru 'come to know', sumu 'come to live', kekkon suru 'get married') become resultative state: shitte iru (<ruby>知<rt>し</rt></ruby>っている) means 'I know' (state), not 'I'm in the process of knowing'.

The casual てる contraction is extremely common in songs, anime, and informal writing. Past form: 〜te ita (〜ていた) → 〜teta (〜てた). Negative: 〜te inai (〜ていない) → 〜tenai (〜てない). Distinguish from 〜te aru (〜てある, intentional resulting state from a transitive verb).

• ame ga futte iru (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>っている) — 'it is raining'
• ongaku o kiite iru (<ruby>音楽<rt>おんがく</rt></ruby>を<ruby>聴<rt>き</rt></ruby>いている) — 'I'm listening to music'
• naiteru (<ruby>泣<rt>な</rt></ruby>いてる) — 'is crying' (casual)
• mou shitteru (もう<ruby>知<rt>し</rt></ruby>ってる) — 'I already know' (casual)
• zutto matteta (ずっと<ruby>待<rt>ま</rt></ruby>ってた) — 'had been waiting all along' (casual past)
• nani shiteru? (<ruby>何<rt>なに</rt></ruby>してる？) — 'what are you doing?' (casual)
• Tokyo ni sunde iru (<ruby>東京<rt>とうきょう</rt></ruby>に<ruby>住<rt>す</rt></ruby>んでいる) — 'I live in Tokyo' (state)
• megane o kakete iru (<ruby>眼鏡<rt>めがね</rt></ruby>をかけている) — 'wearing glasses' (state)
• kekkon shite iru (<ruby>結婚<rt>けっこん</rt></ruby>している) — 'is married' (state)
• kare wa hashitte iru (<ruby>彼<rt>かれ</rt></ruby>は<ruby>走<rt>はし</rt></ruby>っている) — 'he is running' (progressive)
• mada netenai (まだ<ruby>寝<rt>ね</rt></ruby>てない) — 'I haven't slept yet' (casual negative)
• gakkou de benkyou shite iru (<ruby>学校<rt>がっこう</rt></ruby>で<ruby>勉強<rt>べんきょう</rt></ruby>している) — 'studying at school'
• mado ga aite iru (<ruby>窓<rt>まど</rt></ruby>が<ruby>開<rt>あ</rt></ruby>いている) — 'the window is open' (state)
• kawaite iru (<ruby>渇<rt>かわ</rt></ruby>いている) — 'is thirsty / dried up' (state)
• kanojo o aishite iru (<ruby>彼女<rt>かのじょ</rt></ruby>を<ruby>愛<rt>あい</rt></ruby>している) — 'I love her' (state)

${MARKER}`,

  // 命令形 — imperative
  "ebd9bcdf-2acf-4879-a970-50f98346c3cf": `meireikei (<ruby>命令形<rt>めいれいけい</rt></ruby>) is the bare imperative — direct, often blunt commands. For godan (Group 1) verbs, change the final -u to -e: hashiru → hashire (<ruby>走<rt>はし</rt></ruby>る → <ruby>走<rt>はし</rt></ruby>れ), iku → ike (<ruby>行<rt>い</rt></ruby>く → <ruby>行<rt>い</rt></ruby>け). For ichidan (Group 2), drop -ru and add -ro: taberu → tabero (<ruby>食<rt>た</rt></ruby>べる → <ruby>食<rt>た</rt></ruby>べろ). Irregulars: suru → shiro (する → しろ), kuru → koi (<ruby>来<rt>く</rt></ruby>る → <ruby>来<rt>こ</rt></ruby>い).

The bare imperative is strong — common in anime, sports cheering, military / authority contexts, and song lyrics. In daily polite speech, learners use 〜te kudasai (〜てください) instead. The negative imperative is verb-dictionary-form + na (な): iku na (<ruby>行<rt>い</rt></ruby>くな) — 'don't go'.

A softer alternative is the ichidan-friendly form 〜yo (〜よ): tabeyo (<ruby>食<rt>た</rt></ruby>べよ), used in literary / archaic / poetic registers. Female speakers and softer contexts often use 〜nasai (〜なさい) instead, which is firm but polite ('do X, please'): hayaku tabenasai (<ruby>早<rt>はや</rt></ruby>く<ruby>食<rt>た</rt></ruby>べなさい) — 'eat quickly!'.

• hashire (<ruby>走<rt>はし</rt></ruby>れ) — 'run!'
• tabero (<ruby>食<rt>た</rt></ruby>べろ) — 'eat!'
• mezamero (<ruby>目覚<rt>めざ</rt></ruby>めろ) — 'wake up!'
• miro (<ruby>見<rt>み</rt></ruby>ろ) — 'look!'
• tate (<ruby>立<rt>た</rt></ruby>て) — 'stand up!'
• koi (<ruby>来<rt>こ</rt></ruby>い) — 'come!' (irregular)
• shiro (しろ) — 'do (it)!' (irregular する)
• mate (<ruby>待<rt>ま</rt></ruby>て) — 'wait!'
• nigero (<ruby>逃<rt>に</rt></ruby>げろ) — 'run away! / escape!'
• damare (<ruby>黙<rt>だま</rt></ruby>れ) — 'shut up! / be silent!'
• yamero (<ruby>止<rt>や</rt></ruby>めろ) — 'stop (it)!'
• ake (<ruby>開<rt>あ</rt></ruby>け) — 'open (it)!'
• moyase (<ruby>燃<rt>も</rt></ruby>やせ) — 'burn (it)! / set ablaze!'
• tatakae (<ruby>戦<rt>たたか</rt></ruby>え) — 'fight!'
• ganbare (<ruby>頑張<rt>がんば</rt></ruby>れ) — 'do your best! / hang in there!'

${MARKER}`,

  // 〜なら — topic conditional
  "cd6b0ba0-2202-4c5e-8856-db742ca9d2bf": `〜nara (なら) is a topic-based conditional 'if (it's the case that)'. Unlike 〜ba and 〜tara, 〜nara presupposes the topic and gives advice / commentary based on it. Attach to the plain form of a verb, the dictionary form of an i-adjective, or directly to a noun / na-adjective stem (no need for だ before nara).

Use 〜nara when responding to information someone just gave you, or when setting up a hypothetical situation as the premise. The clause that follows is typically a recommendation, opinion, or course of action: 'if that's the case, then...'.

Compare with 〜ba (logical 'if'), 〜tara (sequential 'when/if'), and 〜to (inevitable 'whenever'). 〜nara feels conversational and topic-anchored — it picks up on something already in the air. Common collocations: 〜nara naraba (the literary/emphatic form), 〜suru no nara (formal nominalised version).

• hima nara kite (<ruby>暇<rt>ひま</rt></ruby>なら<ruby>来<rt>き</rt></ruby>て) — 'if you're free, come over'
• iku nara hayaku (<ruby>行<rt>い</rt></ruby>くなら<ruby>早<rt>はや</rt></ruby>く) — 'if you're going, go early'
• gakusei nara yasui (<ruby>学生<rt>がくせい</rt></ruby>なら<ruby>安<rt>やす</rt></ruby>い) — 'if you're a student, it's cheap'
• motomeru nara ataeyou (<ruby>求<rt>もと</rt></ruby>めるなら<ruby>与<rt>あた</rt></ruby>えよう) — 'if you seek it, I'll give it'
• samui nara mado o shimete (<ruby>寒<rt>さむ</rt></ruby>いなら<ruby>窓<rt>まど</rt></ruby>を<ruby>閉<rt>し</rt></ruby>めて) — 'if you're cold, close the window'
• nihon ni iku nara Kyoto (<ruby>日本<rt>にほん</rt></ruby>に<ruby>行<rt>い</rt></ruby>くなら<ruby>京都<rt>きょうと</rt></ruby>) — 'if you're going to Japan, Kyoto'
• yameru nara ima (やめるなら<ruby>今<rt>いま</rt></ruby>) — 'if you're going to quit, now'
• kare nara shitte iru (<ruby>彼<rt>かれ</rt></ruby>なら<ruby>知<rt>し</rt></ruby>っている) — 'as for him, he knows'
• ame nara chuushi da (<ruby>雨<rt>あめ</rt></ruby>なら<ruby>中止<rt>ちゅうし</rt></ruby>だ) — 'if it rains, it's cancelled'
• yasui nara hoshii (<ruby>安<rt>やす</rt></ruby>いなら<ruby>欲<rt>ほ</rt></ruby>しい) — 'if it's cheap, I want it'
• kimi nara dekiru (<ruby>君<rt>きみ</rt></ruby>ならできる) — 'you can do it' (lit. 'as for you, it's possible')
• Tokyo nara den-sha ga benri (<ruby>東京<rt>とうきょう</rt></ruby>なら<ruby>電車<rt>でんしゃ</rt></ruby>が<ruby>便利<rt>べんり</rt></ruby>) — 'if it's Tokyo, the train is convenient'
• komaru nara iwanai (<ruby>困<rt>こま</rt></ruby>るなら<ruby>言<rt>い</rt></ruby>わない) — 'if it'd trouble you, I won't say it'
• kau nara ima dake (<ruby>買<rt>か</rt></ruby>うなら<ruby>今<rt>いま</rt></ruby>だけ) — 'if you're buying, only now'
• kanojo nara wakatte kureru (<ruby>彼女<rt>かのじょ</rt></ruby>ならわかってくれる) — 'she'd understand'

${MARKER}`,

  // 〜たい — want to
  "2f4bde8c-f15b-43bc-bcfa-191da710a386": `〜tai (〜たい) attaches to a verb's i-stem (masu-stem) to express the speaker's desire to do something — 'I want to (X)'. For ichidan verbs, drop る and add たい: taberu → tabetai (<ruby>食<rt>た</rt></ruby>べる → <ruby>食<rt>た</rt></ruby>べたい). For godan, change the final -u to its -i row counterpart and add たい: iku → ikitai (<ruby>行<rt>い</rt></ruby>く → <ruby>行<rt>い</rt></ruby>きたい), nomu → nomitai (<ruby>飲<rt>の</rt></ruby>む → <ruby>飲<rt>の</rt></ruby>みたい).

〜tai conjugates like an i-adjective: takunai (たくない) for negative ('don't want to'), takatta (たかった) for past ('wanted to'), takereba (たければ) for conditional ('if I want to'). The object of desire usually takes が (ga) or を (o): mizu ga nomitai / mizu o nomitai (<ruby>水<rt>みず</rt></ruby>が／を<ruby>飲<rt>の</rt></ruby>みたい) — 'I want to drink water'.

〜tai expresses the SPEAKER's desire (1st person). For 3rd-person desire, use 〜tagaru (たがる) instead: kanojo wa ikitagaru (<ruby>彼女<rt>かのじょ</rt></ruby>は<ruby>行<rt>い</rt></ruby>きたがる) — 'she wants to go'. This gendered shift exists because the speaker can never directly know another person's internal state.

• tabetai (<ruby>食<rt>た</rt></ruby>べたい) — 'want to eat'
• ikitai (<ruby>行<rt>い</rt></ruby>きたい) — 'want to go'
• mitai (<ruby>見<rt>み</rt></ruby>たい) — 'want to see'
• shiritai (<ruby>知<rt>し</rt></ruby>りたい) — 'want to know'
• yasumitai (<ruby>休<rt>やす</rt></ruby>みたい) — 'want to rest'
• kaeritai (<ruby>帰<rt>かえ</rt></ruby>りたい) — 'want to go home'
• kaitai (<ruby>買<rt>か</rt></ruby>いたい) — 'want to buy'
• yomitai (<ruby>読<rt>よ</rt></ruby>みたい) — 'want to read'
• ai ni ikitai (<ruby>会<rt>あ</rt></ruby>いに<ruby>行<rt>い</rt></ruby>きたい) — 'want to go meet (you)'
• shitai koto (したいこと) — 'things I want to do'
• tabetakunai (<ruby>食<rt>た</rt></ruby>べたくない) — 'don't want to eat' (negative)
• ikitakatta (<ruby>行<rt>い</rt></ruby>きたかった) — 'wanted to go' (past)
• mizu ga nomitai (<ruby>水<rt>みず</rt></ruby>が<ruby>飲<rt>の</rt></ruby>みたい) — 'I want to drink water'
• kataritai omoide (<ruby>語<rt>かた</rt></ruby>りたい<ruby>思<rt>おも</rt></ruby>い<ruby>出<rt>で</rt></ruby>) — 'memories I want to talk about'
• issho ni itai (<ruby>一緒<rt>いっしょ</rt></ruby>にいたい) — 'I want to be with (you)'

${MARKER}`,

  // 〜ず(に) — without doing
  "7055ddcc-0f83-4d34-94ca-6b8807abd37e": `〜zu (〜ず) and 〜zu ni (〜ずに) attach to a verb's negative stem (the ない-form minus ない) to mean 'without doing (X)'. Modern usage prefers 〜zu ni; bare 〜zu is more literary. Adding に does not change the meaning, only the register. The pattern is a survival from classical Japanese into modern poetic / formal register.

Formation: take the ない-form and replace ない with ず. iku → ikanai → ikazu (<ruby>行<rt>い</rt></ruby>く → <ruby>行<rt>い</rt></ruby>かない → <ruby>行<rt>い</rt></ruby>かず). taberu → tabenai → tabezu (<ruby>食<rt>た</rt></ruby>べる → <ruby>食<rt>た</rt></ruby>べない → <ruby>食<rt>た</rt></ruby>べず). The irregular suru becomes sezu (せず, NOT shinai+zu — this is the only consistent irregularity to memorise).

Compare with 〜nai de (〜ないで, 'without doing / please don't'), which is the standard colloquial equivalent. 〜zu ni is preferred in writing, songs, formal speech, and idiomatic compounds (omoiwa-zu — 'unexpectedly', shira-zu — 'unknowingly'). Distinguish from the noun-suffix 〜zu (ず) meaning 'incomplete number' (chi-uchi-zu — 'half-done').

• tabezu ni (<ruby>食<rt>た</rt></ruby>べずに) — 'without eating'
• iwazu ni (<ruby>言<rt>い</rt></ruby>わずに) — 'without saying'
• sezu ni (せずに) — 'without doing' (irregular する)
• nemurazu ni hataraku (<ruby>眠<rt>ねむ</rt></ruby>らずに<ruby>働<rt>はたら</rt></ruby>く) — 'work without sleeping'
• yasumazu ni hashiru (<ruby>休<rt>やす</rt></ruby>まずに<ruby>走<rt>はし</rt></ruby>る) — 'run without resting'
• shirazu ni iru (<ruby>知<rt>し</rt></ruby>らずにいる) — 'remain unaware'
• matazu ni iku (<ruby>待<rt>ま</rt></ruby>たずに<ruby>行<rt>い</rt></ruby>く) — 'go without waiting'
• kotaezu ni (<ruby>答<rt>こた</rt></ruby>えずに) — 'without answering'
• furikaerazu ni (<ruby>振<rt>ふ</rt></ruby>り<ruby>返<rt>かえ</rt></ruby>らずに) — 'without looking back'
• wasurerarezu (<ruby>忘<rt>わす</rt></ruby>れられず) — 'unable to forget' (literary, no に)
• akiramezu ni (<ruby>諦<rt>あきら</rt></ruby>めずに) — 'without giving up'
• naka-zu ni warau (<ruby>泣<rt>な</rt></ruby>かずに<ruby>笑<rt>わら</rt></ruby>う) — 'laugh without crying'
• kangaezu ni hashiru (<ruby>考<rt>かんが</rt></ruby>えずに<ruby>走<rt>はし</rt></ruby>る) — 'run without thinking'
• tabe-zu ni nemuru (<ruby>食<rt>た</rt></ruby>べずに<ruby>眠<rt>ねむ</rt></ruby>る) — 'sleep without eating'
• ki-zukazu ni sugosu (<ruby>気<rt>き</rt></ruby>づかずに<ruby>過<rt>す</rt></ruby>ごす) — 'spend (time) unawares'

${MARKER}`,

  // 〜たら — sequential conditional
  "bce4d9cb-0d2c-41fb-a910-7f1a127ba466": `〜tara (〜たら) is a sequential / discovery conditional 'when / if (X happens, then Y)'. Formed by attaching ら to the past-tense form: tabeta → tabetara (<ruby>食<rt>た</rt></ruby>べた → <ruby>食<rt>た</rt></ruby>べたら), itta → ittara (<ruby>行<rt>い</rt></ruby>った → <ruby>行<rt>い</rt></ruby>ったら). For i-adjectives: yasukatta → yasukattara (<ruby>安<rt>やす</rt></ruby>かった → <ruby>安<rt>やす</rt></ruby>かったら). For nouns / na-adjectives: 〜dattara (だったら).

〜tara is the most flexible conditional. It covers temporal sequence ('when / once X happens'), discovery ('I went and found Y'), and hypotheticals ('if X were to happen'). With moshi (もし) prefix, it tilts towards the hypothetical: moshi takarakuji ga atattara (もし<ruby>宝<rt>たから</rt></ruby>くじが<ruby>当<rt>あ</rt></ruby>たったら) — 'if I won the lottery'.

Compare with 〜ba (logical 'if'), 〜nara (topic-based 'if it's the case'), 〜to (inevitable 'whenever A then always B'). 〜tara is the catch-all that beginners learn first because it works in nearly every conditional context. Its discovery flavour is unique: 〜ba and 〜nara cannot mean 'I went and discovered Y' — only 〜tara can.

• tabetara oishikatta (<ruby>食<rt>た</rt></ruby>べたらおいしかった) — 'when I ate it, it was delicious'
• moshi takarakuji ga atattara (もし<ruby>宝<rt>たから</rt></ruby>くじが<ruby>当<rt>あ</rt></ruby>たったら) — 'if I won the lottery'
• ie ni kaettara dare mo inakatta (<ruby>家<rt>いえ</rt></ruby>に<ruby>帰<rt>かえ</rt></ruby>ったら<ruby>誰<rt>だれ</rt></ruby>もいなかった) — 'when I got home, no one was there'
• ame ga futtara chuushi (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ったら<ruby>中止<rt>ちゅうし</rt></ruby>) — 'if it rains, cancelled'
• yasukattara kau (<ruby>安<rt>やす</rt></ruby>かったら<ruby>買<rt>か</rt></ruby>う) — 'I'll buy it if it's cheap'
• ittara wakatta (<ruby>行<rt>い</rt></ruby>ったらわかった) — 'I went and figured it out'
• 18-sai ni nattara (<ruby>歳<rt>さい</rt></ruby>になったら) — 'once I turn 18'
• genki ni nattara aimashou (<ruby>元気<rt>げんき</rt></ruby>になったら<ruby>会<rt>あ</rt></ruby>いましょう) — 'let's meet once you're well'
• samukattara stove o tsukete (<ruby>寒<rt>さむ</rt></ruby>かったらストーブをつけて) — 'turn on the heater if you're cold'
• ie ni tsuitara denwa shite (<ruby>家<rt>いえ</rt></ruby>に<ruby>着<rt>つ</rt></ruby>いたら<ruby>電話<rt>でんわ</rt></ruby>して) — 'call me when you get home'
• shukudai ga owattara asobou (<ruby>宿題<rt>しゅくだい</rt></ruby>が<ruby>終<rt>お</rt></ruby>わったら<ruby>遊<rt>あそ</rt></ruby>ぼう) — 'let's play once homework's done'
• haru ni nattara hana ga saku (<ruby>春<rt>はる</rt></ruby>になったら<ruby>花<rt>はな</rt></ruby>が<ruby>咲<rt>さ</rt></ruby>く) — 'when spring comes, the flowers bloom'
• damaru kara dattara komaru (<ruby>黙<rt>だま</rt></ruby>るからだったら<ruby>困<rt>こま</rt></ruby>る) — 'if it's because you'd be silent, I'm in trouble'
• kanojo dattara wakaru (<ruby>彼女<rt>かのじょ</rt></ruby>だったらわかる) — 'if it were her, she'd understand'
• moshi yumemonara samenaide (もし<ruby>夢<rt>ゆめ</rt></ruby>ならさめないで) — 'if this is a dream, don't let me wake' (poetic with なら/だったら interchangeable here)

${MARKER}`,

  // 〜てしまう — end up doing
  "4d5ffbe9-28ba-475a-a185-d090a30e75a3": `〜te shimau (〜てしまう) attaches to a verb's te-form and carries two readings: (a) full / complete completion of an action, and (b) doing something unintentionally or regretfully. Context distinguishes — same form, two senses. Past form 〜te shimatta (〜てしまった). For -de te-forms (e.g., 飲んで), the contraction becomes 〜de shimau (〜でしまう).

In casual speech, 〜te shimau collapses to 〜chau (〜ちゃう), and 〜de shimau collapses to 〜jau (〜じゃう). The past forms are 〜chatta (〜ちゃった) / 〜jatta (〜じゃった). These contractions are extremely common in spoken Japanese, songs, and informal writing.

The "regret" reading is the more emotionally loaded one — 言ってしまった = 'I went and said it (I shouldn't have)'. The "completion" reading is more neutral — 食べてしまった = 'I ate it all'. Some verbs lean strongly one way: 失敗してしまう reads as regret almost always, while 飲み干してしまう reads as completion.

• tabete shimau (<ruby>食<rt>た</rt></ruby>べてしまう) — 'eat it all up / end up eating'
• wasurete shimatta (<ruby>忘<rt>わす</rt></ruby>れてしまった) — 'I went and forgot'
• kowashite shimatta (<ruby>壊<rt>こわ</rt></ruby>してしまった) — 'I broke it (oops)'
• itte shimatta (<ruby>言<rt>い</rt></ruby>ってしまった) — 'I went and said it'
• yonde shimau (<ruby>読<rt>よ</rt></ruby>んでしまう) — 'I'll read it through'
• shinde shimau (<ruby>死<rt>し</rt></ruby>んでしまう) — 'will die / end up dying' (often hyperbolic)
• tabechatta (<ruby>食<rt>た</rt></ruby>べちゃった) — 'I ate it all up' (casual)
• wasurechatta (<ruby>忘<rt>わす</rt></ruby>れちゃった) — 'I (sadly) forgot' (casual)
• yonjatta (<ruby>読<rt>よ</rt></ruby>んじゃった) — 'I read it' (casual)
• owatte shimatta (<ruby>終<rt>お</rt></ruby>わってしまった) — 'it's over now'
• shippai shite shimatta (<ruby>失敗<rt>しっぱい</rt></ruby>してしまった) — 'I screwed up'
• nete shimatta (<ruby>寝<rt>ね</rt></ruby>てしまった) — 'I (accidentally) fell asleep'
• naite shimau (<ruby>泣<rt>な</rt></ruby>いてしまう) — 'I'm going to cry'
• nigete shimatta (<ruby>逃<rt>に</rt></ruby>げてしまった) — 'they ran away'
• modotte kichau (<ruby>戻<rt>もど</rt></ruby>ってきちゃう) — 'ends up coming back' (casual)

${MARKER}`,

  // 〜続ける — keep doing
  "975331f4-03e3-4703-94a7-100d26eb5145": `Attach tsuzukeru (<ruby>続<rt>つづ</rt></ruby>ける, 'to continue') to a verb's i-stem (masu-stem) to create 〜tsuzukeru (〜続ける), meaning 'keep doing (X) / continue to (X)'. Formation: take the masu-stem of any verb and append 続ける directly. arukimasu → aruki tsuzukeru (<ruby>歩<rt>ある</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>ける) — 'keep walking'.

The pattern emphasises persistent, ongoing action — often used in songs and poetic contexts to convey determination ('I'll keep believing', 'keep running'). 続ける conjugates as a regular ichidan verb: tsuzuketa (<ruby>続<rt>つづ</rt></ruby>けた) past, tsuzuketai (<ruby>続<rt>つづ</rt></ruby>けたい) want-to, tsuzuke yo (<ruby>続<rt>つづ</rt></ruby>けよう) volitional.

Compare with 〜tsuzuku (続く, intransitive 'to continue / go on') — uses different verbs as subjects, not as a suffix. And 〜te iku (〜ていく, 'gradually'), 〜te kuru (〜てくる, 'gradually toward now'), 〜oeru (〜終える, 'finish doing') — all aspectual variants. 続ける is the persistent / determined flavour.

• aruki tsuzukeru (<ruby>歩<rt>ある</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>ける) — 'keep walking'
• hashiri tsuzukeru (<ruby>走<rt>はし</rt></ruby>り<ruby>続<rt>つづ</rt></ruby>ける) — 'keep running'
• mamori tsuzukeru (<ruby>守<rt>まも</rt></ruby>り<ruby>続<rt>つづ</rt></ruby>ける) — 'keep protecting'
• matsu → machi tsuzukeru (<ruby>待<rt>ま</rt></ruby>ち<ruby>続<rt>つづ</rt></ruby>ける) — 'keep waiting'
• ai shi tsuzukeru (<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>ける) — 'keep loving'
• sagashi tsuzukeru (<ruby>探<rt>さが</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>ける) — 'keep searching'
• shinji tsuzukeru (<ruby>信<rt>しん</rt></ruby>じ<ruby>続<rt>つづ</rt></ruby>ける) — 'keep believing'
• kaki tsuzukeru (<ruby>書<rt>か</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>ける) — 'keep writing'
• benkyou shi tsuzukeru (<ruby>勉強<rt>べんきょう</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>ける) — 'keep studying'
• yume o oi tsuzukeru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>追<rt>お</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>ける) — 'keep chasing the dream'
• warai tsuzukeru (<ruby>笑<rt>わら</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>ける) — 'keep laughing'
• naki tsuzukeru (<ruby>泣<rt>な</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>ける) — 'keep crying'
• tatakai tsuzukeru (<ruby>戦<rt>たたか</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>ける) — 'keep fighting'
• ikiru → iki tsuzukeru (<ruby>生<rt>い</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>ける) — 'keep living / live on'
• utai tsuzukeru (<ruby>歌<rt>うた</rt></ruby>い<ruby>続<rt>つづ</rt></ruby>ける) — 'keep singing'

${MARKER}`,
};

async function main() {
  const db = getDb();

  // Build canonical name lookup AND old-name list for JSONB sync
  let rulesUpdated = 0;
  const oldToNew: Record<string, { oldName: string; newName: string; oldJlpt: string; newJlpt: string }> = {};
  for (const [id, en] of Object.entries(REWRITES)) {
    const newName = NAME_REWRITES[id];
    if (!newName) { console.error(`no NAME_REWRITES entry for ${id}; skipping`); continue; }
    const before = await db.execute(sql`
      SELECT name, jlpt_reference FROM grammar_rules WHERE id = ${id}::uuid
    `);
    const beforeRows = (before.rows ?? before) as Array<{ name: string; jlpt_reference: string }>;
    if (beforeRows.length === 0) continue;
    const newJlpt = beforeRows[0].jlpt_reference; // preserve JLPT level

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
      newJlpt,
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
