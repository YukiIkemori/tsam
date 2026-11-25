// /sitemap.xml — 頁の実体から作る（手で書かない）。
// lastmod を書くのは、直した日を原稿に持っている教科書の頁だけ（startup/ の mod）。
// ほかの頁には書かない（手で書くと、直すたびに嘘になるため）。**頁を足したら、ここの fixed に足す。**
import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { pages, index, glossary, BASE } from '../lib/startup';

const fixed = ['/', '/record', '/pages/privacy-policy'];

export const GET: APIRoute = () => {
  const rows = [
    ...fixed.map((p) => ({ loc: p, mod: '' })),
    { loc: BASE, mod: index.mod },
    ...pages.map((p) => ({ loc: p.url, mod: p.mod })),
    { loc: glossary.url, mod: glossary.mod },
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map((r) => `  <url><loc>${site.url}${r.loc}</loc>${r.mod ? `<lastmod>${r.mod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
