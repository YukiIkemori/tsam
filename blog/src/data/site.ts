// ブログ全体で使う決まった値。
// 著者と著書の事実は公式サイト（www/src/pages/index.astro）と同じもの。**向こうを直したら、ここも直す。**
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

export const author = {
  id: 'https://tsam.co.jp/#ikemori',
  name: '池森裕毅',
  latin: 'Yuki Ikemori',
  role: '株式会社tsam 代表取締役',
  url: 'https://tsam.co.jp/#background',
  bio: [
    '1980年生まれ、千葉県松戸市出身。東京理科大学中退後、起業家として活動開始。',
    '現在は、信州大学特任教授として教育現場に携わる傍ら、後進の起業家育成に従事。',
  ],
};

export const org = {
  id: 'https://tsam.co.jp/#org',
  name: '株式会社tsam',
  url: 'https://tsam.co.jp/',
  logo: 'https://tsam.co.jp/apple-touch-icon.png',
};

export const books = [
  { title: 'デジタル人材のシン・キャリアガイド―スタートアップの始め方', role: '著', year: '2023', publisher: 'ぱる出版', href: 'https://www.amazon.co.jp/dp/482721378X' },
  { title: '図解・ビジネスモデルで学ぶスタートアップ', role: '監修', year: '2024', publisher: '日本能率協会マネジメントセンター', href: 'https://www.amazon.co.jp/dp/4800592364' },
];
