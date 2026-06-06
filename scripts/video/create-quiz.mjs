#!/usr/bin/env node
/**
 * create-quiz.mjs — Fully automated quiz video generator
 *
 * Usage:
 *   node scripts/create-quiz.mjs --anime naruto --part 1
 *   node scripts/create-quiz.mjs --anime naruto --part 1 --render
 *   node scripts/create-quiz.mjs --anime naruto --part 1 --no-audio
 *
 * What it does:
 *   1. Reads videos/word-banks/<anime>.json → picks part's 5 words
 *   2. Creates videos/<anime>-quiz[-N]/ folder
 *   3. Copies assets (anime logo, KitsuBeat icons)
 *   4. Generates index.html from template (with correct logo, words, options)
 *   5. Generates generate-audio.js
 *   6. Runs audio generation (edge-tts + ElevenLabs)
 *   7. Generates thumbnail.png via Playwright
 *   8. Generates social.json with captions
 *   9. Updates videos/catalog.json
 *  10. Optionally runs `npx hyperframes render` (--render flag)
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const animeSlug = getArg('--anime');
const partNum   = parseInt(getArg('--part') || '1', 10);
const doRender  = hasFlag('--render');
const noAudio   = hasFlag('--no-audio');

if (!animeSlug) {
  console.error('Usage: node scripts/create-quiz.mjs --anime <slug> --part <n> [--render] [--no-audio]');
  console.error('');
  console.error('Available anime slugs (must match a file in videos/word-banks/):');
  console.error('  one-piece, naruto, attack-on-titan, bleach, fullmetal-alchemist, sword-art-online');
  process.exit(1);
}

// ─── Load word bank ───────────────────────────────────────────────────────────

const bankPath = join(ROOT, 'videos', 'word-banks', `${animeSlug}.json`);
if (!existsSync(bankPath)) {
  console.error(`✗ Word bank not found: ${bankPath}`);
  process.exit(1);
}
const bank = JSON.parse(readFileSync(bankPath, 'utf-8'));
const part = bank.parts.find(p => p.part === partNum);
if (!part) {
  const available = bank.parts.map(p => p.part).join(', ');
  console.error(`✗ Part ${partNum} not found in ${animeSlug}. Available: ${available}`);
  process.exit(1);
}

// ─── Validate quiz questions before creating any files ────────────────────────

function validatePart(words, seriesLabel, partNumber) {
  const errors = [];
  const romajiMap = new Map(words.map(w => [w.romaji.toLowerCase(), w.id]));

  for (const w of words) {
    const q   = w.q.toLowerCase();
    const ans = w.romaji.toLowerCase();
    const pat = new RegExp(`\\b${ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

    if (pat.test(q)) {
      errors.push(`  SELF_REF [${w.id}]: question "${w.q}" contains the answer romaji "${w.romaji}"`);
    }

    const seen = new Set();
    for (const d of w.wrong) {
      const dr = d.r.toLowerCase();
      if (dr === ans) {
        errors.push(`  WRONG_EQUALS_CORRECT [${w.id}]: distractor "${d.r}" equals correct answer`);
      }
      if (seen.has(dr)) {
        errors.push(`  DUPE_WRONG [${w.id}]: duplicate distractor "${d.r}"`);
      }
      seen.add(dr);
    }
  }

  if (errors.length > 0) {
    console.error(`\n✗ Quiz validation failed — ${seriesLabel} Part ${partNumber}:`);
    errors.forEach(e => console.error(e));
    console.error('\nFix the word-bank file and retry. Run: npx tsx --tsconfig tsconfig.scripts.json scripts/social/validate-quiz-banks.ts');
    process.exit(1);
  }
}

validatePart(part.words, bank.label, partNum);

// ─────────────────────────────────────────────────────────────────────────────

const words = part.words.slice(0, 5);
if (words.length < 5) {
  console.error(`✗ Part ${partNum} has only ${words.length} words — need 5`);
  process.exit(1);
}

console.log(`\n🦊 KitsuBeat Quiz Generator`);
console.log(`   Anime : ${bank.label}`);
console.log(`   Part  : ${partNum} — ${part.theme}`);
console.log(`   Words : ${words.map(w => w.romaji).join(', ')}\n`);

// ─── Output folder ───────────────────────────────────────────────────────────

const folderName = partNum === 1
  ? `${animeSlug}-quiz`
  : `${animeSlug}-quiz-${partNum}`;
const outDir    = join(ROOT, 'videos', folderName);
const assetsDir = join(outDir, 'assets');

mkdirSync(assetsDir, { recursive: true });
console.log(`→ ${outDir}`);

// ─── Copy assets ─────────────────────────────────────────────────────────────

const logoSrc  = join(ROOT, 'public', 'anime', `${animeSlug}-logo.png`);
const logoDest = join(assetsDir, `${animeSlug}-logo.png`);
const hasLogo  = existsSync(logoSrc);

if (hasLogo) {
  copyFileSync(logoSrc, logoDest);
  console.log(`✓ Copied ${animeSlug}-logo.png`);
} else {
  console.warn(`⚠ No logo found at ${logoSrc} — header will use fallback text`);
}

copyFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), join(assetsDir, 'apple-touch-icon.png'));
copyFileSync(join(ROOT, 'public', 'logo.png'),             join(assetsDir, 'logo.png'));

// ─── Shuffle options (deterministic per anime+part+wordIndex) ─────────────────

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function shuffleOptions(word, wordIndex) {
  const seed = animeSlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 10000
             + partNum * 100 + wordIndex;
  const rand = seededRandom(seed);

  const options = [
    { r: word.romaji, e: word.en, correct: true },
    ...word.wrong.map(w => ({ r: w.r, e: w.e, correct: false })),
  ];

  // Fisher-Yates
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options; // length 4, one is correct
}

// ─── Build question data ──────────────────────────────────────────────────────

const questions = words.map((word, idx) => {
  const options     = shuffleOptions(word, idx);
  const correctIdx  = options.findIndex(o => o.correct);
  const correctLtr  = 'abcd'[correctIdx];
  const correctId   = `#q${idx + 1}${correctLtr}`;
  const wrongIds    = ['a', 'b', 'c', 'd']
    .filter((_, i) => i !== correctIdx)
    .map(l => `'#q${idx + 1}${l}'`);

  // Famous terms: show JP term and ask for English meaning (inverse)
  const inverse = word.famous === true;
  const qText = inverse
    ? `What does ${word.jp} (${word.romaji}) mean?`
    : word.q.replace(/"([^"]+)"/, '<br>"$1"');

  return {
    n:         idx + 1,
    start:     idx * 14,
    text:      qText,
    options,
    inverse,
    kanji:     word.jp,
    romajiEn:  `${word.romaji} — ${word.en}`,
    correctId,
    wrongIds,
  };
});

// ─── Generate index.html ──────────────────────────────────────────────────────

const templatePath = join(ROOT, 'videos', 'template', 'quiz-template.html');
if (!existsSync(templatePath)) {
  console.error(`✗ Template not found: ${templatePath}`);
  process.exit(1);
}
const template = readFileSync(templatePath, 'utf-8');

const compId    = `kitsubeat-${animeSlug}-quiz-${partNum}`;
const partLabel = partNum === 1 ? 'Part 1' : `Pt. ${partNum}`;
const logoRef   = hasLogo ? `assets/${animeSlug}-logo.png` : 'assets/apple-touch-icon.png';

const LOGO_FILTERS = { 'bleach': 'invert(1)', 'attack-on-titan': 'invert(1)' };
const logoStyle = LOGO_FILTERS[animeSlug] ? ` style="filter: ${LOGO_FILTERS[animeSlug]}"` : '';

function buildQuestionsHtml() {
  return questions.map(q => {
    const optLines = q.options.map((opt, i) => {
      const ltr  = 'ABCD'[i];
      const id   = `q${q.n}${'abcd'[i]}`;
      const text = q.inverse ? opt.e : opt.r;
      return `      <div class="option" id="${id}"><span class="opt-label">${ltr}</span><span class="opt-romaji">${text}</span></div>`;
    }).join('\n');

    return `  <!-- ─── Q${q.n}: ${q.options.find(o => o.correct).e} ─── -->
  <div class="scene" id="s${q.n}">
    <div class="counter">Q ${q.n} / 5</div>
    <div class="question-text">${q.text}</div>
    <div class="options">
${optLines}
    </div>
    <div class="countdown-display" id="cdn${q.n}">
      <div class="cd-logo-wrap" id="cdl${q.n}">
        <div class="dot-orbit">
          <div class="glow-dot"></div>
          <div class="glow-dot"></div>
          <div class="glow-dot"></div>
        </div>
        <img src="assets/apple-touch-icon.png" class="cd-logo-img">
      </div>
      <div class="cd-number" id="cdnum${q.n}">5</div>
      <div class="cd-kanji" id="cdkanji${q.n}">
        <div class="kanji-char">${q.kanji}</div>
        <div class="kanji-romaji">${q.romajiEn}</div>
      </div>
    </div>
    <div class="timer-bottom" id="ts${q.n}">
      <div class="timer-track"><div class="timer-fill" id="t${q.n}"></div></div>
    </div>
  </div>`;
  }).join('\n\n');
}

function buildAudioTags() {
  return questions.map(q => {
    const audioStart = (q.start + 10.0).toFixed(1);
    return `  <audio id="audio-q${q.n}" data-start="${audioStart}" data-duration="4" data-track-index="1" data-volume="1.0" src="assets/q${q.n}.mp3"></audio>`;
  }).join('\n');
}

function buildQuestionsJs() {
  return questions.map(q =>
    `  { n: ${q.n}, start: ${q.start}, correct: '${q.correctId}', wrongs: [${q.wrongIds.join(', ')}] },`
  ).join('\n');
}

const html = template
  .replace(/\{\{COMP_ID\}\}/g,       compId)
  .replace(/\{\{ANIME_LABEL\}\}/g,   bank.label)
  .replace(/\{\{PART_LABEL\}\}/g,    partLabel)
  .replace(/\{\{ANIME_LOGO\}\}/g,       logoRef)
  .replace(/\{\{ANIME_LOGO_ALT\}\}/g,  bank.label)
  .replace(/\{\{ANIME_LOGO_STYLE\}\}/g, logoStyle)
  .replace('{{QUESTIONS_HTML}}',     buildQuestionsHtml())
  .replace('{{AUDIO_TAGS}}',         buildAudioTags())
  .replace('{{QUESTIONS_JS}}',       buildQuestionsJs());

writeFileSync(join(outDir, 'index.html'), html, 'utf-8');
console.log(`✓ index.html`);

// ─── Generate generate-audio.js ───────────────────────────────────────────────

const audioWordLines = questions.map((q, i) => {
  const word = words[i];
  const en   = q.options.find(o => o.correct).e.replace(/\//g, ' or ');
  return `  { file: 'q${i + 1}.mp3', jp: '${word.hiragana}', en: '${en}.' },`;
}).join('\n');

const audioScript = `#!/usr/bin/env node
// Auto-generated by create-quiz.mjs — do not edit manually.
// Generates quiz pronunciation audio for ${bank.label} Part ${partNum}.
// Japanese: ja-JP-NanamiNeural (Edge TTS)
// English:  ElevenLabs Sarah
// Stitched by ffmpeg with 0.3s pause between JP and EN.

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

for (const line of readFileSync(join(__dirname, '../../.env.local'), 'utf-8').split('\\n')) {
  const eq = line.indexOf('=');
  if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

const API_KEY  = process.env.ELEVENLABS_API_KEY;
const JP_VOICE = 'ja-JP-NanamiNeural';
const EN_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs Sarah

if (!API_KEY) throw new Error('ELEVENLABS_API_KEY not found in .env.local');

const WORDS = [
${audioWordLines}
];

async function elevenLabs(text, outPath) {
  const res = await fetch(\`https://api.elevenlabs.io/v1/text-to-speech/\${EN_VOICE}\`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  });
  if (!res.ok) throw new Error(\`ElevenLabs \${res.status}: \${await res.text()}\`);
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
}

function edgeTts(text, outPath) {
  execSync(\`edge-tts --voice "\${JP_VOICE}" --text "\${text}" --write-media "\${outPath}"\`, { stdio: 'pipe' });
}

function combine(jpPath, enPath, outPath) {
  execSync(
    \`ffmpeg -y -i "\${jpPath}" -i "\${enPath}" \` +
    \`-filter_complex "[0]apad=pad_dur=0.3[a0];[a0][1]concat=n=2:v=0:a=1[out]" \` +
    \`-map "[out]" "\${outPath}"\`,
    { stdio: 'pipe' }
  );
}

const assetsDir = join(__dirname, 'assets');
mkdirSync(assetsDir, { recursive: true });

for (const word of WORDS) {
  const outPath = join(assetsDir, word.file);
  if (existsSync(outPath)) { console.log(\`skip: \${word.file}\`); continue; }

  process.stdout.write(\`\${word.jp} — \${word.en}  →  \${word.file} ... \`);

  const jpTmp = join(assetsDir, \`_tmp_jp_\${word.file}\`);
  const enTmp = join(assetsDir, \`_tmp_en_\${word.file}\`);

  edgeTts(word.jp, jpTmp);
  await elevenLabs(word.en, enTmp);
  combine(jpTmp, enTmp, outPath);

  unlinkSync(jpTmp);
  unlinkSync(enTmp);
  console.log('✓');
}

console.log('\\nAll audio ready in assets/');
`;

writeFileSync(join(outDir, 'generate-audio.js'), audioScript, 'utf-8');
console.log(`✓ generate-audio.js`);

// ─── Run audio generation ─────────────────────────────────────────────────────

if (!noAudio) {
  console.log('\n🎙  Generating audio...');
  try {
    execSync(`node generate-audio.js`, {
      cwd: outDir,
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('✓ Audio ready');
  } catch (e) {
    console.warn(`⚠ Audio generation failed: ${e.message}`);
    console.warn('  Run manually: cd videos/' + folderName + ' && node generate-audio.js');
  }
} else {
  console.log('⏭  Skipping audio (--no-audio)');
}

// ─── Generate thumbnail ───────────────────────────────────────────────────────

console.log('\n🖼  Generating thumbnail...');
const wordLabels = words.map(w => `${w.romaji}  (${w.jp})`).join('|');

try {
  const result = spawnSync('node', [
    join(__dirname, 'gen-thumbnail.cjs'),
    outDir,
    bank.label,
    partLabel,
    hasLogo ? logoSrc : '',
    wordLabels,
  ], { stdio: 'inherit' });

  if (result.status !== 0) throw new Error('exit ' + result.status);
  console.log('✓ thumbnail.png (landscape, YouTube)');
} catch (e) {
  console.warn(`⚠ Thumbnail generation failed: ${e.message}`);
}

// Portrait reel thumbnail (1080×1920) for Instagram/TikTok cover
const reelTemplatePath = join(ROOT, 'public', 'thumbnails', `${animeSlug}.html`);
if (existsSync(reelTemplatePath)) {
  console.log('\n🖼  Generating portrait thumbnail (reel cover)...');
  try {
    const result = spawnSync('node', [
      join(__dirname, 'gen-reel-thumbnail.cjs'),
      '--anime', animeSlug,
      '--part',  String(partNum),
    ], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('exit ' + result.status);
  } catch (e) {
    console.warn(`⚠ Portrait thumbnail failed: ${e.message}`);
  }
} else {
  console.warn(`⚠ No portrait template — skipping reel cover (add public/thumbnails/${animeSlug}.html)`);
}

// ─── Generate social.json ─────────────────────────────────────────────────────

const romajiList = words.map(w => w.romaji).join(' · ');
const kanjiList  = words.map(w => `${w.jp} (${w.romaji}) — ${w.en}`).join('\n• ');
const hashtagsAnime = bank.label.replace(/[^a-zA-Z0-9]/g, '');
const partSuffix = partNum > 1 ? ` #${partNum}` : '';

const social = {
  instagram: {
    caption: `🎌 ${bank.label} Vocabulary Quiz${partSuffix}\n\nCan you score 5/5? Drop your answers below 👇\n\nToday's words:\n• ${kanjiList}\n\nLearn Japanese through anime you already love → kitsubeat.com 🦊\n\n#${hashtagsAnime} #LearnJapanese #JapaneseWithAnime #Nihongo #日本語 #AnimeJapanese #JLPT #KitsuBeat #AnimeQuiz #JapaneseVocabulary`,
  },
  tiktok: {
    caption: `🎌 ${bank.label} vocab quiz — can you get 5/5? 👇\n\n${romajiList}\n\nLearn Japanese through anime free at kitsubeat.com\n\n#${hashtagsAnime} #LearnJapanese #AnimeJapanese #Nihongo #JLPT #JapaneseQuiz #KitsuBeat #AnimeQuiz`,
  },
  youtube: {
    title: `${bank.label} Japanese Vocabulary Quiz${partSuffix} — Can You Score 5/5? 🎌`,
    description: `Test your ${bank.label} Japanese vocabulary! 5 questions, 5 seconds each.\n\nWords in this quiz:\n• ${kanjiList}\n\nLearning Japanese through anime is the fastest way to actually remember vocabulary.\n👉 Free lessons, quizzes and songs at kitsubeat.com\n\n#${hashtagsAnime} #LearnJapanese #JapaneseVocabulary #Shorts`,
    tags: [
      bank.label,
      'learn Japanese',
      'Japanese vocabulary',
      'anime Japanese',
      'nihongo',
      'JLPT',
      'Japanese quiz',
      'KitsuBeat',
      'anime language learning',
      'Japanese for beginners',
      '日本語',
    ],
  },
};

writeFileSync(join(outDir, 'social.json'), JSON.stringify(social, null, 2), 'utf-8');
console.log(`✓ social.json`);

// ─── Update catalog.json ──────────────────────────────────────────────────────

const catalogPath = join(ROOT, 'videos', 'catalog.json');
const catalog = existsSync(catalogPath)
  ? JSON.parse(readFileSync(catalogPath, 'utf-8'))
  : {};

if (!catalog[animeSlug]) {
  catalog[animeSlug] = {
    label:      bank.label,
    icon:       `${animeSlug}-logo.png`,
    music:      '',
    parts:      [],
    used_words: [],
  };
}

const entry = catalog[animeSlug];

// Remove any existing entry for this part (idempotent re-run)
entry.parts = entry.parts.filter(p => p.part !== partNum);

entry.parts.push({
  part:        partNum,
  folder:      folderName,
  theme:       part.theme,
  status:      'scaffolded',
  created:     new Date().toISOString().slice(0, 10),
  render_file: null,
  posted:      { instagram: null, tiktok: null, youtube: null },
  words:       words.map(w => ({ en: w.en, jp: w.jp, romaji: w.romaji, hiragana: w.hiragana })),
  social:      social,
});

// Track used words
const newRomaji = words.map(w => w.romaji);
entry.used_words = [...new Set([...(entry.used_words || []), ...newRomaji])];

// Sort parts
entry.parts.sort((a, b) => a.part - b.part);

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
console.log(`✓ catalog.json updated`);

// ─── Optionally render ────────────────────────────────────────────────────────

if (doRender) {
  console.log('\n🎬 Rendering...');
  try {
    execSync(`npx hyperframes render`, { cwd: outDir, stdio: 'inherit' });
    console.log('✓ Render complete');
  } catch (e) {
    console.warn(`⚠ Render failed: ${e.message}`);
  }
}

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log(`
✅ Quiz scaffolded: videos/${folderName}/

Next steps:
  ${noAudio ? '1. Generate audio:  cd videos/' + folderName + ' && node generate-audio.js' : '1. ✓ Audio generated'}
  2. Preview:         cd videos/${folderName} && npx hyperframes preview
  3. Render:          cd videos/${folderName} && npx hyperframes render
     (or re-run with --render flag)
  4. Post:            node scripts/youtube-post.ts --folder videos/${folderName}
`);
