// /llms-full.txt — 全記事の本文を一つの素の文書にしたもの。AI に要約・引用されるときの元になる。posts/ の実体から作る（手で書かない）。
// 本文は記事の頁と同じもの（見出しは ## に、段落は空行で区切る）。足していないし、削ってもいない。
import type { APIRoute } from 'astro';
import { site, author, org } from '../data/site';
import { posts, abs } from '../lib/posts';

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return entities[e.toLowerCase()] ?? m;
  });

// HTML を素の文章に。見出しは ##／###、箇条は「- 」、段落は空行。図は説明（alt）があるときだけ残す。
function plain(html: string) {
  return decode(
    html
      .replace(/<(script|style|iframe)\b[\s\S]*?<\/\1>/g, '')
      .replace(/<blockquote class="twitter-tweet"[\s\S]*?<\/blockquote>/g, '')
      .replace(/<img[^>]*\salt="([^"]+)"[^>]*>/g, '\n[図: $1]\n')
      .replace(/<h2\b[^>]*>/g, '\n\n## ')
      .replace(/<h[3-6]\b[^>]*>/g, '\n\n### ')
      .replace(/<li\b[^>]*>/g, '\n- ')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/(p|h[1-6]|blockquote|figure|ul|ol|table|tr|div)>/g, '\n\n')
      .replace(/<(td|th)\b[^>]*>/g, ' | ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const GET: APIRoute = () => {
  const body = `# ${site.name} 全記事

> ${site.description}。運営は${org.name}（${site.home}/）。全${posts.length}本、新しい順。
> 書き手は特に断りのないかぎり${author.name}（${author.role}）。各記事の URL が正本です。

${posts
  .map(
    (p) => `---

# ${p.title}

- URL: ${abs(p.url)}
- 公開: ${p.date.slice(0, 10)}${p.modified.slice(0, 10) > p.date.slice(0, 10) ? `（更新 ${p.modified.slice(0, 10)}）` : ''}
- 分類: ${p.tags.map((t) => t.ja).join('、') || 'なし'}
- 書き手: ${p.byOrg ? org.name : author.name}
- 要約: ${p.description}

${plain(p.html)}`,
  )
  .join('\n\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
