// /sitemap.xml — 記事は posts/ の実体から作る（手で書かない）。
// 記事の頁には図（image:image）も載せる。lastmod は記事の欄の modified（無ければ date）。**記事を直したら modified を直す。**一覧の頁には書かない。
import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { posts, usedTags, abs } from '../lib/posts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = () => {
  const urls = [
    `<url><loc>${site.url}/</loc></url>`,
    `<url><loc>${site.url}/archives</loc></url>`,
    ...usedTags.map((t) => `<url><loc>${site.url}/tags/${t.slug}</loc></url>`),
    // 記事の図も載せる（画像検索の入口。SNS 用の画像と本文の図。同じものは一度だけ）
    ...posts.map((p) => {
      const imgs = [...new Set([...(p.og ? [p.og] : []), ...p.images].map(abs))];
      return `<url><loc>${site.url}${p.url}</loc><lastmod>${p.modified}</lastmod>${imgs.map((i) => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`).join('')}</url>`;
    }),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
