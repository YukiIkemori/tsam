// 教科書「スタートアップのはじめ方」（/startup）の原稿を startup/ から読む。
//
//   startup/pages/NN-slug.md … 各頁の原稿（これが唯一の原稿）
//   startup/index.md          … 目次（/startup）の前書き
//   startup/glossary.md       … 用語集（/startup/glossary）
//
// 2026-11-26、off-notes.com/startup/ から引っ越した（オーナー指示。意匠は tsam に合わせて作り直した）。
// 元は、オーナーの講座テキストを「検索される問い一つにつき一頁」に組み直したもの。**原稿に無い事実を足さない。**
//
// 原稿の書式（pages/*.md）。頭の欄と本文を「---」の行で分ける:
//     slug: unit-economics          URL の最後の一語（/startup/unit-economics）。**変えない**（検索に載っている）
//     part: 5                       下の rounds の番号
//     title: …                      <title>。30全角以内（超えると build が止まる）。頭に狙う語
//     h1: …                         頁の題。最初の「。」までが大きく出る
//     desc: …                       description。90〜125全角（外れると build が止まる）
//     kw: a, b                      構造化データの keywords
//     blurb: …                      目次に出す一行
//     lead: …                       冒頭の答え。問いに二、三文で答え切る（AI の要約が抜く場所）
//     point: …                      「この頁の要点」。何行でも
//     related: slug, slug           末尾の「あわせて読む」
//     mod: 2026-12-01               直した日。**本文や欄を直したら書き直す**（無ければ引っ越し前の最終更新日）
//     ---
//     ## 見出し / ### 小見出し / 段落 / - 箇条書き / 1. 番号つき / | 表 | / > 補足
//     ?? 問い                       よくある質問。次の空行までが答え。FAQPage にもなる
//     行内は **強調** と [文字](/startup/slug)
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'startup');
export const BASE = '/startup';
export const NAME = 'スタートアップのはじめ方';
export const PUBLISHED = '2026-11-14'; // off-notes.com で最初に公開した日
const CARRIED = '2026-11-20'; // 引っ越し前（off-notes.com）の最終更新日。mod の無い頁はこの日付

// 区分は八つ。札は「Round 01〜08」（公式の節の札と同じ言い方。キャッチが Mentor to the next round. なので）。
// en は頁の頭の大きな字で、「|」の位置の o が輪になる（このサイトの見出しは o のある語にする決まり）。
// 番号は原稿の part と対なので、足すなら末尾に。
export const rounds = [
  { n: 1, ja: '起業の基本', en: 'Intr|', who: '起業するか迷っている。まず全体像を知りたい' },
  { n: 2, ja: '会社とお金', en: 'M|ney', who: '会社を作る。株と資金調達の仕組みを知る' },
  { n: 3, ja: 'アイデア', en: 'C|ncept', who: '何をやるかを決める' },
  { n: 4, ja: '検証', en: 'Pr|of', who: '作る前と作った後に、確かめる' },
  { n: 5, ja: 'ビジネスモデル', en: 'M|del', who: '儲かる形と、真似されない形を設計する' },
  { n: 6, ja: '成長と組織', en: 'Gr|wth', who: 'ユーザーを増やし、人を増やす' },
  { n: 7, ja: 'ピッチ', en: 'St|ry', who: '投資家と審査員に伝える' },
  { n: 8, ja: '出口と環境', en: 'Bey|nd', who: 'Exit、支援プログラム' },
];
export type Round = (typeof rounds)[number];
export const no = (n: number) => String(n).padStart(2, '0');

export type Page = {
  slug: string;
  url: string; // /startup/<slug>
  round: Round;
  title: string;
  h1: string;
  desc: string;
  kw: string[];
  blurb: string;
  lead: string; // HTML
  leadText: string;
  points: string[]; // HTML
  related: string[];
  mod: string;
  html: string;
  toc: { id: string; text: string }[];
  faq: { q: string; a: string }[]; // 素の文
  file: string;
};

// 全角1・半角0.5 で数える（title と description の枠は全角換算）
export const width = (s: string) => [...s].reduce((n, c) => n + (c.codePointAt(0)! < 0x2000 ? 0.5 : 1), 0);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 行内の記法。**強調** と [文字](行き先)。外へ出る線には rel を付ける
export function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t: string, href: string) =>
      href.startsWith('/') ? `<a href="${href}">${t}</a>` : `<a href="${href}" rel="noopener">${t}</a>`,
    );
}
// 構造化データ用。記法を落とした素の文
export const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

function split(file: string) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  const at = text.indexOf('\n---\n');
  if (at < 0) throw new Error(`startup/${file}: 頭の欄と本文を分ける「---」の行が無い`);
  const meta: Record<string, string> = {};
  const points: string[] = [];
  for (const line of text.slice(0, at).split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k === 'point') points.push(v);
    else meta[k] = v;
  }
  return { meta, points, body: text.slice(at + 5) };
}

export function render(body: string) {
  const out: string[] = [];
  const toc: Page['toc'] = [];
  const faq: Page['faq'] = [];
  const lines = body.split('\n');
  let i = 0;
  let faqOpen = false;
  const closeFaq = () => {
    if (faqOpen) out.push('</dl>');
    faqOpen = false;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (line.startsWith('## ')) {
      closeFaq();
      const t = line.slice(3).trim();
      const id = `s${toc.length + 1}`;
      toc.push({ id, text: plain(t) });
      out.push(`<h2 id="${id}"><span class="no" aria-hidden="true">${no(toc.length)}</span>${inline(t)}</h2>`);
      i++;
    } else if (line.startsWith('### ')) {
      closeFaq();
      out.push(`<h3>${inline(line.slice(4).trim())}</h3>`);
      i++;
    } else if (line.startsWith('?? ')) {
      const q = line.slice(3).trim();
      const a: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim()) a.push(lines[i++].trim());
      faq.push({ q: plain(q), a: plain(a.join(' ')) });
      if (!faqOpen) out.push('<dl class="faq">');
      faqOpen = true;
      out.push(`<div><dt>${inline(q)}</dt><dd>${inline(a.join(' '))}</dd></div>`);
    } else if (line.startsWith('- ')) {
      out.push('<ul>');
      while (i < lines.length && lines[i].startsWith('- ')) out.push(`<li>${inline(lines[i++].slice(2).trim())}</li>`);
      out.push('</ul>');
    } else if (/^\d+\. /.test(line)) {
      out.push('<ol>');
      while (i < lines.length && /^\d+\. /.test(lines[i])) out.push(`<li>${inline(lines[i++].replace(/^\d+\. /, '').trim())}</li>`);
      out.push('</ol>');
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i++].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
      }
      // 表は狭い画面で横に溢れるので、自分の箱の中だけで横に送る
      out.push('<div class="tbl" tabindex="0" role="group" aria-label="表"><table><thead><tr>');
      out.push(rows[0].map((c) => (c ? `<th scope="col">${inline(c)}</th>` : '<td></td>')).join(''));
      out.push('</tr></thead><tbody>');
      for (const r of rows.slice(1)) out.push(`<tr>${r.map((c, j) => (j === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`);
      out.push('</tbody></table></div>');
    } else if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) buf.push(lines[i++].slice(2).trim());
      out.push(`<aside class="note">${buf.map((b) => `<p>${inline(b)}</p>`).join('')}</aside>`);
    } else {
      out.push(`<p>${inline(line.trim())}</p>`);
      i++;
    }
  }
  closeFaq();
  return { html: out.join('\n'), toc, faq };
}

function check(what: string, title: string, desc: string) {
  if (width(title) > 30) throw new Error(`${what}: title が ${width(title)} 全角（30以内）: ${title}`);
  const d = width(desc);
  if (d < 90 || d > 125) throw new Error(`${what}: description が ${d} 全角（90〜125）`);
}

function load(): Page[] {
  const list: Page[] = [];
  for (const file of fs.readdirSync(path.join(DIR, 'pages')).sort()) {
    if (!file.endsWith('.md')) continue;
    const { meta, points, body } = split(`pages/${file}`);
    for (const k of ['slug', 'part', 'title', 'h1', 'desc', 'lead']) if (!meta[k]) throw new Error(`startup/pages/${file}: ${k} が無い`);
    const round = rounds.find((r) => r.n === Number(meta.part));
    if (!round) throw new Error(`startup/pages/${file}: part ${meta.part} という区分は無い`);
    check(`startup/pages/${file}`, meta.title, meta.desc);
    const list2 = (s = '') => s.split(',').map((x) => x.trim()).filter(Boolean);
    list.push({
      slug: meta.slug,
      url: `${BASE}/${meta.slug}`,
      round,
      title: meta.title,
      h1: meta.h1,
      desc: meta.desc,
      kw: list2(meta.kw),
      blurb: meta.blurb || `${plain(meta.lead).slice(0, 60)}…`,
      lead: inline(meta.lead),
      leadText: plain(meta.lead),
      points: points.map(inline),
      related: list2(meta.related),
      mod: meta.mod && meta.mod > CARRIED ? meta.mod : CARRIED,
      ...render(body),
      file,
    });
  }
  // 並びは区分の順、区分の中はファイル名の番号順（＝読む順）
  list.sort((a, b) => a.round.n - b.round.n || (a.file < b.file ? -1 : 1));

  const slugs = new Set(list.map((p) => p.slug));
  if (slugs.size !== list.length) throw new Error('startup: slug が重複している');
  const known = new Set([BASE, `${BASE}/glossary`, ...list.map((p) => p.url)]);
  const inbound = new Map(list.map((p) => [p.slug, 0]));
  for (const p of list) {
    for (const s of p.related) if (!slugs.has(s)) throw new Error(`startup/pages/${p.file}: related の ${s} という頁が無い`);
    const hrefs = [...p.html.matchAll(/href="(\/[^"#]*)/g)].map((m) => m[1]);
    for (const h of hrefs) if (!known.has(h)) throw new Error(`startup/pages/${p.file}: 行き先が無い内部リンク ${h}`);
    for (const s of new Set([...p.related, ...hrefs.map((h) => h.slice(BASE.length + 1))])) {
      if (s !== p.slug && inbound.has(s)) inbound.set(s, inbound.get(s)! + 1);
    }
  }
  // 入ってくる線が一本も無い頁を作らない（目次と前後を除いた、本文と「あわせて読む」からの線）
  const lonely = [...inbound].filter(([, c]) => c === 0).map(([s]) => s);
  if (lonely.length) throw new Error(`startup: ほかの頁の本文・関連から線が来ていない頁: ${lonely.join(', ')}`);
  return list;
}

export const pages = load();
export const bySlug = new Map(pages.map((p) => [p.slug, p]));
export const inRound = (r: Round) => pages.filter((p) => p.round === r);

// 目次の前書き
function loadIndex() {
  const { meta, body } = split('index.md');
  check('startup/index.md', meta.title, meta.desc);
  const mods = [...pages.map((p) => p.mod), meta.mod ?? CARRIED];
  return { title: meta.title, h1: meta.h1, desc: meta.desc, html: render(body).html, mod: mods.sort().at(-1)! };
}
export const index = loadIndex();

// 用語集。一行が一語で「語 | 別の言い方 | 説明 | 詳しい頁の slug」
function loadGlossary() {
  const { meta, body } = split('glossary.md');
  check('startup/glossary.md', meta.title, meta.desc);
  const terms = body.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((line, i) => {
    const c = line.split('|').map((x) => x.trim());
    if (c.length !== 4) throw new Error(`startup/glossary.md: 四つに分かれていない: ${line}`);
    const page = bySlug.get(c[3]);
    if (!page) throw new Error(`startup/glossary.md: ${c[3]} という頁が無い（${c[0]}）`);
    return { id: `t${i + 1}`, term: c[0], alt: c[1], def: c[2], page };
  });
  return { url: `${BASE}/glossary`, title: meta.title, h1: meta.h1, desc: meta.desc, lead: meta.lead, mod: meta.mod && meta.mod > CARRIED ? meta.mod : CARRIED, terms };
}
export const glossary = loadGlossary();

export const jaDate = (d: string) => `${d.slice(0, 4)}年${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`;
