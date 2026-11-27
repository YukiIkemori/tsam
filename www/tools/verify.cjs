// 表示の検査。www/ で `npm run build && npx astro preview` を立ててから `node tools/verify.cjs`。
//   ・全部の頁を 390px と 1440px で開き、横スクロール・画像切れ・行き先の無い #リンク・見出しの段飛ばし・
//     11.5px 未満の字・44px 未満の押すもの（本文の中のリンクは除く）を数える
//   ・表紙・活動の記録・教科書の目次と代表の頁は 320〜1920px の9幅でも見る
//   ・SNS 用の画像（og:image）のファイルが dist/ に実在するかも見る（教科書の頁を足して og-startup.cjs を流し忘れると、ここで出る）
//   ・頁の中のリンク（/ で始まるもの）が dist/ に実在するかも見る
// 外の読み込み（アナリティクス、X、YouTube、Google Fonts）は止めて測る。欧文の大きな字（Jost）は自前なので本物で測れる。
// 和文は代わりの字になるが、全角の送りは同じなので、はみ出しの判定は変わらない。
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.URL || 'http://localhost:4321';
const dist = path.join(__dirname, '../dist');
const WIDE = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920];
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.isDirectory()) walk(path.join(d, f.name));
    else if (f.name.endsWith('.html')) pages.push('/' + path.relative(dist, path.join(d, f.name)).replace(/\.html$/, '').replace(/^index$/, ''));
  }
})(dist);
const exists = (href) => {
  const p = href.split('#')[0].split('?')[0];
  if (p === '/' || p === '') return true;
  return fs.existsSync(path.join(dist, p)) || fs.existsSync(path.join(dist, p + '.html'));
};
const sample = new Set(['/', '/record', '/pages/privacy-policy', '/404', '/startup', '/startup/glossary', '/startup/what-is-startup', '/startup/unit-economics', '/startup/moat', '/startup/exit-ipo-ma', '/startup/accelerator']);

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let bad = 0;
  let n = 0;
  // 幅ごとに一つの窓を使い回す（字のファイルを毎回取り直さないように）
  const ctxs = {};
  for (const w of WIDE) {
    ctxs[w] = await b.newContext({ viewport: { width: w, height: 800 } });
    await ctxs[w].route('**/*', (r) => {
      const u = r.request().url();
      return u.startsWith(BASE) ? r.continue() : r.abort();
    });
  }
  const jobs = [];
  for (const pg of pages.sort()) for (const w of sample.has(pg) ? WIDE : [390, 1440]) jobs.push([pg, w]);
  const work = async () => {
    for (let job; (job = jobs.shift()); ) {
      const [pg, w] = job;
      const p = await ctxs[w].newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(BASE + pg, { waitUntil: 'load' });
      await p.evaluate(async () => {
        await document.fonts.ready;
        // 遅延読み込みの画像も先に全部読ませる（やらないと「画像切れ」の誤検知が出る）
        for (const i of document.images) i.loading = 'eager';
        await Promise.race([
          Promise.all([...document.images].map((i) => i.complete || new Promise((r) => { i.onload = i.onerror = r; }))),
          new Promise((r) => setTimeout(r, 8000)),
        ]);
      });
      const r = await p.evaluate(() => {
        const out = { over: document.documentElement.scrollWidth - innerWidth, wide: [], small: [], tap: [], skip: [], links: [] };
        for (const el of document.querySelectorAll('main *, header *, footer *')) {
          const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
          if (rc.width && rc.right > innerWidth + 1 && !el.closest('.rings, .orbit') && cs.position !== 'fixed' && !el.closest('.tbl')) out.wide.push(el.className || el.tagName);
          if ([...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim()) && parseFloat(cs.fontSize) < 11.5 && !el.classList.contains('vh')) out.small.push((el.className || el.tagName) + ':' + cs.fontSize);
        }
        for (const el of document.querySelectorAll('a, button, summary')) {
          const rc = el.getBoundingClientRect(); if (!rc.width) continue;
          if (el.closest('.tb-text, .tb-lead, .tb-points, .tb-pre__text, .prose, .recent__body, .form__note')) continue; // 文の中のリンク
          if (el.tagName === 'SUMMARY' && getComputedStyle(el).pointerEvents === 'none') continue;
          if (el.closest('.tb-toc') && innerWidth >= 900) continue; // 広い画面の目次はマウスで押す細い行
          if (rc.height < 43.5) out.tap.push((el.className || el.tagName) + ' ' + Math.round(rc.width) + 'x' + Math.round(rc.height) + ' ' + (el.textContent || '').trim().slice(0, 14));
        }
        let prev = 0;
        for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) { const l = +h.tagName[1]; if (prev && l > prev + 1) out.skip.push(`h${prev}→h${l} ${h.textContent.trim().slice(0, 16)}`); prev = l; }
        out.h1 = document.querySelectorAll('h1').length;
        out.imgs = [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src'));
        out.anchors = [...document.querySelectorAll('a[href^="#"]')].filter((a) => !document.querySelector(a.getAttribute('href'))).map((a) => a.getAttribute('href'));
        out.og = document.querySelector('meta[property="og:image"]')?.content.replace(/^https:\/\/tsam\.co\.jp/, '');
        out.links = [...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')))];
        return out;
      });
      const dead = r.links.filter((h) => !exists(h));
      if (!r.og || !exists(r.og)) dead.push('og:image ' + r.og);
      delete r.og;
      const isBad = r.over > 0 || r.wide.length || r.small.length || r.tap.length || r.skip.length || r.imgs.length || r.anchors.length || dead.length || errs.length || r.h1 !== 1;
      if (isBad) { bad++; delete r.links; console.log(pg, w, JSON.stringify({ ...r, dead, errs })); }
      n++;
      await p.close();
    }
  };
  await Promise.all([work(), work(), work(), work()]);
  await b.close();
  console.log(`${pages.length}頁・${n}回の表示を見た。問題のあった表示: ${bad}`);
  process.exit(bad ? 1 : 0);
})();
