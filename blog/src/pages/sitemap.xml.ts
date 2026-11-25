// /sitemap.xml — 記事は posts/ の実体から作る（手で書かない）。
// lastmod は記事の欄の modified（無ければ date）。**記事を直したら modified を直す。**一覧の頁には書かない。
import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { posts, usedTags } from '../lib/posts';

export const GET: APIRoute = () => {
  const urls = [
    `<url><loc>${site.url}/</loc></url>`,
    `<url><loc>${site.url}/archives</loc></url>`,
    ...usedTags.map((t) => `<url><loc>${site.url}/tags/${t.slug}</loc></url>`),
    ...posts.map((p) => `<url><loc>${site.url}${p.url}</loc><lastmod>${p.modified}</lastmod></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
