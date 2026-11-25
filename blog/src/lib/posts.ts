// 記事を posts/ から読む。
//
//   posts/<番号>.html … 旧ブログ（WordPress）から移した記事。本文は HTML のまま
//   posts/<番号>.md   … これから書く記事。本文は Markdown
//
// どちらも頭に --- で挟んだ欄を持つ（title・date・modified・tags・image・related・description・author・textbook）。
// 番号がそのまま URL（/archives/<番号>）になる。新しい記事は、いちばん大きい番号の次を使う。
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { tags as tagDefs, site } from '../data/site';
import { textbookPage } from './textbook';

export type Tag = (typeof tagDefs)[number];
export type Post = {
  id: number;
  url: string;
  title: string;
  date: string; // 2025-05-15T03:32:24+09:00
  modified: string;
  ymd: string; // 2025.05.15
  year: string;
  tags: Tag[];
  byOrg: boolean; // 寄稿（書き手が代表本人ではない記事）
  html: string;
  text: string;
  description: string;
  images: string[];
  og?: string;
  toc: { id: string; text: string }[];
  relatedIds: number[];
  hasTweet: boolean;
  textbook?: { url: string; title: string }; // 同じ主題の、教科書（tsam.co.jp/startup）の頁
};

const DIR = path.join(process.cwd(), 'posts');

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return entities[e.toLowerCase()] ?? m;
  });
const strip = (html: string) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

// 日付は日本時間で持つ（YAML が Date にしてしまうので、+09:00 の文字列に戻す）
const jst = (d: unknown) => {
  if (typeof d === 'string') return d;
  const t = new Date((d as Date).getTime() + 9 * 3600e3).toISOString();
  return `${t.slice(0, 19)}+09:00`;
};

// 検索結果に出る説明文。書いていなければ、本文の書き出し（見出し・図・引用を除く）から 120 字までを切り出す。
// 文の途中で切らないように、70 字より先に「。」があればそこで止める。
function describe(html: string) {
  const body = html
    .replace(/<(h[1-6]|figure|blockquote|iframe)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<br\s*\/?>/g, ' ');
  const t = strip(body).replace(/([。！？」）]) /g, '$1');
  if (t.length <= 120) return t;
  const cut = t.slice(0, 120);
  const i = cut.lastIndexOf('。');
  return i >= 70 ? cut.slice(0, i + 1) : `${t.slice(0, 118)}…`;
}

function load(): Post[] {
  const list: Post[] = [];
  for (const file of fs.readdirSync(DIR)) {
    const m = file.match(/^(\d+)\.(html|md)$/);
    if (!m) continue;
    const id = Number(m[1]);
    const { data, content } = matter(fs.readFileSync(path.join(DIR, file), 'utf8'));
    if (!data.title || !data.date) throw new Error(`posts/${file}: title と date が要る`);
    let html = m[2] === 'md' ? (marked.parse(content, { async: false }) as string) : content.trim();

    // 本文の h2 に番号の id を振って、目次にする
    const toc: Post['toc'] = [];
    html = html.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g, (_, inner: string) => {
      const hid = `h${toc.length + 1}`;
      toc.push({ id: hid, text: strip(inner) });
      return `<h2 id="${hid}">${inner}</h2>`;
    });

    const date = jst(data.date);
    const mod = data.modified ? jst(data.modified) : date;
    const slugs: string[] = data.tags ?? [];
    list.push({
      id,
      url: `/archives/${id}`,
      title: String(data.title),
      date,
      // 予約投稿の記事は、更新日のほうが公開日より前になっている。そのときは公開日に合わせる
      modified: mod > date ? mod : date,
      ymd: date.slice(0, 10).replaceAll('-', '.'),
      year: date.slice(0, 4),
      tags: slugs.map((s) => {
        const t = tagDefs.find((d) => d.slug === s);
        if (!t) throw new Error(`posts/${file}: 知らないタグ ${s}（src/data/site.ts の tags にあるものだけ）`);
        return t;
      }),
      byOrg: data.author === 'org',
      html,
      text: strip(html),
      description: data.description ? String(data.description) : describe(html),
      images: [...html.matchAll(/<img[^>]*\ssrc="(\/[^"]+)"/g)].map((x) => x[1]),
      og: data.image,
      toc: toc.length >= 3 ? toc : [],
      relatedIds: data.related ?? [],
      hasTweet: html.includes('twitter-tweet'),
      textbook: data.textbook ? textbookPage(String(data.textbook), `posts/${file}`) : undefined,
    });
  }
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const posts = load();
export const byId = new Map(posts.map((p) => [p.id, p]));

// 関連記事。欄に書いてあればそれ（旧ブログの関連記事を引き継いだもの）。無ければ同じタグの新しい記事から。
export function related(p: Post, n = 4): Post[] {
  const picked = p.relatedIds.map((id) => byId.get(id)).filter((x): x is Post => !!x);
  if (picked.length >= n) return picked.slice(0, n);
  const same = posts.filter((q) => q.id !== p.id && !picked.includes(q) && q.tags.some((t) => p.tags.includes(t)));
  const rest = posts.filter((q) => q.id !== p.id && !picked.includes(q) && !same.includes(q));
  return [...picked, ...same, ...rest].slice(0, n);
}

export const usedTags = tagDefs
  .map((t) => ({ ...t, posts: posts.filter((p) => p.tags.includes(t)) }))
  .filter((t) => t.posts.length > 0);

export function byYear(list: Post[]) {
  const ys = [...new Set(list.map((p) => p.year))];
  return ys.map((year) => ({ year, items: list.filter((p) => p.year === year) }));
}

export const firstYear = posts[posts.length - 1].year;
export const lastYear = posts[0].year;
export const abs = (p: string) => new URL(p, site.url).href;
