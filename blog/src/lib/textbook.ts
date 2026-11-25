// 公式サイトにある教科書（tsam.co.jp/startup）の頁の題を、原稿（../www/startup/pages）から読む。
// 記事の頭の欄に `textbook: mvp` のように slug を書くと、記事の終わりに、その頁への線が一本出る。
// 旧ブログの記事のうち、教科書と同じ主題のもの（33本）に入れてある（2026-11-26。オーナー了承の方針：
// 旧記事は URL も本文もそのまま残し、教科書へのリンクを一本だけ足す）。**本文には触れていない。**
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), '../www/startup/pages');
export const textbookName = 'スタートアップのはじめ方';
export const textbookHome = 'https://tsam.co.jp/startup';

const pages = new Map<string, string>();
for (const file of fs.readdirSync(DIR)) {
  const head = fs.readFileSync(path.join(DIR, file), 'utf8').split('\n---\n')[0];
  const slug = head.match(/^slug:\s*(.+)$/m)?.[1].trim();
  const h1 = head.match(/^h1:\s*(.+)$/m)?.[1].trim();
  if (slug && h1) pages.set(slug, h1);
}

export function textbookPage(slug: string, where: string) {
  const h1 = pages.get(slug);
  if (!h1) throw new Error(`${where}: 教科書に ${slug} という頁が無い（www/startup/pages の slug）`);
  return { url: `${textbookHome}/${slug}`, title: h1 };
}
