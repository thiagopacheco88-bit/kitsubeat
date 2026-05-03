/**
 * Batch 3a — 25 v2-format grammar rule explanations.
 *
 * Continues the inline-Claude rewrite stream:
 *   batch1 (10 rules) → batch2 (15 rules) → batch3a (this, 25 rules) → batch3b (next 25)
 *
 * Selection: top-25 unique by song frequency in the post-pass-3 catalog,
 * skipping (a) already-v2 rules and (b) rules confirmed as duplicates of
 * existing v2 canonicals (d1afdbf7 = batch1 ebd9bcdf 命令形, 684d6fd0 = batch1
 * 28040405 〜teru). Those merges go in pass 4.
 *
 * Format spec (locked): romaji-primary text + JP form in parens, kanji wrapped
 * in <ruby>kanji<rt>kana</rt></ruby>. 3 paragraphs + 15 examples per rule.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/update-batch3a-rules.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "a0d93554-e629-4a25-8d26-6f4bd78a227d": "〜te iku (〜ていく) — gradually / moving onward",
  "5f70f52a-4e3b-4b57-93ce-b44763a711cd": "Passive 〜(ら)reru (〜(ら)れる) — was done by / suffering passive",
  "2a28ef78-f2e4-432f-a6f5-d2d6b22a577e": "〜you ni (〜ように) — like / in the manner of",
  "a69edff2-3f3f-448c-899b-e75e9387fabf": "〜te yuku (〜てゆく) — literary 〜ていく (poetic onward motion)",
  "21037dd8-4312-4b4d-a104-0b6f3fb1f856": "〜darake (〜だらけ) — covered in / riddled with",
  "8d859f55-61c8-4539-9c3b-96832e31e940": "〜bakari (〜ばかり) — only / nothing but / just done",
  "05a47b35-f7bd-41a0-bea8-1eab6bfcd2a1": "〜made (〜まで) — until / as far as / even",
  "0086e6bc-d5b1-4122-b312-e870381d6eb5": "〜kurai / 〜gurai (〜くらい / 〜ぐらい) — about / to the extent of",
  "e5c690b1-cd13-4d82-8181-dde2aba2045e": "〜sugiru (〜すぎる) — too much / excessively",
  "eedcd2c8-0695-4b2c-ba78-70e75b4b5c01": "〜te kita (〜てきた) — has been doing / came to be",
  "2cea4155-d0c8-4446-b751-95e46f54942d": "〜mitai (〜みたい) — like / it seems (colloquial)",
  "737080ec-457d-4433-928f-56c4a1a84ee6": "〜kirenai (〜きれない) — can't fully / cannot do completely",
  "abbf5947-fe80-40e4-8187-81e4c120511f": "〜tari 〜tari (〜たり〜たり) — doing things like X and Y",
  "e6d9fc96-2d75-41a2-9fc4-7d4f9b87129c": "〜dasu (〜だす / 〜出す) — suddenly start / burst into",
  "e57b7b25-a0c0-4824-9fd7-5c1481c4296f": "〜no nara (〜のなら) — if it's the case that",
  "53a9a336-3d93-42ce-8de2-5e5c55f7855d": "〜yori (〜より) — than / rather than (comparison)",
  "0b73b44c-4256-49cb-9002-825f9d225b32": "〜hazu (〜はず) — should / supposed to (logical expectation)",
  "da3b1a0a-498c-4ec0-abdb-14c27c8d0e37": "〜you da (〜ようだ) — it seems / appears to be (formal)",
  "02bb26e0-41f3-475e-8b1b-adffc0e84ef2": "〜au (〜合う) — do mutually / to each other",
  "30adc6ac-4819-46e7-bf32-2f1d8c4c6938": "Causative + kure (〜(さ)せてくれ) — let me / permit me to",
  "616aebc3-512c-44f6-9e19-52cf8f05a3e7": "〜kara (〜から) — because / since (subjective reason)",
  "374d6f9b-2df1-46a3-8b3b-5239c712b804": "〜darou (〜だろう) — probably / right? (conjecture / seeking confirmation)",
  "65590c80-9908-4a07-95ae-f27a4a3b4e51": "〜te oku (〜ておく) — do in advance / leave as is",
  "d4fdeda5-ac36-40a6-b961-23bea04f8c6f": "〜te kuru (〜てくる) — comes toward / becomes",
  "2645301e-25e7-440f-9993-1d996d9ff79a": "〜to iu (〜という) — called / the fact that / so-called",
};

const REWRITES: Record<string, string> = {
  // 〜ていく — gradually / moving onward
  "a0d93554-e629-4a25-8d26-6f4bd78a227d": `Attach iku (<ruby>行<rt>い</rt></ruby>く, 'to go') to a verb's te-form to express gradual onward motion — either physical (going away from the speaker) or aspectual (a process unfolding into the future). Past form: 〜te itta (〜ていった). Casual contraction: 〜teku (〜てく). When the te-form ends in 〜で (e.g., 〜<ruby>飲<rt>の</rt></ruby>んで), the auxiliary is still 〜でいく.

Two main senses: (a) physical movement away — motte iku (<ruby>持<rt>も</rt></ruby>っていく) 'take/carry along', aruite iku (<ruby>歩<rt>ある</rt></ruby>いていく) 'walk away/onward'. (b) Aspectual unfolding — kawatte iku (<ruby>変<rt>か</rt></ruby>わっていく) 'gradually changes', kiete iku (<ruby>消<rt>き</rt></ruby>えていく) 'fades away over time'. The aspectual sense is the one that dominates in songs.

Compare 〜te iku with 〜te kuru (movement TOWARD the speaker / change UP TO now), 〜te iru (current state / progressive), and 〜tsuzukeru (deliberate continuation). 〜te iku tilts forward — the action moves AWAY from the present moment, into the future or into the distance. The literary reading is 〜te yuku (〜てゆく), preferred in songs and poetry.

• kawatte iku (<ruby>変<rt>か</rt></ruby>わっていく) — 'gradually changes / will change'
• kiete iku (<ruby>消<rt>き</rt></ruby>えていく) — 'fades away'
• ikite iku (<ruby>生<rt>い</rt></ruby>きていく) — 'live on / keep on living'
• motte iku (<ruby>持<rt>も</rt></ruby>っていく) — 'take/carry away'
• tsuzukete iku (<ruby>続<rt>つづ</rt></ruby>けていく) — 'keep on going'
• wasurete iku (<ruby>忘<rt>わす</rt></ruby>れていく) — 'gradually forget'
• fuete iku (<ruby>増<rt>ふ</rt></ruby>えていく) — 'increases over time'
• herakte iku (<ruby>減<rt>へ</rt></ruby>っていく) — 'decreases over time'
• ochite iku (<ruby>落<rt>お</rt></ruby>ちていく) — 'falls away / sinks'
• mukatte iku (<ruby>向<rt>む</rt></ruby>かっていく) — 'heads toward'
• tobi-satte iku (<ruby>飛<rt>と</rt></ruby>び<ruby>去<rt>さ</rt></ruby>っていく) — 'flies away'
• toozakatte iku (<ruby>遠<rt>とお</rt></ruby>ざかっていく) — 'recedes into the distance'
• kasanate iku (<ruby>重<rt>かさ</rt></ruby>なっていく) — 'piles up over time'
• tsuyoku natte iku (<ruby>強<rt>つよ</rt></ruby>くなっていく) — 'becomes stronger over time'
• ayunde iku (<ruby>歩<rt>あゆ</rt></ruby>んでいく) — 'walks onward (life)'

${MARKER}`,

  // Passive 〜(ら)reru — was done / suffering
  "5f70f52a-4e3b-4b57-93ce-b44763a711cd": `The passive form attaches 〜reru (〜れる) to Type-1 (godan) a-stems and 〜rareru (〜られる) to Type-2 (ichidan) verbs. Type 1: <ruby>書<rt>か</rt></ruby>く → kakareru (<ruby>書<rt>か</rt></ruby>かれる) 'is written'. Type 2: <ruby>食<rt>た</rt></ruby>べる → taberareru (<ruby>食<rt>た</rt></ruby>べられる) 'is eaten'. Irregular: suru → sareru (される), kuru → korareru (<ruby>来<rt>こ</rt></ruby>られる).

Three uses: (a) Direct passive — focuses on the receiver of the action, like English passive. (b) Suffering passive (<ruby>迷惑<rt>めいわく</rt></ruby>の<ruby>受身<rt>うけみ</rt></ruby>) — the speaker is negatively affected, even when intransitive verbs are involved (ame ni furareta — '(I) was rained on'). (c) Honorific use — same form, polite reading: shachou ga ko-rareta — 'the boss came (honorific)'.

Same surface form as the potential (〜eru / 〜rareru, 'can do') for ichidan verbs — context disambiguates. The passive is also formally identical to the honorific. In modern casual speech, ra-nuki (ら抜き) drops the ら from potential (taberareru → tabereru) but NOT from passive — a useful disambiguation cue.

• iwareta (<ruby>言<rt>い</rt></ruby>われた) — 'I was told'
• kakareta (<ruby>書<rt>か</rt></ruby>かれた) — 'was written'
• yobareta (<ruby>呼<rt>よ</rt></ruby>ばれた) — 'was called/invited'
• shikarareta (<ruby>叱<rt>しか</rt></ruby>られた) — 'was scolded'
• nusumareta (<ruby>盗<rt>ぬす</rt></ruby>まれた) — 'had it stolen' (suffering)
• ame ni furareta (<ruby>雨<rt>あめ</rt></ruby>に<ruby>降<rt>ふ</rt></ruby>られた) — '(I) got rained on' (suffering)
• aisarete iru (<ruby>愛<rt>あい</rt></ruby>されている) — 'is loved'
• tsukurareta (<ruby>作<rt>つく</rt></ruby>られた) — 'was made'
• mitsukerareta (<ruby>見<rt>み</rt></ruby>つけられた) — 'was discovered'
• tatakareta (<ruby>叩<rt>たた</rt></ruby>かれた) — 'was hit'
• shinjirareru (<ruby>信<rt>しん</rt></ruby>じられる) — 'is believed / can believe'
• mamorareta (<ruby>守<rt>まも</rt></ruby>られた) — 'was protected'
• ubawareta (<ruby>奪<rt>うば</rt></ruby>われた) — 'was taken away'
• wasureraremasen (<ruby>忘<rt>わす</rt></ruby>れられません) — 'cannot be forgotten'
• kowasareta (<ruby>壊<rt>こわ</rt></ruby>された) — 'was broken'

${MARKER}`,

  // 〜ように — like / in the manner of
  "2a28ef78-f2e4-432f-a6f5-d2d6b22a577e": `〜you ni (ように) in the manner / simile sense attaches to a noun via no (の) — N + no you ni — or to a clause's plain form, expressing 'like (X) / in the manner of (X) / as (X did)'. Distinct from the purpose / hope sense (also ように) covered separately in batch 2; same particle, different syntactic frame.

Two main uses here: (a) Simile — tori no you ni tobu (<ruby>鳥<rt>とり</rt></ruby>のように<ruby>飛<rt>と</rt></ruby>ぶ) 'fly like a bird'. Common with maru de (まるで, 'just/exactly') for emphatic comparison: marude yume no you ni (just like a dream). (b) Manner reference — clause + you ni — itta you ni (<ruby>言<rt>い</rt></ruby>ったように) 'like I said', omou you ni (<ruby>思<rt>おも</rt></ruby>うように) 'the way you think'.

Compare with 〜mitai (more colloquial simile, attaches directly to a noun without の), 〜sou (visual / hearsay 'looks like'), and 〜rashii (evidential 'apparently'). 〜you ni is the most flexible and the most literary of the simile family — preferred in songs, written Japanese, and any context wanting a measured comparison rather than a casual one.

• tori no you ni (<ruby>鳥<rt>とり</rt></ruby>のように) — 'like a bird'
• yume no you ni (<ruby>夢<rt>ゆめ</rt></ruby>のように) — 'like a dream'
• kaze no you ni (<ruby>風<rt>かぜ</rt></ruby>のように) — 'like the wind'
• hana no you ni (<ruby>花<rt>はな</rt></ruby>のように) — 'like a flower'
• kodomo no you ni (<ruby>子供<rt>こども</rt></ruby>のように) — 'like a child'
• yuki no you ni (<ruby>雪<rt>ゆき</rt></ruby>のように) — 'like snow'
• mizu no you ni (<ruby>水<rt>みず</rt></ruby>のように) — 'like water'
• hoshi no you ni (<ruby>星<rt>ほし</rt></ruby>のように) — 'like a star'
• marude uso no you ni (まるで<ruby>嘘<rt>うそ</rt></ruby>のように) — 'as if it were a lie'
• kimi no itta you ni (<ruby>君<rt>きみ</rt></ruby>の<ruby>言<rt>い</rt></ruby>ったように) — 'just like you said'
• omou you ni (<ruby>思<rt>おも</rt></ruby>うように) — 'as one thinks / the way one wants'
• mae ni hanashita you ni (<ruby>前<rt>まえ</rt></ruby>に<ruby>話<rt>はな</rt></ruby>したように) — 'as I mentioned before'
• mukashi no you ni (<ruby>昔<rt>むかし</rt></ruby>のように) — 'like in the old days'
• maiagaru you ni (<ruby>舞<rt>ま</rt></ruby>い<ruby>上<rt>あ</rt></ruby>がるように) — 'as if dancing into the air'
• hadaka no kokoro no you ni (<ruby>裸<rt>はだか</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>のように) — 'like a bare heart'

${MARKER}`,

  // 〜てゆく — literary 〜ていく
  "a69edff2-3f3f-448c-899b-e75e9387fabf": `〜te yuku (〜てゆく) is the literary / poetic reading of 〜te iku (〜ていく). Attach yuku (<ruby>行<rt>ゆ</rt></ruby>く) to a verb's te-form. Same meaning as 〜te iku — gradual onward motion, away from the present — but yuku reads as elevated, classical, or song-like. Past: 〜te yukita (〜てゆきた) is rare; 〜te itta is preferred even with the literary present. Modern Japanese spoken speech overwhelmingly uses 〜ていく; songs and poetry prefer 〜てゆく.

ゆく vs いく: both write 〜行く but are different historical readings. ゆく is the older, classical reading, surviving in fixed expressions (yuku-kawa no nagare wa taezu shite — 'the river goes on flowing endlessly') and in lyric / literary contexts. いく is the modern colloquial form. The choice between 〜てゆく and 〜ていく is purely register: poetic vs. everyday.

J-pop / anime OST writers reach for 〜てゆく to add weight and timelessness. Same aspectual senses as 〜ていく: gradual change, fading, drifting onward, life-as-journey metaphors. If a song says omoi ga tsunorite yuku (<ruby>想<rt>おも</rt></ruby>いが<ruby>募<rt>つの</rt></ruby>ってゆく) instead of 〜tsunoritte iku, the songwriter is signalling: this is a serious feeling, not a casual one.

• kawatte yuku (<ruby>変<rt>か</rt></ruby>わってゆく) — 'gradually changes' (poetic)
• kiete yuku (<ruby>消<rt>き</rt></ruby>えてゆく) — 'fades away' (poetic)
• nagarete yuku (<ruby>流<rt>なが</rt></ruby>れてゆく) — 'flows onward'
• ochite yuku (<ruby>落<rt>お</rt></ruby>ちてゆく) — 'falls / sinks gradually'
• sugite yuku (<ruby>過<rt>す</rt></ruby>ぎてゆく) — 'passes by'
• afurete yuku (<ruby>溢<rt>あふ</rt></ruby>れてゆく) — 'overflows / fills up'
• tsuzuite yuku (<ruby>続<rt>つづ</rt></ruby>いてゆく) — 'continues onward'
• toozakatte yuku (<ruby>遠<rt>とお</rt></ruby>ざかってゆく) — 'recedes into the distance'
• tobi-satte yuku (<ruby>飛<rt>と</rt></ruby>び<ruby>去<rt>さ</rt></ruby>ってゆく) — 'flies away'
• ikite yuku (<ruby>生<rt>い</rt></ruby>きてゆく) — 'live on'
• ayunde yuku (<ruby>歩<rt>あゆ</rt></ruby>んでゆく) — 'walks onward (life)'
• kumo ga nagarete yuku (<ruby>雲<rt>くも</rt></ruby>が<ruby>流<rt>なが</rt></ruby>れてゆく) — 'clouds drift away'
• yoru ga akete yuku (<ruby>夜<rt>よる</rt></ruby>が<ruby>明<rt>あ</rt></ruby>けてゆく) — 'night gives way to dawn'
• omoi ga tsunorite yuku (<ruby>想<rt>おも</rt></ruby>いが<ruby>募<rt>つの</rt></ruby>ってゆく) — 'feelings build up'
• yume ga sugite yuku (<ruby>夢<rt>ゆめ</rt></ruby>が<ruby>過<rt>す</rt></ruby>ぎてゆく) — 'the dream slips by'

${MARKER}`,

  // 〜だらけ — covered in / riddled with
  "21037dd8-4312-4b4d-a104-0b6f3fb1f856": `〜darake (〜だらけ) attaches directly to a noun (no particle) to mean 'covered in (X) / full of (X) / riddled with (X)'. Almost always carries a negative or messy connotation — chi-darake (<ruby>血<rt>ち</rt></ruby>だらけ) 'covered in blood', shippai-darake (<ruby>失敗<rt>しっぱい</rt></ruby>だらけ) 'riddled with failures'. The image is one of saturation by something undesirable, dirty, or excessive.

Used both literally (physical mess) and figuratively (abstract excess of bad things). Goes with countables (kizu-darake, 'covered in scars') and uncountables (doro-darake, 'covered in mud'). Modifies nouns attributively with の: kizu-darake no kao (<ruby>傷<rt>きず</rt></ruby>だらけの<ruby>顔<rt>かお</rt></ruby>) 'a scarred face'.

Compare with 〜mamire (〜まみれ — 'smeared with', wetter / more visceral, often blood/sweat/mud), 〜zukume (〜ずくめ — 'all X-style', neutral or positive: ii-koto-zukume 'nothing but good things'), and 〜ippai (いっぱい — 'full of', neutral). 〜darake is the negative-charged member of the family — never use it for things you like.

• chi-darake (<ruby>血<rt>ち</rt></ruby>だらけ) — 'covered in blood'
• doro-darake (<ruby>泥<rt>どろ</rt></ruby>だらけ) — 'covered in mud'
• ase-darake (<ruby>汗<rt>あせ</rt></ruby>だらけ) — 'drenched in sweat'
• kizu-darake (<ruby>傷<rt>きず</rt></ruby>だらけ) — 'covered in wounds / scars'
• machigai-darake (<ruby>間違<rt>まちが</rt></ruby>いだらけ) — 'full of mistakes'
• shippai-darake (<ruby>失敗<rt>しっぱい</rt></ruby>だらけ) — 'riddled with failures'
• hokori-darake (<ruby>埃<rt>ほこり</rt></ruby>だらけ) — 'covered in dust'
• namida-darake (<ruby>涙<rt>なみだ</rt></ruby>だらけ) — 'tear-stained'
• ana-darake (<ruby>穴<rt>あな</rt></ruby>だらけ) — 'full of holes'
• gomi-darake (ゴミだらけ) — 'full of trash'
• shimi-darake (シミだらけ) — 'covered in stains'
• yowamushi-darake (<ruby>弱虫<rt>よわむし</rt></ruby>だらけ) — 'a bunch of cowards'
• uso-darake (<ruby>嘘<rt>うそ</rt></ruby>だらけ) — 'full of lies'
• shiwa-darake (<ruby>皺<rt>しわ</rt></ruby>だらけ) — 'covered in wrinkles'
• yume-darake no jinsei (<ruby>夢<rt>ゆめ</rt></ruby>だらけの<ruby>人生<rt>じんせい</rt></ruby>) — 'a life full of dreams' (rare positive use, ironic)

${MARKER}`,

  // 〜ばかり — only / nothing but / just done
  "8d859f55-61c8-4539-9c3b-96832e31e940": `〜bakari (〜ばかり) has two distinct uses depending on what it attaches to. (a) After a noun or V-dictionary: 'only / nothing but X' — uso bakari (<ruby>嘘<rt>うそ</rt></ruby>ばかり) 'nothing but lies'. (b) After V-past (〜ta): 'just (did)' — tabeta bakari (<ruby>食<rt>た</rt></ruby>べたばかり) 'just ate'. (c) After te-form: 〜te bakari iru — 'always doing X' — naite bakari iru (<ruby>泣<rt>な</rt></ruby>いてばかりいる) 'always crying'.

The 'only / nothing but' sense often carries mild criticism or weariness — 'X is the only thing happening, and that's tiresome'. The 'just done' sense is purely temporal, like the English just (just got home, just woke up). The 〜te bakari iru flavour is dismissive — 'always doing X (and not doing the things they should)'.

Compare with 〜dake (〜だけ — neutral 'only / just', no judgement), 〜nomi (〜のみ — formal / written 'only'), 〜tokoro (〜ところ — temporal 'just X-ed', neutral, more bookish than 〜tabakari), batch1's 〜tsuzukeru (deliberate continuation, no criticism). Casual contraction: 〜bakka (〜ばっか) or 〜bakkari (〜ばっかり) — same meaning, more spoken.

• uso bakari (<ruby>嘘<rt>うそ</rt></ruby>ばかり) — 'nothing but lies'
• yume bakari (<ruby>夢<rt>ゆめ</rt></ruby>ばかり) — 'just dreams'
• naite bakari iru (<ruby>泣<rt>な</rt></ruby>いてばかりいる) — 'always crying'
• tabeta bakari (<ruby>食<rt>た</rt></ruby>べたばかり) — 'just ate'
• kaetta bakari (<ruby>帰<rt>かえ</rt></ruby>ったばかり) — 'just got home'
• okita bakari (<ruby>起<rt>お</rt></ruby>きたばかり) — 'just woke up'
• kanji bakari (<ruby>漢字<rt>かんじ</rt></ruby>ばかり) — 'all kanji'
• kimi no koto bakari kangaete iru (<ruby>君<rt>きみ</rt></ruby>のことばかり<ruby>考<rt>かんが</rt></ruby>えている) — 'just thinking about you'
• warai bakari (<ruby>笑<rt>わら</rt></ruby>いばかり) — 'nothing but laughter'
• iya na koto bakari (<ruby>嫌<rt>いや</rt></ruby>なことばかり) — 'only bad things'
• gēmu bakari shite iru (ゲームばかりしている) — 'just playing games (constantly)'
• hajimatta bakari (<ruby>始<rt>はじ</rt></ruby>まったばかり) — 'just begun'
• kanashii koto bakari (<ruby>悲<rt>かな</rt></ruby>しいことばかり) — 'only sad things'
• atta bakari (<ruby>会<rt>あ</rt></ruby>ったばかり) — 'just met'
• yume bakka mite iru (<ruby>夢<rt>ゆめ</rt></ruby>ばっか<ruby>見<rt>み</rt></ruby>ている) — 'doing nothing but dreaming' (casual)

${MARKER}`,

  // 〜まで — until / as far as / even
  "05a47b35-f7bd-41a0-bea8-1eab6bfcd2a1": `〜made (〜まで) attaches to a noun, time expression, or V-dictionary form to mark a limit. Three senses: (a) temporal 'until X' — asa made (<ruby>朝<rt>あさ</rt></ruby>まで) 'until morning'; (b) spatial 'as far as / up to' — tokyo made (<ruby>東京<rt>とうきょう</rt></ruby>まで) 'as far as Tokyo'; (c) emphatic 'even / going so far as to' — kodomo made (<ruby>子供<rt>こども</rt></ruby>まで) 'even children'.

Pairs with 〜kara (〜から, 'from') to bracket a span: tokyo kara osaka made (<ruby>東京<rt>とうきょう</rt></ruby>から<ruby>大阪<rt>おおさか</rt></ruby>まで) 'from Tokyo to Osaka'. With a verb: kuru made matsu (<ruby>来<rt>く</rt></ruby>るまで<ruby>待<rt>ま</rt></ruby>つ) 'wait until they come'. The 'even' / scalar sense is one of the most expressive uses in songs and casual speech: kimi made boku o uragiru no? (<ruby>君<rt>きみ</rt></ruby>まで<ruby>僕<rt>ぼく</rt></ruby>を<ruby>裏切<rt>うらぎ</rt></ruby>るの？) 'even you betray me?'.

Distinct from 〜made ni (〜までに, 'by — deadline'): hachi-ji made = 'until 8 (continuously)', hachi-ji made ni = 'by 8 (one-shot deadline)'. Compare with 〜kara (start), 〜dake (only — limit on amount, not endpoint), and the te-form + 〜made (going so far as to do X — very emphatic concessive).

• ie made (<ruby>家<rt>いえ</rt></ruby>まで) — 'to / until home'
• asa made (<ruby>朝<rt>あさ</rt></ruby>まで) — 'until morning'
• shinu made (<ruby>死<rt>し</rt></ruby>ぬまで) — 'until I die'
• doko made? (どこまで？) — 'how far?'
• kimi ga kuru made (<ruby>君<rt>きみ</rt></ruby>が<ruby>来<rt>く</rt></ruby>るまで) — 'until you come'
• saigo made (<ruby>最後<rt>さいご</rt></ruby>まで) — 'until the end'
• kodomo made wakaru (<ruby>子供<rt>こども</rt></ruby>までわかる) — 'even a child gets it'
• boku made waratta (<ruby>僕<rt>ぼく</rt></ruby>まで<ruby>笑<rt>わら</rt></ruby>った) — 'even I laughed'
• ame ga yamu made (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>むまで) — 'until the rain stops'
• kore made (これまで) — 'up until now / so far'
• itsu made? (いつまで？) — 'until when?'
• yoru made matte (<ruby>夜<rt>よる</rt></ruby>まで<ruby>待<rt>ま</rt></ruby>って) — 'wait until night'
• kotaeru made hanasanai (<ruby>答<rt>こた</rt></ruby>えるまで<ruby>離<rt>はな</rt></ruby>さない) — "won't let go until you answer"
• kimi made ushinau no wa iya da (<ruby>君<rt>きみ</rt></ruby>まで<ruby>失<rt>うしな</rt></ruby>うのは<ruby>嫌<rt>いや</rt></ruby>だ) — "I can't bear losing even you"
• tooku made tobu (<ruby>遠<rt>とお</rt></ruby>くまで<ruby>飛<rt>と</rt></ruby>ぶ) — 'flies far'

${MARKER}`,

  // 〜くらい / 〜ぐらい — about / to the extent of
  "0086e6bc-d5b1-4122-b312-e870381d6eb5": `〜kurai / 〜gurai (くらい / ぐらい — interchangeable) attaches to nouns, quantifiers, or V-dictionary forms. Two main senses: (a) approximation — 'about X / roughly X' — juppun kurai (<ruby>十<rt>じゅっ</rt></ruby><ruby>分<rt>ぷん</rt></ruby>くらい) 'about 10 minutes'; (b) extent / comparison — 'to the extent that X / so much that X' — naku kurai ureshikatta (<ruby>泣<rt>な</rt></ruby>くくらい<ruby>嬉<rt>うれ</rt></ruby>しかった) 'I was so happy I could cry'.

A scalar marker: it sets up a benchmark. With small / trivial things, it minimises ('it's just X kurai — no big deal') — kore kurai wakaru yo (これくらいわかるよ) 'I understand at least this much'. With big / extreme things, it intensifies — shinitai kurai (<ruby>死<rt>し</rt></ruby>にたいくらい) 'to the point of wanting to die'.

Compare with 〜hodo (〜ほど — also extent, but more formal and often used in 'the more X, the more Y' constructions like takaranareba takai hodo); 〜bakari (also approximate, but more about 'limited to'); and 〜yaku (<ruby>約<rt>やく</rt></ruby> — neutral 'approximately', formal). 〜kurai is the everyday, conversational scalar marker. After question words it scales meaning: dore kurai (どれくらい) 'how much / how long'.

• juppun kurai (<ruby>十<rt>じゅっ</rt></ruby><ruby>分<rt>ぷん</rt></ruby>くらい) — 'about 10 minutes'
• hyaku-en kurai (<ruby>百円<rt>ひゃくえん</rt></ruby>くらい) — 'about ¥100'
• kore kurai (これくらい) — 'about this much'
• dore kurai? (どれくらい？) — 'how much / how long?'
• naku kurai ureshii (<ruby>泣<rt>な</rt></ruby>くくらい<ruby>嬉<rt>うれ</rt></ruby>しい) — 'so happy I could cry'
• shinitai kurai (<ruby>死<rt>し</rt></ruby>にたいくらい) — 'to the point of wanting to die'
• hazukashii kurai (<ruby>恥<rt>は</rt></ruby>ずかしいくらい) — 'embarrassingly so'
• kanji ga komaru kurai (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>困<rt>こま</rt></ruby>るくらい) — 'enough kanji to be a problem'
• boku kurai wakaru (<ruby>僕<rt>ぼく</rt></ruby>くらいわかる) — 'at least someone like me understands'
• onaji kurai (<ruby>同<rt>おな</rt></ruby>じくらい) — 'about the same'
• kao mo wasureru kurai (<ruby>顔<rt>かお</rt></ruby>も<ruby>忘<rt>わす</rt></ruby>れるくらい) — 'enough to forget even your face'
• aitai kurai (<ruby>会<rt>あ</rt></ruby>いたいくらい) — 'wanting to meet so badly'
• mukashi kurai mae ni (<ruby>昔<rt>むかし</rt></ruby>くらい<ruby>前<rt>まえ</rt></ruby>に) — 'about as long ago as the old days'
• kore gurai no koto (これぐらいのこと) — 'something this trivial'
• hyaku-nin gurai (<ruby>百人<rt>ひゃくにん</rt></ruby>ぐらい) — 'about a hundred people'

${MARKER}`,

  // 〜すぎる — too much
  "e5c690b1-cd13-4d82-8181-dde2aba2045e": `〜sugiru (〜すぎる, 'to exceed') attaches to a verb's masu-stem or an adjective's stem to mean 'too (much) X / excessively X'. Verb: tabe-sugiru (<ruby>食<rt>た</rt></ruby>べすぎる) 'eat too much'. I-adjective: takasugiru (<ruby>高<rt>たか</rt></ruby>すぎる) 'too expensive' (drop the い). Na-adjective: shizuka-sugiru (<ruby>静<rt>しず</rt></ruby>かすぎる) 'too quiet' (drop the な). Conjugates as an ichidan verb: 〜sugita (past), 〜suginai (negative), 〜sugite (te-form).

The default flavour is mildly negative — 'X is happening to a degree that is excessive / problematic'. Even neutral or positive descriptions become slightly critical with 〜sugiru: kawai-sugiru (<ruby>可愛<rt>かわい</rt></ruby>すぎる) literally 'too cute', often used affectionately ('cuter than is reasonable') but still implies excess. In writing, frequently nominalised: tabesugi (<ruby>食<rt>た</rt></ruby>べすぎ) 'overeating'.

Compare with 〜tooi (too far — but this is just an adjective, not a productive pattern), the colloquial chou (<ruby>超<rt>ちょう</rt></ruby> — 'super', positive intensifier, no excess implication), and 〜amari (〜あまり — formal 'so X that...'). 〜sugiru is the ubiquitous everyday 'too' suffix — present in almost every meal, every shopping trip, every workout.

• tabesugi-ru (<ruby>食<rt>た</rt></ruby>べすぎる) — 'eat too much'
• nomisugi-ru (<ruby>飲<rt>の</rt></ruby>みすぎる) — 'drink too much'
• takasugi-ru (<ruby>高<rt>たか</rt></ruby>すぎる) — 'too expensive / too tall'
• yasusugi-ru (<ruby>安<rt>やす</rt></ruby>すぎる) — 'too cheap'
• kawai-sugiru (<ruby>可愛<rt>かわい</rt></ruby>すぎる) — 'too cute'
• shaberi-sugiru (しゃべりすぎる) — 'talk too much'
• kangae-sugiru (<ruby>考<rt>かんが</rt></ruby>えすぎる) — 'overthink'
• hayasugi-ru (<ruby>早<rt>はや</rt></ruby>すぎる) — 'too early / too fast'
• osoi-sugita (<ruby>遅<rt>おそ</rt></ruby>すぎた) — 'was too late'
• ureshii-sugiru (<ruby>嬉<rt>うれ</rt></ruby>しすぎる) — 'too happy (overwhelmed)'
• shiawase-sugiru (<ruby>幸<rt>しあわ</rt></ruby>せすぎる) — 'too happy'
• tsuyo-sugiru (<ruby>強<rt>つよ</rt></ruby>すぎる) — 'too strong'
• yoru ga nagasugiru (<ruby>夜<rt>よる</rt></ruby>が<ruby>長<rt>なが</rt></ruby>すぎる) — 'the night is too long'
• kimi wa yasashisugiru (<ruby>君<rt>きみ</rt></ruby>は<ruby>優<rt>やさ</rt></ruby>しすぎる) — 'you are too kind'
• tabesugi (<ruby>食<rt>た</rt></ruby>べすぎ) — 'overeating' (nominalised)

${MARKER}`,

  // 〜てきた — has been doing / came to be
  "eedcd2c8-0695-4b2c-ba78-70e75b4b5c01": `〜te kita (〜てきた) is the past form of 〜te kuru (〜てくる) — attach kita (<ruby>来<rt>き</rt></ruby>た, 'came') to a verb's te-form. Three main readings: (a) physical motion toward the speaker — motte kita (<ruby>持<rt>も</rt></ruby>ってきた) 'brought (here)'. (b) Aspectual change unfolding UP TO NOW — fuete kita (<ruby>増<rt>ふ</rt></ruby>えてきた) 'has been increasing'. (c) Inception / appearance — futte kita (<ruby>降<rt>ふ</rt></ruby>ってきた) 'started raining / began to fall'.

The 'has been doing' reading (perfect aspect from the past up to now) is the one beginners hit constantly: ganbatte kita (<ruby>頑張<rt>がんば</rt></ruby>ってきた) 'I have been trying / I've worked hard up to this point'. It collapses the entire arc of effort into a single past-completed-but-still-relevant form. Distinct from 〜te ita (continuous past, ongoing at a past moment) and from 〜ta (one-shot past).

Compare with 〜te iku (movement away / forward) — 〜te kuru/kita is its mirror, motion or change TOWARD the present. With change-of-state verbs, 〜te kita signals 'has come to be' — wakatte kita (<ruby>分<rt>わ</rt></ruby>かってきた) 'I'm starting to understand / I've come to understand'. With weather and natural phenomena, it signals onset: kaze ga fuite kita (<ruby>風<rt>かぜ</rt></ruby>が<ruby>吹<rt>ふ</rt></ruby>いてきた) 'the wind picked up'.

• motte kita (<ruby>持<rt>も</rt></ruby>ってきた) — 'brought (here)'
• fuete kita (<ruby>増<rt>ふ</rt></ruby>えてきた) — 'has been increasing'
• ganbatte kita (<ruby>頑張<rt>がんば</rt></ruby>ってきた) — 'I have been trying'
• ikite kita (<ruby>生<rt>い</rt></ruby>きてきた) — 'I have lived (up to now)'
• wakatte kita (<ruby>分<rt>わ</rt></ruby>かってきた) — "I'm starting to understand"
• futte kita (<ruby>降<rt>ふ</rt></ruby>ってきた) — 'started raining / falling'
• samuku natte kita (<ruby>寒<rt>さむ</rt></ruby>くなってきた) — 'has gotten cold'
• atsuku natte kita (<ruby>暑<rt>あつ</rt></ruby>くなってきた) — 'has gotten hot'
• kaze ga fuite kita (<ruby>風<rt>かぜ</rt></ruby>が<ruby>吹<rt>ふ</rt></ruby>いてきた) — 'the wind picked up'
• tanoshiku natte kita (<ruby>楽<rt>たの</rt></ruby>しくなってきた) — "it's getting fun"
• mietekita (<ruby>見<rt>み</rt></ruby>えてきた) — 'has come into view / started to see'
• yatte kita (やってきた) — 'have done / have arrived'
• tsuzukete kita (<ruby>続<rt>つづ</rt></ruby>けてきた) — 'have kept doing (until now)'
• naite kita (<ruby>泣<rt>な</rt></ruby>いてきた) — 'started crying'
• mamotte kita (<ruby>守<rt>まも</rt></ruby>ってきた) — 'have protected (until now)'

${MARKER}`,

  // 〜みたい — like / it seems (colloquial)
  "2cea4155-d0c8-4446-b751-95e46f54942d": `〜mitai (〜みたい) is the colloquial 'like / seems like' marker. Attaches directly to a noun (no の particle): tori mitai (<ruby>鳥<rt>とり</rt></ruby>みたい) 'like a bird'. To V/Adj plain forms: ame ga furu mitai (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るみたい) 'looks like it'll rain'. To na-adj stems without な: kirei mitai (<ruby>綺麗<rt>きれい</rt></ruby>みたい) 'seems pretty'. Conjugates as a na-adjective: mitai na (modifying), mitai ni (adverbial), mitai datta (past).

Two senses: (a) Simile — 'like / similar to'. (b) Conjecture from observation — 'it looks / seems X' — based on what the speaker can perceive directly. The conjecture flavour is informal and immediate, less hedged than 〜you da or 〜rashii.

Compare with 〜you da (formal, written, both simile and conjecture; 〜mitai is its colloquial twin), 〜sou da (visual 'looks X' — narrower, only based on appearance), and 〜rashii (evidential 'apparently / from what I hear' — based on hearsay or social typicality). 〜mitai is the everyday spoken Japanese choice — songs and casual speech overflow with it. The combination 〜mitai ni (adverbial: 'in the manner of') is a song staple: kaze mitai ni (<ruby>風<rt>かぜ</rt></ruby>みたいに) 'like the wind'.

• tori mitai (<ruby>鳥<rt>とり</rt></ruby>みたい) — 'like a bird'
• yume mitai (<ruby>夢<rt>ゆめ</rt></ruby>みたい) — 'like a dream'
• kodomo mitai (<ruby>子供<rt>こども</rt></ruby>みたい) — 'like a child'
• kaze mitai ni (<ruby>風<rt>かぜ</rt></ruby>みたいに) — 'like the wind'
• ame ga furu mitai (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るみたい) — "looks like it'll rain"
• shiranai mitai (<ruby>知<rt>し</rt></ruby>らないみたい) — "looks like (they) don't know"
• tsukareta mitai (<ruby>疲<rt>つか</rt></ruby>れたみたい) — 'seems tired'
• boku mitai (<ruby>僕<rt>ぼく</rt></ruby>みたい) — 'like me'
• marude uso mitai (まるで<ruby>嘘<rt>うそ</rt></ruby>みたい) — 'just like a lie'
• kirei mitai (<ruby>綺麗<rt>きれい</rt></ruby>みたい) — 'seems pretty'
• kanji mitai na shape (<ruby>漢字<rt>かんじ</rt></ruby>みたいな<ruby>形<rt>かたち</rt></ruby>) — 'a kanji-like shape'
• yuki mitai ni shiroi (<ruby>雪<rt>ゆき</rt></ruby>みたいに<ruby>白<rt>しろ</rt></ruby>い) — 'white like snow'
• sukoshi okotteru mitai (<ruby>少<rt>すこ</rt></ruby>し<ruby>怒<rt>おこ</rt></ruby>ってるみたい) — 'seems a bit angry'
• boku ja nai mitai (<ruby>僕<rt>ぼく</rt></ruby>じゃないみたい) — "doesn't feel like me"
• mahou mitai (<ruby>魔法<rt>まほう</rt></ruby>みたい) — 'like magic'

${MARKER}`,

  // 〜きれない — can't fully / cannot do completely
  "737080ec-457d-4433-928f-56c4a1a84ee6": `〜kirenai (〜きれない) is the negative potential of 〜kiru (<ruby>切<rt>き</rt></ruby>る — auxiliary 'do completely / to the end'). Attach to a verb's masu-stem: tabekirenai (<ruby>食<rt>た</rt></ruby>べきれない) 'can't eat it all', kazoekirenai (<ruby>数<rt>かぞ</rt></ruby>えきれない) 'can't count them all'. The implication is overwhelming quantity, complexity, or duration — 'so much that one cannot finish'.

The positive 〜kiru means 'do completely, exhaust the action': tabekiru (<ruby>食<rt>た</rt></ruby>べきる) 'eat it all, finish eating'. The negative 〜kirenai inverts this: the action cannot be fully completed because of scale. Distinct from a simple negative potential (taberarenai 'can't eat') — 〜kirenai specifically asserts that completion is the obstacle.

Common in songs and emotional speech: ureshikute namida ga koraekirenai (<ruby>嬉<rt>うれ</rt></ruby>しくて<ruby>涙<rt>なみだ</rt></ruby>が<ruby>堪<rt>こら</rt></ruby>えきれない) 'so happy I can't hold back the tears'. Compare with 〜enai (general inability, 〜られない), 〜ezu (literary inability), and 〜tsukusu (〜尽くす — exhaustive completion). 〜kirenai is the one to reach for when expressing 'too much to handle'.

• tabekirenai (<ruby>食<rt>た</rt></ruby>べきれない) — "can't eat it all"
• kazoekirenai (<ruby>数<rt>かぞ</rt></ruby>えきれない) — 'too many to count'
• matikirenai (<ruby>待<rt>ま</rt></ruby>ちきれない) — "can't wait (any longer)"
• gaman shikirenai (<ruby>我慢<rt>がまん</rt></ruby>しきれない) — 'cannot endure (any more)'
• shinjikirenai (<ruby>信<rt>しん</rt></ruby>じきれない) — 'unable to fully believe'
• kotaekirenai (<ruby>答<rt>こた</rt></ruby>えきれない) — 'cannot fully answer'
• yomikirenai (<ruby>読<rt>よ</rt></ruby>みきれない) — 'too much to read'
• namida ga koraekirenai (<ruby>涙<rt>なみだ</rt></ruby>が<ruby>堪<rt>こら</rt></ruby>えきれない) — "can't hold back tears"
• omoi ga osaekirenai (<ruby>想<rt>おも</rt></ruby>いが<ruby>抑<rt>おさ</rt></ruby>えきれない) — "can't suppress these feelings"
• arigato to ii-kirenai (ありがとうと<ruby>言<rt>い</rt></ruby>いきれない) — "can't say thanks enough"
• ai wo tsutaekirenai (<ruby>愛<rt>あい</rt></ruby>を<ruby>伝<rt>つた</rt></ruby>えきれない) — 'cannot fully convey love'
• mamori-kirenakatta (<ruby>守<rt>まも</rt></ruby>りきれなかった) — 'could not fully protect'
• wasure-kirenai omoide (<ruby>忘<rt>わす</rt></ruby>れきれない<ruby>思<rt>おも</rt></ruby>い<ruby>出<rt>で</rt></ruby>) — 'memories I cannot let go of'
• mi-kirenai dorama (<ruby>見<rt>み</rt></ruby>きれないドラマ) — 'too many shows to watch'
• tsuki-aikirenai (<ruby>付<rt>つ</rt></ruby>き<ruby>合<rt>あ</rt></ruby>いきれない) — "can't keep up with (someone) anymore"

${MARKER}`,

  // 〜たり〜たり — doing things like X and Y
  "abbf5947-fe80-40e4-8187-81e4c120511f": `〜tari 〜tari (〜たり〜たり) attaches the 〜たり ending (V-past + り) to two or more verbs to list representative actions — 'doing things like X and Y (among others)'. Closes with する or its conjugated forms. Past: 〜tari shita. The list is non-exhaustive: 〜tari 〜tari implies 'these are examples; there may be more'.

Formation: take the 〜ta past form, replace the final 〜た with 〜たり (or 〜だり for verbs whose past ends in 〜だ): tabeta → tabetari, nonda → nondari. For nouns / na-adjectives: 〜dattari. Single 〜tari without a partner (only one verb listed) is also valid, with the same 'one example among others' nuance — naitari shite ita (<ruby>泣<rt>な</rt></ruby>いたりしていた) 'doing things like crying'.

A second use: alternation — 'sometimes X, sometimes Y' — futtari yandari (<ruby>降<rt>ふ</rt></ruby>ったりやんだり) 'on and off (raining and stopping)'. Compare with 〜te 〜te (sequential 'X then Y, in order'), 〜nagara (simultaneous 'while doing'), and Verb-ya...ya (formal listing). 〜tari 〜tari is the everyday neutral way to enumerate non-sequential examples.

• tabetari nondari shita (<ruby>食<rt>た</rt></ruby>べたり<ruby>飲<rt>の</rt></ruby>んだりした) — 'ate and drank (and so on)'
• naitari warattari (<ruby>泣<rt>な</rt></ruby>いたり<ruby>笑<rt>わら</rt></ruby>ったり) — 'crying and laughing'
• ittari kitari (<ruby>行<rt>い</rt></ruby>ったり<ruby>来<rt>き</rt></ruby>たり) — 'going back and forth'
• futtari yandari (<ruby>降<rt>ふ</rt></ruby>ったりやんだり) — 'raining on and off'
• mitari kiitari (<ruby>見<rt>み</rt></ruby>たり<ruby>聞<rt>き</rt></ruby>いたり) — 'watching and listening'
• yondari kaitari (<ruby>読<rt>よ</rt></ruby>んだり<ruby>書<rt>か</rt></ruby>いたり) — 'reading and writing'
• hashittari aruitari (<ruby>走<rt>はし</rt></ruby>ったり<ruby>歩<rt>ある</rt></ruby>いたり) — 'running and walking'
• yorokondari kanashindari (<ruby>喜<rt>よろこ</rt></ruby>んだり<ruby>悲<rt>かな</rt></ruby>しんだり) — 'rejoicing and grieving'
• tsuyokattari yowakattari (<ruby>強<rt>つよ</rt></ruby>かったり<ruby>弱<rt>よわ</rt></ruby>かったり) — 'sometimes strong, sometimes weak'
• ame dattari yuki dattari (<ruby>雨<rt>あめ</rt></ruby>だったり<ruby>雪<rt>ゆき</rt></ruby>だったり) — 'sometimes rain, sometimes snow'
• ittari kitari no toshi (<ruby>行<rt>い</rt></ruby>ったり<ruby>来<rt>き</rt></ruby>たりの<ruby>都市<rt>とし</rt></ruby>) — 'a city of comings and goings'
• shinjitari utagattari (<ruby>信<rt>しん</rt></ruby>じたり<ruby>疑<rt>うたが</rt></ruby>ったり) — 'believing and doubting'
• iitari iwanakattari (<ruby>言<rt>い</rt></ruby>ったり<ruby>言<rt>い</rt></ruby>わなかったり) — 'sometimes saying it, sometimes not'
• naitari shite ita (<ruby>泣<rt>な</rt></ruby>いたりしていた) — 'doing things like crying'
• kawattari modottari (<ruby>変<rt>か</rt></ruby>わったり<ruby>戻<rt>もど</rt></ruby>ったり) — 'changing and reverting'

${MARKER}`,

  // 〜だす — suddenly start / burst into
  "e6d9fc96-2d75-41a2-9fc4-7d4f9b87129c": `〜dasu (〜だす / 〜出す) attaches dasu (<ruby>出<rt>だ</rt></ruby>す, 'to put/take out') to a verb's masu-stem to express the sudden, often unexpected, onset of an action — 'burst out X-ing / suddenly start to X'. naki-dasu (<ruby>泣<rt>な</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) 'burst into tears'. furi-dasu (<ruby>降<rt>ふ</rt></ruby>り<ruby>出<rt>だ</rt></ruby>す) 'start to rain (suddenly)'. Conjugates as a regular godan verb: dashita past, dasanai negative.

Distinguished from 〜hajimeru (〜<ruby>始<rt>はじ</rt></ruby>める, 'begin to') by abruptness. 〜hajimeru is neutral — 'begin doing X' (planned or natural). 〜dasu is sudden and often involuntary — 'burst into X'. Also distinct from the productive auxiliary 'X out' sense in compounds like motte dasu (<ruby>持<rt>も</rt></ruby>ち<ruby>出<rt>だ</rt></ruby>す) 'take out, bring out' — same 出す, different aspectual function.

The sudden-onset reading dominates with emotional verbs (cry, laugh, scream, run) and weather verbs (rain, snow, blow). Common in narrative writing and lyrics where sudden mood shifts matter. Compare with 〜tsukeru (〜つける — habitual / customary), 〜komu (〜<ruby>込<rt>こ</rt></ruby>む — 'into / deeply'), and the 〜hajimeru / 〜dasu / 〜tsukeru / 〜tsuzukeru aspectual cluster.

• naki-dasu (<ruby>泣<rt>な</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'burst into tears'
• warai-dasu (<ruby>笑<rt>わら</rt></ruby>い<ruby>出<rt>だ</rt></ruby>す) — 'burst out laughing'
• furi-dasu (<ruby>降<rt>ふ</rt></ruby>り<ruby>出<rt>だ</rt></ruby>す) — 'start to rain (suddenly)'
• hashiri-dasu (<ruby>走<rt>はし</rt></ruby>り<ruby>出<rt>だ</rt></ruby>す) — 'break into a run'
• sakebi-dasu (<ruby>叫<rt>さけ</rt></ruby>び<ruby>出<rt>だ</rt></ruby>す) — 'start screaming'
• naki-dashita (<ruby>泣<rt>な</rt></ruby>き<ruby>出<rt>だ</rt></ruby>した) — 'burst into tears (past)'
• ame ga furi-dashita (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>り<ruby>出<rt>だ</rt></ruby>した) — 'it started to rain'
• kaze ga fuki-dasu (<ruby>風<rt>かぜ</rt></ruby>が<ruby>吹<rt>ふ</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'wind starts blowing'
• utai-dasu (<ruby>歌<rt>うた</rt></ruby>い<ruby>出<rt>だ</rt></ruby>す) — 'burst into song'
• hanashi-dasu (<ruby>話<rt>はな</rt></ruby>し<ruby>出<rt>だ</rt></ruby>す) — 'start talking'
• ugoki-dasu (<ruby>動<rt>うご</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す) — 'begin to move'
• tobi-dasu (<ruby>飛<rt>と</rt></ruby>び<ruby>出<rt>だ</rt></ruby>す) — 'jump out / dash out'
• afure-dasu (<ruby>溢<rt>あふ</rt></ruby>れ<ruby>出<rt>だ</rt></ruby>す) — 'overflow / start spilling'
• kanga-e-dasu (<ruby>考<rt>かんが</rt></ruby>え<ruby>出<rt>だ</rt></ruby>す) — 'begin to think (sudden)'
• kakidashita (<ruby>書<rt>か</rt></ruby>き<ruby>出<rt>だ</rt></ruby>した) — 'started writing (suddenly)'

${MARKER}`,

  // 〜のなら — if it's the case that
  "e57b7b25-a0c0-4824-9fd7-5c1481c4296f": `〜no nara (〜のなら) attaches to plain-form verbs / adjectives via の (the explanatory particle, sometimes ん in casual). It marks a topic-based conditional grounded in something the speaker has observed or been told: 'if (it's the case that) X, then Y'. iku no nara (<ruby>行<rt>い</rt></ruby>くのなら) 'if you're going (then...)'. The の adds the nuance 'given that', distinguishing this conditional from a generic 〜nara.

Compare with batch1's 〜nara (without の: bare topic conditional, often hypothetical). 〜no nara is more situational — the conditional is anchored in something already in the conversation. Often shortened to 〜n nara (〜んなら) in casual speech. Politely: 〜no deshitara / 〜noyo deshitara.

Frequently used to give advice or impose a condition: shitsumon ga aru no nara, ima kiite (<ruby>質問<rt>しつもん</rt></ruby>があるのなら、<ruby>今<rt>いま</rt></ruby><ruby>聞<rt>き</rt></ruby>いて) 'if you have a question, ask now'. Also for emotional response / complaint: sonna ni iya na no nara, yamete (そんなに<ruby>嫌<rt>いや</rt></ruby>なのなら、やめて) 'if you hate it that much, stop'. Compare with 〜tara (sequential discovery), 〜ba (logical 'if'), and 〜to (inevitable consequence).

• iku no nara (<ruby>行<rt>い</rt></ruby>くのなら) — "if you're going"
• yameru no nara (やめるのなら) — "if you're going to quit"
• taberu no nara (<ruby>食<rt>た</rt></ruby>べるのなら) — "if you're going to eat (it)"
• kanashii no nara (<ruby>悲<rt>かな</rt></ruby>しいのなら) — 'if you are sad'
• shinjiru no nara (<ruby>信<rt>しん</rt></ruby>じるのなら) — 'if you believe'
• boku ga inai no nara (<ruby>僕<rt>ぼく</rt></ruby>がいないのなら) — 'if I were not there'
• yume nara samenaide (<ruby>夢<rt>ゆめ</rt></ruby>ならさめないで) — "if it's a dream, don't let me wake" (variant)
• iya na no nara yamete (<ruby>嫌<rt>いや</rt></ruby>なのならやめて) — 'if you hate it, stop'
• kuru no nara matsu (<ruby>来<rt>く</rt></ruby>るのなら<ruby>待<rt>ま</rt></ruby>つ) — "if you're coming, I'll wait"
• shitsumon ga aru no nara (<ruby>質問<rt>しつもん</rt></ruby>があるのなら) — 'if you have a question'
• wasureru no nara wasurete (<ruby>忘<rt>わす</rt></ruby>れるのなら<ruby>忘<rt>わす</rt></ruby>れて) — 'if you would forget, then forget'
• sayonara nara (さよならなら) — 'if (this is) farewell'
• damaru no nara (<ruby>黙<rt>だま</rt></ruby>るのなら) — "if you'll stay silent"
• motto aitai no nara (もっと<ruby>会<rt>あ</rt></ruby>いたいのなら) — 'if you want to meet more'
• kowareru no nara koware-yo (<ruby>壊<rt>こわ</rt></ruby>れるのなら<ruby>壊<rt>こわ</rt></ruby>れよ) — 'if it would break, then break (let it)'

${MARKER}`,

  // 〜より — than / rather than (comparison)
  "53a9a336-3d93-42ce-8de2-5e5c55f7855d": `〜yori (〜より) marks the standard of comparison — 'than X' or 'rather than X'. Attaches to nouns, V-dictionary forms, or adjectives. Basic frame: A wa B yori X — 'A is X-er than B'. neko yori inu ga suki (<ruby>猫<rt>ねこ</rt></ruby>より<ruby>犬<rt>いぬ</rt></ruby>が<ruby>好<rt>す</rt></ruby>き) 'I like dogs more than cats'. Sometimes paired with 〜hou ga (〜<ruby>方<rt>ほう</rt></ruby>が) for clarity.

Two distinct uses: (a) Comparison — 'X than Y'. (b) Source / starting point in formal contexts — yori (より) means 'from' in written/announcement Japanese: tokyo yori (<ruby>東京<rt>とうきょう</rt></ruby>より) 'from Tokyo'. The comparison sense is what songs and conversation use; the 'from' sense appears on packages, formal letters, and announcements.

Combined with negation, 〜yori expresses preference: B yori A no hou ga ii (B より A の<ruby>方<rt>ほう</rt></ruby>がいい) 'A is better than B'. Adverbial intensifier: yori takaku (より<ruby>高<rt>たか</rt></ruby>く) 'higher (than before)' — compare with 〜motto (more, neutral). 〜yori in this elevated 'even more' sense gives song lyrics their sweep.

• neko yori inu (<ruby>猫<rt>ねこ</rt></ruby>より<ruby>犬<rt>いぬ</rt></ruby>) — 'dogs (more) than cats'
• kinou yori atatakai (<ruby>昨日<rt>きのう</rt></ruby>より<ruby>暖<rt>あたた</rt></ruby>かい) — 'warmer than yesterday'
• boku yori kimi (<ruby>僕<rt>ぼく</rt></ruby>より<ruby>君<rt>きみ</rt></ruby>) — 'you (more) than me'
• mae yori tsuyoi (<ruby>前<rt>まえ</rt></ruby>より<ruby>強<rt>つよ</rt></ruby>い) — 'stronger than before'
• kotoba yori (<ruby>言葉<rt>ことば</rt></ruby>より) — 'more than words'
• yume yori riaru (<ruby>夢<rt>ゆめ</rt></ruby>よりリアル) — 'more real than a dream'
• shinjiru yori (<ruby>信<rt>しん</rt></ruby>じるより) — 'rather than believing'
• A yori B no hou ga suki (AよりBの<ruby>方<rt>ほう</rt></ruby>が<ruby>好<rt>す</rt></ruby>き) — 'I like B more than A'
• yori takaku (より<ruby>高<rt>たか</rt></ruby>く) — 'even higher'
• yori tsuyoku (より<ruby>強<rt>つよ</rt></ruby>く) — 'even stronger'
• tokyo yori (<ruby>東京<rt>とうきょう</rt></ruby>より) — 'from Tokyo' (formal sender)
• boku no kanashimi yori (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>悲<rt>かな</rt></ruby>しみより) — 'more than my sadness'
• ima yori mae (<ruby>今<rt>いま</rt></ruby>より<ruby>前<rt>まえ</rt></ruby>) — 'before now (earlier than now)'
• namida yori egao (<ruby>涙<rt>なみだ</rt></ruby>より<ruby>笑顔<rt>えがお</rt></ruby>) — 'smiles more than tears'
• nani yori (<ruby>何<rt>なに</rt></ruby>より) — 'more than anything'

${MARKER}`,

  // 〜はず — should / supposed to (logical expectation)
  "0b73b44c-4256-49cb-9002-825f9d225b32": `〜hazu (〜はず) is a noun meaning 'logical expectation / what should be the case'. Attaches to plain-form verbs, adjectives, or nouns + の. Marks the speaker's confident inference based on evidence or established knowledge — 'it should be that X / X is supposed to be'. kuru hazu da (<ruby>来<rt>く</rt></ruby>るはずだ) 'they should come'. Negative: 〜hazu ga nai / 〜hazu wa nai (it can't possibly be / no way that).

Distinguished from 〜beki (〜べき, moral 'should / ought to') — 〜hazu is about likelihood and reasoning, not duty. Distinct from 〜darou (probably — softer guess) and 〜kamo shirenai (〜かもしれない — 'might be', genuine uncertainty). 〜hazu sits at the high-confidence end of conjecture: the speaker has reason to believe X is true, even if they can't directly verify it.

Common pattern 〜hazu datta (〜はずだった) 'was supposed to (but didn't happen)' marks unfulfilled expectations: kuru hazu datta (<ruby>来<rt>く</rt></ruby>るはずだった) 'they were supposed to come'. The negation 〜hazu ga nai is one of the most emphatic ways to deny something in Japanese — 'there's no way'. Bunkai kara: 'I won't accept that this is true given what I know'.

• kuru hazu da (<ruby>来<rt>く</rt></ruby>るはずだ) — 'they should come'
• shitte iru hazu (<ruby>知<rt>し</rt></ruby>っているはず) — 'should know'
• wakaru hazu (<ruby>分<rt>わ</rt></ruby>かるはず) — 'ought to understand'
• ano hito ga shiranai hazu ga nai (あの<ruby>人<rt>ひと</rt></ruby>が<ruby>知<rt>し</rt></ruby>らないはずがない) — 'no way that person would not know'
• boku no koto wo wasureru hazu ga nai (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れるはずがない) — "you can't possibly have forgotten me"
• kuru hazu datta (<ruby>来<rt>く</rt></ruby>るはずだった) — 'was supposed to come (but didn't)'
• kekkon suru hazu datta (<ruby>結婚<rt>けっこん</rt></ruby>するはずだった) — 'was supposed to get married'
• ima goro tsuita hazu (<ruby>今頃<rt>いまごろ</rt></ruby><ruby>着<rt>つ</rt></ruby>いたはず) — 'should have arrived by now'
• maketa hazu wa nai (<ruby>負<rt>ま</rt></ruby>けたはずはない) — "there's no way I lost"
• kotaeru hazu (<ruby>答<rt>こた</rt></ruby>えるはず) — 'should answer'
• kanarazu kuru hazu (<ruby>必<rt>かなら</rt></ruby>ず<ruby>来<rt>く</rt></ruby>るはず) — 'should definitely come'
• kanjiru hazu (<ruby>感<rt>かん</rt></ruby>じるはず) — 'should be able to feel'
• issho ni iru hazu datta (<ruby>一緒<rt>いっしょ</rt></ruby>にいるはずだった) — 'we were supposed to be together'
• mitsukaru hazu (<ruby>見<rt>み</rt></ruby>つかるはず) — 'should be findable'
• taberareru hazu ga nai (<ruby>食<rt>た</rt></ruby>べられるはずがない) — 'no way I can eat (it)'

${MARKER}`,

  // 〜ようだ — it seems / appears to be (formal)
  "da3b1a0a-498c-4ec0-abdb-14c27c8d0e37": `〜you da (〜ようだ) is the formal / written counterpart to 〜mitai. Attaches to plain-form verbs, adjectives, or nouns + の: ame ga furu you da (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るようだ) 'it seems it'll rain'. Conjugates as a na-adjective: 〜you na (modifying), 〜you ni (adverbial), 〜you datta (past), 〜you de (and / so).

Two senses: (a) Conjecture from evidence — 'it appears / seems X' (based on what the speaker observes). (b) Simile — 'like X' — yume no you da (<ruby>夢<rt>ゆめ</rt></ruby>のようだ) 'it's like a dream'. Same particle ように in adverbial form gives both 'so that / hoping that' (batch 2) and 'in the manner of' (rule #3 in this batch). 〜you da is the noun-final / sentence-final form.

Compare with 〜mitai (colloquial twin, identical meaning, less formal), 〜rashii (〜らしい — evidential 'apparently / from hearsay'), and 〜sou da (visual 'looks X' — narrower, only direct appearance). 〜you da is the choice for written Japanese, news, formal reports, and any context wanting measured judgement rather than chatty inference.

• ame ga furu you da (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るようだ) — "it seems it'll rain"
• yume no you da (<ruby>夢<rt>ゆめ</rt></ruby>のようだ) — "it's like a dream"
• shitte iru you da (<ruby>知<rt>し</rt></ruby>っているようだ) — 'seems to know'
• tsukareta you da (<ruby>疲<rt>つか</rt></ruby>れたようだ) — 'seems tired'
• marude uso no you da (まるで<ruby>嘘<rt>うそ</rt></ruby>のようだ) — 'just like a lie'
• kanashii you ni (<ruby>悲<rt>かな</rt></ruby>しいように) — 'as if sad'
• tori no you ni tobu (<ruby>鳥<rt>とり</rt></ruby>のように<ruby>飛<rt>と</rt></ruby>ぶ) — 'fly like a bird'
• hada-zamui you ni (<ruby>肌寒<rt>はださむ</rt></ruby>いように) — 'as if chilly'
• hito no you na karada (<ruby>人<rt>ひと</rt></ruby>のような<ruby>体<rt>からだ</rt></ruby>) — 'a body like a person'
• maru de boku no you na (まるで<ruby>僕<rt>ぼく</rt></ruby>のような) — 'just like me'
• mou owatta you da (もう<ruby>終<rt>お</rt></ruby>わったようだ) — "it seems it's already over"
• warau you ni naita (<ruby>笑<rt>わら</rt></ruby>うように<ruby>泣<rt>な</rt></ruby>いた) — 'cried as if laughing'
• kaze no you ni (<ruby>風<rt>かぜ</rt></ruby>のように) — 'like the wind'
• yuki no you ni shiroi (<ruby>雪<rt>ゆき</rt></ruby>のように<ruby>白<rt>しろ</rt></ruby>い) — 'white like snow'
• shiranai you datta (<ruby>知<rt>し</rt></ruby>らないようだった) — 'seemed not to know'

${MARKER}`,

  // 〜合う — do mutually / to each other
  "02bb26e0-41f3-475e-8b1b-adffc0e84ef2": `〜au (〜<ruby>合<rt>あ</rt></ruby>う) attaches to a verb's masu-stem to express mutual / reciprocal action — 'do X to each other'. ai-suru → ai shi-au (<ruby>愛<rt>あい</rt></ruby>し<ruby>合<rt>あ</rt></ruby>う) 'love each other'. tasukeru → tasuke-au (<ruby>助<rt>たす</rt></ruby>け<ruby>合<rt>あ</rt></ruby>う) 'help each other'. Conjugates as a regular godan verb: 〜atta past, 〜awanai negative, 〜aeru potential ('be able to do mutually').

Implies bidirectionality and intimacy. Often used for relational verbs — love, help, understand, fight, talk, hold. The implied subject is plural ('we / they each other'): hanashi-au (<ruby>話<rt>はな</rt></ruby>し<ruby>合<rt>あ</rt></ruby>う) 'discuss / talk things over together'. Distinguish from 〜ai (〜<ruby>合<rt>あ</rt></ruby>い) the noun form: hanashi-ai (<ruby>話<rt>はな</rt></ruby>し<ruby>合<rt>あ</rt></ruby>い) 'a discussion'.

Compare with 〜komu (deeply / into), 〜kaesu (return / repeat), and the standalone verb au (<ruby>会<rt>あ</rt></ruby>う 'to meet'). The mutual sense is highly productive — most action verbs accept it. In songs and ballads, 〜au is the marker of romantic mutuality: shinji-au (<ruby>信<rt>しん</rt></ruby>じ<ruby>合<rt>あ</rt></ruby>う) 'believe in each other' is a J-pop staple.

• ai shi-au (<ruby>愛<rt>あい</rt></ruby>し<ruby>合<rt>あ</rt></ruby>う) — 'love each other'
• tasuke-au (<ruby>助<rt>たす</rt></ruby>け<ruby>合<rt>あ</rt></ruby>う) — 'help each other'
• shinji-au (<ruby>信<rt>しん</rt></ruby>じ<ruby>合<rt>あ</rt></ruby>う) — 'trust each other'
• wakari-au (<ruby>分<rt>わ</rt></ruby>かり<ruby>合<rt>あ</rt></ruby>う) — 'understand each other'
• mitsume-au (<ruby>見<rt>み</rt></ruby>つめ<ruby>合<rt>あ</rt></ruby>う) — 'gaze at each other'
• hanashi-au (<ruby>話<rt>はな</rt></ruby>し<ruby>合<rt>あ</rt></ruby>う) — 'discuss / talk things over'
• tatakai-au (<ruby>戦<rt>たたか</rt></ruby>い<ruby>合<rt>あ</rt></ruby>う) — 'fight each other'
• yobi-au (<ruby>呼<rt>よ</rt></ruby>び<ruby>合<rt>あ</rt></ruby>う) — 'call out to each other'
• tsutae-au (<ruby>伝<rt>つた</rt></ruby>え<ruby>合<rt>あ</rt></ruby>う) — 'communicate (with each other)'
• mamori-au (<ruby>守<rt>まも</rt></ruby>り<ruby>合<rt>あ</rt></ruby>う) — 'protect each other'
• butsukari-au (ぶつかり<ruby>合<rt>あ</rt></ruby>う) — 'collide / clash with each other'
• yurushi-au (<ruby>許<rt>ゆる</rt></ruby>し<ruby>合<rt>あ</rt></ruby>う) — 'forgive each other'
• kotaeau (<ruby>応<rt>こた</rt></ruby>え<ruby>合<rt>あ</rt></ruby>う) — 'respond to each other'
• fure-au (<ruby>触<rt>ふ</rt></ruby>れ<ruby>合<rt>あ</rt></ruby>う) — 'touch / be in contact with each other'
• sasae-au (<ruby>支<rt>ささ</rt></ruby>え<ruby>合<rt>あ</rt></ruby>う) — 'support each other'

${MARKER}`,

  // Causative + kure — let me / permit me to
  "30adc6ac-4819-46e7-bf32-2f1d8c4c6938": `Causative + kure (〜(さ)せてくれ / 〜(さ)せてください) combines the causative form (〜seru / 〜saseru) with the te-form + kureru (or its imperative kure) to ask permission — 'let me do X / allow me to do X'. Type 1 verbs: yobaseru (<ruby>呼<rt>よ</rt></ruby>ばせる) → yobase-te kure ('let me call'). Type 2: tabesaseru (<ruby>食<rt>た</rt></ruby>べさせる) → tabesase-te kure ('let me eat'). Polite: 〜(さ)せてください.

The structure asks the listener to PERMIT the speaker to do something. Forces a giving-and-receiving frame: the listener allows, the speaker receives. This is the standard polite way to ask for permission, request a favour involving the speaker's own action, or beg for a chance: ayamarasete kudasai (<ruby>謝<rt>あやま</rt></ruby>らせてください) 'please let me apologise'.

Common emotional uses in songs and drama: aisasete (<ruby>愛<rt>あい</rt></ruby>させて) 'let me love (you)', wasuresasete (<ruby>忘<rt>わす</rt></ruby>れさせて) 'let me forget'. Compare with simple imperative (commanding the listener), 〜te kudasai (asking the listener to do X — opposite direction), and 〜tai (just expressing the speaker's own desire). Causative + kure is the only way to formally REQUEST PERMISSION TO ACT.

• yobasete kure (<ruby>呼<rt>よ</rt></ruby>ばせてくれ) — 'let me call (you)'
• tabesasete (<ruby>食<rt>た</rt></ruby>べさせて) — 'let me eat'
• ikasete kure (<ruby>行<rt>い</rt></ruby>かせてくれ) — 'let me go'
• yasumasete kudasai (<ruby>休<rt>やす</rt></ruby>ませてください) — 'please let me rest'
• kangaesasete (<ruby>考<rt>かんが</rt></ruby>えさせて) — 'let me think'
• ayamarasete kudasai (<ruby>謝<rt>あやま</rt></ruby>らせてください) — 'please let me apologise'
• aisasete (<ruby>愛<rt>あい</rt></ruby>させて) — 'let me love (you)'
• wasure-sasete (<ruby>忘<rt>わす</rt></ruby>れさせて) — 'let me forget'
• mamora-sete kure (<ruby>守<rt>まも</rt></ruby>らせてくれ) — 'let me protect (you)'
• shinji-sasete (<ruby>信<rt>しん</rt></ruby>じさせて) — 'let me believe'
• hitori ni shite kure (<ruby>一人<rt>ひとり</rt></ruby>にしてくれ) — 'leave me alone' (related: shi-te → shi makes the verb)
• kissu-sasete (キスさせて) — 'let me kiss (you)'
• sayonara wo iwa-sete (さよならを<ruby>言<rt>い</rt></ruby>わせて) — 'let me say goodbye'
• naki-sasete (<ruby>泣<rt>な</rt></ruby>かせて) — 'let me cry'
• matase-te (<ruby>待<rt>ま</rt></ruby>たせて) — 'have me wait / let me wait' (also 'I made you wait — sorry')

${MARKER}`,

  // 〜から — because / since (subjective reason)
  "616aebc3-512c-44f6-9e19-52cf8f05a3e7": `〜kara (〜から) attaches to plain-form sentences to express reason or cause — 'because X / since X'. atsui kara (<ruby>暑<rt>あつ</rt></ruby>いから) 'because it's hot'. Polite: 〜masu kara / 〜desu kara. Sentence-final 〜kara ne / 〜kara yo emphasises that the speaker is offering a justification.

Crucial contrast with 〜node (〜ので): 〜kara is SUBJECTIVE — the speaker's own reason or judgement, often to assert, demand, or warn. 〜node is OBJECTIVE — a presented-as-given fact, more polite and softer. tsukareta kara nemashou (<ruby>疲<rt>つか</rt></ruby>れたから<ruby>寝<rt>ね</rt></ruby>ましょう) 'let's sleep — I'm tired' (subjective). tsukareta node nemasu (<ruby>疲<rt>つか</rt></ruby>れたので<ruby>寝<rt>ね</rt></ruby>ます) 'I will sleep, since I'm tired' (more deferential).

Also marks 'from' (origin / source) when attached to nouns: tokyo kara (<ruby>東京<rt>とうきょう</rt></ruby>から) 'from Tokyo'. With 〜made (until), brackets a span: tokyo kara osaka made (<ruby>東京<rt>とうきょう</rt></ruby>から<ruby>大阪<rt>おおさか</rt></ruby>まで) 'from Tokyo to Osaka'. The reason and the source uses share the underlying 'starting point' image.

• atsui kara (<ruby>暑<rt>あつ</rt></ruby>いから) — "because it's hot"
• samui kara (<ruby>寒<rt>さむ</rt></ruby>いから) — "because it's cold"
• tsukareta kara (<ruby>疲<rt>つか</rt></ruby>れたから) — "because I'm tired"
• kimi ga iru kara (<ruby>君<rt>きみ</rt></ruby>がいるから) — "because you're here"
• suki dakara (<ruby>好<rt>す</rt></ruby>きだから) — "because I like (it)"
• ame ga furu kara kasa wo motte iku (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るから<ruby>傘<rt>かさ</rt></ruby>を<ruby>持<rt>も</rt></ruby>っていく) — "I'll bring an umbrella because it'll rain"
• tokyo kara (<ruby>東京<rt>とうきょう</rt></ruby>から) — 'from Tokyo'
• kinou kara (<ruby>昨日<rt>きのう</rt></ruby>から) — 'since yesterday'
• ima kara (<ruby>今<rt>いま</rt></ruby>から) — 'from now'
• kore kara (これから) — 'from now on'
• kimi dakara hanasu (<ruby>君<rt>きみ</rt></ruby>だから<ruby>話<rt>はな</rt></ruby>す) — "because it's you, I'll talk (about it)"
• mou ii kara (もういいから) — "that's enough already"
• shinpai dakara (<ruby>心配<rt>しんぱい</rt></ruby>だから) — "because I'm worried"
• boku ga iru kara daijoubu (<ruby>僕<rt>ぼく</rt></ruby>がいるから<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>) — "you'll be fine because I'm here"
• atashi-tachi tomodachi dakara ne (<ruby>私<rt>わたし</rt></ruby>たち<ruby>友達<rt>ともだち</rt></ruby>だからね) — "after all, we're friends"

${MARKER}`,

  // 〜だろう — probably / right? (conjecture / seeking confirmation)
  "374d6f9b-2df1-46a3-8b3b-5239c712b804": `〜darou (〜だろう, polite 〜deshou 〜でしょう) attaches to plain-form sentences. The plain copula da's volitional / inferential form, it carries two reading flavours: (a) conjecture — 'probably / I'd guess (X)' — ame ga furu darou (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るだろう) 'it'll probably rain'. (b) Confirmation-seeking — 'X, right?' — wakaru darou? (<ruby>分<rt>わ</rt></ruby>かるだろう？) 'you understand, right?' — same form, rising intonation.

Frequently dropped to 〜daro (〜だろ) in casual male speech, or to 〜desho (〜でしょ) in casual feminine. Distinct from 〜hazu (high-confidence inference based on evidence) and 〜kamo shirenai (genuine uncertainty). 〜darou sits in the middle: confident but tentative, asserting probability with room for doubt.

The 'right?' use is one of the most-used pragmatic markers in spoken Japanese. With na-adj or noun, attaches directly: kirei darou (<ruby>綺麗<rt>きれい</rt></ruby>だろう) 'pretty, isn't it?'. With i-adj or verb, attaches to the plain form: omoshiroi darou (<ruby>面白<rt>おもしろ</rt></ruby>いだろう) 'interesting, right?'. Compare with 〜janai? (also 'isn't it?', more casual / negotiating), 〜yo ne (gentle agreement-seeking).

• ame ga furu darou (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るだろう) — "it'll probably rain"
• kuru darou (<ruby>来<rt>く</rt></ruby>るだろう) — "they'll probably come"
• wakaru darou? (<ruby>分<rt>わ</rt></ruby>かるだろう？) — 'you understand, right?'
• omoshiroi darou (<ruby>面白<rt>おもしろ</rt></ruby>いだろう) — 'interesting, right?'
• kirei darou (<ruby>綺麗<rt>きれい</rt></ruby>だろう) — 'pretty, isn't it?'
• tabun shiranai darou (<ruby>多分<rt>たぶん</rt></ruby><ruby>知<rt>し</rt></ruby>らないだろう) — "they probably don't know"
• kitto deshou (きっとでしょう) — 'surely so'
• boku no koto suki daro? (<ruby>僕<rt>ぼく</rt></ruby>のこと<ruby>好<rt>す</rt></ruby>きだろ？) — 'you like me, right?' (casual)
• mata aeru darou (また<ruby>会<rt>あ</rt></ruby>えるだろう) — "we'll meet again, probably"
• taihen datta darou (<ruby>大変<rt>たいへん</rt></ruby>だっただろう) — 'must have been hard'
• kimi mo wakaru darou (<ruby>君<rt>きみ</rt></ruby>も<ruby>分<rt>わ</rt></ruby>かるだろう) — 'you understand too, right?'
• zutto issho da yo, daro? (ずっと<ruby>一緒<rt>いっしょ</rt></ruby>だよ、だろ？) — "we'll always be together, right?"
• mou inai darou (もういないだろう) — "they're probably gone now"
• nidoto naku desho (<ruby>二度<rt>にど</rt></ruby>と<ruby>泣<rt>な</rt></ruby>かないでしょ) — "you won't cry again, will you"
• shoujiki da darou (<ruby>正直<rt>しょうじき</rt></ruby>だだろう) — 'they're honest, no?'

${MARKER}`,

  // 〜ておく — do in advance / leave as is
  "65590c80-9908-4a07-95ae-f27a4a3b4e51": `〜te oku (〜ておく) attaches oku (<ruby>置<rt>お</rt></ruby>く, 'to put/place') to a verb's te-form. Two senses: (a) Preparation — 'do X in advance' — kau (<ruby>買<rt>か</rt></ruby>う) → katte oku (<ruby>買<rt>か</rt></ruby>っておく) 'buy in advance'. (b) Maintenance — 'leave X as it is / let it remain' — sono mama ni shite oku (そのままにしておく) 'leave it as it is'. Casual contraction: 〜toku (〜とく). Past: 〜te oita / 〜toita.

The preparation reading is enormously common in everyday and business Japanese — anything done IN ADVANCE for a future need takes 〜te oku. yoyaku shite oku (<ruby>予約<rt>よやく</rt></ruby>しておく) 'make a reservation in advance'. yonde oku (<ruby>読<rt>よ</rt></ruby>んでおく) 'read it beforehand'.

The maintenance reading often signals 'leave it alone, don't touch it': hanashite oite (<ruby>離<rt>はな</rt></ruby>しておいて) — actually that's the casual 'let go and leave alone'. Compare with batch1's 〜te shimau (completion / regret), 〜te aru (resultative passive 'has been done'), and the bare imperative oki nasai. 〜te oku focuses on the SPEAKER's foresight or restraint — preparing OR not interfering.

• katte oku (<ruby>買<rt>か</rt></ruby>っておく) — 'buy in advance'
• yonde oku (<ruby>読<rt>よ</rt></ruby>んでおく) — 'read beforehand'
• yoyaku shite oku (<ruby>予約<rt>よやく</rt></ruby>しておく) — 'make a reservation'
• tabete oku (<ruby>食<rt>た</rt></ruby>べておく) — 'eat in advance'
• kangae-te oku (<ruby>考<rt>かんが</rt></ruby>えておく) — "I'll think about it"
• sono mama ni shite oku (そのままにしておく) — 'leave it as is'
• shitte oite (<ruby>知<rt>し</rt></ruby>っておいて) — 'know this in advance'
• junbi shite oku (<ruby>準備<rt>じゅんび</rt></ruby>しておく) — 'prepare in advance'
• kaite oita (<ruby>書<rt>か</rt></ruby>いておいた) — 'wrote it down beforehand'
• nokoshi-te oku (<ruby>残<rt>のこ</rt></ruby>しておく) — 'leave (some) behind / save'
• kette oku (<ruby>決<rt>き</rt></ruby>めておく) — 'decide in advance'
• kioku shite oku (<ruby>記憶<rt>きおく</rt></ruby>しておく) — 'commit to memory'
• ittoku ne (<ruby>言<rt>い</rt></ruby>っとくね) — "I'm telling you in advance" (casual)
• matte oite (<ruby>待<rt>ま</rt></ruby>っておいて) — 'wait for me (in the meantime)'
• samete oku (<ruby>覚<rt>さ</rt></ruby>めておく) — 'stay awake (in advance)'

${MARKER}`,

  // 〜てくる — comes toward / becomes
  "d4fdeda5-ac36-40a6-b961-23bea04f8c6f": `〜te kuru (〜てくる) attaches kuru (<ruby>来<rt>く</rt></ruby>る, 'to come') to a verb's te-form. The directional mirror of 〜te iku (〜ていく). Three readings: (a) Physical motion toward the speaker — motte kuru (<ruby>持<rt>も</rt></ruby>ってくる) 'bring (here)'. (b) Aspectual change UP TO NOW — fuete kuru (<ruby>増<rt>ふ</rt></ruby>えてくる) 'is increasing (up to the present)'. (c) Inception / appearance — futte kuru (<ruby>降<rt>ふ</rt></ruby>ってくる) 'starts raining'.

Conjugates as kuru does (irregular): 〜te kita (past, see batch3a entry), 〜te konai (negative), 〜te kite (te-form / requesting). The past 〜te kita is what many learners encounter first, but the present-tense 〜te kuru is critical for describing ongoing change UP TO and INCLUDING now: dandan tsuyoku natte kuru (だんだん<ruby>強<rt>つよ</rt></ruby>くなってくる) 'gradually becoming stronger'.

Pairs structurally with 〜te iku (forward / away). Together they let speakers locate change in time relative to the present. Common in songs for sweeping arrival imagery: yoake ga chikadzuite kuru (<ruby>夜明<rt>よあ</rt></ruby>けが<ruby>近<rt>ちかづ</rt></ruby>いてくる) 'dawn approaches'. Casual contractions in spoken Japanese: 〜tekuru is rarely contracted since kuru is already short.

• motte kuru (<ruby>持<rt>も</rt></ruby>ってくる) — 'bring (here)'
• tsurete kuru (<ruby>連<rt>つ</rt></ruby>れてくる) — 'bring (a person)'
• fuete kuru (<ruby>増<rt>ふ</rt></ruby>えてくる) — 'is increasing'
• samuku natte kuru (<ruby>寒<rt>さむ</rt></ruby>くなってくる) — 'is getting cold'
• atsuku natte kuru (<ruby>暑<rt>あつ</rt></ruby>くなってくる) — 'is getting hot'
• kaze ga fuite kuru (<ruby>風<rt>かぜ</rt></ruby>が<ruby>吹<rt>ふ</rt></ruby>いてくる) — 'wind picks up'
• hashitte kuru (<ruby>走<rt>はし</rt></ruby>ってくる) — 'comes running'
• mietekuru (<ruby>見<rt>み</rt></ruby>えてくる) — 'comes into view'
• wakatte kuru (<ruby>分<rt>わ</rt></ruby>かってくる) — 'starts to make sense'
• yatte kuru (やってくる) — 'comes / arrives'
• ame ga futte kuru (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ってくる) — "it's starting to rain"
• naite kuru (<ruby>泣<rt>な</rt></ruby>いてくる) — 'feels like crying / starts crying'
• yoake ga chikadzuite kuru (<ruby>夜明<rt>よあ</rt></ruby>けが<ruby>近<rt>ちかづ</rt></ruby>いてくる) — 'dawn approaches'
• kanji ga afurete kuru (<ruby>感<rt>かん</rt></ruby>じが<ruby>溢<rt>あふ</rt></ruby>れてくる) — 'feelings come welling up'
• ki ni natte kuru (<ruby>気<rt>き</rt></ruby>になってくる) — 'starts to bother me / catches my attention'

${MARKER}`,

  // 〜という — called / the fact that / so-called
  "2645301e-25e7-440f-9993-1d996d9ff79a": `〜to iu (〜という) is the quotative particle と + iu (<ruby>言<rt>い</rt></ruby>う 'say'), serving as a flexible labelling / quotative connector. Three main uses: (a) Naming — N + to iu + N — 'an X called Y' — yamada-san to iu hito (<ruby>山田<rt>やまだ</rt></ruby>さんという<ruby>人<rt>ひと</rt></ruby>) 'a person named Yamada-san'. (b) Quotative content — clause + to iu — 'that says / the fact that' — ame ga furu to iu hanashi (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るという<ruby>話<rt>はなし</rt></ruby>) 'the news that it'll rain'. (c) Definitional — N + to iu + no wa — 'what X means is...' — ai to iu no wa (<ruby>愛<rt>あい</rt></ruby>というのは) 'what love is'.

Casual contraction: 〜tte (〜って) — extremely common in spoken Japanese. yamada-san tte hito (<ruby>山田<rt>やまだ</rt></ruby>さんって<ruby>人<rt>ひと</rt></ruby>) 'a guy called Yamada'. With abstract nouns (koto, mono, no), it builds nominalisations and metalinguistic statements.

The naming use is essential when introducing unfamiliar referents — names of places, people, books, songs. The definitional use is the workhorse for explaining concepts. The quotative use connects content clauses to head nouns (hanashi, kangae, uwasa, etc.) and is critical for reported speech and indirect description. Compare 〜to iu koto wa (literally 'the thing that says X' — 'in other words / so what you mean is').

• yamada-san to iu hito (<ruby>山田<rt>やまだ</rt></ruby>さんという<ruby>人<rt>ひと</rt></ruby>) — 'a person named Yamada'
• kitsubeat to iu apuri (キツビートというアプリ) — 'an app called KitsuBeat'
• ame ga furu to iu hanashi (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るという<ruby>話<rt>はなし</rt></ruby>) — "the news that it'll rain"
• ai to iu no wa (<ruby>愛<rt>あい</rt></ruby>というのは) — 'what love is'
• shiawase to iu mono (<ruby>幸<rt>しあわ</rt></ruby>せというもの) — 'something called happiness'
• inochi to iu (<ruby>命<rt>いのち</rt></ruby>という) — 'so-called life'
• shinjiru to iu koto (<ruby>信<rt>しん</rt></ruby>じるということ) — 'the act / fact of believing'
• yoku waratta tte (よく<ruby>笑<rt>わら</rt></ruby>ったって) — 'they say (you) laughed a lot' (casual)
• kimi to iu sonzai (<ruby>君<rt>きみ</rt></ruby>という<ruby>存在<rt>そんざい</rt></ruby>) — 'the existence called you'
• yume to iu mono (<ruby>夢<rt>ゆめ</rt></ruby>というもの) — 'something called a dream'
• kawaru to iu koto (<ruby>変<rt>か</rt></ruby>わるということ) — 'the meaning of changing'
• ima to iu shunkan (<ruby>今<rt>いま</rt></ruby>という<ruby>瞬間<rt>しゅんかん</rt></ruby>) — 'this moment we call now'
• boku to iu ningen (<ruby>僕<rt>ぼく</rt></ruby>という<ruby>人間<rt>にんげん</rt></ruby>) — 'a human being called me'
• naku to iu koto wa (<ruby>泣<rt>な</rt></ruby>くということは) — 'what it means to cry is...'
• mahou to iu (<ruby>魔法<rt>まほう</rt></ruby>という) — 'so-called magic'

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

  // Propagate name+explanation into song_versions.lesson.grammar_points[]
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
