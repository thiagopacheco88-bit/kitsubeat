/**
 * Batch 3b — 25 v2-format grammar rule explanations (final batch of the 50-rule run).
 *
 * Continues the inline-Claude rewrite stream:
 *   batch1 (10) → batch2 (15) → batch3a (25) → batch3b (this, 25) = 75 v2 rules total.
 *
 * Selection: ranks 1-15 + 17-26 of the post-batch3a queue. Skipped from this
 * batch and deferred to pass 4 dedup as obvious duplicates of existing v2
 * canonicals:
 *   - 284f8804 〜てく → a0d93554 〜ていく (batch3a, casual contraction)
 *   - afdceda7 〜のに  → 8748faec 〜noni (batch2)
 *   - 09478338 受身形  → 5f70f52a Passive 〜(ら)れる (batch3a)
 *   - 48215292 意志形  → 75765b3c Volitional 〜you/ou (batch2)
 *   - d1afdbf7 命令形 N3 → ebd9bcdf 命令形 N4 (batch1)
 *   - 684d6fd0 〜てる   → 28040405 〜te iru/〜teru (batch1)
 *
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/update-batch3b-rules.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "e099e98b-d943-471b-a6f7-60a0f158cd14": "〜nakya (〜なきゃ) — gotta / must (casual)",
  "49fba520-a454-4d3b-913c-35e6aa990829": "〜n darou (〜んだろう) — explanatory conjecture",
  "bde81cdd-76c3-4f05-a902-d1bfdeb5ea76": "〜kakeru (〜かける) — about to / partially done",
  "1ef3e2d7-8393-4513-b1b6-81d93c2b1549": "tatoe 〜demo (たとえ〜でも) — even if (strong concessive)",
  "cca60ff5-153c-4c71-8859-ff59163cd7d9": "〜te ageru (〜てあげる) — doing for someone's benefit",
  "7546c279-a5a1-4000-bb87-a6ab9ca419eb": "〜te miru (〜てみる) — try doing / give it a try",
  "ecdf4566-dd99-4a6f-bed5-473e9ba18e84": "〜nakute ii (〜なくていい) — don't have to",
  "583a6e56-7874-4efd-9dc2-21b5ce2300df": "〜nakute mo (〜なくても) — even without doing",
  "cf6c9f79-3a4d-4227-a32e-cced4debb9ef": "〜wake ga nai (〜わけがない) — there's no way / impossible",
  "0e471da0-a5fc-4486-9c83-6fcf29926111": "〜sou (〜そう) — looks like / I heard (visual + hearsay)",
  "d2c689cc-c7b1-4e28-b26d-c07dbe503840": "〜takunai (〜たくない) — don't want to",
  "17aedcea-dd37-4c90-b25e-9b39fdd5815e": "〜tabi ni (〜たびに) — each time / every time",
  "d795b132-df64-4e4b-a3e5-d7e9b91a942b": "〜dake (〜だけ) — only / just (neutral)",
  "c96afb7b-cc6a-4e4a-9d11-07b5a46e566e": "〜te form (〜て) — connecting actions / sequence",
  "4bf73669-f3e6-47ed-bfae-570bfd4ea370": "〜to shite mo (〜としても) — even supposing / even if",
  "c4a89586-ffd1-47dc-bb76-73608793f04c": "〜naraba (〜ならば) — literary / formal 〜nara",
  "d058db02-2b24-455a-8966-93a3aa65d9df": "〜nu (〜ぬ) — classical negative (= 〜ない)",
  "f5280e84-a494-4aa7-a7e7-42b878eddd0d": "〜no wa 〜da (〜のは〜だ) — emphasis cleft / it is X that",
  "a26c69c5-5c7e-4fae-a6b3-5b1151b1fc8f": "〜ki ga suru (〜気がする) — feel like / have a hunch",
  "0a113c07-9391-43d8-8e6d-5ab070401a09": "de (で) — means / instrument / location of action",
  "23e8091a-08c3-4c70-8ed9-dc7dd8361707": "〜kana (〜かな) — I wonder",
  "88fee13d-6632-45bc-91b3-f80f677e2d0a": "〜kamo shirenai (〜かもしれない) — might / perhaps",
  "e59dfad2-264d-4e28-92dd-c02726a3a516": "〜kiri (〜きり) — just / only / nothing since",
  "f8364773-e5b7-4064-991a-1238030f9e00": "〜kiru (〜きる) — do completely / through to the end",
  "7ca38620-e36b-434c-bdad-84e764f5be5b": "〜keredo (〜けれど / 〜けど) — although / but",
};

const REWRITES: Record<string, string> = {
  // 〜なきゃ — gotta / must (casual)
  "e099e98b-d943-471b-a6f7-60a0f158cd14": `〜nakya (〜なきゃ) is the casual contraction of 〜nakereba (〜なければ), the conditional negative form. Add it to a verb's nai-stem: taberu → tabe-nakya (<ruby>食<rt>た</rt></ruby>べなきゃ) 'gotta eat'. The full underlying structure is 〜nakereba ikenai / naranai / dame ('if X is not done, it's no good') — but in spoken Japanese, the trailing ikenai/dame is almost always dropped, so 〜nakya alone carries the full 'must / gotta' meaning.

Variant casual contractions: 〜nakucha (〜なくちゃ) is interchangeable, with slightly more emphatic / urgent feel. The non-contracted forms (〜nakereba ikenai / 〜nakereba naranai) are bookish or formal. The literary 〜neba naranai is even more elevated. In conversation, songs, and casual writing, 〜nakya / 〜nakucha dominate.

Compare with 〜beki (〜べき, moral 'should / ought to' — about right vs. wrong, not necessity), 〜hou ga ii (〜<ruby>方<rt>ほう</rt></ruby>がいい, 'better to' — soft recommendation), and the negative 〜naide (without doing — different pattern entirely). 〜nakya is for inescapable necessity — the urgent must.

• tabe-nakya (<ruby>食<rt>た</rt></ruby>べなきゃ) — 'gotta eat'
• ika-nakya (<ruby>行<rt>い</rt></ruby>かなきゃ) — 'gotta go'
• kaera-nakya (<ruby>帰<rt>かえ</rt></ruby>らなきゃ) — 'gotta head home'
• nemu-nakya (<ruby>寝<rt>ね</rt></ruby>なきゃ) — 'gotta sleep'
• benkyou shi-nakya (<ruby>勉強<rt>べんきょう</rt></ruby>しなきゃ) — 'gotta study'
• shigoto shi-nakya (<ruby>仕事<rt>しごと</rt></ruby>しなきゃ) — 'gotta work'
• ki o tsuke-nakya (<ruby>気<rt>き</rt></ruby>をつけなきゃ) — 'gotta be careful'
• isoga-nakya (<ruby>急<rt>いそ</rt></ruby>がなきゃ) — 'gotta hurry'
• ganbara-nakya (<ruby>頑張<rt>がんば</rt></ruby>らなきゃ) — 'gotta try hard'
• ima ika-nakya (<ruby>今<rt>いま</rt></ruby><ruby>行<rt>い</rt></ruby>かなきゃ) — 'I gotta go now'
• shiawase ni nara-nakya (<ruby>幸<rt>しあわ</rt></ruby>せにならなきゃ) — 'gotta be happy'
• tsutae-nakya (<ruby>伝<rt>つた</rt></ruby>えなきゃ) — 'gotta tell (them)'
• damattera-nakya (<ruby>黙<rt>だま</rt></ruby>ってらなきゃ) — 'gotta stay silent'
• mata aware-nakya (また<ruby>会<rt>あ</rt></ruby>わなきゃ) — 'we gotta meet again'
• ikiteika-nakya (<ruby>生<rt>い</rt></ruby>きていかなきゃ) — 'gotta keep on living'

${MARKER}`,

  // 〜んだろう — explanatory conjecture
  "49fba520-a454-4d3b-913c-35e6aa990829": `〜n darou (〜んだろう) combines the explanatory particle no (〜の, contracted to 〜ん in casual speech) with the conjectural copula darou (〜だろう). Attaches to plain-form sentences. Carries the meaning 'I'd guess that X is the case (because of some evidence / reason)' — distinct from bare 〜darou ('probably X', no underlying reason implied).

The 〜n / 〜no part adds explanation or context — there's a felt cause, observation, or shared circumstance behind the speculation. naite iru n darou (<ruby>泣<rt>な</rt></ruby>いているんだろう) 'I bet they're crying (and there's a reason)'. Compared to bare naite iru darou which would just be a guess about whether they're crying.

Casual contractions: 〜n daro (〜んだろ) male spoken, 〜n desho (〜んでしょ) gentler / female. Question form 〜n darou ka (〜んだろうか) is reflective — 'I wonder why / how (is it that) X'. Compare with 〜hazu (high-confidence inference), 〜kamo shirenai (genuine uncertainty), and bare 〜darou (light conjecture). The 〜n adds emotional or evidential depth.

• naite iru n darou (<ruby>泣<rt>な</rt></ruby>いているんだろう) — "I bet they're crying"
• tsukareta n darou (<ruby>疲<rt>つか</rt></ruby>れたんだろう) — 'must be tired'
• shitte iru n darou (<ruby>知<rt>し</rt></ruby>っているんだろう) — 'must already know'
• kuru n darou ka (<ruby>来<rt>く</rt></ruby>るんだろうか) — 'I wonder if they'll come'
• naze nai-n darou (なぜないんだろう) — 'I wonder why there isn't any'
• boku no koto, oboeteru n darou? (<ruby>僕<rt>ぼく</rt></ruby>のこと、<ruby>覚<rt>おぼ</rt></ruby>えてるんだろ？) — "you remember me, don't you?" (casual)
• mou nai n darou (もうないんだろう) — 'must be gone now'
• mada matteru n daro (まだ<ruby>待<rt>ま</rt></ruby>ってるんだろ) — "you're still waiting, right?"
• shiawase nan darou (<ruby>幸<rt>しあわ</rt></ruby>せなんだろう) — 'must be happy'
• arigatou tte koto nan darou (ありがとうってことなんだろう) — 'I guess it means thank you'
• zenbu uso datta n darou (<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>嘘<rt>うそ</rt></ruby>だったんだろう) — 'must have all been a lie'
• kimi mo onaji nan desho (<ruby>君<rt>きみ</rt></ruby>も<ruby>同<rt>おな</rt></ruby>じなんでしょ) — "you're the same way, aren't you"
• naze konnani kanashii n darou (なぜこんなに<ruby>悲<rt>かな</rt></ruby>しいんだろう) — 'I wonder why I feel this sad'
• modoritakute iru n darou (<ruby>戻<rt>もど</rt></ruby>りたくているんだろう) — 'must want to go back'
• shinpai shite kureteru n darou (<ruby>心配<rt>しんぱい</rt></ruby>してくれてるんだろう) — 'they must be worrying about me'

${MARKER}`,

  // 〜かける — about to / partially done
  "bde81cdd-76c3-4f05-a902-d1bfdeb5ea76": `〜kakeru (〜かける / 〜<ruby>掛<rt>か</rt></ruby>ける) attaches kakeru ('to hang / to start') to a verb's masu-stem. Two distinct readings: (a) On the verge — 'about to do X / on the brink of X' — shini-kakeru (<ruby>死<rt>し</rt></ruby>にかける) 'on the verge of dying'. (b) Partially done — 'started X but didn't finish' — yomi-kake no hon (<ruby>読<rt>よ</rt></ruby>みかけの<ruby>本<rt>ほん</rt></ruby>) 'a half-read book'. Conjugates as a regular ichidan verb.

The 'about to' sense often pairs with rescue or recovery: koware-kaketa kokoro (<ruby>壊<rt>こわ</rt></ruby>れかけた<ruby>心<rt>こころ</rt></ruby>) 'a heart on the verge of breaking'. Used heavily in lyrics for fragility / threshold imagery. The 'partially done' sense is everyday — yari-kake no shukudai (やりかけの<ruby>宿題<rt>しゅくだい</rt></ruby>) 'half-done homework'.

Compare with 〜hajimeru (begin to — neutral, planned), 〜dasu (sudden onset, abrupt), 〜sou (looks about to, evidential), and 〜tokoro (just about to / just X-ed — temporal). 〜kakeru is the threshold word — caught at the edge, neither fully begun nor finished. Often nominalised as 〜kake (〜かけ) for the noun form: ii-kake no kotoba (<ruby>言<rt>い</rt></ruby>いかけの<ruby>言葉<rt>ことば</rt></ruby>) 'words half-spoken'.

• shini-kakeru (<ruby>死<rt>し</rt></ruby>にかける) — 'on the verge of dying'
• naki-kakeru (<ruby>泣<rt>な</rt></ruby>きかける) — 'about to cry'
• taore-kakeru (<ruby>倒<rt>たお</rt></ruby>れかける) — 'about to collapse'
• koware-kaketa (<ruby>壊<rt>こわ</rt></ruby>れかけた) — 'on the verge of breaking'
• tsubure-kakeru (<ruby>潰<rt>つぶ</rt></ruby>れかける) — 'about to be crushed'
• yomi-kake (<ruby>読<rt>よ</rt></ruby>みかけ) — 'partially read'
• tabe-kake (<ruby>食<rt>た</rt></ruby>べかけ) — 'partially eaten'
• kaki-kake (<ruby>書<rt>か</rt></ruby>きかけ) — 'partially written'
• ii-kake no kotoba (<ruby>言<rt>い</rt></ruby>いかけの<ruby>言葉<rt>ことば</rt></ruby>) — 'words half-spoken'
• yari-kake (やりかけ) — 'half-done'
• kie-kakeru (<ruby>消<rt>き</rt></ruby>えかける) — 'about to disappear'
• wasure-kakeru (<ruby>忘<rt>わす</rt></ruby>れかける) — 'starting to forget'
• ai shi-kakeru (<ruby>愛<rt>あい</rt></ruby>しかける) — 'starting to love'
• shinjikaketa (<ruby>信<rt>しん</rt></ruby>じかけた) — 'almost believed'
• yume ga sake-kaketa (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>裂<rt>さ</rt></ruby>けかけた) — 'the dream was about to tear apart'

${MARKER}`,

  // たとえ〜でも — even if (strong concessive)
  "1ef3e2d7-8393-4513-b1b6-81d93c2b1549": `tatoe 〜demo (たとえ〜でも) is a paired construction — tatoe (たとえ, 'even if / supposing') at the start of the conditional clause, demo or temo at the end. Strong concession: the speaker insists their statement holds 'no matter what'. tatoe ame ga futte mo iku (たとえ<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>っても<ruby>行<rt>い</rt></ruby>く) 'I'll go even if it rains'.

The tatoe at the front signals to the listener 'a strong concession is coming' — this raises the emotional weight compared to plain 〜temo (which can be casual or weak). Often paired with absolute adverbs at the end: zettai (<ruby>絶対<rt>ぜったい</rt></ruby>, 'definitely'), kanarazu (<ruby>必<rt>かなら</rt></ruby>ず, 'without fail'), nanika atte mo ('no matter what').

Variants: tatoe + 〜tatte (casual), tatoe + 〜to shite mo (formal). Compare with batch2's 〜temo (basic concession), 〜tatte (casual concession), and 〜noni (despite — for actual contradictions, not hypothetical). tatoe〜demo is the strong, dramatic, often emotional concession — perfect for songs and declarations.

• tatoe ame ga futte mo (たとえ<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>っても) — 'even if it rains'
• tatoe shinde mo (たとえ<ruby>死<rt>し</rt></ruby>んでも) — 'even if I die'
• tatoe kimi ga inakute mo (たとえ<ruby>君<rt>きみ</rt></ruby>がいなくても) — "even if you're not here"
• tatoe yume demo (たとえ<ruby>夢<rt>ゆめ</rt></ruby>でも) — 'even if it's a dream'
• tatoe sekai ga owatte mo (たとえ<ruby>世界<rt>せかい</rt></ruby>が<ruby>終<rt>お</rt></ruby>わっても) — 'even if the world ends'
• tatoe nani ga atte mo (たとえ<ruby>何<rt>なに</rt></ruby>があっても) — 'no matter what happens'
• tatoe boku dake demo (たとえ<ruby>僕<rt>ぼく</rt></ruby>だけでも) — 'even if it's only me'
• tatoe jikan ga kakatte mo (たとえ<ruby>時間<rt>じかん</rt></ruby>がかかっても) — 'even if it takes time'
• tatoe machigatte mo (たとえ<ruby>間違<rt>まちが</rt></ruby>っても) — 'even if I'm wrong'
• tatoe kotoba ni dekinakute mo (たとえ<ruby>言葉<rt>ことば</rt></ruby>にできなくても) — "even if I can't put it into words"
• tatoe wasuretemo (たとえ<ruby>忘<rt>わす</rt></ruby>れても) — 'even if I forget'
• tatoe hanareteite mo (たとえ<ruby>離<rt>はな</rt></ruby>れていても) — 'even if we're apart'
• tatoe ushinatte mo (たとえ<ruby>失<rt>うしな</rt></ruby>っても) — 'even if I lose (it)'
• tatoe ima wa wakaranakute mo (たとえ<ruby>今<rt>いま</rt></ruby>はわからなくても) — "even if I don't understand now"
• tatoe doko ni ite mo (たとえどこにいても) — 'no matter where I am'

${MARKER}`,

  // 〜てあげる — doing for someone's benefit
  "cca60ff5-153c-4c71-8859-ff59163cd7d9": `〜te ageru (〜てあげる) attaches ageru (<ruby>上<rt>あ</rt></ruby>げる, 'to give upward') to a verb's te-form. The speaker (or in-group) does X as a favour for someone else. The mirror of batch2's 〜te kureru (someone does X for me): here, the speaker is the BENEFACTOR, the listener or third party is the recipient.

Three giving-and-receiving auxiliaries: 〜te ageru (I do for you / them), 〜te kureru (someone does for me), 〜te morau (I receive someone doing). Politeness levels: 〜te sashiage-ru (humble, for higher status recipients), 〜te yaru (rough male / when speaking down to subordinates / when speaking to objects or animals).

A pragmatic warning: directly saying 〜te ageru to a Japanese listener can sound condescending — 'I am doing you the favour of X'. Soften with 〜te ageyou ka (offering politely 'shall I X for you?') or rephrase with 〜te kureru no? from the recipient's side. Compare with batch3a's Causative + kure ('let me do X' — speaker requests permission to act). 〜te ageru is the classroom-textbook way to talk about doing favours, but use carefully in real conversation.

• tetsudatte ageru (<ruby>手伝<rt>てつだ</rt></ruby>ってあげる) — "I'll help (you)"
• oshiete ageru (<ruby>教<rt>おし</rt></ruby>えてあげる) — "I'll teach (you)"
• tsukutte ageta (<ruby>作<rt>つく</rt></ruby>ってあげた) — 'made it for them'
• yatte ageyou ka (やってあげようか) — 'shall I do it for you?'
• mamotte ageru (<ruby>守<rt>まも</rt></ruby>ってあげる) — "I'll protect (you)"
• kashite ageru (<ruby>貸<rt>か</rt></ruby>してあげる) — "I'll lend (it to you)"
• motte ageyou ka (<ruby>持<rt>も</rt></ruby>ってあげようか) — 'shall I carry it?'
• yonde ageru (<ruby>読<rt>よ</rt></ruby>んであげる) — "I'll read (it) for (you)"
• matte ageru (<ruby>待<rt>ま</rt></ruby>ってあげる) — "I'll wait for (you)"
• tasukete ageru (<ruby>助<rt>たす</rt></ruby>けてあげる) — "I'll help / save (you)"
• kanaete ageru (<ruby>叶<rt>かな</rt></ruby>えてあげる) — "I'll grant (it) for (you)"
• shinjite ageyou (<ruby>信<rt>しん</rt></ruby>じてあげよう) — "I'll believe in (you)"
• naka-sete ageru (<ruby>泣<rt>な</rt></ruby>かせてあげる) — "I'll let (you) cry" (gentler)
• egao ni shite ageru (<ruby>笑顔<rt>えがお</rt></ruby>にしてあげる) — "I'll make (you) smile"
• shoukai shite ageru (<ruby>紹介<rt>しょうかい</rt></ruby>してあげる) — "I'll introduce (you)"

${MARKER}`,

  // 〜てみる — try doing / give it a try
  "7546c279-a5a1-4000-bb87-a6ab9ca419eb": `〜te miru (〜てみる) attaches miru (<ruby>見<rt>み</rt></ruby>る, 'to see') to a verb's te-form, expressing 'try doing X (and see what happens / how it turns out)'. The speaker undertakes X as an experiment, attempt, or first try. tabete miru (<ruby>食<rt>た</rt></ruby>べてみる) 'give it a taste / try eating it'. The miru auxiliary loses its literal 'see' meaning here — written in kana to mark the auxiliary use.

Past form 〜te mita expresses 'tried it (and here's what happened)'. Negative 〜te minai means 'don't try' or, in the question form 〜te minai? ('how about trying X?'), is a soft suggestion. Conditional 〜te mireba ('if (you) try') and volitional 〜te miyou ('let's try') are also extremely common.

Compare with 〜tameshi ni (<ruby>試<rt>ため</rt></ruby>しに, 'as a test / experimentally' — more deliberate, often for product trials), 〜tetokoro (just about to do — different aspect), and the auxiliary 〜te oku (do in advance — purposeful preparation, not exploratory). 〜te miru is the everyday 'give it a shot' — low-stakes, exploratory, with implicit 'and we'll see'.

• tabete miru (<ruby>食<rt>た</rt></ruby>べてみる) — 'try eating'
• yatte miru (やってみる) — 'give it a try'
• kiite miru (<ruby>聞<rt>き</rt></ruby>いてみる) — 'try asking / listen and see'
• yonde miru (<ruby>読<rt>よ</rt></ruby>んでみる) — 'try reading'
• kangaete miru (<ruby>考<rt>かんが</rt></ruby>えてみる) — 'try thinking it over'
• kaite mita (<ruby>書<rt>か</rt></ruby>いてみた) — 'tried writing'
• itte miyou (<ruby>行<rt>い</rt></ruby>ってみよう) — 'let's try going'
• tsukatte miru (<ruby>使<rt>つか</rt></ruby>ってみる) — 'try using (it)'
• hanashite minai? (<ruby>話<rt>はな</rt></ruby>してみない？) — 'how about trying to talk?'
• shinjite miru (<ruby>信<rt>しん</rt></ruby>じてみる) — 'try believing'
• mukatte miru (<ruby>向<rt>む</rt></ruby>かってみる) — 'try heading toward'
• ai shite miru (<ruby>愛<rt>あい</rt></ruby>してみる) — 'try loving'
• matte miru (<ruby>待<rt>ま</rt></ruby>ってみる) — 'try waiting'
• yume wo oikakete miru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>追<rt>お</rt></ruby>いかけてみる) — 'try chasing the dream'
• mou ichido yatte miyou (もう<ruby>一度<rt>いちど</rt></ruby>やってみよう) — "let's try one more time"

${MARKER}`,

  // 〜なくていい — don't have to
  "ecdf4566-dd99-4a6f-bed5-473e9ba18e84": `〜nakute ii (〜なくていい) attaches the te-form of the negative (nai-stem + kute) plus the i-adjective ii (<ruby>良<rt>い</rt></ruby>い, 'good / okay'). Means 'don't have to do X / it's fine not to'. The grant of permission NOT to do something. taberu → tabe-nakute ii (<ruby>食<rt>た</rt></ruby>べなくていい) 'you don't have to eat'.

The structure literally reads 'not doing X is good' — explicit permission to opt out. Polite: 〜nakute ii desu / 〜nakute mo ii desu. Slightly stronger / more emphatic version: 〜nakute mo ii (<ruby>食<rt>た</rt></ruby>べなくてもいい) 'even without eating, it's fine'. The mo (も) adds 'even', making the permission broader.

Compare with 〜nakereba naranai (must — opposite of 'don't have to'), 〜nai de (without doing — different syntactic role), and 〜nai hou ga ii (better not to — a recommendation NOT to do, vs. permission not to). 〜nakute ii is reassuring — relieving the listener from an obligation they thought they had.

• tabe-nakute ii (<ruby>食<rt>た</rt></ruby>べなくていい) — "don't have to eat"
• ika-nakute ii (<ruby>行<rt>い</rt></ruby>かなくていい) — "don't have to go"
• shinpai shi-nakute ii (<ruby>心配<rt>しんぱい</rt></ruby>しなくていい) — "don't have to worry"
• mata-nakute ii (<ruby>待<rt>ま</rt></ruby>たなくていい) — "don't have to wait"
• kaera-nakute ii (<ruby>帰<rt>かえ</rt></ruby>らなくていい) — "don't have to go home"
• ganbara-nakute ii (<ruby>頑張<rt>がんば</rt></ruby>らなくていい) — "don't have to push yourself"
• naka-nakute ii (<ruby>泣<rt>な</rt></ruby>かなくていい) — "don't have to cry"
• ayamara-nakute ii (<ruby>謝<rt>あやま</rt></ruby>らなくていい) — "don't have to apologise"
• isoga-nakute ii yo (<ruby>急<rt>いそ</rt></ruby>がなくていいよ) — "you don't have to hurry"
• nemura-nakute ii (<ruby>眠<rt>ねむ</rt></ruby>らなくていい) — "don't have to sleep"
• wakara-nakute ii (<ruby>分<rt>わ</rt></ruby>からなくていい) — "don't have to understand"
• boku no koto, oboe-nakute ii (<ruby>僕<rt>ぼく</rt></ruby>のこと、<ruby>覚<rt>おぼ</rt></ruby>えなくていい) — "you don't need to remember me"
• nani mo iwa-nakute ii (<ruby>何<rt>なに</rt></ruby>も<ruby>言<rt>い</rt></ruby>わなくていい) — "you don't have to say anything"
• kotaenakute ii (<ruby>答<rt>こた</rt></ruby>えなくていい) — "don't have to answer"
• tsuyoku nara-nakute ii (<ruby>強<rt>つよ</rt></ruby>くならなくていい) — "you don't have to become strong"

${MARKER}`,

  // 〜なくても — even without doing
  "583a6e56-7874-4efd-9dc2-21b5ce2300df": `〜nakute mo (〜なくても) attaches the te-form of the negative (nai-stem + kute) + mo (も, 'even'). Means 'even without doing X / even if X isn't done'. The negative concession — concession applied to a non-action. shira-nakute mo daijoubu (<ruby>知<rt>し</rt></ruby>らなくても<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>) 'it's fine even if you don't know'.

Closely related to 〜nakute ii (don't have to) but syntactically different: 〜nakute mo can stand on its own as a concessive clause, while 〜nakute ii is a complete predicate. Often paired with 〜mo ii (mu-so ii — even just OK), or with stronger predicates: shinjinakute mo aishite (<ruby>信<rt>しん</rt></ruby>じなくても<ruby>愛<rt>あい</rt></ruby>して) 'even if you don't believe me, love me'.

Compare with 〜temo (positive concession, 'even if X happens'), tatoe〜temo (strong concession, just done), and 〜nakereba (negative conditional, 'if not'). 〜nakute mo is the negative-side mirror of 〜temo. In songs and declarations of love it's everywhere — 'even if X isn't there, even if Y doesn't happen, I will still...'.

• shira-nakute mo (<ruby>知<rt>し</rt></ruby>らなくても) — "even if you don't know"
• ika-nakute mo (<ruby>行<rt>い</rt></ruby>かなくても) — 'even without going'
• tabe-nakute mo (<ruby>食<rt>た</rt></ruby>べなくても) — 'even without eating'
• mata-nakute mo (<ruby>待<rt>ま</rt></ruby>たなくても) — 'even without waiting'
• shinji-nakute mo (<ruby>信<rt>しん</rt></ruby>じなくても) — "even if you don't believe"
• kotaenakute mo wakaru (<ruby>答<rt>こた</rt></ruby>えなくてもわかる) — "I get it even without an answer"
• mienakute mo aru (<ruby>見<rt>み</rt></ruby>えなくてもある) — "it's there even if you can't see it"
• ie-nakute mo (<ruby>言<rt>い</rt></ruby>えなくても) — "even if I can't say it"
• kimi ga inakute mo (<ruby>君<rt>きみ</rt></ruby>がいなくても) — 'even without you'
• wakaranakute mo aishiteru (<ruby>分<rt>わ</rt></ruby>からなくても<ruby>愛<rt>あい</rt></ruby>してる) — "I love (you) even without understanding"
• naka-nakute mo (<ruby>泣<rt>な</rt></ruby>かなくても) — 'even without crying'
• kotoba ni naranakute mo (<ruby>言葉<rt>ことば</rt></ruby>にならなくても) — "even if it can't become words"
• atta koto ga nakute mo (<ruby>会<rt>あ</rt></ruby>ったことがなくても) — "even if we've never met"
• tsuyoku nakute mo (<ruby>強<rt>つよ</rt></ruby>くなくても) — 'even without being strong'
• kanaranai nakute mo yume wo miru (<ruby>叶<rt>かな</rt></ruby>わないなくても<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>る) — "I dream even if it won't come true"

${MARKER}`,

  // 〜わけがない — there's no way / impossible
  "cf6c9f79-3a4d-4227-a32e-cced4debb9ef": `〜wake ga nai (〜わけがない) attaches to a plain-form verb, adjective, or noun + na/no. wake (<ruby>訳<rt>わけ</rt></ruby>) is a noun meaning 'reason / case / circumstance'. With ga nai ('there isn't'), the construction means 'there's no reason / no way that X is true' — an emphatic logical denial.

Stronger than 〜hazu ga nai (highly unlikely based on knowledge). 〜wake ga nai is an EMOTIONAL or LOGICAL impossibility — the speaker is dismissing a possibility outright. boku ga wasureru wake ga nai (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>忘<rt>わす</rt></ruby>れるわけがない) "there's no way I'd forget". Casual variant: 〜wake nai (drops the が).

A related but different construction: 〜wake ni wa ikanai (〜わけにはいかない, 'cannot/should not — for social reasons'). And 〜wake da ('that's why' — explanatory, not denial). Compare with 〜hazu ga nai (knowledge-based denial), 〜nai ni chigai nai (must not be), 〜arienai (impossible — formal). 〜wake ga nai is the most emotional way to deny something in everyday Japanese.

• wasureru wake ga nai (<ruby>忘<rt>わす</rt></ruby>れるわけがない) — "no way I'd forget"
• shiranai wake ga nai (<ruby>知<rt>し</rt></ruby>らないわけがない) — "no way they don't know"
• dekiru wake ga nai (できるわけがない) — "no way I can do it"
• sonna koto suru wake ga nai (そんなことするわけがない) — "no way I'd do something like that"
• maketa wake ga nai (<ruby>負<rt>ま</rt></ruby>けたわけがない) — "no way I lost"
• inai wake ga nai (いないわけがない) — "no way they're not here"
• kimi ni wakaru wake ga nai (<ruby>君<rt>きみ</rt></ruby>に<ruby>分<rt>わ</rt></ruby>かるわけがない) — "no way you'd understand"
• ai shite-nai wake ga nai (<ruby>愛<rt>あい</rt></ruby>してないわけがない) — "no way I don't love (you)"
• kanji ga kantan na wake ga nai (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>簡単<rt>かんたん</rt></ruby>なわけがない) — "no way kanji is easy"
• yume nan ka miru wake ga nai (<ruby>夢<rt>ゆめ</rt></ruby>なんか<ruby>見<rt>み</rt></ruby>るわけがない) — 'no way I'd dream of something like that'
• boku no kimochi ga wakaru wake nai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>気持<rt>きも</rt></ruby>ちがわかるわけない) — "no way you get how I feel" (casual)
• inu ga kotoba o hanasu wake ga nai (<ruby>犬<rt>いぬ</rt></ruby>が<ruby>言葉<rt>ことば</rt></ruby>を<ruby>話<rt>はな</rt></ruby>すわけがない) — "no way a dog would speak"
• zenbu uso na wake ga nai (<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>嘘<rt>うそ</rt></ruby>なわけがない) — "no way all of it was lies"
• mou aenai wake ga nai (もう<ruby>会<rt>あ</rt></ruby>えないわけがない) — "no way we'll never meet again"
• boku no koto kirai na wake nai (<ruby>僕<rt>ぼく</rt></ruby>のこと<ruby>嫌<rt>きら</rt></ruby>いなわけない) — "no way you hate me" (casual)

${MARKER}`,

  // 〜そう — visual / hearsay seems like
  "0e471da0-a5fc-4486-9c83-6fcf29926111": `〜sou (〜そう) has TWO distinct grammatical patterns that share the same surface form. (a) Visual / appearance — attaches to V-stem or Adj-stem (drop 〜い / 〜な): oishi-sou (<ruby>美味<rt>おい</rt></ruby>しそう) 'looks delicious', furi-sou (<ruby>降<rt>ふ</rt></ruby>りそう) 'looks like it'll rain'. (b) Hearsay — attaches to plain form + 〜sou da: ame ga furu sou da (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るそうだ) 'I heard it'll rain'.

The two are distinguished by the attachment point — stem (visual) vs. plain form (hearsay). Visual 〜sou is what the speaker DIRECTLY OBSERVES; hearsay 〜sou da is what the speaker WAS TOLD. Visual conjugates as a na-adjective: oishi-sou na (modifying), oishi-sou ni (adverbial). Hearsay does not conjugate — it ends a sentence.

Special cases for visual 〜sou: ii (good) → yo-sa-sou (looks good — irregular, with sa inserted); nai (not) → na-sa-sou (looks not). Negation of visual: oishiku-na-sa-sou (doesn't look delicious). Compare with 〜you da (formal seems-like, both visual and conjecture), 〜mitai (colloquial seems-like), 〜rashii (apparently / hearsay, evidential). 〜sou is the immediate 'looks like' of the family.

• oishi-sou (<ruby>美味<rt>おい</rt></ruby>しそう) — 'looks delicious'
• tanoshi-sou (<ruby>楽<rt>たの</rt></ruby>しそう) — 'looks fun'
• kanashi-sou (<ruby>悲<rt>かな</rt></ruby>しそう) — 'looks sad'
• furi-sou (<ruby>降<rt>ふ</rt></ruby>りそう) — "looks like it'll rain"
• taore-sou (<ruby>倒<rt>たお</rt></ruby>れそう) — 'looks about to fall'
• naki-sou (<ruby>泣<rt>な</rt></ruby>きそう) — 'looks about to cry'
• yowa-sou (<ruby>弱<rt>よわ</rt></ruby>そう) — 'looks weak'
• tsuyo-sou (<ruby>強<rt>つよ</rt></ruby>そう) — 'looks strong'
• yo-sa-sou (よさそう) — 'looks good'
• ame ga furu sou da (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るそうだ) — "I heard it'll rain"
• kuru sou da (<ruby>来<rt>く</rt></ruby>るそうだ) — 'I heard they're coming'
• taberu no ga suki na sou da (<ruby>食<rt>た</rt></ruby>べるのが<ruby>好<rt>す</rt></ruby>きなそうだ) — 'I hear they like to eat'
• kekkon shita sou (<ruby>結婚<rt>けっこん</rt></ruby>したそう) — 'I heard they got married'
• mou owaru sou da (もう<ruby>終<rt>お</rt></ruby>わるそうだ) — "I hear it's about to end"
• ureshi-sou ni waratta (<ruby>嬉<rt>うれ</rt></ruby>しそうに<ruby>笑<rt>わら</rt></ruby>った) — 'smiled as if happy'

${MARKER}`,

  // 〜たくない — don't want to
  "d2c689cc-c7b1-4e28-b26d-c07dbe503840": `〜takunai (〜たくない) is the negative form of 〜tai (the desire suffix from batch 1, 'want to do'). Take a verb's masu-stem + tai → tabetai → tabetakunai. Conjugates as an i-adjective: 〜takunakatta (past), 〜takunakute (te-form), 〜takunai desu (polite). Negation can also be 〜taku wa nai (more emphatic) or 〜takunai (standard).

Like 〜tai, 〜takunai expresses the speaker's own internal state (or, with 〜takunasou, someone else's apparent reluctance). Saying it about a third party requires evidence framing: 〜takunasou (looks reluctant) or 〜takunai you da (seems not to want).

A pragmatic note: 〜takunai is direct. Polite refusals in Japanese often soften with conditional negative + 〜hou ga ('better not to') or with 〜nakute mo ii ('don't have to') rather than blunt 〜takunai. In songs and emotional speech, however, 〜takunai is exactly the right word for visceral refusal: wasuretakunai (<ruby>忘<rt>わす</rt></ruby>れたくない) "I don't want to forget".

• tabetakunai (<ruby>食<rt>た</rt></ruby>べたくない) — "don't want to eat"
• ikitakunai (<ruby>行<rt>い</rt></ruby>きたくない) — "don't want to go"
• kaeritakunai (<ruby>帰<rt>かえ</rt></ruby>りたくない) — "don't want to go home"
• wasuretakunai (<ruby>忘<rt>わす</rt></ruby>れたくない) — "don't want to forget"
• shiritakunai (<ruby>知<rt>し</rt></ruby>りたくない) — "don't want to know"
• ushinaitakunai (<ruby>失<rt>うしな</rt></ruby>いたくない) — "don't want to lose (it)"
• mitakunai (<ruby>見<rt>み</rt></ruby>たくない) — "don't want to see"
• kikitakunai (<ruby>聞<rt>き</rt></ruby>きたくない) — "don't want to hear"
• shinitakunai (<ruby>死<rt>し</rt></ruby>にたくない) — "don't want to die"
• naka-saretakunai (<ruby>泣<rt>な</rt></ruby>かされたくない) — "don't want to be made to cry"
• wakaretakunai (<ruby>別<rt>わか</rt></ruby>れたくない) — "don't want to break up / part"
• nemuritakunai (<ruby>眠<rt>ねむ</rt></ruby>りたくない) — "don't want to sleep"
• damaritakunai (<ruby>黙<rt>だま</rt></ruby>りたくない) — "don't want to stay silent"
• boku wa nigetakunai (<ruby>僕<rt>ぼく</rt></ruby>は<ruby>逃<rt>に</rt></ruby>げたくない) — "I don't want to run"
• mou aitakunai (もう<ruby>会<rt>あ</rt></ruby>いたくない) — "don't want to meet anymore"

${MARKER}`,

  // 〜たびに — each time / every time
  "17aedcea-dd37-4c90-b25e-9b39fdd5815e": `〜tabi ni (〜たびに / 〜<ruby>度<rt>たび</rt></ruby>に) attaches to a V-dictionary form or noun + no. tabi (<ruby>度<rt>たび</rt></ruby>) is a noun meaning 'time / occasion'. With ni (に, 'at'), the structure means 'each time / every time X happens, Y'. au tabi ni (<ruby>会<rt>あ</rt></ruby>うたびに) 'each time we meet'.

Implies a repeating correlation — Y happens every single time X does. Often used for emotional or habitual reactions: kimi ni au tabi ni mune ga itamu (<ruby>君<rt>きみ</rt></ruby>に<ruby>会<rt>あ</rt></ruby>うたびに<ruby>胸<rt>むね</rt></ruby>が<ruby>痛<rt>いた</rt></ruby>む) 'each time I see you, my chest aches'. With nouns: tanjoubi no tabi ni (<ruby>誕生日<rt>たんじょうび</rt></ruby>のたびに) 'every birthday'.

Compare with 〜goto ni (〜<ruby>毎<rt>ごと</rt></ruby>に, 'at each interval' — neutral, factual: san-nichi goto ni 'every three days'), 〜itsu mo (every time / always — adverbial), and 〜made / 〜kara (start / end, not iterative). 〜tabi ni is the emotional / song-friendly 'every time' — implies that the repetition is meaningful.

• au tabi ni (<ruby>会<rt>あ</rt></ruby>うたびに) — 'each time we meet'
• kuru tabi ni (<ruby>来<rt>く</rt></ruby>るたびに) — 'each time you come'
• miru tabi ni (<ruby>見<rt>み</rt></ruby>るたびに) — 'each time I see (it)'
• kiku tabi ni (<ruby>聞<rt>き</rt></ruby>くたびに) — 'each time I hear (it)'
• omoi-dasu tabi ni (<ruby>思<rt>おも</rt></ruby>い<ruby>出<rt>だ</rt></ruby>すたびに) — 'each time I remember'
• nakareru tabi ni (<ruby>泣<rt>な</rt></ruby>かれるたびに) — 'each time (someone) cries on me'
• namida ga deru tabi ni (<ruby>涙<rt>なみだ</rt></ruby>が<ruby>出<rt>で</rt></ruby>るたびに) — 'each time tears come'
• tanjoubi no tabi ni (<ruby>誕生日<rt>たんじょうび</rt></ruby>のたびに) — 'every birthday'
• haru no tabi ni (<ruby>春<rt>はる</rt></ruby>のたびに) — 'every spring'
• kimi ni au tabi ni mune ga itamu (<ruby>君<rt>きみ</rt></ruby>に<ruby>会<rt>あ</rt></ruby>うたびに<ruby>胸<rt>むね</rt></ruby>が<ruby>痛<rt>いた</rt></ruby>む) — 'each time I see you, my chest aches'
• kane wo tsukau tabi ni (<ruby>金<rt>かね</rt></ruby>を<ruby>使<rt>つか</rt></ruby>うたびに) — 'each time I spend money'
• yume wo miru tabi ni (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>るたびに) — 'each time I dream'
• shippai suru tabi ni (<ruby>失敗<rt>しっぱい</rt></ruby>するたびに) — 'each time I fail'
• mata kanji wo wasureru tabi ni (また<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れるたびに) — 'each time I forget a kanji'
• kono uta wo kiku tabi ni (この<ruby>歌<rt>うた</rt></ruby>を<ruby>聞<rt>き</rt></ruby>くたびに) — 'each time I hear this song'

${MARKER}`,

  // 〜だけ — only / just (neutral)
  "d795b132-df64-4e4b-a3e5-d7e9b91a942b": `〜dake (〜だけ) attaches to nouns, V-dictionary forms, V-past, or adjectives to mean 'only / just (X)'. The most neutral 'only' marker in Japanese — no judgement, no criticism, no formality. ichi-do dake (<ruby>一度<rt>いちど</rt></ruby>だけ) 'just once'. kimi dake (<ruby>君<rt>きみ</rt></ruby>だけ) 'only you'. Pairs with negation for emphasis: 〜dake ja nai ('not only') / 〜dake de naku ('not just').

Distinct from 〜bakari (often critical 'only / nothing but'), 〜nomi (formal / written 'only'), 〜shika (only — used with negative predicate: ichi-do shika nai 'there's only once'). 〜dake is the neutral, most-used spoken / written option that fits any register.

A common pattern: V-tai dake — '(I) just want to do X (and nothing more)'. Also the modal 〜dake da (〜だけだ) 'just X / nothing but X' for refocusing: ato wa kimi to issho ni iru dake da (<ruby>後<rt>あと</rt></ruby>は<ruby>君<rt>きみ</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>にいるだけだ) 'all that's left is being together with you'. The dake-de-naku-...mo (not just X but also Y) structure builds emphatic two-part claims.

• kimi dake (<ruby>君<rt>きみ</rt></ruby>だけ) — 'only you'
• ichi-do dake (<ruby>一度<rt>いちど</rt></ruby>だけ) — 'just once'
• kore dake (これだけ) — 'just this much / only this'
• boku dake (<ruby>僕<rt>ぼく</rt></ruby>だけ) — 'only me'
• ima dake (<ruby>今<rt>いま</rt></ruby>だけ) — 'just for now'
• sukoshi dake (<ruby>少<rt>すこ</rt></ruby>しだけ) — 'just a little'
• hitokoto dake (<ruby>一言<rt>ひとこと</rt></ruby>だけ) — 'just one word'
• mitai dake (<ruby>見<rt>み</rt></ruby>たいだけ) — 'just want to look'
• shitai dake (したいだけ) — 'just want to do'
• boku ga shitte iru dake da (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>知<rt>し</rt></ruby>っているだけだ) — 'only I know'
• kore dake ja taranai (これだけじゃ<ruby>足<rt>た</rt></ruby>りない) — "just this isn't enough"
• kimi dake o aishiteru (<ruby>君<rt>きみ</rt></ruby>だけを<ruby>愛<rt>あい</rt></ruby>してる) — 'I love only you'
• warau dake de ii (<ruby>笑<rt>わら</rt></ruby>うだけでいい) — 'just smiling is enough'
• boku-tachi dake no sekai (<ruby>僕<rt>ぼく</rt></ruby>たちだけの<ruby>世界<rt>せかい</rt></ruby>) — 'a world just for us'
• namida dake ga koborete iku (<ruby>涙<rt>なみだ</rt></ruby>だけがこぼれていく) — 'only the tears keep falling'

${MARKER}`,

  // 〜て form — connecting actions / sequence
  "c96afb7b-cc6a-4e4a-9d11-07b5a46e566e": `The te-form (〜て / 〜で) is the universal connector of Japanese verbs and adjectives. Formed by softening the past-tense ending: tabeta → tabete, itta → itte, nonda → nonde. For i-adjectives: 〜i → 〜kute (atatakai → atatakakute). For na-adjectives and nouns: 〜de (kirei de, gakusei de). It has no tense by itself — the final verb in the sentence carries tense.

Many functions, all anchored on 'connect': (a) Sequential — 'do X (and then) Y' — okite, asagohan o tabete, dekaketa (got up, ate breakfast, left). (b) Cause/manner — yorokonde naita 'cried for joy'. (c) Soft request — V-te kudasai 'please do'. (d) Auxiliary base — every 〜te kureru / 〜te miru / 〜te oku / 〜te shimau pattern stacks here. (e) Permission / prohibition — 〜te mo ii / 〜te wa ikenai.

Mastering the te-form is the single biggest grammar milestone for beginners — most multi-clause sentences and most modal patterns route through it. The split between 〜て (after k/g/s/t/n/h/m/r-stems and vowel verbs) and 〜で (after b/m/n-stems) follows the same rules as the 〜ta past form. Once you can produce the past tense, you can produce the te-form by changing the final 〜た/〜だ to 〜て/〜で.

• tabete (<ruby>食<rt>た</rt></ruby>べて) — 'eat and... / please eat'
• itte (<ruby>行<rt>い</rt></ruby>って) — 'go and... / please go'
• nonde (<ruby>飲<rt>の</rt></ruby>んで) — 'drink and... / please drink'
• mite (<ruby>見<rt>み</rt></ruby>て) — 'look and... / please look'
• kaite (<ruby>書<rt>か</rt></ruby>いて) — 'write and... / please write'
• matte (<ruby>待<rt>ま</rt></ruby>って) — 'wait and... / please wait'
• yonde benkyou shita (<ruby>読<rt>よ</rt></ruby>んで<ruby>勉強<rt>べんきょう</rt></ruby>した) — 'read and studied'
• naite waratta (<ruby>泣<rt>な</rt></ruby>いて<ruby>笑<rt>わら</rt></ruby>った) — 'cried and laughed'
• atsukute taberenai (<ruby>暑<rt>あつ</rt></ruby>くて<ruby>食<rt>た</rt></ruby>べれない) — 'too hot to eat'
• shinpai de nemurenai (<ruby>心配<rt>しんぱい</rt></ruby>で<ruby>眠<rt>ねむ</rt></ruby>れない) — "can't sleep from worry"
• gakusei de kashu desu (<ruby>学生<rt>がくせい</rt></ruby>で<ruby>歌手<rt>かしゅ</rt></ruby>です) — "I'm a student and a singer"
• ie ni kaette gohan o tabeta (<ruby>家<rt>いえ</rt></ruby>に<ruby>帰<rt>かえ</rt></ruby>って<ruby>御飯<rt>ごはん</rt></ruby>を<ruby>食<rt>た</rt></ruby>べた) — 'went home and ate'
• te wo tsunaide aruita (<ruby>手<rt>て</rt></ruby>をつないで<ruby>歩<rt>ある</rt></ruby>いた) — 'walked holding hands'
• damatte kiite (<ruby>黙<rt>だま</rt></ruby>って<ruby>聞<rt>き</rt></ruby>いて) — 'be quiet and listen'
• kimi ni atte yokatta (<ruby>君<rt>きみ</rt></ruby>に<ruby>会<rt>あ</rt></ruby>えてよかった) — "I'm glad I met you"

${MARKER}`,

  // 〜としても — even supposing / even if
  "4bf73669-f3e6-47ed-bfae-570bfd4ea370": `〜to shite mo (〜としても) attaches to plain-form verbs, adjectives, or nouns. The structure breaks down as と (quotative) + する (do / consider) + ても (even if). Means 'even supposing X / even granting X / even if X (were the case)'. Used for hypothetical or counterfactual concession — often more formal and more strongly hypothetical than plain 〜temo.

honto da to shite mo (<ruby>本当<rt>ほんとう</rt></ruby>だとしても) 'even supposing it's true'. The implication is 'I'm not necessarily granting that X is true, but for argument's sake, even if it were'. Useful for debate, hedging, conditional acceptance: maketa to shite mo, shippai dewa nai (<ruby>負<rt>ま</rt></ruby>けたとしても、<ruby>失敗<rt>しっぱい</rt></ruby>ではない) 'even if I lost, that's not failure'.

Compare with 〜temo (basic concession), batch3b's tatoe〜demo (strong / dramatic concession), 〜tatte (casual concession), and 〜noni (despite — for actual contradictions). 〜to shite mo sits in the formal-hypothetical zone. Often paired with concessive markers like soredemo, kekkyoku ('regardless / in the end').

• honto da to shite mo (<ruby>本当<rt>ほんとう</rt></ruby>だとしても) — 'even if it were true'
• kuru to shite mo (<ruby>来<rt>く</rt></ruby>るとしても) — 'even if they come'
• maketa to shite mo (<ruby>負<rt>ま</rt></ruby>けたとしても) — 'even if I lost'
• yume da to shite mo (<ruby>夢<rt>ゆめ</rt></ruby>だとしても) — 'even if it's a dream'
• shitte ita to shite mo (<ruby>知<rt>し</rt></ruby>っていたとしても) — 'even if I had known'
• ikenai to shite mo (<ruby>行<rt>い</rt></ruby>けないとしても) — "even if I can't go"
• kanji ga muzukashii to shite mo (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>難<rt>むずか</rt></ruby>しいとしても) — 'even if kanji is hard'
• kimi ga inai to shite mo (<ruby>君<rt>きみ</rt></ruby>がいないとしても) — "even if you aren't here"
• ushinau to shite mo (<ruby>失<rt>うしな</rt></ruby>うとしても) — 'even if I lose (it)'
• mada wakaranai to shite mo (まだ<ruby>分<rt>わ</rt></ruby>からないとしても) — "even if I still don't understand"
• mainichi naite iru to shite mo (<ruby>毎日<rt>まいにち</rt></ruby><ruby>泣<rt>な</rt></ruby>いているとしても) — 'even if (you) cry every day'
• onaji koto da to shite mo (<ruby>同<rt>おな</rt></ruby>じことだとしても) — 'even if it amounts to the same thing'
• kotoba ni naranai to shite mo (<ruby>言葉<rt>ことば</rt></ruby>にならないとしても) — "even if it can't become words"
• kakko warui to shite mo (<ruby>格好<rt>かっこう</rt></ruby><ruby>悪<rt>わる</rt></ruby>いとしても) — 'even if it looks uncool'
• tatoe boku ga inai to shite mo (たとえ<ruby>僕<rt>ぼく</rt></ruby>がいないとしても) — "even supposing I'm not here"

${MARKER}`,

  // 〜ならば — literary / formal 〜nara
  "c4a89586-ffd1-47dc-bb76-73608793f04c": `〜naraba (〜ならば) is the literary / formal expansion of batch1's 〜nara (なら). Same topic-based conditional meaning — 'if it's the case that X, then Y' — but with elevated register. Found in poetry, song lyrics, formal speech, classical-flavoured writing. Attaches to plain-form verbs, adjectives, or nouns.

The naraba form preserves the older copula structure (〜nara is a contraction). Modern Japanese drops the ば almost universally in casual contexts, leaving 〜nara. The 〜naraba ending makes a sentence sound deliberate, weighty, sometimes archaic. yume naraba (<ruby>夢<rt>ゆめ</rt></ruby>ならば) 'if it be a dream' — note the elevated translation register.

Compare with batch1's 〜nara (modern conversational), 〜no naraba (more emphatic literary, with explanatory の), 〜tara (sequential / discovery conditional), and 〜ba (logical conditional). 〜naraba is the conditional you reach for in song lyrics, sworn statements, and any context wanting timeless weight. moshi (もし, 'if') often pairs with it to underscore the hypothetical: moshi yume naraba samenaide (もし<ruby>夢<rt>ゆめ</rt></ruby>ならばさめないで) 'if this is a dream, do not let me wake'.

• yume naraba (<ruby>夢<rt>ゆめ</rt></ruby>ならば) — 'if it be a dream'
• moshi naraba (もしならば) — 'if so'
• kimi naraba (<ruby>君<rt>きみ</rt></ruby>ならば) — 'if it were you'
• boku naraba (<ruby>僕<rt>ぼく</rt></ruby>ならば) — 'were I to'
• shinjiru naraba (<ruby>信<rt>しん</rt></ruby>じるならば) — 'if you would believe'
• kanau naraba (<ruby>叶<rt>かな</rt></ruby>うならば) — 'if it were to come true'
• ikiru naraba (<ruby>生<rt>い</rt></ruby>きるならば) — 'if I am to live'
• kotoba ni dekiru naraba (<ruby>言葉<rt>ことば</rt></ruby>にできるならば) — 'if I could put it into words'
• kimi ga iru naraba (<ruby>君<rt>きみ</rt></ruby>がいるならば) — 'if you are there'
• mou ichido aeru naraba (もう<ruby>一度<rt>いちど</rt></ruby><ruby>会<rt>あ</rt></ruby>えるならば) — 'if I could meet you once more'
• shiawase naraba (<ruby>幸<rt>しあわ</rt></ruby>せならば) — 'if (you are) happy'
• tsumi naraba (<ruby>罪<rt>つみ</rt></ruby>ならば) — 'if it be a sin'
• yume wo miru naraba (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>見<rt>み</rt></ruby>るならば) — 'if I am to dream'
• ushinau naraba (<ruby>失<rt>うしな</rt></ruby>うならば) — 'if I am to lose (it)'
• tsuyoku nareru naraba (<ruby>強<rt>つよ</rt></ruby>くなれるならば) — 'if I could become strong'

${MARKER}`,

  // 〜ぬ — classical negative
  "d058db02-2b24-455a-8966-93a3aa65d9df": `〜nu (〜ぬ) is the classical Japanese negative ending — equivalent to modern 〜nai (〜ない). Attaches to a verb's nai-stem just like modern 〜nai: shiranu (<ruby>知<rt>し</rt></ruby>らぬ, 'not knowing'), wakaranu (<ruby>分<rt>わ</rt></ruby>からぬ, 'not understanding'). Survives in modern Japanese mainly through (a) literary writing, (b) song lyrics and poetry, (c) fixed expressions: shiranu ga hotoke (<ruby>知<rt>し</rt></ruby>らぬが<ruby>仏<rt>ほとけ</rt></ruby>) 'ignorance is bliss'.

Has a continuative form 〜zu (〜ず) that connects to the next clause — shirazu shirazu (<ruby>知<rt>し</rt></ruby>らず<ruby>知<rt>し</rt></ruby>らず) 'unknowingly / without realising'. Both 〜nu and 〜zu are part of the classical negative system, surviving in the modern language as a register marker — anything that uses 〜nu or 〜zu reads as elevated, archaic, or song-like.

Compare with modern 〜nai (everyday negative), 〜zu ni (batch1, literary 'without doing'), and the classical 〜nu / 〜zu as forms of the same auxiliary. The exception verb suru becomes sezu / senu in classical form (not shi-nu, which actually means 'to die' — different verb!). Use carefully: misreading 〜nu can collapse two completely different verbs.

• shiranu (<ruby>知<rt>し</rt></ruby>らぬ) — 'unknown / not knowing'
• wakaranu (<ruby>分<rt>わ</rt></ruby>からぬ) — 'not understanding'
• shiranu ga hotoke (<ruby>知<rt>し</rt></ruby>らぬが<ruby>仏<rt>ほとけ</rt></ruby>) — 'ignorance is bliss' (proverb)
• tasenu (<ruby>足<rt>た</rt></ruby>せぬ) — 'cannot add / will not give'
• kawaranu (<ruby>変<rt>か</rt></ruby>わらぬ) — 'unchanging'
• modoranu (<ruby>戻<rt>もど</rt></ruby>らぬ) — 'not returning / never to return'
• ienu (<ruby>言<rt>い</rt></ruby>えぬ) — 'cannot say'
• kasanaru omoi taenu (<ruby>重<rt>かさ</rt></ruby>なる<ruby>想<rt>おも</rt></ruby>い<ruby>絶<rt>た</rt></ruby>えぬ) — 'feelings that pile up unceasingly'
• kotaezu ni iru (<ruby>答<rt>こた</rt></ruby>えずにいる) — 'remaining without answering'
• tomaranu namida (<ruby>止<rt>と</rt></ruby>まらぬ<ruby>涙<rt>なみだ</rt></ruby>) — 'unstoppable tears'
• yumemoshiranu (<ruby>夢<rt>ゆめ</rt></ruby>もしらぬ) — 'unaware even in dreams'
• kakenu omoi (<ruby>書<rt>か</rt></ruby>けぬ<ruby>想<rt>おも</rt></ruby>い) — 'thoughts I cannot write'
• arai-nu kaze (<ruby>荒<rt>あら</rt></ruby>いぬ<ruby>風<rt>かぜ</rt></ruby>) — 'a fierce wind that does not abate'
• taezu nagareru (<ruby>絶<rt>た</rt></ruby>えず<ruby>流<rt>なが</rt></ruby>れる) — 'flows without ceasing'
• shirazu shirazu (<ruby>知<rt>し</rt></ruby>らず<ruby>知<rt>し</rt></ruby>らず) — 'without realising'

${MARKER}`,

  // 〜のは〜だ — emphasis cleft / it is X that
  "f5280e84-a494-4aa7-a7e7-42b878eddd0d": `〜no wa 〜da (〜のは〜だ) is the standard cleft / focus construction. Take a sentence, nominalise its predicate with の, mark with は as the topic, then assert the focused element with だ. boku ga itta — 'I went' becomes itta no wa boku da (<ruby>行<rt>い</rt></ruby>ったのは<ruby>僕<rt>ぼく</rt></ruby>だ) 'It is I who went / The one who went is me'. The cleft fronts emphasis: what comes after は is given (already in conversation), what comes before だ is the new / emphasised element.

Useful for correcting (kuru no wa Yamada-san da, NOT Tanaka-san), for rhetorical emphasis (taisetsu na no wa kokoro da — 'what's important is the heart'), and for definition-style assertions. Variants: 〜no wa 〜da yo (assertive), 〜no wa 〜datta (past), 〜no wa 〜janai (negative — denies the focus element).

Compare with the related 〜no wa 〜koto da (definitional cleft, often used to define abstract concepts: ai to wa shinjiru koto da — 'love is to believe'), 〜koso (emphatic particle, 'precisely / certainly'), and 〜nan da (explanatory). The 〜no wa 〜da structure is one of the most productive rhetorical patterns in Japanese — it's how you put emphasis on any element of a sentence.

• itta no wa boku da (<ruby>行<rt>い</rt></ruby>ったのは<ruby>僕<rt>ぼく</rt></ruby>だ) — "the one who went is me"
• taisetsu na no wa kokoro da (<ruby>大切<rt>たいせつ</rt></ruby>なのは<ruby>心<rt>こころ</rt></ruby>だ) — "what matters is the heart"
• kanashii no wa boku dake da (<ruby>悲<rt>かな</rt></ruby>しいのは<ruby>僕<rt>ぼく</rt></ruby>だけだ) — 'the one who is sad is just me'
• ii no wa kimi da (いいのは<ruby>君<rt>きみ</rt></ruby>だ) — 'the good one is you'
• yarinaoshitai no wa kinou da (やり<ruby>直<rt>なお</rt></ruby>したいのは<ruby>昨日<rt>きのう</rt></ruby>だ) — "what I want to redo is yesterday"
• warui no wa boku da (<ruby>悪<rt>わる</rt></ruby>いのは<ruby>僕<rt>ぼく</rt></ruby>だ) — "the one at fault is me"
• tsutaetai no wa kanshasuru kimochi da (<ruby>伝<rt>つた</rt></ruby>えたいのは<ruby>感謝<rt>かんしゃ</rt></ruby>する<ruby>気持<rt>きも</rt></ruby>ちだ) — "what I want to convey is gratitude"
• boku ga aishite iru no wa kimi da (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>愛<rt>あい</rt></ruby>しているのは<ruby>君<rt>きみ</rt></ruby>だ) — "the one I love is you"
• shitte iru no wa boku dake (<ruby>知<rt>し</rt></ruby>っているのは<ruby>僕<rt>ぼく</rt></ruby>だけ) — 'the only one who knows is me'
• kanji ga muzukashii no wa hontou da (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>難<rt>むずか</rt></ruby>しいのは<ruby>本当<rt>ほんとう</rt></ruby>だ) — "what's true is that kanji is hard"
• mienai no wa namida da (<ruby>見<rt>み</rt></ruby>えないのは<ruby>涙<rt>なみだ</rt></ruby>だ) — "what can't be seen are tears"
• matte iru no wa kimi da (<ruby>待<rt>ま</rt></ruby>っているのは<ruby>君<rt>きみ</rt></ruby>だ) — "the one waiting is you"
• boku ga inai no wa ima dake (<ruby>僕<rt>ぼく</rt></ruby>がいないのは<ruby>今<rt>いま</rt></ruby>だけ) — "I'm only absent for now"
• shiawase nano wa kimi to iru kara da (<ruby>幸<rt>しあわ</rt></ruby>せなのは<ruby>君<rt>きみ</rt></ruby>といるからだ) — "the reason I'm happy is because you're with me"
• mamoritai no wa kazoku da (<ruby>守<rt>まも</rt></ruby>りたいのは<ruby>家族<rt>かぞく</rt></ruby>だ) — "what I want to protect is family"

${MARKER}`,

  // 〜気がする — feel like / have a hunch
  "a26c69c5-5c7e-4fae-a6b3-5b1151b1fc8f": `〜ki ga suru (〜<ruby>気<rt>き</rt></ruby>がする) attaches to plain-form verbs, adjectives, or nouns + na/no. ki (<ruby>気<rt>き</rt></ruby>) is a noun meaning 'spirit / feeling / sense'. With ga suru ('does / occurs'), the construction means 'I have the feeling that X / it feels like X'. Subjective intuition — not based on hard evidence, just a sense or hunch.

dareka kuru ki ga suru (<ruby>誰<rt>だれ</rt></ruby>か<ruby>来<rt>く</rt></ruby>る<ruby>気<rt>き</rt></ruby>がする) 'I have a feeling someone is coming'. Distinguished from 〜you da or 〜mitai (visible / hearable evidence) and 〜hazu (logical inference) — 〜ki ga suru is purely interior, the speaker's gut sense. Often used in songs and reflective speech for vague or premonitory feelings.

The negative 〜ki ga shinai means 'I don't feel like / it doesn't feel that' — kotaeru ki ga shinai (<ruby>答<rt>こた</rt></ruby>える<ruby>気<rt>き</rt></ruby>がしない) "I don't feel like answering". Compare with 〜sou (visual seems-like), 〜you ni omou (formal 'I think that'), and 〜mitai (colloquial seems). 〜ki ga suru is the signature 'gut feeling' marker — perfect for premonition, intuition, half-formed thoughts.

• dareka kuru ki ga suru (<ruby>誰<rt>だれ</rt></ruby>か<ruby>来<rt>く</rt></ruby>る<ruby>気<rt>き</rt></ruby>がする) — "I feel like someone's coming"
• mou aenai ki ga suru (もう<ruby>会<rt>あ</rt></ruby>えない<ruby>気<rt>き</rt></ruby>がする) — "I feel like we won't meet again"
• ame ga furu ki ga suru (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>る<ruby>気<rt>き</rt></ruby>がする) — "I feel like it'll rain"
• shitte iru ki ga suru (<ruby>知<rt>し</rt></ruby>っている<ruby>気<rt>き</rt></ruby>がする) — "I feel like I know"
• mae ni atta ki ga suru (<ruby>前<rt>まえ</rt></ruby>に<ruby>会<rt>あ</rt></ruby>った<ruby>気<rt>き</rt></ruby>がする) — "I feel like we've met before"
• warau ki ga shinai (<ruby>笑<rt>わら</rt></ruby>う<ruby>気<rt>き</rt></ruby>がしない) — "I don't feel like laughing"
• ikenai ki ga suru (<ruby>行<rt>い</rt></ruby>けない<ruby>気<rt>き</rt></ruby>がする) — "I have a feeling I can't go"
• boku no koto wo wasureta ki ga suru (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れた<ruby>気<rt>き</rt></ruby>がする) — "I feel like you've forgotten me"
• jikan ga tomatta ki ga suru (<ruby>時間<rt>じかん</rt></ruby>が<ruby>止<rt>と</rt></ruby>まった<ruby>気<rt>き</rt></ruby>がする) — "I feel like time has stopped"
• naki-sou na ki ga suru (<ruby>泣<rt>な</rt></ruby>きそうな<ruby>気<rt>き</rt></ruby>がする) — "I feel like I might cry"
• kawatte iru ki ga suru (<ruby>変<rt>か</rt></ruby>わっている<ruby>気<rt>き</rt></ruby>がする) — "I feel like (I'm/it's) changing"
• ayashii ki ga suru (<ruby>怪<rt>あや</rt></ruby>しい<ruby>気<rt>き</rt></ruby>がする) — "I feel like it's suspicious"
• mada wakatte nai ki ga suru (まだ<ruby>分<rt>わ</rt></ruby>かってない<ruby>気<rt>き</rt></ruby>がする) — "I feel like I still don't get it"
• mata ushinau ki ga suru (また<ruby>失<rt>うしな</rt></ruby>う<ruby>気<rt>き</rt></ruby>がする) — "I feel like I'll lose (it) again"
• kimi to onaji ki ga suru (<ruby>君<rt>きみ</rt></ruby>と<ruby>同<rt>おな</rt></ruby>じ<ruby>気<rt>き</rt></ruby>がする) — "I feel the same way as you"

${MARKER}`,

  // で particle — means / instrument / location of action
  "0a113c07-9391-43d8-8e6d-5ab070401a09": `de (で) is one of the most-used Japanese particles. Attaches directly to nouns. Three primary functions: (a) Means / instrument — 'by means of X / using X' — basu de iku (バスで<ruby>行<rt>い</rt></ruby>く) 'go by bus'. (b) Location of action — 'at X (for an action)' — gakkou de benkyou suru (<ruby>学校<rt>がっこう</rt></ruby>で<ruby>勉強<rt>べんきょう</rt></ruby>する) 'study at school'. (c) Cause / reason — 'due to X' — byouki de yasumu (<ruby>病気<rt>びょうき</rt></ruby>で<ruby>休<rt>やす</rt></ruby>む) 'rest because of illness'.

Critical contrast with ni (に) for location: ni marks the location of EXISTENCE or the destination of MOVEMENT (gakkou ni iru — 'be at school'); de marks the location where an ACTION takes place (gakkou de benkyou suru — 'study at school'). Mixing them up is the most common particle error for English speakers.

Other senses: scope ('among / out of') — kurasu de ichiban (クラスで<ruby>一番<rt>いちばん</rt></ruby>) 'best in class'. Material — ki de tsukutta (<ruby>木<rt>き</rt></ruby>で<ruby>作<rt>つく</rt></ruby>った) 'made of wood'. Time limit — ichi-jikan de tsuita (<ruby>一時間<rt>いちじかん</rt></ruby>で<ruby>着<rt>つ</rt></ruby>いた) 'arrived in one hour'. The te-form of the copula (gakusei de — 'is a student and...') is technically the same character but a different grammatical role. Mastery of で is mastery of half of everyday Japanese sentences.

• basu de (バスで) — 'by bus'
• denwa de (<ruby>電話<rt>でんわ</rt></ruby>で) — 'by phone'
• nihongo de (<ruby>日本語<rt>にほんご</rt></ruby>で) — 'in Japanese'
• gakkou de benkyou suru (<ruby>学校<rt>がっこう</rt></ruby>で<ruby>勉強<rt>べんきょう</rt></ruby>する) — 'study at school'
• kouen de asobu (<ruby>公園<rt>こうえん</rt></ruby>で<ruby>遊<rt>あそ</rt></ruby>ぶ) — 'play at the park'
• ie de tabeta (<ruby>家<rt>いえ</rt></ruby>で<ruby>食<rt>た</rt></ruby>べた) — 'ate at home'
• byouki de yasumu (<ruby>病気<rt>びょうき</rt></ruby>で<ruby>休<rt>やす</rt></ruby>む) — 'rest from illness'
• ki de tsukutta (<ruby>木<rt>き</rt></ruby>で<ruby>作<rt>つく</rt></ruby>った) — 'made of wood'
• kurasu de ichiban (クラスで<ruby>一番<rt>いちばん</rt></ruby>) — 'best in class'
• ichi-jikan de tsuita (<ruby>一時間<rt>いちじかん</rt></ruby>で<ruby>着<rt>つ</rt></ruby>いた) — 'arrived in one hour'
• namida de mienai (<ruby>涙<rt>なみだ</rt></ruby>で<ruby>見<rt>み</rt></ruby>えない) — "can't see for tears"
• kono uta de aetan da (この<ruby>歌<rt>うた</rt></ruby>で<ruby>会<rt>あ</rt></ruby>えたんだ) — "we met through this song"
• shinpai de nemurenai (<ruby>心配<rt>しんぱい</rt></ruby>で<ruby>眠<rt>ねむ</rt></ruby>れない) — "can't sleep from worry"
• futari de aruita (<ruby>二人<rt>ふたり</rt></ruby>で<ruby>歩<rt>ある</rt></ruby>いた) — 'walked together (as two)'
• jibun no chikara de (<ruby>自分<rt>じぶん</rt></ruby>の<ruby>力<rt>ちから</rt></ruby>で) — 'by my own strength'

${MARKER}`,

  // 〜かな — I wonder
  "23e8091a-08c3-4c70-8ed9-dc7dd8361707": `〜kana (〜かな) attaches to plain-form verbs, adjectives, or nouns. Self-directed pondering — 'I wonder if X / I'm thinking about whether X'. Female / softer variant: 〜kashira (〜かしら). The kana suffix doesn't necessarily expect an answer — it's the speaker's interior musing made audible. ame ga furu kana (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るかな) "I wonder if it'll rain".

Two main flavours: (a) Self-wondering — most common, no listener required. (b) Indirect / soft request — 〜te kureru kana? (<ruby>〜<rt></rt></ruby>てくれるかな？) "I wonder if you'd... (do me a favour)" — softens a request by framing it as a thought rather than a demand.

The negative form 〜nai kana (〜ないかな) carries a wishful tone: 'I wonder if (X won't happen) / I hope X' — haru ga konai kana (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>こ</rt></ruby>ないかな) "I wonder if spring won't come / I hope spring comes". Very common in songs for soft, wistful uncertainty. Compare with 〜darou (probably / right?), 〜n darou (explanatory wonder), 〜beki ka (deliberative formal). 〜kana is the everyday musing marker.

• ame ga furu kana (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るかな) — "I wonder if it'll rain"
• kuru kana (<ruby>来<rt>く</rt></ruby>るかな) — "I wonder if they'll come"
• dare kana (<ruby>誰<rt>だれ</rt></ruby>かな) — "I wonder who"
• naze kana (なぜかな) — "I wonder why"
• ii kana (いいかな) — "I wonder if it's okay"
• boku ni dekiru kana (<ruby>僕<rt>ぼく</rt></ruby>にできるかな) — "I wonder if I can do it"
• shitte iru kana (<ruby>知<rt>し</rt></ruby>っているかな) — "I wonder if they know"
• mata aeru kana (また<ruby>会<rt>あ</rt></ruby>えるかな) — "I wonder if we'll meet again"
• boku no koto, oboeteru kana (<ruby>僕<rt>ぼく</rt></ruby>のこと、<ruby>覚<rt>おぼ</rt></ruby>えてるかな) — "I wonder if you remember me"
• haru ga konai kana (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>こ</rt></ruby>ないかな) — "I hope spring comes"
• tsutawaru kana (<ruby>伝<rt>つた</rt></ruby>わるかな) — "I wonder if it'll get through"
• yume kana (<ruby>夢<rt>ゆめ</rt></ruby>かな) — "I wonder if it's a dream"
• boku dake kana (<ruby>僕<rt>ぼく</rt></ruby>だけかな) — "I wonder if it's only me"
• naite ii kana (<ruby>泣<rt>な</rt></ruby>いていいかな) — "I wonder if I can cry"
• tetsudatte kureru kana (<ruby>手伝<rt>てつだ</rt></ruby>ってくれるかな) — "I wonder if you'd help"

${MARKER}`,

  // 〜かもしれない — might / perhaps
  "88fee13d-6632-45bc-91b3-f80f677e2d0a": `〜kamo shirenai (〜かもしれない) attaches to plain-form verbs, adjectives, or nouns. Expresses genuine uncertainty — 'might / perhaps / maybe X'. Literally 'cannot be known whether X (be the case)'. Polite form: 〜kamo shiremasen. Casual contraction: 〜kamo (〜かも) — extremely common in spoken Japanese.

Distinct from 〜darou (probably — moderate confidence) and 〜hazu (high-confidence inference). 〜kamo shirenai is genuine 50/50 uncertainty, leaning slightly toward possibility. ame ga furu kamo shirenai (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るかもしれない) "it might rain". The casual 〜kamo is often used as a complete utterance: "kamo." = 'maybe'.

Compare with 〜nai ka mo shirenai (negative possibility 'might not'), 〜ka douka wakaranai (literally 'don't know whether or not'), and 〜rashii (apparently / based on hearsay). 〜kamo shirenai is the everyday hedge — the marker for any claim the speaker isn't fully certain about. In songs, often used for self-doubting wonder: kowai kamo (<ruby>怖<rt>こわ</rt></ruby>いかも) 'maybe I'm scared'.

• ame ga furu kamo shirenai (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るかもしれない) — "it might rain"
• kuru kamo shirenai (<ruby>来<rt>く</rt></ruby>るかもしれない) — "they might come"
• shitte iru kamo (<ruby>知<rt>し</rt></ruby>っているかも) — 'might know' (casual)
• boku no sei kamo (<ruby>僕<rt>ぼく</rt></ruby>のせいかも) — 'might be my fault'
• yume kamo shirenai (<ruby>夢<rt>ゆめ</rt></ruby>かもしれない) — "it might be a dream"
• maketa kamo shirenai (<ruby>負<rt>ま</rt></ruby>けたかもしれない) — "I might have lost"
• mou inai kamo (もういないかも) — 'might be gone now'
• onaji ki mochi kamo shirenai (<ruby>同<rt>おな</rt></ruby>じ<ruby>気持<rt>きも</rt></ruby>ちかもしれない) — 'might feel the same way'
• tabun chigau kamo (<ruby>多分<rt>たぶん</rt></ruby><ruby>違<rt>ちが</rt></ruby>うかも) — 'might be different'
• boku wa machigatte iru kamo shirenai (<ruby>僕<rt>ぼく</rt></ruby>は<ruby>間違<rt>まちが</rt></ruby>っているかもしれない) — "I might be wrong"
• kowai kamo (<ruby>怖<rt>こわ</rt></ruby>いかも) — 'maybe scared' (casual)
• shiawase kamo shirenai (<ruby>幸<rt>しあわ</rt></ruby>せかもしれない) — 'I might be happy'
• mou aenai kamo shirenai (もう<ruby>会<rt>あ</rt></ruby>えないかもしれない) — "we might not meet again"
• boku ga hen na no kamo (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>変<rt>へん</rt></ruby>なのかも) — 'maybe I'm the weird one'
• ai kamo shirenai (<ruby>愛<rt>あい</rt></ruby>かもしれない) — 'it might be love'

${MARKER}`,

  // 〜きり — just / only / nothing since
  "e59dfad2-264d-4e28-92dd-c02726a3a516": `〜kiri (〜きり / 〜<ruby>切<rt>き</rt></ruby>り) attaches to nouns, V-past forms, or sometimes V-dictionary forms. Three main uses: (a) Limit / exclusive — 'just X / only X' — futari-kiri (<ruby>二人<rt>ふたり</rt></ruby>きり) 'just the two of us'. (b) Last instance — 'just (did X) and nothing since' — atta kiri (<ruby>会<rt>あ</rt></ruby>ったきり) 'met (then), and nothing since'. (c) Endpoint — kore-kiri (これきり) 'this is the last'.

The 'and nothing since' use carries an implicit incompleteness or melancholy: dete itta kiri (<ruby>出<rt>で</rt></ruby>ていったきり) 'left (then never returned)'. Common in songs for departure / loss imagery. Sometimes spelled 〜kkiri (〜っきり) for emphasis: kore kkiri da (これっきりだ) "this is it / this is the last".

Compare with 〜dake (neutral 'only'), 〜bakari (often critical 'only / nothing but'), 〜nomi (formal 'only'), and the past-progressive 〜ta mama (state continuing — 'left as is'). 〜kiri overlaps with 〜dake but adds a sense of finality, isolation, or unbroken state. The futari-kiri ('just the two of us') variant is romance-shorthand in J-pop.

• futari-kiri (<ruby>二人<rt>ふたり</rt></ruby>きり) — 'just the two (of us)'
• hitori-kiri (<ruby>一人<rt>ひとり</rt></ruby>きり) — 'just one / alone'
• kore-kiri (これきり) — 'this is the last'
• kondo-kiri (<ruby>今度<rt>こんど</rt></ruby>きり) — 'just this once'
• atta kiri (<ruby>会<rt>あ</rt></ruby>ったきり) — 'met (then nothing since)'
• dete itta kiri (<ruby>出<rt>で</rt></ruby>ていったきり) — 'left (and never returned)'
• denwa shita kiri (<ruby>電話<rt>でんわ</rt></ruby>したきり) — 'called (and nothing since)'
• yonda kiri (<ruby>読<rt>よ</rt></ruby>んだきり) — 'read (it once and that was it)'
• kiita kiri (<ruby>聞<rt>き</rt></ruby>いたきり) — 'heard (and nothing more)'
• ni-do to nai kiri (<ruby>二度<rt>にど</rt></ruby>とないきり) — 'just this and never again'
• kimi to no futari-kiri no jikan (<ruby>君<rt>きみ</rt></ruby>との<ruby>二人<rt>ふたり</rt></ruby>きりの<ruby>時間<rt>じかん</rt></ruby>) — 'time alone with you'
• shinda kiri (<ruby>死<rt>し</rt></ruby>んだきり) — 'died (and that's it)'
• mou kore-kkiri (もうこれっきり) — "this is really it now"
• kawatta kiri (<ruby>変<rt>か</rt></ruby>わったきり) — 'changed (and stayed that way)'
• ano hi-kiri da (あの<ruby>日<rt>ひ</rt></ruby>きりだ) — "it's been since that day"

${MARKER}`,

  // 〜きる — do completely / through to the end
  "f8364773-e5b7-4064-991a-1238030f9e00": `〜kiru (〜きる / 〜<ruby>切<rt>き</rt></ruby>る) attaches kiru ('to cut') to a verb's masu-stem to express full completion or thoroughness — 'do X completely / to the end / fully'. tabe-kiru (<ruby>食<rt>た</rt></ruby>べきる) 'eat it all'. hashiri-kiru (<ruby>走<rt>はし</rt></ruby>りきる) 'run all the way / finish running'. The positive counterpart of 〜kirenai (batch3a — 'cannot fully X').

Two flavours: (a) Quantitative completion — finishing everything (food, list, work). (b) Qualitative thoroughness — doing X with conviction / to the absolute end (akirame-kiru — fully give up; shinji-kiru — believe completely / unconditionally). Conjugates as a regular godan verb.

Compare with 〜tsukusu (〜<ruby>尽<rt>つ</rt></ruby>くす — exhaust, even more emphatic), 〜oeru (〜<ruby>終<rt>お</rt></ruby>える — finish doing, neutral), 〜shimau (completion + sometimes regret, batch1), and 〜nuku (〜<ruby>抜<rt>ぬ</rt></ruby>く — get through to the end, often via difficulty). 〜kiru emphasises the COMPLETENESS of the action. Common in lyrics for emotional fullness: ai shi-kiru (<ruby>愛<rt>あい</rt></ruby>しきる) 'love completely / unconditionally'.

• tabe-kiru (<ruby>食<rt>た</rt></ruby>べきる) — 'eat it all'
• hashiri-kiru (<ruby>走<rt>はし</rt></ruby>りきる) — 'run to the end'
• yomi-kiru (<ruby>読<rt>よ</rt></ruby>みきる) — 'read it all the way through'
• tsukai-kiru (<ruby>使<rt>つか</rt></ruby>いきる) — 'use up completely'
• nigi-kiru (<ruby>握<rt>にぎ</rt></ruby>りきる) — 'grasp tightly'
• shinji-kiru (<ruby>信<rt>しん</rt></ruby>じきる) — 'believe completely'
• ai shi-kiru (<ruby>愛<rt>あい</rt></ruby>しきる) — 'love completely'
• akirame-kiru (<ruby>諦<rt>あきら</rt></ruby>めきる) — 'completely give up'
• gaman shi-kiru (<ruby>我慢<rt>がまん</rt></ruby>しきる) — 'endure all the way'
• nori-kiru (<ruby>乗<rt>の</rt></ruby>りきる) — 'get through / weather (a difficulty)'
• ie-kiru (<ruby>言<rt>い</rt></ruby>いきる) — 'declare / say with conviction'
• hashiri-kitta (<ruby>走<rt>はし</rt></ruby>りきった) — 'finished the run'
• mamori-kiru (<ruby>守<rt>まも</rt></ruby>りきる) — 'protect to the very end'
• yomi-kireru hon (<ruby>読<rt>よ</rt></ruby>みきれる<ruby>本<rt>ほん</rt></ruby>) — 'a book one can read through'
• arai-kiru (<ruby>洗<rt>あら</rt></ruby>いきる) — 'wash thoroughly / clean completely'

${MARKER}`,

  // 〜けれど — although / but
  "7ca38620-e36b-434c-bdad-84e764f5be5b": `〜keredo (〜けれど) and its variants 〜kedo (〜けど, casual contraction) and 〜keredomo (〜けれども, formal) attach to plain-form sentences as a contrastive connector — 'although / but / however'. Less assertive than 〜ga (〜が), softer than English 'but', often used to introduce a contrast or qualification gently. atsui kedo, dekakeyou (<ruby>暑<rt>あつ</rt></ruby>いけど、<ruby>出<rt>で</rt></ruby>かけよう) "it's hot, but let's go out".

Often used as a sentence-final particle, leaving a thought hanging — 'X, but...' — to invite the listener's reaction or to soften an opinion: ii to omou kedo (いいと<ruby>思<rt>おも</rt></ruby>うけど) "I think it's good, but..." (left dangling, polite hedge). This trailing-off use is one of the most-used pragmatic markers in conversational Japanese.

Compare with 〜ga (slightly more formal 'but / however'), 〜noni (despite — implies frustration / contradiction), 〜tokoroga (however / unexpectedly), and 〜shikashi (formal, written 'however'). 〜keredo / 〜kedo is the everyday choice, sitting between casual and formal. The keredomo form is for written prose and formal speech.

• atsui kedo (<ruby>暑<rt>あつ</rt></ruby>いけど) — "it's hot, but..."
• tabetai kedo nai (<ruby>食<rt>た</rt></ruby>べたいけどない) — "I want to eat (it), but there isn't any"
• ikitai keredo (<ruby>行<rt>い</rt></ruby>きたいけれど) — "I want to go, but..."
• shitte iru kedo iwanai (<ruby>知<rt>し</rt></ruby>っているけど<ruby>言<rt>い</rt></ruby>わない) — "I know, but I won't say"
• ame da keredo iku (<ruby>雨<rt>あめ</rt></ruby>だけれど<ruby>行<rt>い</rt></ruby>く) — "it's raining, but I'll go"
• kanashii kedo daijoubu (<ruby>悲<rt>かな</rt></ruby>しいけど<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>) — "it's sad, but I'm okay"
• boku no sei kamo shirenai keredo (<ruby>僕<rt>ぼく</rt></ruby>のせいかもしれないけれど) — "it might be my fault, but..."
• kanji wa muzukashii kedo omoshiroi (<ruby>漢字<rt>かんじ</rt></ruby>は<ruby>難<rt>むずか</rt></ruby>しいけど<ruby>面白<rt>おもしろ</rt></ruby>い) — "kanji is hard but interesting"
• anata no kimochi wakaru kedo (あなたの<ruby>気持<rt>きも</rt></ruby>ち<ruby>分<rt>わ</rt></ruby>かるけど) — "I understand how you feel, but..."
• tabun kuru to omou kedo (<ruby>多分<rt>たぶん</rt></ruby><ruby>来<rt>く</rt></ruby>ると<ruby>思<rt>おも</rt></ruby>うけど) — "I think they'll probably come, but..."
• yume datta kedo (<ruby>夢<rt>ゆめ</rt></ruby>だったけど) — "it was a dream, but..."
• mou owatta kedo (もう<ruby>終<rt>お</rt></ruby>わったけど) — "it's already over, but..."
• boku wa shinjite ita kedo (<ruby>僕<rt>ぼく</rt></ruby>は<ruby>信<rt>しん</rt></ruby>じていたけど) — "I had believed, but..."
• mada wakaranai keredomo (まだ<ruby>分<rt>わ</rt></ruby>からないけれども) — "I still don't know, but..."
• yowai kedo tsuyoku naritai (<ruby>弱<rt>よわ</rt></ruby>いけど<ruby>強<rt>つよ</rt></ruby>くなりたい) — "I'm weak, but I want to become strong"

${MARKER}`,
};

async function main() {
  const db = getDb();

  let rulesUpdated = 0;
  const oldToNew: Record<string, { oldName: string; newName: string; oldJlpt: string; newJlpt: string }> = {};
  for (const [id, en] of Object.entries(REWRITES)) {
    const newName = NAME_REWRITES[id];
    if (!newName) { console.error(`no NAME_REWRITES entry for ${id}; skipping`); continue; }
    const before = await db.execute(sql`
      SELECT name, jlpt_reference FROM grammar_rules WHERE id = ${id}::uuid
    `);
    const beforeRows = (before.rows ?? before) as Array<{ name: string; jlpt_reference: string }>;
    if (beforeRows.length === 0) { console.warn(`rule ${id} not found; skipping`); continue; }
    const newJlpt = beforeRows[0].jlpt_reference;

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
  console.log(`updated ${rulesUpdated}/${Object.keys(REWRITES).length} grammar_rules`);

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
