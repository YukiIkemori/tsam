// 教科書（/startup）の OGカードを作り直す。頁ごとに一枚（public/startup/og/<slug>.jpg）と、目次（index.jpg）・用語集（glossary.jpg）。
// 使い方: www/ で `node tools/og-startup.cjs`。Playwright（Chromium）が要る。日本語の書体を Google Fonts から読むので、ネットワークも要る。
// **頁を足したとき、題（h1）を変えたときに流す。**カードが無い頁は build は通るが、SNS に画像が出ない（tools/verify.cjs が数える）。
const { chromium } = require('playwright');
const { readFileSync, writeFileSync, rmSync, readdirSync, mkdirSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');

const here = __dirname;
const src = join(here, '../startup');
const out = join(here, '../public/startup/og');

// 区分の語（Intr|・M|ney…）は src/lib/startup.ts の rounds から読む（二か所に書かない）
const lib = readFileSync(join(here, '../src/lib/startup.ts'), 'utf8');
const rounds = [...lib.matchAll(/\{ n: (\d+), ja: '([^']+)', en: '([^']+)'/g)].map((m) => ({ n: Number(m[1]), ja: m[2], en: m[3] }));
if (rounds.length !== 8) throw new Error('rounds を読めなかった');

const meta = (file) => {
  const head = readFileSync(file, 'utf8').split('\n---\n')[0];
  return Object.fromEntries(head.split('\n').filter((l) => l.includes(':') && !l.startsWith('point:')).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
};
const cut = (h1) => {
  const i = h1.indexOf('。');
  return i > 0 ? [h1.slice(0, i + 1), h1.slice(i + 1)] : [h1, ''];
};

const files = readdirSync(join(src, 'pages')).filter((f) => f.endsWith('.md'));
const cards = files.map((f) => {
  const m = meta(join(src, 'pages', f));
  const r = rounds.find((x) => x.n === Number(m.part));
  const [a, b] = cut(m.h1);
  return { slug: m.slug, word: r.en, tag: `Round ${String(r.n).padStart(2, '0')}`, ja: r.ja, lamps: r.n, a, b };
});
cards.push({ slug: 'index', word: 'Textb|ok', tag: 'Textbook', ja: '起業の教科書', lamps: 0, a: meta(join(src, 'index.md')).h1, b: `全${files.length + 2}頁`, hero: true });
cards.push({ slug: 'glossary', word: 'Gl|ssary', tag: 'A–Z', ja: 'スタートアップのはじめ方', lamps: 0, a: meta(join(src, 'glossary.md')).h1, b: '' });

(async () => {
  const logo = readFileSync(join(here, '../src/components/Logo.astro'), 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
  const tmp = join(here, '.og-build.html');
  writeFileSync(tmp, readFileSync(join(here, 'og-startup.html'), 'utf8').replace('__LOGO__', logo));
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
  for (const c of cards) {
    await page.evaluate((x) => window.draw(x), c);
    await page.evaluate(() => document.fonts.ready);
    const ok = await page.evaluate(() => document.fonts.check('400 60px "IBM Plex Sans JP"', '起業') && document.fonts.check('300 100px Jost'));
    if (!ok) throw new Error('書体を読めていない（ネットワークを確かめる）');
    await page.evaluate((x) => window.draw(x), c); // 書体が入ってから測り直す
    await page.screenshot({ path: join(out, `${c.slug}.jpg`), type: 'jpeg', quality: 86 });
  }
  await browser.close();
  rmSync(tmp);
  console.log(`${cards.length} 枚を書き出しました: public/startup/og/`);
})();
