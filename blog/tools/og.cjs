// ブログ共通の OGカード（public/ogp.jpg）を作り直す。アイキャッチを持たない記事と、一覧の頁がこれを使う。
// 旧ブログの共通カードの場所（/images/ogp.png）にも同じ絵を置く（古い共有リンクが画像切れにならないように）。
// 使い方: blog/ で `node tools/og.cjs`。Playwright（Chromium）が要る。ロゴや意匠を変えたときだけ流す。
const { chromium } = require('playwright');
const { readFileSync, writeFileSync, rmSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');

const here = __dirname;
(async () => {
  const logo = readFileSync(join(here, '../../www/src/components/Logo.astro'), 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
  const tmp = join(here, '.og-build.html');
  writeFileSync(tmp, readFileSync(join(here, 'og.html'), 'utf8').replace('__LOGO__', logo));
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(here, '../public/ogp.jpg'), type: 'jpeg', quality: 88 });
  await page.screenshot({ path: join(here, '../public/images/ogp.png') });
  await browser.close();
  rmSync(tmp);
  console.log('ogp.jpg / images/ogp.png を書き出しました');
})();
