// /llms.txt — AI に読ませるための、このブログの素の目次。posts/ の実体から作る（手で書かない）。
// まだ標準ではなく、検索の順位が上がる根拠も無い。費用がゼロだから置いている。
import type { APIRoute } from 'astro';
import { site, author, books } from '../data/site';
import { posts, usedTags, firstYear, lastYear, abs } from '../lib/posts';

export const GET: APIRoute = () => {
  const body = `# ${site.name}

> ${site.description}。${firstYear}年から${lastYear}年までの全${posts.length}本。

- 運営: 株式会社tsam（${site.home}/）
- 書き手: ${author.name}（${author.latin}）。${author.role}。${author.bio.join('')}
- 著書: ${books.map((b) => `${b.title}（${b.publisher}、${b.year}年${b.role === '監修' ? '。監修' : ''}）`).join('、')}
- 記事一覧: ${site.url}/archives
- RSS: ${site.url}/feed.xml
- 全記事の本文: ${site.url}/llms-full.txt

${usedTags
  .map(
    (t) => `## ${t.ja}

${t.posts.map((p) => `- [${p.title}](${abs(p.url)})（${p.date.slice(0, 10)}）: ${p.description}`).join('\n')}`,
  )
  .join('\n\n')}
${
  posts.some((p) => p.tags.length === 0)
    ? `\n## タグなし\n\n${posts.filter((p) => p.tags.length === 0).map((p) => `- [${p.title}](${abs(p.url)})（${p.date.slice(0, 10)}）`).join('\n')}\n`
    : ''
}`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
