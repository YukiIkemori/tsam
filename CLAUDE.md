# tsam — 作業メモ（Claude Code向け）

株式会社tsam の公式サイト。2026-11 に、さくらVPS の WordPress＋JSアプリから静的サイトへ作り直している途中。
**まだ本番には出ていない。**本番はいまも旧サイト。切り替えの手順と注意は `docs/dns-cutover.md`。

## つくり

- `www/` が tsam.co.jp。Astro。`npm run build` で `www/dist/` に出る
- 置き場所は Firebase Hosting（off-notes と同じプロジェクト `my-retro-bbs` に tsam 用のサイトを作る。オーナー了承 2026-11-25）。
  **サイトの作成と、リポジトリの Secrets（FIREBASE_TOKEN）はまだ。**`firebase.json` と `.github/workflows/deploy.yml` は未検証
- `blog/` が blog.tsam.co.jp。Astro。`npm run build` で `blog/dist/` に出る。旧ブログ（WordPress）の165本を 2026-11-26 に全部移した。
  URL は `blog.tsam.co.jp/archives/<番号>` の形を変えない（オーナー決定）。**本番はまだ旧ブログ。**
  Firebase のサイトは公式とは別にもう一つ要る（`firebase.json` の `tsam-blog`。これもまだ作っていない）
- ブログは意匠の部品（輪の o・ロゴ・`global.css`・`ring.js`）を `www/src` からそのまま読む（`@www/…`）。
  **www の部品を直すとブログも変わる。**直したら両方を見る。ブログだけの部品は `blog/src/styles/blog.css`

## 検証

```bash
cd www && npm install && npm run build && npx astro preview   # http://localhost:4321/
```

ブログは `cd blog && npm install && npm run build && npx astro preview --port 4322` のあと `node tools/verify.cjs`
（全175頁を 390px と 1440px で開いて、横スクロール・画像切れ・リンク切れ・見出しの段飛ばし・小さい字・小さい押し場所を数える。30秒ほど）。

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

- **活動の記録**：`www/src/data/activities.json`。旧サイトの News 180件（2019〜）を全部持っている。
  **選別はしない**（オーナー 2026-11-26「全部データ使おう。選別のほうがだるい」）。新しい活動は配列の頭に一件足すだけ。
  トップの「最近の活動」には新しい順に8件（`site.ts` の `recentCount`）、`/record` には全件が年ごとに出る。
  本文の `[文字](URL)` はリンクになる
- **経歴・著書・会社概要**：`www/src/pages/index.astro` の中
- **決まった値**（メール、ブログのURL、アナリティクスのID、フォームの送信先）：`www/src/data/site.ts`
- **OGカードとアイコン**：`cd www && node tools/og.cjs`（Playwright が要る）。キャッチやロゴを変えたときだけ
- **見本（本番に出す前に動きごと見てもらう1ファイルの写し）**：`cd www && npm run build && python3 tools/preview.py <出力先のフォルダ>`

## ブログの更新のしかた

- **記事を足す**：`blog/posts/<番号>.md` を一つ足す。番号はいちばん大きい番号の次（いま最大は 5641）。番号がそのまま URL になる。
  頭の欄は `title`・`date`（`2026-12-01T09:00:00+09:00` の形）・`tags`（`[columns]` のように一つ）。本文は Markdown。
  画像は `blog/public/images/<番号>/` に置いて `![説明](/images/<番号>/01.webp)`。
  任意の欄：`modified`（直した日）、`description`（検索結果の説明文。無ければ書き出しから自動）、`image`（SNS 用の画像）、
  `related`（関連記事の番号。無ければ同じタグの新しい記事）、`author: org`（寄稿。書き手を代表本人にしない）
- **旧ブログから移した記事**（`blog/posts/<番号>.html`）は本文が HTML のまま。**文章には触れていない。**
  移すときに変えたことは `blog/tools/import_wp.py` の頭に書いてある（画像の置き直し、記事どうしのリンク、見出しを h2 始まりに、など）。
  このスクリプトは一度きりの道具で、もう流さない
- **記事を直したら `modified` を直す**（sitemap の lastmod と構造化データの dateModified がここから出る）
- **タグ**は `blog/src/data/site.ts` の `tags`。`en` は頁の大きな見出しで、o のある語にする（「|」の位置の o が輪になる）
- **トップの Focus**（旧ブログの Featured articles）は `site.ts` の `featured`。いまは旧ブログのままの一本
- **コメント**は旧ブログに付いていた26件を記事の下にそのまま残してある（`blog/src/data/comments.json`）。新しくは受け付けない
- **書いた人・著書**は `blog/src/data/site.ts`。公式サイト（`www/src/pages/index.astro`）と同じ事実なので、**片方を直したらもう片方も直す**
- 旧ブログから**引き継がなかったもの**：Community（Stoked capital）と講演実績一例（公式サイトで載せないと決めたものに合わせた）、
  コメントの投稿フォーム、`/?tags=…&p=…` の絞り込み（いまは `/tags/<名前>` と `/archives`）
- ブログの記事の頁では、輪が頭の見出し（タグの英語の名前）から読み終わりの「Next round」（関連記事）まで左端の線を降りる。
  公式のキャッチ「Mentor to the next round.」に合わせて、関連記事の見出しを「Next round」にしてある
- sitemap・RSS（`/feed.xml`）・`/llms.txt` は `posts/` の実体から作る。手で書かない
- ブログ共通の OGカード：`cd blog && node tools/og.cjs`

## SEO / AIO の決まりごと（オーナー 2026-11-25「バリバリ効かせて」）

- title は30全角以内、description は90〜125全角。**頁に見えている事実だけで書く**
- 構造化データは `index.astro` の `jsonld`（WebSite・Organization・Person・Book×2・WebPage）。**本文に無い事実を書かない。**
  Review・Event・SoftwareApplication・FAQPage は使わない（必須項目を満たせない／本文に無い問いを作ることになる）
- 大きな見出しの h2 は「会社概要 Company」のように日本語の名前を中に持つ（並びは CSS でほどいている）
- `/llms.txt` は `src/pages/llms.txt.ts` が作る。手で書かない。経歴や会社概要を直したら、ここも同じ事実になっているか見る
- `/record`（活動の記録）は Event を使わず、CollectionPage とパンくずだけ（Event は場所などの必須項目を満たせない）
- 頁を足したら `public/sitemap.xml` と `llms.txt.ts` の「頁」に足す
- `sitemap.xml` に lastmod は書いていない（手で書くと直すたびに嘘になるため）
- 一番効くのはブログ165本。記事ごとに BlogPosting とパンくず、canonical（`blog.tsam.co.jp/archives/<番号>`）を入れてある。
  記事の title は題そのまま（30全角を超えるものもあるが、題は変えない）。description は本文の書き出しから 120 字まで（`blog/src/lib/posts.ts`）

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
