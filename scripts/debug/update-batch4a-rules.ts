/**
 * Batch 4a — 20 v2 grammar rule explanations.
 * Format: romaji-primary + (kana) + 3 paragraphs + 15 examples per rule.
 *
 * Skipped from queue and queued for pass 6 dedup as duplicates of existing v2:
 *   5cc4e34b Imperative → batch1 ebd9bcdf 命令形
 *   54523f3b / 126ccd9e Literary 〜ぬ N1 → batch3b d058db02 〜nu
 *   d47f7395 German song metadata → DELETE
 *   2d029959 / 38ea38c8 / acb5af46 / 171a233e / 415e6c3d / 6ebc71c7 / 9244f9a8 / 361cac68 → various v2 canonicals
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const MARKER = "<!-- v2-romaji-primary -->";

const NAME_REWRITES: Record<string, string> = {
  "ab9d2989": "Causative 〜(さ)seru (〜(さ)せる) — make / let X do",
  "8370cb1d": "〜zu (〜ず) — classical negative continuative",
  "1a68a128": "〜ze (〜ぜ) — masculine emphasis particle",
  "641e4f77": "〜na (〜な) — na-adjective connector / soft prohibition",
  "abddaea4": "〜nai de ite (〜ないでいて) — keep not doing / please don't (continuous)",
  "3d8f8611": "〜naki (〜なき) — literary attributive 'without / no'",
  "3b3d1273": "〜no sa (〜のさ) — explanatory emphasis (masculine)",
  "52cbab2e": "〜hazu nanoni (〜はずなのに) — should be, but...",
  "f1266fba": "〜you to suru (〜ようとする) — try to / be about to",
  "185984a3": "〜shidai (〜次第) — depending on / as soon as",
  "eac3a7b9": "kanoukei (可能形) — potential form 〜eru / 〜rareru",
  "8c42f4ca": "〜gurai nara (〜ぐらいなら) — rather than / sooner than",
  "c3e728ed": "〜koto nai (〜ことない) — no need to / never have",
  "4b13802a": "〜shika nai (〜しかない) — have no choice but",
  "19c44529": "〜tara ii (〜たらいい) — it would be nice if / should",
  "8b1f9116": "〜tte (〜って) — casual quotative / topic marker",
  "02ced521": "〜te miseru (〜てみせる) — I'll show you (resolve)",
  "1f99eab6": "〜te yaru (〜てやる) — do for someone (rough)",
  "1d33d68b": "〜de wa nakute (〜ではなくて) — not X but Y",
  "4902e9be": "〜nai (〜ない) — negative form (verbs / adjectives)",
};

const REWRITES: Record<string, string> = {
  "ab9d2989": `The causative form attaches 〜seru (〜せる) to Type-1 (godan) a-stems and 〜saseru (〜させる) to Type-2 (ichidan) verbs. Type 1: <ruby>書<rt>か</rt></ruby>く → kakaseru (<ruby>書<rt>か</rt></ruby>かせる) 'make/let write'. Type 2: <ruby>食<rt>た</rt></ruby>べる → tabesaseru (<ruby>食<rt>た</rt></ruby>べさせる) 'make/let eat'. Irregular: suru → saseru (させる), kuru → kosaseru (<ruby>来<rt>こ</rt></ruby>させる). Conjugates as a regular ichidan verb.

Two readings: (a) Coercive 'make X do' — kodomo ni yasai o tabesaseru (<ruby>子供<rt>こども</rt></ruby>に<ruby>野菜<rt>やさい</rt></ruby>を<ruby>食<rt>た</rt></ruby>べさせる) 'make the child eat vegetables'. (b) Permissive 'let X do' — same form, context disambiguates. Particle marking: the made-to-do agent takes ni (に, intransitive) or o (を, transitive base).

Combined with 〜te kure / 〜te kudasai → batch3a's "Causative + kure" (let me / permit me). Combined with the passive → causative-passive 〜(sa)serareru — 'was made to do (against my will)', a uniquely Japanese suffering structure. Compare with bare imperative (direct command, no agency framing) and 〜te morau (have someone do — gentler than coercive causative).

• tabesaseru (<ruby>食<rt>た</rt></ruby>べさせる) — 'make/let eat'
• ikaseru (<ruby>行<rt>い</rt></ruby>かせる) — 'make/let go'
• yobaseru (<ruby>呼<rt>よ</rt></ruby>ばせる) — 'make/let call'
• yomaseru (<ruby>読<rt>よ</rt></ruby>ませる) — 'make/let read'
• benkyou saseru (<ruby>勉強<rt>べんきょう</rt></ruby>させる) — 'make study'
• warawaseru (<ruby>笑<rt>わら</rt></ruby>わせる) — 'make laugh'
• nakaseru (<ruby>泣<rt>な</rt></ruby>かせる) — 'make cry'
• matase-ru (<ruby>待<rt>ま</rt></ruby>たせる) — 'make wait'
• yorokobaseru (<ruby>喜<rt>よろこ</rt></ruby>ばせる) — 'make (someone) happy'
• kanashimaseru (<ruby>悲<rt>かな</rt></ruby>しませる) — 'make sad'
• yaraseru (やらせる) — 'make/let do'
• kosaseru (<ruby>来<rt>こ</rt></ruby>させる) — 'make/let come'
• damaraseru (<ruby>黙<rt>だま</rt></ruby>らせる) — 'make stay silent'
• shaberasenai (しゃべらせない) — "don't let (them) speak"
• boku ni iwaseta (<ruby>僕<rt>ぼく</rt></ruby>に<ruby>言<rt>い</rt></ruby>わせた) — 'made me say (it)'

${MARKER}`,

  "8370cb1d": `〜zu (〜ず) is the classical negative continuative — equivalent to modern 〜nai de or 〜nakute. Attaches to a verb's nai-stem: shirazu (<ruby>知<rt>し</rt></ruby>らず) 'without knowing'. Connects to a following clause, like the te-form. Survives in literary writing, songs, fixed expressions, and the 〜zu ni form (batch1) — 'without doing'. The exception suru becomes sezu (せず), not shi-zu.

Distinct from 〜nu (the standalone classical negative — predicative form, batch3b). 〜zu is the connecting / continuative form of the same auxiliary; together they form the classical negative paradigm. In modern Japanese both function as register markers — using 〜zu signals literary, archaic, or song-like style.

Common patterns: 〜zu ni (batch1, 'without doing'), 〜zu shite (literary 'without' + connection), 〜zu tomo (even without). Compare with modern 〜nai de (everyday 'without doing'), 〜nakute (negative te-form connecting clauses). Use 〜zu for the elevated register; 〜nai de for everyday.

• shirazu (<ruby>知<rt>し</rt></ruby>らず) — 'without knowing'
• kawarazu (<ruby>変<rt>か</rt></ruby>わらず) — 'unchanging / as ever'
• taezu (<ruby>絶<rt>た</rt></ruby>えず) — 'unceasing / continually'
• omowazu (<ruby>思<rt>おも</rt></ruby>わず) — 'unintentionally'
• yamuzu (やむず) — 'without stopping'
• shirazu shirazu (<ruby>知<rt>し</rt></ruby>らず<ruby>知<rt>し</rt></ruby>らず) — 'unconsciously / without realising'
• ikazu (<ruby>行<rt>い</rt></ruby>かず) — 'without going'
• tabezu (<ruby>食<rt>た</rt></ruby>べず) — 'without eating'
• mizu (<ruby>見<rt>み</rt></ruby>ず) — 'without seeing'
• kotaezu (<ruby>答<rt>こた</rt></ruby>えず) — 'without answering'
• ame ni mo makezu (<ruby>雨<rt>あめ</rt></ruby>にも<ruby>負<rt>ま</rt></ruby>けず) — 'undaunted by rain' (Miyazawa Kenji)
• namida wo nagasazu (<ruby>涙<rt>なみだ</rt></ruby>を<ruby>流<rt>なが</rt></ruby>さず) — 'without shedding tears'
• naki mo sezu warai mo sezu (<ruby>泣<rt>な</rt></ruby>きもせず<ruby>笑<rt>わら</rt></ruby>いもせず) — 'neither crying nor laughing'
• kotoba ni narazu (<ruby>言葉<rt>ことば</rt></ruby>にならず) — 'without becoming words'
• yume yaburezu (<ruby>夢<rt>ゆめ</rt></ruby><ruby>破<rt>やぶ</rt></ruby>れず) — 'dreams unbroken'

${MARKER}`,

  "1a68a128": `〜ze (〜ぜ) is a sentence-final particle expressing masculine emphasis or assertion — 'X, you know! / X, dammit!'. Attaches to plain-form sentences (verbs, adjectives, copula). iku ze (<ruby>行<rt>い</rt></ruby>くぜ) "let's go!" / "I'm going!". Conveys casual, often rough, often confident or rallying tone. Stereotypically male — women rarely use it except in role-play / fiction.

Pairs naturally with rough volitional ('let's X!' rallies) and direct imperatives. Often used to invite or announce action: tatakau ze (<ruby>戦<rt>たたか</rt></ruby>うぜ) 'we fight!'. Distinct from 〜zo (〜ぞ) — both masculine emphasis particles, but 〜ze is more outwardly directed (to others), 〜zo more self-directed (to self / inner monologue).

Compare with 〜yo (〜よ — neutral assertion), 〜sa (〜さ — masculine but softer), 〜wa (〜わ — feminine assertion / Kansai male), and the rough imperative + 〜ze stack (iko ze, yare yo, etc.). Frequent in shounen anime, rock songs, and any persona projecting bravado. In real conversation, use sparingly — overuse reads as cartoonish.

• iku ze (<ruby>行<rt>い</rt></ruby>くぜ) — "let's go!"
• yaru ze (やるぜ) — "I'll do it!"
• tatakau ze (<ruby>戦<rt>たたか</rt></ruby>うぜ) — "we fight!"
• matte ru ze (<ruby>待<rt>ま</rt></ruby>ってるぜ) — "I'm waiting"
• kachi-tai ze (<ruby>勝<rt>か</rt></ruby>ちたいぜ) — "I wanna win!"
• ikou ze (<ruby>行<rt>い</rt></ruby>こうぜ) — "let's head out!"
• mada owaranai ze (まだ<ruby>終<rt>お</rt></ruby>わらないぜ) — "it's not over yet!"
• kakatte koi ze (かかってこいぜ) — "bring it on!"
• yatte yaru ze (やってやるぜ) — "I'll show 'em!"
• mou nigenai ze (もう<ruby>逃<rt>に</rt></ruby>げないぜ) — "I won't run anymore"
• shinjite iru ze (<ruby>信<rt>しん</rt></ruby>じているぜ) — "I believe in (you)"
• miteru ze (<ruby>見<rt>み</rt></ruby>てるぜ) — "I'm watching"
• boku-tachi wa tsuyoi ze (<ruby>僕<rt>ぼく</rt></ruby>たちは<ruby>強<rt>つよ</rt></ruby>いぜ) — "we're strong!"
• mata aou ze (また<ruby>会<rt>あ</rt></ruby>おうぜ) — "let's meet again!"
• ima ga sono toki da ze (<ruby>今<rt>いま</rt></ruby>がその<ruby>時<rt>とき</rt></ruby>だぜ) — "now's the moment!"

${MARKER}`,

  "641e4f77": `〜na (〜な) has TWO completely separate uses despite the same surface form. (a) Na-adjective connector: na-adjectives modify nouns by inserting 〜な between adjective and noun — kirei na hana (<ruby>綺麗<rt>きれい</rt></ruby>な<ruby>花<rt>はな</rt></ruby>) 'a pretty flower'. (b) Soft prohibition: V-dictionary + 〜な means 'don't X!' — iku na! (<ruby>行<rt>い</rt></ruby>くな！) "don't go!". Context disambiguates instantly.

The na-adjective connector role is fundamental N5 grammar — without it na-adjectives can't attribute. shizuka na heya (<ruby>静<rt>しず</rt></ruby>かな<ruby>部屋<rt>へや</rt></ruby>) 'a quiet room'; suki na hito (<ruby>好<rt>す</rt></ruby>きな<ruby>人<rt>ひと</rt></ruby>) 'a person (you) like'. The 〜na drops in predicate position (kono heya wa shizuka da — 'this room is quiet') — only re-appears when the na-adj attributes a following noun.

The prohibitive 〜na is harsh and direct — used in commands, warnings, and song lyrics where assertive emotion is wanted: wasureru na! (<ruby>忘<rt>わす</rt></ruby>れるな！) "don't forget!". Compare with 〜nai de (gentler 'please don't', batch2) and the polite 〜nai de kudasai. Soft prohibition 〜na is for emotional emphasis, not for polite requests.

• kirei na hana (<ruby>綺麗<rt>きれい</rt></ruby>な<ruby>花<rt>はな</rt></ruby>) — 'a pretty flower'
• shizuka na heya (<ruby>静<rt>しず</rt></ruby>かな<ruby>部屋<rt>へや</rt></ruby>) — 'a quiet room'
• suki na hito (<ruby>好<rt>す</rt></ruby>きな<ruby>人<rt>ひと</rt></ruby>) — 'a liked person / someone (I) like'
• taisetsu na omoide (<ruby>大切<rt>たいせつ</rt></ruby>な<ruby>思<rt>おも</rt></ruby>い<ruby>出<rt>で</rt></ruby>) — 'a precious memory'
• genki na kodomo (<ruby>元気<rt>げんき</rt></ruby>な<ruby>子供<rt>こども</rt></ruby>) — 'a lively child'
• benri na douku (<ruby>便利<rt>べんり</rt></ruby>な<ruby>道具<rt>どうぐ</rt></ruby>) — 'a useful tool'
• yuumei na utai (<ruby>有名<rt>ゆうめい</rt></ruby>な<ruby>歌<rt>うた</rt></ruby>) — 'a famous song'
• iku na! (<ruby>行<rt>い</rt></ruby>くな！) — "don't go!"
• naku na! (<ruby>泣<rt>な</rt></ruby>くな！) — "don't cry!"
• wasureru na (<ruby>忘<rt>わす</rt></ruby>れるな) — "don't forget"
• miru na (<ruby>見<rt>み</rt></ruby>るな) — "don't look"
• akirameru na (<ruby>諦<rt>あきら</rt></ruby>めるな) — "don't give up"
• boku no koto wo wasureru na (<ruby>僕<rt>ぼく</rt></ruby>のことを<ruby>忘<rt>わす</rt></ruby>れるな) — "don't forget about me"
• tomaru na (<ruby>止<rt>と</rt></ruby>まるな) — "don't stop"
• nigeru na (<ruby>逃<rt>に</rt></ruby>げるな) — "don't run"

${MARKER}`,

  "abddaea4": `〜nai de ite (〜ないでいて) combines the negative te-form (〜nai de) with the te-form of iru ('to be / exist'). Means 'keep not doing X / continue not to do X / please remain in the state of not doing X'. ika-naide ite (<ruby>行<rt>い</rt></ruby>かないでいて) "stay (without going)". The structure layers two negations: 〜nai de softens the negative request, and ite extends it into a continuous state.

A staple of song lyrics for begging or pleading: wasure-naide ite (<ruby>忘<rt>わす</rt></ruby>れないでいて) "don't (ever stop) forgetting (me)" → "please continue to remember me". Often paired with kudasai for politeness, or left as a soft sentence-final request. The continuous nuance (be in the state of not X) distinguishes it from bare 〜nai de ('please don't' — one-shot request).

Compare with 〜nai de (one-shot 'please don't'), 〜zu ni (literary 'without doing'), 〜nakute (negative connector, no continuous nuance). 〜nai de ite is specifically about LASTING absence — sustained restraint or sustained non-action over time.

• ika-naide ite (<ruby>行<rt>い</rt></ruby>かないでいて) — 'stay (without going)'
• wasure-naide ite (<ruby>忘<rt>わす</rt></ruby>れないでいて) — 'please keep remembering (me)'
• kie-naide ite (<ruby>消<rt>き</rt></ruby>えないでいて) — "don't fade away"
• naka-naide ite (<ruby>泣<rt>な</rt></ruby>かないでいて) — "don't cry (any longer)"
• hanare-naide ite (<ruby>離<rt>はな</rt></ruby>れないでいて) — 'stay (without leaving)'
• shira-naide ite (<ruby>知<rt>し</rt></ruby>らないでいて) — 'remain unaware'
• kawara-naide ite (<ruby>変<rt>か</rt></ruby>わらないでいて) — "don't change"
• yameru naide ite (やめないでいて) — "don't stop"
• kanji wo wasure-naide ite (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れないでいて) — 'keep remembering kanji'
• mata aware-naide ite (また<ruby>会<rt>あ</rt></ruby>われないでいて) — wait
• tomara-naide ite (<ruby>止<rt>と</rt></ruby>まらないでいて) — "don't stop"
• ushinawa-naide ite (<ruby>失<rt>うしな</rt></ruby>わないでいて) — "don't lose (sight of)"
• mienaku nara-naide ite (<ruby>見<rt>み</rt></ruby>えなくならないでいて) — "don't become invisible"
• kotaenakute mo iwa-naide ite (<ruby>答<rt>こた</rt></ruby>えなくても<ruby>言<rt>い</rt></ruby>わないでいて) — 'remain silent even without answering'
• boku no soba kara hanareru naide ite (<ruby>僕<rt>ぼく</rt></ruby>のそばから<ruby>離<rt>はな</rt></ruby>れるないでいて) — 'stay close to me'

${MARKER}`,

  "3d8f8611": `〜naki (〜なき) is the classical attributive negative — used to modify a following noun with negation. The classical equivalent of modern 〜nai. nake-redo (<ruby>無<rt>な</rt></ruby>けれど) 'although there isn't', naki sora (なき<ruby>空<rt>そら</rt></ruby>) 'a sky without (X) / a starless sky'. Survives mainly in literary writing, song lyrics, and fixed expressions like 〜naki ni shi mo arazu ('it's not without X').

Distinct from the noun-suffix 〜naki (=「無き」) meaning 'without (something)' — michi naki michi (<ruby>道<rt>みち</rt></ruby>なき<ruby>道<rt>みち</rt></ruby>) 'a path without a path / unmarked road'. Both patterns extend to a noun, both are heavily literary. In modern Japanese, you'd use the prosaic 〜nai (kunai sora 'a non-existent sky' is awkward; naki sora is poetic).

Compare with 〜nu (classical negative predicative, batch3b), 〜zu (classical negative continuative, this batch), and modern 〜nai (everyday). 〜naki is the rarest of the classical negative paradigm, surviving almost exclusively in elevated and song registers. Use it to pull lyrical, archaic weight into a sentence.

• naki sora (なき<ruby>空<rt>そら</rt></ruby>) — 'a sky without (X)'
• michi naki michi (<ruby>道<rt>みち</rt></ruby>なき<ruby>道<rt>みち</rt></ruby>) — 'a path without a path'
• naki kage (なき<ruby>影<rt>かげ</rt></ruby>) — 'a missing shadow'
• tomeru naki (<ruby>止<rt>と</rt></ruby>めるなき) — 'unstoppable'
• naki na (なき<ruby>名<rt>な</rt></ruby>) — 'a nameless name' (rumour)
• kotae naki tooi (<ruby>答<rt>こた</rt></ruby>えなき<ruby>問<rt>と</rt></ruby>い) — 'a question without an answer'
• naki goto (なきごと) — 'something not present'
• mina naki sekai (みなき<ruby>世界<rt>せかい</rt></ruby>) — 'a world all are gone from'
• taeru naki omoi (<ruby>絶<rt>た</rt></ruby>えるなき<ruby>想<rt>おも</rt></ruby>い) — 'unceasing thoughts'
• yume naki yo (<ruby>夢<rt>ゆめ</rt></ruby>なき<ruby>世<rt>よ</rt></ruby>) — 'a dreamless world'
• kakaeru naki (<ruby>抱<rt>かか</rt></ruby>えるなき) — 'unable to hold'
• kotoba naki ai (<ruby>言葉<rt>ことば</rt></ruby>なき<ruby>愛<rt>あい</rt></ruby>) — 'love without words'
• kaze naki yoru (<ruby>風<rt>かぜ</rt></ruby>なき<ruby>夜<rt>よる</rt></ruby>) — 'a windless night'
• naku shi ta naki kako (<ruby>無<rt>な</rt></ruby>くしたなき<ruby>過去<rt>かこ</rt></ruby>) — 'a vanished past'
• nageku naki hikari (<ruby>嘆<rt>なげ</rt></ruby>くなき<ruby>光<rt>ひかり</rt></ruby>) — 'a light without lament'

${MARKER}`,

  "3b3d1273": `〜no sa (〜のさ) combines the explanatory particle 〜no (〜の, often contracted to 〜n) with the masculine assertive particle 〜sa (〜さ). Attaches to plain-form sentences. Means 'X, you know / X, that's how it is' — assertive explanation. wakaru no sa (<ruby>分<rt>わ</rt></ruby>かるのさ) "I get it, you see". Casual / masculine register, very common in song lyrics for self-confident reflection.

The 〜no provides explanatory grounding ('the reason / the situation is...'), while 〜sa adds the casual assertion. Together they express 'I'm telling you how things are'. Often used to assert a personal truth or reveal context the listener didn't know. Variant: 〜no yo (〜のよ) — feminine equivalent.

Compare with bare 〜no / 〜n da (explanatory), 〜sa alone (masculine emphasis without explanation), 〜nan da (more neutral explanatory assertion), and 〜n darou / 〜n da yo. 〜no sa sits in the masculine confident-reflection zone — perfect for J-rock vocalists declaring inner truths. Sentence-final particles in Japanese carry huge tonal weight; using 〜no sa marks a speaker as casual, certain, and vaguely poetic.

• wakaru no sa (<ruby>分<rt>わ</rt></ruby>かるのさ) — "I get it, you see"
• shitte iru no sa (<ruby>知<rt>し</rt></ruby>っているのさ) — "I know, you know"
• boku no koto sa (<ruby>僕<rt>ぼく</rt></ruby>のことさ) — "it's about me"
• mata aeru no sa (また<ruby>会<rt>あ</rt></ruby>えるのさ) — "we'll meet again, you see"
• yume nan da no sa (<ruby>夢<rt>ゆめ</rt></ruby>なんだのさ) — "it's a dream, that's all"
• kanjite iru no sa (<ruby>感<rt>かん</rt></ruby>じているのさ) — "I'm feeling it, you know"
• ai no sa (<ruby>愛<rt>あい</rt></ruby>のさ) — "it's love, see"
• tsuyoku naritai no sa (<ruby>強<rt>つよ</rt></ruby>くなりたいのさ) — "I want to be strong, that's why"
• naite iru no sa (<ruby>泣<rt>な</rt></ruby>いているのさ) — "I'm crying, you see"
• boku-tachi no sekai sa (<ruby>僕<rt>ぼく</rt></ruby>たちの<ruby>世界<rt>せかい</rt></ruby>さ) — "it's our world"
• mou owari no sa (もう<ruby>終<rt>お</rt></ruby>わりのさ) — "it's already over"
• kawaranai no sa (<ruby>変<rt>か</rt></ruby>わらないのさ) — "it doesn't change, you see"
• sayonara nan no sa (さよならなんのさ) — "it's a goodbye"
• boku ga utau no sa (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>歌<rt>うた</rt></ruby>うのさ) — "I'll sing, that's the thing"
• mada hashireru no sa (まだ<ruby>走<rt>はし</rt></ruby>れるのさ) — "I can still run, you know"

${MARKER}`,

  "52cbab2e": `〜hazu nanoni (〜はずなのに) combines 〜hazu (logical expectation, batch3a) with 〜nanoni (despite — a variant of 〜noni, batch2). Means 'should be (X), but...' — the speaker had a confident expectation, and reality contradicts it. atatakai hazu nanoni samui (<ruby>暖<rt>あたた</rt></ruby>かいはずなのに<ruby>寒<rt>さむ</rt></ruby>い) 'it should be warm, but it's cold'.

Carries disappointment, frustration, or emotional weight — the contradiction of expectation matters to the speaker. Common in lyrics and reflective speech: wasureta hazu nanoni (<ruby>忘<rt>わす</rt></ruby>れたはずなのに) "I should have forgotten, but...". The trailing clause may be left unspoken — implied disappointment.

Compare with 〜noni alone (despite — for any contradiction), 〜hazu da (just expectation, no contradiction), and 〜tsumori datta noni ('I had intended to, but...'). 〜hazu nanoni specifically pairs CONFIDENT inference with VIOLATED reality — perfect for songs about love that 'should have ended', hopes that 'should have been crushed'.

• atatakai hazu nanoni (<ruby>暖<rt>あたた</rt></ruby>かいはずなのに) — 'should be warm, but...'
• wasureta hazu nanoni (<ruby>忘<rt>わす</rt></ruby>れたはずなのに) — 'should have forgotten, but...'
• shitte iru hazu nanoni (<ruby>知<rt>し</rt></ruby>っているはずなのに) — 'should know, but...'
• shiawase no hazu nanoni (<ruby>幸<rt>しあわ</rt></ruby>せのはずなのに) — "should be happy, but..."
• mou owatta hazu nanoni (もう<ruby>終<rt>お</rt></ruby>わったはずなのに) — 'should be over, but...'
• tsuyoi hazu nanoni (<ruby>強<rt>つよ</rt></ruby>いはずなのに) — 'should be strong, but...'
• boku no mono no hazu nanoni (<ruby>僕<rt>ぼく</rt></ruby>のもののはずなのに) — 'should be mine, but...'
• kuru hazu nanoni (<ruby>来<rt>く</rt></ruby>るはずなのに) — 'should be coming, but...'
• maketa hazu nanoni (<ruby>負<rt>ま</rt></ruby>けたはずなのに) — 'should have lost, but...'
• kawaranai hazu nanoni (<ruby>変<rt>か</rt></ruby>わらないはずなのに) — 'should be unchanging, but...'
• kanjinai hazu nanoni mune ga itamu (<ruby>感<rt>かん</rt></ruby>じないはずなのに<ruby>胸<rt>むね</rt></ruby>が<ruby>痛<rt>いた</rt></ruby>む) — "shouldn't feel anything, but my chest aches"
• mou aenai hazu nanoni (もう<ruby>会<rt>あ</rt></ruby>えないはずなのに) — "shouldn't be able to meet again, but..."
• boku ga warui hazu nanoni (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>悪<rt>わる</rt></ruby>いはずなのに) — "I should be the bad one, but..."
• jikan ga tariteiru hazu nanoni (<ruby>時間<rt>じかん</rt></ruby>が<ruby>足<rt>た</rt></ruby>りているはずなのに) — 'should have enough time, but...'
• kotae ga aru hazu nanoni (<ruby>答<rt>こた</rt></ruby>えがあるはずなのに) — 'there should be an answer, but...'

${MARKER}`,

  "f1266fba": `〜you to suru (〜ようとする) attaches the volitional form (〜you / 〜ou) + to (と, quotative) + suru (do). Means 'try to X / be about to X / make an effort to X'. Frame: speaker has intent, makes the attempt — success or failure not implied. tabe-you to suru (<ruby>食<rt>た</rt></ruby>べようとする) 'try to eat'. iko-u to shita (<ruby>行<rt>い</rt></ruby>こうとした) 'was about to go'.

Three nuances: (a) Intentional attempt — making a deliberate effort (often unsuccessful). (b) Verge / brink — being on the cusp of doing X (like 〜kakeru, batch3b). (c) Reasoning / inference — sometimes used metaphorically: hi ga shizumou to suru (<ruby>日<rt>ひ</rt></ruby>が<ruby>沈<rt>しず</rt></ruby>もうとする) 'the sun is about to set'.

Compare with 〜tai (just want to — internal desire, no attempt), 〜hajimeru (begin to — neutral start), 〜kakeru (on the verge of, batch3b), 〜te miru (try doing — exploratory). 〜you to suru emphasises EFFORT or INCEPTION. The negative 〜you to shinai (〜ようとしない) means 'doesn't even try to X' — strong implication of refusal.

• tabe-you to suru (<ruby>食<rt>た</rt></ruby>べようとする) — 'try to eat'
• iko-u to shita (<ruby>行<rt>い</rt></ruby>こうとした) — 'was about to go'
• naka-yo-u to shita (<ruby>泣<rt>な</rt></ruby>こうとした) — 'tried to cry'
• shinjirou to suru (<ruby>信<rt>しん</rt></ruby>じようとする) — 'try to believe'
• wasure-you to suru (<ruby>忘<rt>わす</rt></ruby>れようとする) — 'try to forget'
• hi ga shizumou to suru (<ruby>日<rt>ひ</rt></ruby>が<ruby>沈<rt>しず</rt></ruby>もうとする) — 'the sun is about to set'
• tachiagaroo to suru (<ruby>立<rt>た</rt></ruby>ち<ruby>上<rt>あ</rt></ruby>がろうとする) — 'try to stand up'
• mamorou to suru (<ruby>守<rt>まも</rt></ruby>ろうとする) — 'try to protect'
• tsutaeyou to suru (<ruby>伝<rt>つた</rt></ruby>えようとする) — 'try to convey'
• hashirou to shita kedo (<ruby>走<rt>はし</rt></ruby>ろうとしたけど) — 'I tried to run but...'
• kane wo nigiroo to suru (<ruby>金<rt>かね</rt></ruby>を<ruby>握<rt>にぎ</rt></ruby>ろうとする) — 'try to grab money'
• yume wo kanaeyou to suru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>叶<rt>かな</rt></ruby>えようとする) — 'try to make a dream come true'
• kotae yo-u to shinai (<ruby>答<rt>こた</rt></ruby>えようとしない) — "doesn't even try to answer"
• miyou to suru (<ruby>見<rt>み</rt></ruby>ようとする) — 'try to see / look'
• ai-shi-you to shita (<ruby>愛<rt>あい</rt></ruby>しようとした) — 'tried to love'

${MARKER}`,

  "185984a3": `〜shidai (〜<ruby>次第<rt>しだい</rt></ruby>) is a noun that grammaticalises into two productive patterns. (a) After a noun: 'depending on / determined by' — kekka shidai (<ruby>結果<rt>けっか</rt></ruby>しだい) 'depending on the result'. (b) After V-stem: 'as soon as X / immediately after X' — tsuki shidai denwa shimasu (<ruby>着<rt>つ</rt></ruby>き<ruby>次第<rt>しだい</rt></ruby><ruby>電話<rt>でんわ</rt></ruby>します) 'I'll call as soon as I arrive'.

The 'depending on' use is everywhere in business and formal Japanese: anata shidai da (あなたしだいだ) "it depends on you" — placing decision / responsibility on someone. The 'as soon as' use is contractual and prompt — contrasts with 〜tara (general 'when X happens', less urgent) and 〜sugu ('immediately', adverbial without conditional structure).

Pairs commonly with kekka, tenki, jouken, kimi (anata) etc. for the 'depending' sense, and with action verbs for the 'as soon as' sense. Compare with 〜kara (because — reason), 〜nara (topic conditional), and 〜to (inevitable consequence). 〜shidai is the workhorse for conditional / contingent / immediate scheduling.

• kekka shidai (<ruby>結果<rt>けっか</rt></ruby>しだい) — 'depending on the result'
• kimi shidai (<ruby>君<rt>きみ</rt></ruby>しだい) — "it's up to you"
• tenki shidai (<ruby>天気<rt>てんき</rt></ruby>しだい) — 'depending on the weather'
• jibun shidai (<ruby>自分<rt>じぶん</rt></ruby>しだい) — 'up to oneself'
• tsuki shidai (<ruby>着<rt>つ</rt></ruby>き<ruby>次第<rt>しだい</rt></ruby>) — 'as soon as I arrive'
• kakikaeshi-dai (<ruby>書<rt>か</rt></ruby>き<ruby>替<rt>か</rt></ruby>えしだい) — 'as soon as rewritten'
• shidai ni (<ruby>次第<rt>しだい</rt></ruby>に) — 'gradually / by degrees' (idiomatic)
• shidai ni kawaru (<ruby>次第<rt>しだい</rt></ruby>に<ruby>変<rt>か</rt></ruby>わる) — 'gradually changes'
• yukue shidai (<ruby>行方<rt>ゆくえ</rt></ruby>しだい) — 'depending on which way it goes'
• ame ga yami shidai dekakeru (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>みしだい<ruby>出<rt>で</rt></ruby>かける) — "I'll go as soon as the rain stops"
• jikan ga ari shidai (<ruby>時間<rt>じかん</rt></ruby>がありしだい) — 'as soon as I have time'
• jouken shidai (<ruby>条件<rt>じょうけん</rt></ruby>しだい) — 'depending on conditions'
• boku no kimochi shidai (<ruby>僕<rt>ぼく</rt></ruby>の<ruby>気持<rt>きも</rt></ruby>ちしだい) — 'depending on how I feel'
• kotae ga deshidai (<ruby>答<rt>こた</rt></ruby>えが<ruby>出<rt>で</rt></ruby>しだい) — 'as soon as the answer comes out'
• jinsei wa kokoro shidai (<ruby>人生<rt>じんせい</rt></ruby>は<ruby>心<rt>こころ</rt></ruby>しだい) — 'life depends on the heart'

${MARKER}`,

  "eac3a7b9": `The potential form (<ruby>可能形<rt>かのうけい</rt></ruby>, kanoukei) attaches 〜eru (〜える) to Type-1 (godan) e-stems and 〜rareru (〜られる) to Type-2 (ichidan) verbs. Type 1: <ruby>書<rt>か</rt></ruby>く → kakeru (<ruby>書<rt>か</rt></ruby>ける) 'can write'. Type 2: <ruby>食<rt>た</rt></ruby>べる → taberareru (<ruby>食<rt>た</rt></ruby>べられる) 'can eat'. Irregular: suru → dekiru (できる), kuru → korareru (<ruby>来<rt>こ</rt></ruby>られる).

Marks ability, possibility, or permission — 'can do X / be able to X'. Direct objects switch from を to が in many contexts: kanji ga yomeru (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>読<rt>よ</rt></ruby>める) 'can read kanji'. Negative 〜enai / 〜rarenai means 'cannot'. Conjugates as a regular ichidan verb.

Casual ra-nuki (ら抜き): ichidan potentials drop the ら in spoken Japanese — taberareru → tabereru. Standard prescriptive grammar disapproves; spoken Japanese embraces it. Same surface form as the passive for ichidan verbs (taberareru) — context disambiguates, but the ra-nuki potential helps distinguish in casual speech. Compare with 〜koto ga dekiru (more analytic 'be able to do X', also valid).

• kakeru (<ruby>書<rt>か</rt></ruby>ける) — 'can write'
• yomeru (<ruby>読<rt>よ</rt></ruby>める) — 'can read'
• ikeru (<ruby>行<rt>い</rt></ruby>ける) — 'can go'
• taberareru (<ruby>食<rt>た</rt></ruby>べられる) — 'can eat' (or "tabereru" casual)
• mireru (<ruby>見<rt>み</rt></ruby>れる) — 'can see' (ra-nuki casual)
• mirareru (<ruby>見<rt>み</rt></ruby>られる) — 'can see' (standard)
• dekiru (できる) — 'can do'
• kikareru (<ruby>聞<rt>き</rt></ruby>かれる) — 'can ask / be asked'
• hashireru (<ruby>走<rt>はし</rt></ruby>れる) — 'can run'
• shinjirareru (<ruby>信<rt>しん</rt></ruby>じられる) — 'can believe'
• ai-sareru (<ruby>愛<rt>あい</rt></ruby>される) — 'can be loved'
• korareru (<ruby>来<rt>こ</rt></ruby>られる) — 'can come'
• mamori-rareru (<ruby>守<rt>まも</rt></ruby>られる) — 'can protect'
• wasurerarenai (<ruby>忘<rt>わす</rt></ruby>れられない) — 'cannot forget'
• ie-nai (<ruby>言<rt>い</rt></ruby>えない) — 'cannot say'

${MARKER}`,

  "8c42f4ca": `〜gurai nara (〜ぐらいなら / 〜くらいなら) attaches to a V-dictionary form. Combines 〜gurai/〜kurai (extent, batch3a) with 〜nara (topic conditional, batch1). Means 'rather than X / sooner than X / if (it would be as bad as) X, then...'. Frames a rejected option against a preferred one. shinu kurai nara waratte ikiru (<ruby>死<rt>し</rt></ruby>ぬくらいなら<ruby>笑<rt>わら</rt></ruby>って<ruby>生<rt>い</rt></ruby>きる) 'rather than die, I'll laugh and live'.

The implicit logic is 'X is so undesirable that I'd take Y instead'. The follow-up clause (Y) is the preferred alternative or the speaker's chosen path. Often used for emphatic preferences, refusals dressed as alternatives, and song declarations of endurance / loyalty.

Compare with 〜yori (just comparison — neutral 'than'), 〜hou ga ii (better to do — positive recommendation), 〜nara (general topic conditional). 〜gurai nara is for STRONG preference frames where one side is rejected as unbearable. The reverse pairing 〜hou ga mashi ('it's better to') reinforces it: shinu kurai nara ikita hou ga mashi 'rather than dying, living is better'.

• shinu kurai nara (<ruby>死<rt>し</rt></ruby>ぬくらいなら) — 'rather than die'
• naku kurai nara (<ruby>泣<rt>な</rt></ruby>くくらいなら) — 'rather than cry'
• taoreru kurai nara (<ruby>倒<rt>たお</rt></ruby>れるくらいなら) — 'rather than collapse'
• ushinau kurai nara (<ruby>失<rt>うしな</rt></ruby>うくらいなら) — 'rather than lose (it)'
• damaru kurai nara hanase (<ruby>黙<rt>だま</rt></ruby>るくらいなら<ruby>話<rt>はな</rt></ruby>せ) — 'rather than stay silent, talk'
• nigeru kurai nara mukatte iku (<ruby>逃<rt>に</rt></ruby>げるくらいなら<ruby>向<rt>む</rt></ruby>かっていく) — "rather than run, I'll face it"
• maketa kurai nara yari-naoshi tai (<ruby>負<rt>ま</rt></ruby>けたくらいならやり<ruby>直<rt>なお</rt></ruby>したい) — "rather than have lost, I want to redo"
• kanji wo wasureru kurai nara benkyou suru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れるくらいなら<ruby>勉強<rt>べんきょう</rt></ruby>する) — 'rather than forget kanji, I study'
• kimi wo nakaseru kurai nara (<ruby>君<rt>きみ</rt></ruby>を<ruby>泣<rt>な</rt></ruby>かせるくらいなら) — 'rather than make you cry'
• ai shinai kurai nara (<ruby>愛<rt>あい</rt></ruby>しないくらいなら) — 'rather than not love'
• damatte iru kurai nara (<ruby>黙<rt>だま</rt></ruby>っているくらいなら) — 'rather than stay silent'
• yume wo akirameru kurai nara (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>諦<rt>あきら</rt></ruby>めるくらいなら) — 'rather than give up the dream'
• yuruseru kurai nara (<ruby>許<rt>ゆる</rt></ruby>せるくらいなら) — 'rather than be able to forgive'
• matte iru kurai nara mukae ni iku (<ruby>待<rt>ま</rt></ruby>っているくらいなら<ruby>迎<rt>むか</rt></ruby>えに<ruby>行<rt>い</rt></ruby>く) — "rather than wait, I'll come for you"
• shippai suru kurai nara yara nai (<ruby>失敗<rt>しっぱい</rt></ruby>するくらいならやらない) — "rather than fail, I won't try"

${MARKER}`,

  "c3e728ed": `〜koto nai (〜ことない / 〜<ruby>事<rt>こと</rt></ruby>ない) attaches to a V-past form to mean 'have never done X' (the negation of 〜koto ga aru, 'have done X'). Or after V-dictionary + 〜koto wa nai 'there's no need to / it's not necessary'. The two readings hinge on which form precedes: V-past = experience denial, V-dictionary = no necessity.

Experience: itta koto nai (<ruby>行<rt>い</rt></ruby>ったことない) "I've never been". A standard way to say 'never X-ed'. Often shortened from the polite koto ga arimasen → casual koto nai. Necessity: shinpai suru koto nai (<ruby>心配<rt>しんぱい</rt></ruby>することない) 'no need to worry'. Reassuring or dismissive.

Compare with 〜hazu ga nai (no way — emphatic denial, batch3b), 〜wake ga nai (no possible way — even stronger emotional denial, batch3b), and 〜nakute mo ii (don't have to, batch3b — permission frame). 〜koto nai is gentler — either neutral experience denial or soft reassurance.

• itta koto nai (<ruby>行<rt>い</rt></ruby>ったことない) — "I've never been"
• atta koto nai (<ruby>会<rt>あ</rt></ruby>ったことない) — "I've never met"
• tabeta koto nai (<ruby>食<rt>た</rt></ruby>べたことない) — "I've never eaten (it)"
• mita koto nai (<ruby>見<rt>み</rt></ruby>たことない) — "I've never seen"
• kiita koto nai (<ruby>聞<rt>き</rt></ruby>いたことない) — "I've never heard"
• shinpai suru koto nai (<ruby>心配<rt>しんぱい</rt></ruby>することない) — 'no need to worry'
• ayamaru koto nai (<ruby>謝<rt>あやま</rt></ruby>ることない) — 'no need to apologise'
• naku koto nai (<ruby>泣<rt>な</rt></ruby>くことない) — 'no need to cry'
• yameru koto nai (やめることない) — 'no need to quit'
• shinjita koto nai (<ruby>信<rt>しん</rt></ruby>じたことない) — "I've never believed"
• kanaratan koto nai (<ruby>叶<rt>かな</rt></ruby>った<ruby>事<rt>こと</rt></ruby>ない) — "(a dream) that hasn't come true"
• tsukareta koto nai (<ruby>疲<rt>つか</rt></ruby>れたことない) — "I've never been tired"
• kanji wo wasureta koto nai (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>忘<rt>わす</rt></ruby>れたことない) — "I've never forgotten kanji"
• maketa koto nai (<ruby>負<rt>ま</rt></ruby>けたことない) — "I've never lost"
• ushinau koto nai (<ruby>失<rt>うしな</rt></ruby>うことない) — 'no need to lose (it)'

${MARKER}`,

  "4b13802a": `〜shika nai (〜しかない) attaches to nouns or V-dictionary forms. shika (しか) is a particle meaning 'only', used exclusively with negative predicates (the 'only X' meaning emerges from 'nothing other than X'). With nai ('not exist / no'), the structure means 'have only X / only X exists'. yaru shika nai (やるしかない) "there's no choice but to do (it)".

The V-dictionary + shika nai pattern is the workhorse: 'no choice but to X'. Carries resignation, determination, or fatalism. itte miru shika nai (<ruby>行<rt>い</rt></ruby>ってみるしかない) "the only thing left is to try". Common in song lyrics and emotional declarations of commitment.

Compare with 〜dake (neutral 'only', no implied lack of choice, batch3b), 〜nomi (formal 'only'), 〜bakari (often critical 'only / nothing but', batch3a). 〜shika...nai uniquely combines exclusivity with the implicit 'and nothing else / no other option'. The polite form 〜shika arimasen (formal 'only X is available') appears in business and travel contexts.

• yaru shika nai (やるしかない) — 'no choice but to do (it)'
• matsu shika nai (<ruby>待<rt>ま</rt></ruby>つしかない) — 'have to wait'
• shinjiru shika nai (<ruby>信<rt>しん</rt></ruby>じるしかない) — 'no choice but to believe'
• kane ga sukoshi shika nai (<ruby>金<rt>かね</rt></ruby>が<ruby>少<rt>すこ</rt></ruby>ししかない) — "I have only a little money"
• mizu shika nai (<ruby>水<rt>みず</rt></ruby>しかない) — 'there's only water'
• ichi-do shika nai (<ruby>一度<rt>いちど</rt></ruby>しかない) — 'there's only once'
• kotae wa hitotsu shika nai (<ruby>答<rt>こた</rt></ruby>えは<ruby>一<rt>ひと</rt></ruby>つしかない) — 'there's only one answer'
• boku ni wa kimi shika inai (<ruby>僕<rt>ぼく</rt></ruby>には<ruby>君<rt>きみ</rt></ruby>しかいない) — 'I have only you'
• mou hashiru shika nai (もう<ruby>走<rt>はし</rt></ruby>るしかない) — 'no choice but to run'
• mukaeau shika nai (<ruby>迎<rt>むか</rt></ruby>え<ruby>合<rt>あ</rt></ruby>うしかない) — 'no choice but to face it'
• wasureru shika nai (<ruby>忘<rt>わす</rt></ruby>れるしかない) — 'have to forget'
• maeni susumu shika nai (<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>むしかない) — 'no choice but to move forward'
• damatte iru shika nai (<ruby>黙<rt>だま</rt></ruby>っているしかない) — "all I can do is stay silent"
• ai shi-tsuzukeru shika nai (<ruby>愛<rt>あい</rt></ruby>し<ruby>続<rt>つづ</rt></ruby>けるしかない) — "all I can do is keep loving"
• tatakau shika nai (<ruby>戦<rt>たたか</rt></ruby>うしかない) — 'no choice but to fight'

${MARKER}`,

  "19c44529": `〜tara ii (〜たらいい) combines the 〜tara conditional (batch1) with the i-adjective ii (good). Two readings: (a) Wish — 'it would be nice if / I hope (X)' — ame ga yandara ii (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>んだらいい) "I hope the rain stops". (b) Suggestion — 'should X / would do well to X' — kiitara ii (<ruby>聞<rt>き</rt></ruby>いたらいい) 'should ask'.

The wish reading is common in songs and reflective speech — soft hope for a future event. The suggestion reading is mild advice, less direct than 〜hou ga ii ('better to'). Often paired with na (なあ) for wistful tone: ame ga yandara ii naa (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>んだらいいなあ) "I sure hope the rain stops".

Compare with 〜eba ii (logical 'should — if we do X, it'd be good'), 〜hou ga ii ('it's better to'), 〜nakereba naranai ('must'). 〜tara ii is the gentlest — wishful hope or soft suggestion. Negative 〜nakattara ii has the same wish / suggestion split for negative cases. Variant 〜tara ii noni (たらいいのに) intensifies the wish: 'if only X would happen'.

• ame ga yandara ii (<ruby>雨<rt>あめ</rt></ruby>が<ruby>止<rt>や</rt></ruby>んだらいい) — "I hope the rain stops"
• haru ga kitara ii (<ruby>春<rt>はる</rt></ruby>が<ruby>来<rt>き</rt></ruby>たらいい) — "I hope spring comes"
• kiitara ii (<ruby>聞<rt>き</rt></ruby>いたらいい) — 'should ask'
• yondara ii (<ruby>読<rt>よ</rt></ruby>んだらいい) — 'should read'
• yatte mitara ii (やってみたらいい) — 'should give it a try'
• ittara ii (<ruby>行<rt>い</rt></ruby>ったらいい) — 'should go'
• mou ichi-do attara ii (もう<ruby>一度<rt>いちど</rt></ruby><ruby>会<rt>あ</rt></ruby>ったらいい) — "I hope we meet again"
• yume nara samenakattara ii (<ruby>夢<rt>ゆめ</rt></ruby>ならさめなかったらいい) — "if it's a dream, I hope I don't wake"
• shippai shitara ii (<ruby>失敗<rt>しっぱい</rt></ruby>したらいい) — "they should fail" (sarcastic / harsh)
• boku ga inakattara ii noni (<ruby>僕<rt>ぼく</rt></ruby>がいなかったらいいのに) — "if only I weren't here"
• kanji ga kantan dattara ii (<ruby>漢字<rt>かんじ</rt></ruby>が<ruby>簡単<rt>かんたん</rt></ruby>だったらいい) — 'I wish kanji were easy'
• kimi ga koko ni itara ii (<ruby>君<rt>きみ</rt></ruby>がここにいたらいい) — "I wish you were here"
• ima sugu aetara ii (<ruby>今<rt>いま</rt></ruby>すぐ<ruby>会<rt>あ</rt></ruby>えたらいい) — "I wish we could meet right now"
• sou nattara ii (そうなったらいい) — "I hope it turns out that way"
• hayaku owattara ii (<ruby>早<rt>はや</rt></ruby>く<ruby>終<rt>お</rt></ruby>わったらいい) — "I hope it ends soon"

${MARKER}`,

  "8b1f9116": `〜tte (〜って) is the casual quotative / topic marker — a contraction of 〜to iu (batch3a). Three main uses: (a) Quotative — 'they say / I heard' — ame ga furu tte (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るって) "I hear it'll rain". (b) Casual topic introduction — replaces wa: kanji tte muzukashii (<ruby>漢字<rt>かんじ</rt></ruby>って<ruby>難<rt>むずか</rt></ruby>しい) "kanji, huh, is hard". (c) Naming — equivalent to 〜to iu casual.

Extremely common in spoken Japanese — appears multiple times per casual conversation. Pre-dating 〜to iu, used for both naming and quoting: yamada-san tte (<ruby>山田<rt>やまだ</rt></ruby>さんって) 'this person Yamada / what's-his-name Yamada'. Sentence-finally as a softener: yatta tte! (やったって！) "I told you I did it!".

Compare with 〜to iu (formal full form, batch3a), 〜tte koto (combination — 'it's the case that'), 〜tte iu no wa (definitional). 〜tte is the conversational shortcut — ubiquitous in casual speech, song lyrics, manga dialogue, but should be replaced by 〜to iu in formal writing. In songs it adds intimacy and casualness.

• ame ga furu tte (<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>るって) — "I hear it'll rain"
• yamada-san tte hito (<ruby>山田<rt>やまだ</rt></ruby>さんって<ruby>人<rt>ひと</rt></ruby>) — 'a guy called Yamada'
• kitsubeat tte apuri (キツビートってアプリ) — 'an app called KitsuBeat'
• kanji tte muzukashii (<ruby>漢字<rt>かんじ</rt></ruby>って<ruby>難<rt>むずか</rt></ruby>しい) — 'kanji is hard'
• ai tte nan da (<ruby>愛<rt>あい</rt></ruby>って<ruby>何<rt>なん</rt></ruby>だ) — 'what is love?'
• kimi tte kawaii (<ruby>君<rt>きみ</rt></ruby>って<ruby>可愛<rt>かわい</rt></ruby>い) — "you're cute"
• kuru tte iitan da (<ruby>来<rt>く</rt></ruby>るって<ruby>言<rt>い</rt></ruby>いたんだ) — "they said they'd come"
• shitte ru tte (<ruby>知<rt>し</rt></ruby>ってるって) — "I told you I know"
• yatta tte (やったって) — "I told you I did it"
• kawatta tte (<ruby>変<rt>か</rt></ruby>わったって) — "I heard it changed"
• yumetterashi (<ruby>夢<rt>ゆめ</rt></ruby>ってらしい) — "it seems to be a dream"
• boku da tte itte iru (<ruby>僕<rt>ぼく</rt></ruby>だって<ruby>言<rt>い</rt></ruby>っている) — "I'm saying it's me"
• shinjirenai tte (<ruby>信<rt>しん</rt></ruby>じれないって) — "(I) can't believe it"
• onaji tte koto sa (<ruby>同<rt>おな</rt></ruby>じってことさ) — "it's the same thing, you see"
• mou ii tte (もういいって) — "(I told you) it's okay already"

${MARKER}`,

  "02ced521": `〜te miseru (〜てみせる) attaches the te-form + miseru (<ruby>見<rt>み</rt></ruby>せる, 'to show'). Means "I'll show (you) by doing X / I'll prove I can X / watch me X". The literal 'show by doing' carries a note of resolve, defiance, or commitment. Distinct from 〜te miru (try doing, batch3b) — same te-form auxiliary structure, but miseru ('show') replaces miru ('see').

The implication is performative: the action is undertaken with witness, often as a declaration to oneself or to a doubting audience. kachitemiseru (<ruby>勝<rt>か</rt></ruby>ってみせる) "I'll win, watch!". katte misete kureta (<ruby>勝<rt>か</rt></ruby>ってみせてくれた) "they won (and showed me they could)".

Common in songs, manga, sports speeches — anywhere the speaker rallies will or commits to a goal. Compare with 〜te miru (exploratory try), 〜oun to suru (try to — effort, batch4a), and the bare volitional ('I'll do X'). 〜te miseru specifically adds the demonstrative / performative dimension — proving capability through action.

• kachi-temiseru (<ruby>勝<rt>か</rt></ruby>ってみせる) — "I'll win, watch me"
• yatte miseru (やってみせる) — "I'll do it (and show you)"
• ai-shi-temiseru (<ruby>愛<rt>あい</rt></ruby>してみせる) — "I'll love (you), watch"
• mamotte miseru (<ruby>守<rt>まも</rt></ruby>ってみせる) — "I'll protect (you), watch me"
• kanaeteru-temiseru (<ruby>叶<rt>かな</rt></ruby>えてみせる) — "I'll make it come true, watch"
• tsuyoku natte miseru (<ruby>強<rt>つよ</rt></ruby>くなってみせる) — "I'll become strong"
• shinjite miseru (<ruby>信<rt>しん</rt></ruby>じてみせる) — "I'll believe (and show you)"
• ikiru-temiseru (<ruby>生<rt>い</rt></ruby>きてみせる) — "I'll keep on living"
• tatakatte miseru (<ruby>戦<rt>たたか</rt></ruby>ってみせる) — "I'll fight, watch me"
• egao ni shite miseru (<ruby>笑顔<rt>えがお</rt></ruby>にしてみせる) — "I'll make (you) smile"
• yume wo kanaete miseru (<ruby>夢<rt>ゆめ</rt></ruby>を<ruby>叶<rt>かな</rt></ruby>えてみせる) — "I'll achieve the dream"
• kanji wo zenbu oboete miseru (<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>覚<rt>おぼ</rt></ruby>えてみせる) — "I'll memorise all the kanji"
• mata aete miseru (また<ruby>会<rt>あ</rt></ruby>えてみせる) — "I'll meet (you) again, watch"
• tsutaete miseru (<ruby>伝<rt>つた</rt></ruby>えてみせる) — "I'll convey it"
• hashiri-kitte miseru (<ruby>走<rt>はし</rt></ruby>りきってみせる) — "I'll run all the way through"

${MARKER}`,

  "1f99eab6": `〜te yaru (〜てやる) attaches yaru (やる, rough 'to give') to a verb's te-form. The rough male / down-status counterpart of 〜te ageru (batch3b — 'doing for someone's benefit'). Same giving-and-receiving structure, but with informal / rough register. Often used when speaking to inferiors, animals, plants, or in defiant declarations.

Two distinct flavours: (a) Doing-for-someone — neutral when used to inferiors / juniors / non-humans, but RUDE when used toward equals / superiors. mizu o yatta (<ruby>水<rt>みず</rt></ruby>をやった) 'gave (the plant) water'. (b) Defiant resolve — ki-tara koroshite yaru (<ruby>来<rt>き</rt></ruby>たら<ruby>殺<rt>ころ</rt></ruby>してやる) "if they come, I'll kill 'em" — very rough, anime / manga staple.

Compare with 〜te ageru (polite-ish 'do for', batch3b — but condescending in some contexts) and 〜te sashiageru (humble, for higher status). 〜te yaru is the masculine / rough end of the giving spectrum. In everyday conversation, prefer 〜te ageru with care; 〜te yaru is for fiction, defiance, intimate bravado, or talking to one's dog.

• yatte yaru (やってやる) — "I'll do it (defiant)"
• mite yaru (<ruby>見<rt>み</rt></ruby>てやる) — "I'll show 'em / I'll see it through"
• ka-tte yaru (<ruby>勝<rt>か</rt></ruby>ってやる) — "I'll win (defiant)"
• mizu o yatta (<ruby>水<rt>みず</rt></ruby>をやった) — 'gave (it) water'
• esa o yaru (<ruby>餌<rt>えさ</rt></ruby>をやる) — 'feed (an animal)'
• tasukete yaru (<ruby>助<rt>たす</rt></ruby>けてやる) — "I'll help (them)" (rough)
• ai-shi-te yaru (<ruby>愛<rt>あい</rt></ruby>してやる) — "I'll love (you)" (rough male)
• mamotte yaru (<ruby>守<rt>まも</rt></ruby>ってやる) — "I'll protect (you)" (rough)
• tatakatte yaru (<ruby>戦<rt>たたか</rt></ruby>ってやる) — "I'll fight (them)"
• damasarete yaru mono ka (<ruby>騙<rt>だま</rt></ruby>されてやるものか) — "I won't be fooled"
• mada hashitte yaru (まだ<ruby>走<rt>はし</rt></ruby>ってやる) — "I'll keep running"
• zettai ni katsu shika nai katte yaru (<ruby>絶対<rt>ぜったい</rt></ruby>に<ruby>勝<rt>か</rt></ruby>つしかない<ruby>勝<rt>か</rt></ruby>ってやる) — "absolutely have to win — I will win"
• boku ga mamotte yaru kara (<ruby>僕<rt>ぼく</rt></ruby>が<ruby>守<rt>まも</rt></ruby>ってやるから) — "because I'll protect (you)"
• naita gurai jya nigashite yaru (<ruby>泣<rt>な</rt></ruby>いたぐらいじゃ<ruby>逃<rt>に</rt></ruby>がしてやる) — "for just crying, I'll let (you) escape"
• miseru-te yaru (<ruby>見<rt>み</rt></ruby>せてやる) — "I'll show (them)"

${MARKER}`,

  "1d33d68b": `〜de wa nakute (〜ではなくて) attaches to nouns, na-adjectives, or whole clauses. Combines the negative copula 〜de wa nai with the te-form connector 〜kute. Means 'not X, but (rather) Y' — explicit negation of X with implied or stated alternative. Casual contraction: 〜ja nakute (〜じゃなくて). neko de wa nakute inu (<ruby>猫<rt>ねこ</rt></ruby>ではなくて<ruby>犬<rt>いぬ</rt></ruby>) 'not a cat, but a dog'.

The structure connects two clauses: the rejected option (X de wa nakute) and the chosen one (Y). Useful for corrections, specifications, and emphatic distinctions. Often paired with 〜demo / 〜nano de instead, depending on the conjunction needed: kirai janakute, hazukashii dake (<ruby>嫌<rt>きら</rt></ruby>いじゃなくて、<ruby>恥<rt>は</rt></ruby>ずかしいだけ) 'not that I dislike (you), I'm just shy'.

Compare with 〜ja naku (more abrupt 'not X'), 〜nai de (negative te-form for verbs — 'without doing'), and the formal 〜de naku (written register). 〜de wa nakute is the everyday connector for distinguishing what something IS not from what it IS. In songs and emotional speech, it carves out precise meaning.

• neko de wa nakute inu (<ruby>猫<rt>ねこ</rt></ruby>ではなくて<ruby>犬<rt>いぬ</rt></ruby>) — 'not a cat, but a dog'
• ame janakute yuki (<ruby>雨<rt>あめ</rt></ruby>じゃなくて<ruby>雪<rt>ゆき</rt></ruby>) — 'not rain, but snow'
• boku janakute kimi (<ruby>僕<rt>ぼく</rt></ruby>じゃなくて<ruby>君<rt>きみ</rt></ruby>) — 'not me, but you'
• kanashii janakute samishii (<ruby>悲<rt>かな</rt></ruby>しいじゃなくて<ruby>寂<rt>さび</rt></ruby>しい) — 'not sad, but lonely'
• yume janakute genjitsu (<ruby>夢<rt>ゆめ</rt></ruby>じゃなくて<ruby>現実<rt>げんじつ</rt></ruby>) — 'not a dream, but reality'
• kirai janakute hazukashii dake (<ruby>嫌<rt>きら</rt></ruby>いじゃなくて<ruby>恥<rt>は</rt></ruby>ずかしいだけ) — "not that I dislike, just shy"
• tabun janakute zettai (<ruby>多分<rt>たぶん</rt></ruby>じゃなくて<ruby>絶対<rt>ぜったい</rt></ruby>) — 'not maybe, but definitely'
• boku no koto janakute (<ruby>僕<rt>ぼく</rt></ruby>のことじゃなくて) — 'not about me, but...'
• ima janakute mae (<ruby>今<rt>いま</rt></ruby>じゃなくて<ruby>前<rt>まえ</rt></ruby>) — 'not now, but before'
• kotoba janakute koudou (<ruby>言葉<rt>ことば</rt></ruby>じゃなくて<ruby>行動<rt>こうどう</rt></ruby>) — 'not words, but actions'
• shinjite janakute aishite (<ruby>信<rt>しん</rt></ruby>じてじゃなくて<ruby>愛<rt>あい</rt></ruby>して) — "not just believe, love (me)"
• unmei de wa nakute sentaku (<ruby>運命<rt>うんめい</rt></ruby>ではなくて<ruby>選択<rt>せんたく</rt></ruby>) — 'not fate, but choice'
• kikoeru janakute kanjiru (<ruby>聞<rt>き</rt></ruby>こえるじゃなくて<ruby>感<rt>かん</rt></ruby>じる) — 'not hearing, but feeling'
• dare ka janakute kimi (<ruby>誰<rt>だれ</rt></ruby>かじゃなくて<ruby>君<rt>きみ</rt></ruby>) — 'not someone, but you'
• yawarakai janakute tsuyoi (<ruby>柔<rt>やわ</rt></ruby>らかいじゃなくて<ruby>強<rt>つよ</rt></ruby>い) — 'not soft, but strong'

${MARKER}`,

  "4902e9be": `The negative form (〜nai, 〜ない) attaches to a verb's nai-stem to express negation. Type 1 (godan): 〜u → 〜anai (kau → kawanai), 〜ku → 〜kanai (kaku → kakanai). Type 2 (ichidan): drop 〜ru, add 〜nai (taberu → tabenai). Irregular: suru → shinai, kuru → konai. The polite form is 〜masen.

For i-adjectives, the negative is 〜kunai (atatakai → atatakakunai). For na-adjectives and nouns: 〜de wa nai / 〜janai (kirei janai 'not pretty'). The 〜nai itself conjugates as an i-adjective: nakatta (past), nakute (te-form), naku (adverbial), nasou (looks not).

The single most common form in Japanese — countless idioms and constructions stack on top: 〜nakereba naranai (must), 〜nakute mo ii (don't have to, batch3b), 〜nai de (without / please don't), 〜nakatta (past negative). Mastering verb and adjective conjugation begins with the 〜nai stem. The casual sentence-final 〜n (dropped 〜nai) appears in spoken Kansai and male casual speech.

• tabenai (<ruby>食<rt>た</rt></ruby>べない) — "don't eat"
• ikanai (<ruby>行<rt>い</rt></ruby>かない) — "don't go"
• mienai (<ruby>見<rt>み</rt></ruby>えない) — "don't / can't see"
• wakaranai (<ruby>分<rt>わ</rt></ruby>からない) — "don't understand"
• shiranai (<ruby>知<rt>し</rt></ruby>らない) — "don't know"
• atatakakunai (<ruby>暖<rt>あたた</rt></ruby>かくない) — "not warm"
• kirei janai (<ruby>綺麗<rt>きれい</rt></ruby>じゃない) — "not pretty"
• gakusei janai (<ruby>学生<rt>がくせい</rt></ruby>じゃない) — "not a student"
• shinai (しない) — "don't do"
• konai (<ruby>来<rt>こ</rt></ruby>ない) — "doesn't come"
• matanai (<ruby>待<rt>ま</rt></ruby>たない) — "don't wait"
• naka-nai (<ruby>泣<rt>な</rt></ruby>かない) — "don't cry"
• wasure-nai (<ruby>忘<rt>わす</rt></ruby>れない) — "won't forget"
• ushinai-takunai (<ruby>失<rt>うしな</rt></ruby>いたくない) — "don't want to lose"
• kanaranai (<ruby>叶<rt>かな</rt></ruby>らない) — "won't come true"

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
