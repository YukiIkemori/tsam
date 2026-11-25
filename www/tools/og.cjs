// OGカード（public/ogp.jpg）とアイコン（favicon-32.png・apple-touch-icon.png）を作り直す。
// 使い方: www/ で `node tools/og.cjs`。Playwright（Chromium）が要る。キャッチやロゴを変えたときだけ流す。
const { chromium } = require('playwright');
const { readFileSync, writeFileSync, rmSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');

const here = __dirname;
(async () => {
const logo = readFileSync(join(here, '../src/components/Logo.astro'), 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
const tmp = join(here, '.og-build.html');
writeFileSync(tmp, readFileSync(join(here, 'og.html'), 'utf8').replace('__LOGO__', logo));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(tmp).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(here, '../public/ogp.jpg'), type: 'jpeg', quality: 88 });

const icon = readFileSync(join(here, '../public/favicon.svg'), 'utf8');
for (const [size, name, full] of [[32, 'favicon-32.png', false], [180, 'apple-touch-icon.png', true]]) {
  // iOS は自分で角を丸めるので、apple-touch-icon だけは角を落とさず地を端まで敷く
  const svg = full ? icon.replace('rx="14"', 'rx="0"') : icon;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: join(here, '../public', name), omitBackground: true });
}
await browser.close();
rmSync(tmp);
console.log('ogp.jpg / favicon-32.png / apple-touch-icon.png を書き出しました');
})();
