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
  chars: number; // 本文の字数（空白を除く）。構造化データの wordCount と、読む時間の目安に使う
  minutes: number; // 読む時間の目安（1分 600字）
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

// 書いた説明文の長さの番人。検索結果で切られない長さ（125字まで）。短すぎるのも枠の無駄なので 60 字から。
function checkDesc(d: string, file: string) {
  if (d.length > 125 || d.length < 60) throw new Error(`posts/${file}: description は 60〜125 字（いま ${d.length} 字）`);
  return d;
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
      chars: strip(html).replace(/\s/g, '').length,
      minutes: Math.max(1, Math.round(strip(html).replace(/\s/g, '').length / 600)),
      description: data.description ? checkDesc(String(data.description), file) : describe(html),
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

// 関連記事。欄に書いてあるもの（旧ブログの関連記事を引き継いだもの）は頭の2本まで使い、残りは中身の近い記事で埋める。
// 近さは本文の「2文字の並び」を TF-IDF で数えた cosine。同じタグなら少し足す。
// 旧ブログの関連記事は古い記事どうしで閉じていて、新しく足した記事に線が入らなかったため（2026-11-27）。
const vec = new Map<number, Map<string, number>>();
{
  const df = new Map<string, number>();
  const tf = new Map<number, Map<string, number>>();
  for (const p of posts) {
    const t = (p.title + ' ' + p.title + ' ' + p.text).replace(/[\s、。，．・「」『』（）()［］【】！？!?:：;；…"'“”‘’〜~\-—–]/g, '');
    const m = new Map<string, number>();
    for (let i = 0; i < t.length - 1; i++) {
      const g = t.slice(i, i + 2);
      if (/^[a-z0-9]+$/i.test(g)) continue;
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    tf.set(p.id, m);
    for (const g of m.keys()) df.set(g, (df.get(g) ?? 0) + 1);
  }
  const N = posts.length;
  for (const p of posts) {
    const m = tf.get(p.id)!;
    const v = new Map<string, number>();
    let norm = 0;
    for (const [g, c] of m) {
      const d = df.get(g)!;
      if (d > N * 0.5 || d < 2) continue; // どこにでもある並びと、一本にしか無い並びは数えない
      const w = (1 + Math.log(c)) * Math.log(N / d);
      v.set(g, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [g, w] of v) v.set(g, w / norm);
    vec.set(p.id, v);
  }
}
function similarity(a: Post, b: Post) {
  const va = vec.get(a.id)!;
  const vb = vec.get(b.id)!;
  const [s, l] = va.size < vb.size ? [va, vb] : [vb, va];
  let dot = 0;
  for (const [g, w] of s) dot += w * (l.get(g) ?? 0);
  return dot + (a.tags.some((t) => b.tags.includes(t)) ? 0.03 : 0);
}
// まず全記事の関連記事（4本）を決め、どこからも線が来ない記事があれば、その記事に一番近い記事の4本目と入れ替える
// （入れ替えられる記事が別の孤立を生まない場合だけ）。関連記事の線は、検索エンジンが記事を見つける道でもあるため。
const RN = 4;
const relatedMap = new Map<number, Post[]>();
{
  for (const p of posts) {
    const picked = p.relatedIds.map((id) => byId.get(id)).filter((x): x is Post => !!x).slice(0, 2);
    const rest = posts
      .filter((q) => q.id !== p.id && !picked.includes(q))
      .map((q) => ({ q, s: similarity(p, q) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.q);
    relatedMap.set(p.id, [...picked, ...rest].slice(0, RN));
  }
  const inbound = new Map<number, number>(posts.map((p) => [p.id, 0]));
  for (const l of relatedMap.values()) for (const q of l) inbound.set(q.id, inbound.get(q.id)! + 1);
  const swapped = new Set<number>();
  for (const o of posts.filter((p) => inbound.get(p.id) === 0)) {
    const hosts = posts
      .filter((h) => h.id !== o.id && !swapped.has(h.id))
      .map((h) => ({ h, s: similarity(o, h) }))
      .sort((a, b) => b.s - a.s);
    for (const { h } of hosts) {
      const l = relatedMap.get(h.id)!;
      const last = l[RN - 1];
      if (l.includes(o) || h.relatedIds.slice(0, 2).includes(last.id) || inbound.get(last.id)! < 2) continue;
      l[RN - 1] = o;
      inbound.set(last.id, inbound.get(last.id)! - 1);
      inbound.set(o.id, 1);
      swapped.add(h.id);
      break;
    }
  }
}
export function related(p: Post): Post[] {
  return relatedMap.get(p.id)!;
}

// 時系列の前後（ひとつ古い記事・ひとつ新しい記事）
export function neighbors(p: Post) {
  const i = posts.indexOf(p);
  return { newer: i > 0 ? posts[i - 1] : undefined, older: i < posts.length - 1 ? posts[i + 1] : undefined };
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
