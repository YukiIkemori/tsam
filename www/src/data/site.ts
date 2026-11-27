// サイト全体で使う決まった値。文言の出どころは旧サイト（WordPress）の本文。
export const site = {
  name: '株式会社tsam',
  url: 'https://tsam.co.jp',
  tagline: 'Mentor to the next round.',
  description: '株式会社tsamは起業家をサポートする会社です。',
  email: 'ikemori@tsam.co.jp',
  blog: 'https://blog.tsam.co.jp/',
  // 旧サイトと同じ Google アナリティクス（GA4）の測定ID。計測を途切れさせないために引き継ぐ。
  ga: 'G-SGZRRJP3VJ',
  // お問い合わせフォームの送信先。空のあいだは、送信ボタンでメールアプリを開く（mailto）。
  // 受け口（Google Apps Script のウェブアプリ。forms/contact.gs、手順は docs/contact-form.md）の URL と、
  // 下の turnstileSiteKey の両方を入れると、その場で送信する動きに切り替わる。
  contactEndpoint: '',
  // 機械でないことの確認（Cloudflare Turnstile）のサイトキー。公開してよい値（シークレットのほうは受け口の側にだけ置く）。
  // フォームは、この確認の結果を添えて送る（受け口は、確認の無い送信を受けない）。
  turnstileSiteKey: '',
  // トップの「最近の活動」に出す件数（新しい順）。全件は /record に出る。
  recentCount: 8,
  social: [
    { label: 'X', href: 'https://twitter.com/yuki_ikemori' },
    { label: 'Facebook', href: 'https://www.facebook.com/yuki.ikemori/' },
  ],
};
