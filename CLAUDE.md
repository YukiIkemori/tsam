# tsam — 作業メモ（Claude Code向け）

株式会社tsam の公式サイト。2026-11 に、さくらVPS の WordPress＋JSアプリから静的サイトへ作り直している途中。
**まだ本番には出ていない。**本番はいまも旧サイト。切り替えの手順と注意は `docs/dns-cutover.md`。

## つくり

- `www/` が tsam.co.jp。Astro。`npm run build` で `www/dist/` に出る
- 置き場所は Firebase Hosting（off-notes と同じプロジェクト `my-retro-bbs` に tsam 用のサイトを作る。オーナー了承 2026-11-25）。
  **サイトの作成と、リポジトリの Secrets（FIREBASE_TOKEN）はまだ。**`firebase.json` と `.github/workflows/deploy.yml` は未検証
- ブログ（blog.tsam.co.jp、165本）はまだ旧サイトのまま。URL は `blog.tsam.co.jp/archives/<番号>` の形を変えない（オーナー決定）。
  静的化するときは `blog/` を足す

## 検証

```bash
cd www && npm install && npm run build && npx astro preview   # http://localhost:4321/
```

確認はスマホ幅（390px）から。320 / 360 / 390 / 414 / 768 / 1024 / 1280 / 1440 / 1920px で横スクロールが無いこと。
文字は 11.5px 以上、押すものは 44px 以上。

## 意匠の決まりごと

オーナーの好み（2026-11-25）：「超イケてる尖った感じ」。地は白か薄いグレー。差し色はくぐもったコーラルピンクか、濃いグレー。

- **装置は一つ。見出しの「o」が輪になっている。**キャッチ「Mentor to the next round.」の round ＝輪。
  Company / Background / Contact / Blog にも o があるので、コーラルの輪が一つだけ、読んでいる見出しの o に座り、
  スクロールすると左端の細い線を伝って次の見出しの o へ渡る（`src/components/O.astro`、`src/scripts/ring.js`）
- **大きな見出しを足すときは、o のある英単語にする。**輪の席が要るので
- 輪の寸法は Jost の o の実測値（`global.css` の `.ring`）。**大きな欧文の書体を替えたら測り直す**
- コーラル `#d98577` は、明るい地の上では文字に使わない（コントラスト 2.6）。輪・線・灯りと、暗い地の上だけ
- 節の札は「Round 01 / 02 / 03」、最後のブログへの扉が「Next round」。キャッチは「Mentor to the next round.」で確定

## 文章の決まりごと

- 本文は旧サイトの文章のまま。**勝手に書き足さない。事実（経歴・日付・社名）は旧サイトにあるものだけ**
- 直したのは一か所：「夢を叶えられたなと」→「夢を叶えられたらなと」（脱字と見て直した。オーナーに報告済み）
- 載せないと決めたもの（オーナー 2026-11-25）：Portfolio（投資先・所属プログラム・講演実績）、Services（Startup 101・Stoked capital）、
  Consulting、特定商取引法の表示、料金表、決済。Startup 101（101.tsam.co.jp）は残さない

## 更新のしかた

- **最近の活動**：`www/src/data/activities.json`。旧サイトの News 180件（2019〜）を全部持っている。
  トップに出るのは `"pick": true` を付けたものだけ（新しい順）。新しい活動は配列の頭に足し、出したければ pick を付ける。
  本文の `[文字](URL)` はリンクになる
- **経歴・著書・会社概要**：`www/src/pages/index.astro` の中
- **決まった値**（メール、ブログのURL、アナリティクスのID、フォームの送信先）：`www/src/data/site.ts`
- **OGカードとアイコン**：`cd www && node tools/og.cjs`（Playwright が要る）。キャッチやロゴを変えたときだけ

## お問い合わせフォーム

届け先は ikemori@tsam.co.jp（オーナー 2026-11-25）。**送信の仕組みはまだ入れていない。**
`site.ts` の `contactEndpoint` が空のあいだは、送信ボタンで内容を入れたメールアプリが開く（mailto）。
URL を入れると、そこへ POST してその場で送信する動きに切り替わる（`src/components/ContactForm.astro`）。

## 旧サイトから引き継いだもの

- URL：`/pages/privacy-policy` はそのまま。`/archives/<番号>` と `/blog` はブログへ 301。
  `/pages/transaction` `/pages/consulting-fees` `/payment/**` は表紙へ 301（`firebase.json`）
- 旧サイトのアンカー（`/#section-contact` など）は、新しい見出しへ送る（`src/scripts/reveal.js`）
- Google アナリティクスの測定ID（`site.ts`）
- ロゴの形（`src/components/Logo.astro`）
