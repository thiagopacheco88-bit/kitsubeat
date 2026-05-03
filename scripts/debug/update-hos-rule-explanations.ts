/**
 * One-off: rewrite the 6 Heart of Sword grammar rule explanations to the
 * locked v2 format (memory:project_grammar_explanation_format).
 *
 * Format per rule:
 *   • Romaji is the primary teaching signal; JP form follows with <ruby>
 *     furigana on the kanji portions only (kana stays bare).
 *   • Three short paragraphs: how-it-works → in this song → distinguishing notes.
 *   • Exactly 15 example sentences as bulleted list. Each example:
 *     "romaji_form (jp_with_furigana) — 'English meaning'".
 *   • Trailing sentinel <!-- v2-romaji-primary --> so the bulk-rewrite-grammar
 *     script's resume filter recognises these as already-v2 and skips them.
 *
 * Updates BOTH grammar_rules (used by Practice exercises) AND the
 * song_versions.lesson.grammar_points JSONB (used by the song-page Grammar tab).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/update-hos-rule-explanations.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

/**
 * Rule name rewrites — romaji-primary pattern + parenthetical English gloss.
 * The original kana-only names ("〜そうだ / 〜そうで") were redundant with the
 * explanation body and made the Grammar tab title unscannable for beginners.
 *
 * Updates BOTH grammar_rules.name AND song_versions.lesson.grammar_points[].name
 * so the (name, jlpt_reference) dedupe key in 12-backfill-grammar-rules.ts
 * stays consistent and re-running the backfill remains idempotent.
 */
const NAME_REWRITES: Record<string, string> = {
  "768ca248-c25d-4e5d-a13f-3a47515dff5f": "〜sou da / 〜sou de (〜そうだ / 〜そうで) — looks like / about to",
  "5dce6151-b1cb-4acf-a41a-b982cd918eb7": "〜ba (〜ば) — general conditional + 〜kya collapse",
  "9a24ae2d-56dd-4dfd-81bf-39aac4839fff": "〜chau (〜ちゃう) — regretful / unintended completion",
  "37ef6108-2544-4faf-ae61-90b0e5c39359": "〜kiru (〜きる) — do completely / thoroughly",
  "d7e3a014-8a19-4ea6-8e7a-d35369701386": "〜kaneru (〜かねる) — find it hard to / cannot bring oneself to",
  "691ce281-42fe-4021-8505-a2866e663a63": "〜noni (〜のに) — although / despite (with regret)",
};

const REWRITES: Record<string, string> = {
  // 768ca248 :: N4 :: 〜そうだ / 〜そうで (looks like / about to)
  "768ca248-c25d-4e5d-a13f-3a47515dff5f": `Attach 〜sou (そう) to a verb's i-stem (ren'youkei, 連用形) or to an adjective stem (drop い from i-adj, drop な from na-adj). It expresses 'looks like / seems about to (X)' based on immediate visual evidence. The te-form 〜sou de (そうで) links it to a following clause; the attributive 〜sou na (そうな) modifies a following noun.

This song uses koesou de (<ruby>越<rt>こ</rt></ruby>えそうで) in yoake no mama de koesou de (<ruby>夜明<rt>よあ</rt></ruby>けのままで <ruby>越<rt>こ</rt></ruby>えそうで) — 'looks like we might cross it stuck at dawn'. The そう reads the situation: it appears the speakers will pass through dawn together — but uncertainly.

Distinguish from 〜sou da (〜そうだ) attached to a plain form, which means 'I hear that (X)' — hearsay, not visual evidence. The visual-evidence sense never attaches to plain forms; the hearsay sense always does. Context and intonation separate them in speech.

• ame ga furi sou da (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>りそうだ) — 'looks like rain'
• oishi sou (<ruby>美味<rt>おい</rt></ruby>しそう) — 'looks delicious'
• ochi sou na hon (<ruby>落<rt>お</rt></ruby>ちそうな<ruby>本<rt>ほん</rt></ruby>) — 'a book about to fall'
• naki sou na kao (<ruby>泣<rt>な</rt></ruby>きそうな<ruby>顔<rt>かお</rt></ruby>) — 'a face about to cry'
• tsukare sou (<ruby>疲<rt>つか</rt></ruby>れそう) — 'looks exhausting'
• nemu sou ni shiteiru (<ruby>眠<rt>ねむ</rt></ruby>そうにしている) — 'looking sleepy'
• taore sou na ki (<ruby>倒<rt>たお</rt></ruby>れそうな<ruby>木<rt>き</rt></ruby>) — 'a tree about to topple'
• wasure sou ni naru (<ruby>忘<rt>わす</rt></ruby>れそうになる) — 'I'm about to forget'
• kowa sou na inu (<ruby>怖<rt>こわ</rt></ruby>そうな<ruby>犬<rt>いぬ</rt></ruby>) — 'a scary-looking dog'
• samu sou (<ruby>寒<rt>さむ</rt></ruby>そう) — 'looks cold'
• sabishi sou na hito (<ruby>寂<rt>さび</rt></ruby>しそうな<ruby>人<rt>ひと</rt></ruby>) — 'a lonely-looking person'
• yume ga kanai sou (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>叶<rt>かな</rt></ruby>いそう) — 'looks like the dream will come true'
• wakari sou de wakaranai (<ruby>分<rt>わ</rt></ruby>かりそうで<ruby>分<rt>わ</rt></ruby>からない) — 'almost get it but don't quite'
• kachi sou na kao (<ruby>勝<rt>か</rt></ruby>ちそうな<ruby>顔<rt>かお</rt></ruby>) — 'a face that looks like winning'
• shinpai sou ni mimamoru (<ruby>心配<rt>しんぱい</rt></ruby>そうに<ruby>見守<rt>みまも</rt></ruby>る) — 'watching anxiously'

${MARKER}`,

  // 5dce6151 :: N4 :: 〜ば (general conditional) and 〜ば collapse
  "5dce6151-b1cb-4acf-a41a-b982cd918eb7": `〜ba (ば) is the general conditional 'if (X)'. For Group 1 verbs (godan), replace -u with -eba: hottoku → hottokeba (<ruby>放<rt>ほう</rt></ruby>っとく → <ruby>放<rt>ほう</rt></ruby>っとけば), iku → ikeba (<ruby>行<rt>い</rt></ruby>く → <ruby>行<rt>い</rt></ruby>けば). For Group 2 (ichidan), drop -ru and add -reba: koeru → koereba (<ruby>越<rt>こ</rt></ruby>える → <ruby>越<rt>こ</rt></ruby>えれば). For i-adjectives, drop い and add ければ: yasui → yasukereba (<ruby>安<rt>やす</rt></ruby>い → <ruby>安<rt>やす</rt></ruby>ければ). Negative is 〜nakereba (なければ).

This song collapses the conditional twice in colloquial speech: butsukatte ikya (ブツかっていきゃ) — full form butsukatte ikeba (ぶつかっていけば) 'if we keep crashing into things'; hottokeba (<ruby>放<rt>ほう</rt></ruby>っとけば) 'if you leave it'. The 〜ba → 〜kya contraction is heavy slang you hear in songs and intimate speech.

Compare with 〜tara (たら), 〜nara (なら), and 〜to (と) — different conditional flavours. 〜ba feels like a natural cause-and-effect implication ('if A, then naturally B'). 〜tara is more sequential ('once A happens, then B'). 〜nara presupposes A as a topic ('given that A, B'). 〜to expresses inevitable outcomes ('whenever A, then always B').

• ikeba wakaru (<ruby>行<rt>い</rt></ruby>けばわかる) — 'if you go, you'll understand'
• yasukereba kau (<ruby>安<rt>やす</rt></ruby>ければ<ruby>買<rt>か</rt></ruby>う) — 'I'll buy it if it's cheap'
• ame ga fureba chuushi (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>れば<ruby>中止<rt>ちゅうし</rt></ruby>) — 'if it rains, it's cancelled'
• isoganakya ma ni awanai (<ruby>急<rt>いそ</rt></ruby>がなきゃ<ruby>間<rt>ま</rt></ruby>に<ruby>合<rt>あ</rt></ruby>わない) — 'I have to hurry or I won't make it' (collapsed 〜nakereba)
• tabereba genki ni naru (<ruby>食<rt>た</rt></ruby>べれば<ruby>元気<rt>げんき</rt></ruby>になる) — 'if you eat, you'll feel better'
• mireba wakaru (<ruby>見<rt>み</rt></ruby>ればわかる) — 'one look and you'll get it'
• shitte ireba oshiete (<ruby>知<rt>し</rt></ruby>っていれば<ruby>教<rt>おし</rt></ruby>えて) — 'tell me if you know'
• okane ga areba kau (お<ruby>金<rt>かね</rt></ruby>があれば<ruby>買<rt>か</rt></ruby>う) — 'I'll buy it if I have money'
• samukereba uwagi o kite (<ruby>寒<rt>さむ</rt></ruby>ければ<ruby>上着<rt>うわぎ</rt></ruby>を<ruby>着<rt>き</rt></ruby>て) — 'put on a jacket if you're cold'
• doryoku sureba dekiru (<ruby>努力<rt>どりょく</rt></ruby>すればできる) — 'you can do it if you try'
• yomeba omoshiroi (<ruby>読<rt>よ</rt></ruby>めば<ruby>面白<rt>おもしろ</rt></ruby>い) — 'it's interesting once you read it'
• ashita harereba yuuenchi (<ruby>明日<rt>あした</rt></ruby><ruby>晴<rt>は</rt></ruby>れれば<ruby>遊園地<rt>ゆうえんち</rt></ruby>) — 'if it's sunny tomorrow, off to the amusement park'
• yasumeba naoru (<ruby>休<rt>やす</rt></ruby>めば<ruby>治<rt>なお</rt></ruby>る) — 'rest and you'll get better'
• kikeba kotaeru (<ruby>聞<rt>き</rt></ruby>けば<ruby>答<rt>こた</rt></ruby>える) — 'I'll answer if you ask'
• tomereba hairenai (<ruby>止<rt>と</rt></ruby>めれば<ruby>入<rt>はい</rt></ruby>れない) — 'if you stop them, they can't enter'

${MARKER}`,

  // 9a24ae2d :: N3 :: 〜ちゃう (regretful / unintended completion)
  "9a24ae2d-56dd-4dfd-81bf-39aac4839fff": `〜chau (ちゃう) is the colloquial collapse of 〜te shimau (てしまう). Both attach to a verb's te-form to express either (a) completing an action thoroughly, or (b) doing something unintentionally / regretfully. Context distinguishes. For verbs whose te-form ends in -de, the contraction becomes -jau (じゃう): yonde shimau → yonjau (<ruby>読<rt>よ</rt></ruby>んじゃう).

This song uses modotte kichau (<ruby>戻<rt>もど</rt></ruby>ってきちゃう) twice: modotte kichau aijou ni (<ruby>戻<rt>もど</rt></ruby>ってきちゃう <ruby>愛情<rt>あいじょう</rt></ruby>に) and modotte kichau ai dakara (<ruby>戻<rt>もど</rt></ruby>ってきちゃう <ruby>愛<rt>あい</rt></ruby>だから) — 'this love just ends up coming back'. The chau carries 'against my will' — the speaker can't help that the love returns.

〜chau is informal — avoid it in business writing or polite speech (use 〜te shimau instead). The past form is 〜chatta (ちゃった) / 〜jatta (じゃった). With certain verbs (失敗しちゃった, 'I screwed up'), the regretful nuance is so baked in that the completion sense fades entirely.

• tabechatta (<ruby>食<rt>た</rt></ruby>べちゃった) — 'I ate it all up / I went and ate it'
• wasurechatta (<ruby>忘<rt>わす</rt></ruby>れちゃった) — 'I (sadly) forgot'
• owacchatta (<ruby>終<rt>お</rt></ruby>わっちゃった) — 'it's all over now'
• icchatta (<ruby>言<rt>い</rt></ruby>っちゃった) — 'I went and said it'
• kowashichatta (<ruby>壊<rt>こわ</rt></ruby>しちゃった) — 'I broke it (oops)'
• yonjatta (<ruby>読<rt>よ</rt></ruby>んじゃった) — 'I read it through / went and read it'
• shinjatta (<ruby>死<rt>し</rt></ruby>んじゃった) — 'they died (sadly)'
• shippai shichatta (<ruby>失敗<rt>しっぱい</rt></ruby>しちゃった) — 'I screwed up'
• chikoku shichau (<ruby>遅刻<rt>ちこく</rt></ruby>しちゃう) — 'I'm going to be late (oh no)'
• nechatta (<ruby>寝<rt>ね</rt></ruby>ちゃった) — 'I (accidentally) fell asleep'
• naichatta (<ruby>泣<rt>な</rt></ruby>いちゃった) — 'I cried (couldn't help it)'
• nigechatta (<ruby>逃<rt>に</rt></ruby>げちゃった) — 'they ran away (sadly)'
• yacchatta (やっちゃった) — 'I (went and) did it'
• omoidashichatta (<ruby>思<rt>おも</rt></ruby>い<ruby>出<rt>だ</rt></ruby>しちゃった) — 'I just remembered (and now I'm sad)'
• machigaechatta (<ruby>間違<rt>まちが</rt></ruby>えちゃった) — 'I made a mistake'

${MARKER}`,

  // 37ef6108 :: N3 :: 〜きる (do completely / thoroughly)
  "37ef6108-2544-4faf-ae61-90b0e5c39359": `Attach kiru (<ruby>切<rt>き</rt></ruby>る, literally 'cut') as a verbal suffix to a verb's i-stem to create 〜kiru (きる), meaning 'do (X) completely / through to the end'. Often paired with quantifiable actions — eating, drinking, reading, finishing. The completion is total: nothing left after.

This song uses shinu made ni tsukai kiru un no kazu (<ruby>死<rt>し</rt></ruby>ぬまでに<ruby>使<rt>つか</rt></ruby>いきる <ruby>運<rt>うん</rt></ruby>の<ruby>数<rt>かず</rt></ruby>) — 'the amount of luck I'll use up before dying'. tsukai kiru = '(use) every last bit'. The 〜kiru finalises the action — there's nothing left after.

Compare with 〜oeru (<ruby>終<rt>お</rt></ruby>える, 'to finish doing'), which signals task completion without the 'thoroughly / down to nothing' nuance. 〜kiru emphasises exhausting the object or capacity. The opposite, 〜kirenai (きれない), means 'cannot finish (X)' — too much to consume.

• tabe kiru (<ruby>食<rt>た</rt></ruby>べきる) — 'to eat it all'
• nomi kiru (<ruby>飲<rt>の</rt></ruby>みきる) — 'to drink it all up'
• hashiri kiru (<ruby>走<rt>はし</rt></ruby>りきる) — 'to run all the way'
• yomi kiru (<ruby>読<rt>よ</rt></ruby>みきる) — 'to finish reading'
• ii kiru (<ruby>言<rt>い</rt></ruby>いきる) — 'to assert categorically'
• moe kiru (<ruby>燃<rt>も</rt></ruby>えきる) — 'to burn out completely'
• tsukai kiru (<ruby>使<rt>つか</rt></ruby>いきる) — 'to use up every bit'
• uri kiru (<ruby>売<rt>う</rt></ruby>りきる) — 'to sell out completely'
• kaki kiru (<ruby>書<rt>か</rt></ruby>ききる) — 'to write to the end'
• yari kiru (やりきる) — 'to see it through'
• tatakai kiru (<ruby>戦<rt>たたか</rt></ruby>いきる) — 'to fight to the very end'
• nori kiru (<ruby>乗<rt>の</rt></ruby>りきる) — 'to weather it / ride it out'
• kiki kiru (<ruby>聞<rt>き</rt></ruby>ききる) — 'to listen all the way through'
• utai kiru (<ruby>歌<rt>うた</rt></ruby>いきる) — 'to sing all the way to the end'
• kotae kireru (<ruby>答<rt>こた</rt></ruby>えきれる) — 'to be able to answer all of them'

${MARKER}`,

  // d7e3a014 :: N1 :: 〜かねる (find it hard to / cannot bring oneself to)
  "d7e3a014-8a19-4ea6-8e7a-d35369701386": `Attach kaneru (<ruby>兼<rt>か</rt></ruby>ねる) as a suffix to a verb's i-stem to create 〜kaneru (かねる), expressing 'find it difficult to / cannot quite (X)' — a hedged, formal negative. Common in business and formal writing. Carries no nuance of physical inability; it's a polite refusal or hesitation.

This song uses shinji kaneru utare tsuyosa (<ruby>信<rt>しん</rt></ruby>じかねる <ruby>打<rt>う</rt></ruby>たれ<ruby>強<rt>つよ</rt></ruby>さ) — 'a resilience hard to believe'. shinji kaneru is more elegant than shinjirarenai (<ruby>信<rt>しん</rt></ruby>じられない) — used here for poetic register.

The opposite 〜kanenai (かねない) — same suffix, negative ending — means 'might (do something undesirable)'. yari kanenai = 'they might just do it' (with implicit warning). Don't confuse the two: the polarity flips the meaning, not just the mood.

• okotae shi kanemasu (お<ruby>答<rt>こた</rt></ruby>えしかねます) — 'I'm afraid I can't answer'
• sansei shi kaneru (<ruby>賛成<rt>さんせい</rt></ruby>しかねる) — 'I cannot really agree'
• rikai shi kaneru (<ruby>理解<rt>りかい</rt></ruby>しかねる) — 'hard to comprehend'
• souzou shi kaneru (<ruby>想像<rt>そうぞう</rt></ruby>しかねる) — 'hard to imagine'
• handan shi kaneru (<ruby>判断<rt>はんだん</rt></ruby>しかねる) — 'I cannot judge'
• okotowari shi kanemasu (お<ruby>断<rt>ことわ</rt></ruby>りしかねます) — 'I'm afraid I must decline'
• shinji kaneru (<ruby>信<rt>しん</rt></ruby>じかねる) — 'hard to believe'
• uke ire kaneru (<ruby>受<rt>う</rt></ruby>け<ruby>入<rt>い</rt></ruby>れかねる) — 'unable to accept'
• wakari kaneru (<ruby>分<rt>わ</rt></ruby>かりかねる) — 'I cannot quite tell'
• otsutae shi kaneru (お<ruby>伝<rt>つた</rt></ruby>えしかねる) — 'I am not in a position to convey this'
• okuri kaneru (<ruby>送<rt>おく</rt></ruby>りかねる) — 'unable to send'
• kotae kaneru (<ruby>答<rt>こた</rt></ruby>えかねる) — 'I find it hard to answer'
• ohanashi shi kaneru (お<ruby>話<rt>はなし</rt></ruby>しかねる) — 'I find it hard to say'
• ouke shi kanemasu (お<ruby>受<rt>う</rt></ruby>けしかねます) — 'I cannot accept (your offer)'
• mitome kaneru (<ruby>認<rt>みと</rt></ruby>めかねる) — 'I cannot quite acknowledge'

${MARKER}`,

  // 691ce281 :: N3 :: 〜のに (although; despite — with regret/frustration)
  "691ce281-42fe-4021-8505-a2866e663a63": `noni (のに) connects two clauses where the second contradicts what one would expect from the first. Unlike neutral kedo (けど), noni carries strong emotional colour — typically disappointment, frustration, or surprise. Attaches to plain forms of verbs and i-adjectives; for nouns and na-adjectives, use 〜na noni (なのに).

This song uses it in kimi nara doo ni demo rikutsu o kaete ii noni (<ruby>君<rt>きみ</rt></ruby>ならどーにでも <ruby>理屈<rt>りくつ</rt></ruby>を<ruby>変<rt>か</rt></ruby>えていいのに) — 'you could twist the logic any way you like, but...'. The noni lands as accusatory — 'and yet you don't'. The trailing implication: 'why don't you just do it'.

のに at the end of a sentence (sentence-final) often expresses regret or dissatisfaction with no following clause: '...even though it should be otherwise'. Compare with kedo (けど), which is neutral, and ga (が), which is more formal but lacks the emotional weight of noni.

• benkyou shita noni, tesuto ni ochita (<ruby>勉強<rt>べんきょう</rt></ruby>したのに、テストに<ruby>落<rt>お</rt></ruby>ちた) — 'even though I studied, I failed the test'
• ame da to itta noni, kasa o motte konakatta (<ruby>雨<rt>あめ</rt></ruby>だと<ruby>言<rt>い</rt></ruby>ったのに、<ruby>傘<rt>かさ</rt></ruby>を<ruby>持<rt>も</rt></ruby>って<ruby>来<rt>こ</rt></ruby>なかった) — 'I told you it would rain, yet you didn't bring an umbrella'
• shizuka na noni nemurenai (<ruby>静<rt>しず</rt></ruby>かなのに<ruby>眠<rt>ねむ</rt></ruby>れない) — 'even though it's quiet, I can't sleep'
• takai noni mazui (<ruby>高<rt>たか</rt></ruby>いのにまずい) — 'expensive but tastes bad'
• ganbatta noni dame datta (<ruby>頑張<rt>がんば</rt></ruby>ったのにダメだった) — 'I tried my best but it didn't work out'
• wakai noni kashikoi (<ruby>若<rt>わか</rt></ruby>いのに<ruby>賢<rt>かしこ</rt></ruby>い) — 'wise despite being young'
• okane ga aru noni shiawase ja nai (お<ruby>金<rt>かね</rt></ruby>があるのに<ruby>幸<rt>しあわ</rt></ruby>せじゃない) — 'has money but isn't happy'
• kawaii noni seikaku ga warui (<ruby>可愛<rt>かわい</rt></ruby>いのに<ruby>性格<rt>せいかく</rt></ruby>が<ruby>悪<rt>わる</rt></ruby>い) — 'cute, but mean-spirited'
• yakusoku shita noni konakatta (<ruby>約束<rt>やくそく</rt></ruby>したのに<ruby>来<rt>こ</rt></ruby>なかった) — 'they promised but didn't come'
• dekiru noni shinai (できるのにしない) — 'they could do it but they don't'
• kodomo na noni otonabita (<ruby>子供<rt>こども</rt></ruby>なのに<ruby>大人<rt>おとな</rt></ruby>びた) — 'mature despite being a child'
• itte oita noni wasureta no? (<ruby>言<rt>い</rt></ruby>っておいたのに<ruby>忘<rt>わす</rt></ruby>れたの？) — 'I told you, did you forget?'
• matta noni konakatta (<ruby>待<rt>ま</rt></ruby>ったのに<ruby>来<rt>こ</rt></ruby>なかった) — 'I waited but they didn't show'
• ii hito na noni... (いい<ruby>人<rt>ひと</rt></ruby>なのに...) — 'they're a good person, but...' (sentence-final regret)
• eigo o benkyou shita noni hanasenai (<ruby>英語<rt>えいご</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>したのに<ruby>話<rt>はな</rt></ruby>せない) — 'I studied English but can't speak it'

${MARKER}`,
};

async function main() {
  const db = getDb();

  // Step 1: update grammar_rules (used by Practice exercises / intro card).
  // We need OLD names to find matching grammar_points in JSONB (which still
  // hold the original kana-only names) before flipping to the new names.
  let rulesUpdated = 0;
  const oldToNewName: Record<string, { oldName: string; newName: string; jlpt: string }> = {};
  for (const [id, en] of Object.entries(REWRITES)) {
    const newName = NAME_REWRITES[id];
    if (!newName) {
      console.error(`no NAME_REWRITES entry for ${id}; skipping`);
      continue;
    }
    // Read the old name first so JSONB sync can match by it.
    const before = await db.execute(sql`
      SELECT name, jlpt_reference FROM grammar_rules WHERE id = ${id}::uuid
    `);
    const beforeRows = (before.rows ?? before) as Array<{ name: string; jlpt_reference: string }>;
    if (beforeRows.length === 0) continue;

    const newExplanation = { en };
    await db.execute(sql`
      UPDATE grammar_rules
      SET explanation = ${JSON.stringify(newExplanation)}::jsonb,
          name = ${newName},
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
    oldToNewName[id] = {
      oldName: beforeRows[0].name,
      newName,
      jlpt: beforeRows[0].jlpt_reference,
    };
    rulesUpdated++;
  }
  console.log(`updated ${rulesUpdated} grammar_rules (name + explanation)`);

  // Step 2: propagate the same explanations into song_versions.lesson.grammar_points
  // (used by the song page's Grammar tab). Match by (name, jlpt_reference).
  const versionRes = await db.execute(sql`
    SELECT sv.id, sv.lesson
    FROM song_versions sv
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
      // Match by OLD name (gp.name is the pre-rewrite kana form OR already the
      // new romaji form if a prior run already migrated this grammar_point).
      const matchId = Object.entries(oldToNewName).find(
        ([, info]) =>
          (info.oldName.trim() === (gp.name ?? "").trim() ||
           info.newName.trim() === (gp.name ?? "").trim()) &&
          info.jlpt.trim() === (gp.jlpt_reference ?? "").trim(),
      )?.[0];
      if (!matchId) continue;
      gp.name = oldToNewName[matchId].newName;
      gp.explanation = { en: REWRITES[matchId] };
      mutated = true;
    }

    if (mutated) {
      await db.execute(sql`
        UPDATE song_versions
        SET lesson = ${JSON.stringify(lesson)}::jsonb,
            updated_at = NOW()
        WHERE id = ${v.id}::uuid
      `);
      lessonsUpdated++;
    }
  }
  console.log(`updated ${lessonsUpdated} song_versions.lesson.grammar_points`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
