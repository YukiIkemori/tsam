import { person, org as wwwOrg, books as wwwBooks } from '@www/data/person';

// ブログ全体で使う決まった値。
export const site = {
  name: 'tsam.blog',
  url: 'https://blog.tsam.co.jp',
  // 旧ブログの説明文のまま
  description: '株式会社tsamブログ。起業家に向けたチップス、コラムなど',
  home: 'https://tsam.co.jp',
  email: 'ikemori@tsam.co.jp',
  // 旧ブログと同じ Google アナリティクス（GA4）の測定ID。公式サイトとは別のID（旧サイトがそうなっていた）。
  ga: 'G-J2L9RRSGC2',
  // トップに出す最新記事の本数。全部は /archives に出る。
  latestCount: 10,
  social: [
    { label: 'X', href: 'https://twitter.com/yuki_ikemori' },
    { label: 'Facebook', href: 'https://www.facebook.com/yuki.ikemori/' },
  ],
};

// タグ。slug は URL（/tags/<slug>）。en は頁の大きな見出しで、「|」の位置の o が輪になる
// （このサイトの見出しは o のある語にする決まり。輪の席が要る）。並びは旧ブログのタグの順。
export const tags = [
  { slug: 'startup', ja: 'スタートアップ概論', en: 'The|ry' },
  { slug: 'finance', ja: '資金調達', en: 'M|ney' },
  { slug: 'venturecapital', ja: '投資家視点', en: 'Invest|rs' },
  { slug: 'knowhow', ja: 'ノウハウ', en: 'Kn|w-how' },
  { slug: 'columns', ja: 'コラム', en: 'C|lumns' },
  { slug: 'reports', ja: 'レポート', en: 'Rep|rts' },
  { slug: 'contribution', ja: '寄稿', en: 'C|ntributions' },
  { slug: 'others', ja: 'その他', en: 'N|tes' },
];

// 書いた人・会社・著書は、公式サイトと同じ一か所（www/src/data/person.ts）から読む。直すのは向こう。
export const author = person;
export const org = wwwOrg;
export const books = wwwBooks.map((b) => ({ title: b.full, role: b.role, year: b.date.slice(0, 4), publisher: b.publisher, href: b.href }));
