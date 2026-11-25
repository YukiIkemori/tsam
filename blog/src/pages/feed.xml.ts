// /feed.xml — RSS。新しい順に30本。本文は載せず、書き出しとリンクだけ。
import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { posts, abs } from '../lib/posts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = () => {
  const items = posts.slice(0, 30).map((p) => `<item>
<title>${esc(p.title)}</title>
<link>${abs(p.url)}</link>
<guid isPermaLink="true">${abs(p.url)}</guid>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
${p.tags.map((t) => `<category>${esc(t.ja)}</category>`).join('')}
<description>${esc(p.description)}</description>
</item>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(site.name)}</title>
<link>${site.url}/</link>
<description>${esc(site.description)}</description>
<language>ja</language>
<lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
<atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
