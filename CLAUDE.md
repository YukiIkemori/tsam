# tsam — 作業メモ（Claude Code向け）

株式会社tsam の公式サイト。2026-11 に、さくらVPS の WordPress＋JSアプリから静的サイトへ作り直した。
**2026-11-26 に本番を切り替えた**（tsam.co.jp と blog.tsam.co.jp は Firebase Hosting。メールはさくらのまま）。経過と残りの作業、戻し方は `docs/dns-cutover.md`。

## つくり

- `www/` が tsam.co.jp。Astro。`npm run build` で `www/dist/` に出る
- 置き場所は Firebase Hosting（off-notes と同じプロジェクト `my-retro-bbs` に tsam 用のサイトを作る。オーナー了承 2026-11-25）。
  サイトは `tsam-co-jp`（公式）と `tsam-blog`（ブログ）。**main に入れて、ワークフロー `deploy-tsam.yml` を手で流すと出る**（2026-11-27 から。まず見本、次に本番）。
  出し方と決まりごとは `docs/deploy.md`。ワークフローの名前と `--only` は変えない
- `blog/` が blog.tsam.co.jp。Astro。`npm run build` で `blog/dist/` に出る。旧ブログ（WordPress）の165本を 2026-11-26 に全部移した。
  URL は `blog.tsam.co.jp/archives/<番号>` の形を変えない（オーナー決定）。2026-11-26 に本番を切り替えた。
  Firebase のサイトは公式とは別（`firebase.json` の `tsam-blog`）
- `www/startup/` が教科書「スタートアップのはじめ方」の原稿（40頁）。tsam.co.jp/startup に出る。2026-11-26 に off-notes.com/startup/ から引っ越した。
  off-notes 側の 301 も同じ日に入れた（`docs/startup-move.md`）。下の「教科書」を読むこと
- ブログは意匠の部品（輪の o・ロゴ・`global.css`・`ring.js`・書いた人の節）を `www/src` からそのまま読む（`@www/…`）。
  **www の部品を直すとブログも変わる。**直したら両方を見る。ブログだけの部品は `blog/src/styles/blog.css`

## 検証

```bash
cd www && npm install && npm run build && npx astro preview   # http://localhost:4321/
```

公式は、上の preview を立てたまま `node tools/verify.cjs`（全44頁を 390px と 1440px で開いて、横スクロール・画像切れ・リンク切れ・
見出しの段飛ばし・小さい字・小さい押し場所・SNS 用の画像の有無を数える。10秒ほど）。
ブログは `cd blog && npm install && npm run build && npx astro preview --port 4322` のあと `node tools/verify.cjs`（全175頁。30秒ほど）。
**www の部品を直したら両方流す。**

`firebase.json` の URL の動き（`/startup`・`/startup/<slug>`・`/archives/<番号>`・末尾スラッシュ・301）は、
2026-11-26 に Firebase の模擬環境（`firebase emulators:start --only hosting --project demo-tsam`）で確かめ、切り替えのあと本番でも確かめた。

確認はスマホ幅（390px）から。320 / 360 / 390 / 414 / 768 / 1024 / 1280 / 1440 / 1920px で横スクロールが無いこと。
文字は 11.5px 以上、押すものは 44px 以上。

## 意匠の決まりごと

オーナーの好み（2026-11-25）：「超イケてる尖った感じ」。地は白か薄いグレー。差し色はくぐもったコーラルピンクか、濃いグレー。

- **装置は一つ。見出しの「o」が輪になっている。**キャッチ「Mentor to the next round.」の round ＝輪。
  Company / Background / Contact / Blog にも o があるので、コーラルの輪が一つだけ、読んでいる見出しの o に座り、
  スクロールすると左端の細い線を伝って次の見出しの o へ渡る（`src/components/O.astro`、`src/scripts/ring.js`）
- 大きな欧文の見出しはふだん極細（200）。o が座った一語だけが極太（800）に膨らみ、膨らみきったときに枠の左右に届く
  （画面の中で太いのは、いつも一語だけ）。太さはスクロールの位置だけで決まり、時間では動かさない（行きと帰りで同じ見え方）。
  動きを減らす設定のときと JS が動かないときは、全部の見出しが太く、o は全部コーラルのまま止まる
- **大きな見出しを足すときは、o のある英単語にする。**輪の席が要るので。o は `<O />`、語には `class="display fit"`・
  `style={fitStyle('語')}`（`src/lib/fit.ts`）・`data-swell` を付ける。枠になる親に `container-type: inline-size` が要る
- o の位置と大きさは Jost の o の実測値（`ring.js` の `CX`・`CY`・`INK`）、語の幅は 800 の送り幅の表（`fit.ts`）。**大きな欧文の書体を替えたら測り直す**
- コーラル `#d98577` は、明るい地の上では文字に使わない（コントラスト 2.6）。輪・線・灯りと、暗い地の上だけ
- 節の札は「Round 01 / 02 / 03」、最後のブログへの扉が「Next round」。キャッチは「Mentor to the next round.」で確定
- 天のメニューの「Textbook」は 640px 未満では出さない（五つ並ぶと 320px で溢れる）。狭い画面の入口は、経歴の節の「Textbook」と地のリンク

## 文章の決まりごと

- 本文は旧サイトの文章のまま。**勝手に書き足さない。事実（経歴・日付・社名）は旧サイトにあるものだけ**
- 直したのは一か所：「夢を叶えられたなと」→「夢を叶えられたらなと」（脱字と見て直した。オーナーに報告済み）
- 載せないと決めたもの（オーナー 2026-11-25）：Portfolio（投資先・所属プログラム・講演実績）、Services（Startup 101・Stoked capital）、
  Consulting、特定商取引法の表示、料金表、決済。Startup 101（101.tsam.co.jp）は残さない

## 更新のしかた

- **活動の記録**：`www/src/data/activities.json`。旧サイトの News 180件（2019〜）を全部持っている。
  **選別はしない**（オーナー 2026-11-26「全部データ使おう。選別のほうがだるい」）。新しい活動は配列の頭に一件足すだけ。
  書き方はこれまでの行に合わせる（「〜にて講演」「〜にてオンライン講演」「〜にてプログラムを審査」）。足したら main に入れて出す（`docs/deploy.md`）。
  トップの「最近の活動」には新しい順に8件（`site.ts` の `recentCount`）、`/record` には全件が年ごとに出る。
  本文の `[文字](URL)` はリンクになる
- **経歴・著書**：`www/src/data/person.ts`。公式の表紙・llms.txt・教科書・ブログが、ここ一か所を読む
- **会社概要**：`www/src/pages/index.astro` の中
- **決まった値**（メール、ブログのURL、アナリティクスのID、フォームの送信先）：`www/src/data/site.ts`
- **OGカードとアイコン**：`cd www && node tools/og.cjs`（Playwright が要る）。キャッチやロゴを変えたときだけ
- **見本（本番に出す前に動きごと見てもらう1ファイルの写し）**：`cd www && npm run build && python3 tools/preview.py <出力先のフォルダ>`

## 教科書（tsam.co.jp/startup）

オーナーの講座テキストを「検索される問い一つにつき一頁」に組み直したもの。**検索と AI の要約から読まれること**が一番の目的（オーナー 2026-11-14）。
目次（`/startup`）＋38頁（`/startup/<slug>`）＋用語集（`/startup/glossary`）。

- **原稿は `www/startup/pages/NN-slug.md`**。書式は `www/src/lib/startup.ts` の頭。文体は「である」調で、**答えを冒頭に置く**（`lead`）
- **原稿に無い事実・数字を足さない。第三者のサービス名・会社名は出さない**（「家事代行のマッチングサービス」のように一般化。架空の事例「セラート」だけは教科書のまま）
- **slug は変えない**（検索に載っている。off-notes からの 301 も slug で対になっている）
- **直したら頭の欄の `mod:` を今日にする**（sitemap の lastmod と構造化データの dateModified がここから出る。無い頁は引っ越し前の最終更新日 2026-11-20）
- build が止めるもの：title 30全角超、description 90〜125全角の外、行き先の無い内部リンク、ほかの頁の本文・関連から線が来ていない頁
- **頁を足すとき**：`pages/NN-slug.md` を足し、近い頁の `related` と本文から線を張り、用語があれば `glossary.md` に足す。
  目次の title の「全40頁」を直す。`cd www && node tools/og-startup.cjs` で SNS 用の画像を作る（流し忘れると `tools/verify.cjs` が出す）
- 意匠：区分は八つで、札は「Round 01〜08」。頁の頭に区分の語（Intro・Money・Concept・Proof・Model・Growth・Story・Beyond。`startup.ts` の `rounds`）が大きく出て、
  その o に輪が座る。右肩の八つの灯りが、いま何ラウンド目か。読み終わりは「Next round」（次の頁）。**全頁同じ顔**（教科書なので変えない）。部品は `www/src/styles/startup.css`
- 構造化データは Article・BreadcrumbList と、**頁に見えている「よくある質問」をそのまま写した FAQPage**（原稿の `?? 問い`）。用語集は DefinedTermSet。
  公式の表紙で FAQPage を使わないのは「本文に無い問いを作ることになる」からで、ここは本文にある問いなので使っている
- **旧ブログとの関係**（オーナー了承 2026-11-26）：旧ブログの3本（3676 バイアウト・3638 Why you・4960 ディスラプト）は検索の主役なので、教科書はその語を狙わず、
  37・36・22 からリンクで渡している。**37 の kw に「バイアウト 意味」を戻さない。**ほかの重複は教科書が主役で、旧ブログの33本の終わりに教科書への線が一本出る
  （`blog/posts/<番号>.html` の頭の欄 `textbook: <slug>`。本文には触れていない）。教科書と旧ブログのあいだに 301 は張らない
- 引っ越しのときに原稿を変えたところと、off-notes 側の 301 の手順は `docs/startup-move.md`

## ブログの更新のしかた

- **記事を足す**：`blog/posts/<番号>.md` を一つ足す。番号はいちばん大きい番号の次（いま最大は 5641）。番号がそのまま URL になる。
  頭の欄は `title`・`date`（`2026-12-01T09:00:00+09:00` の形）・`tags`（`[columns]` のように一つ）。本文は Markdown。
  画像は `blog/public/images/<番号>/` に置いて `![説明](/images/<番号>/01.webp)`。
  任意の欄：`modified`（直した日）、`description`（検索結果の説明文。**60〜125字で、本文の要点を本文にある事実だけで書く**。外れると build が止まる。全205本は 2026-11-27 に手で書いた。無ければ書き出しから自動）、`image`（SNS 用の画像）、
  `related`（関連記事の番号。頭の2本まで使い、残りは本文の近い記事で自動に埋まる。どこからも関連記事の線が来ない記事が出ないように、自動で入れ替えもする。`src/lib/posts.ts`）、`author: org`（寄稿。書き手を代表本人にしない）、
  `textbook`（同じ主題の教科書の頁の slug。記事の終わりに、その頁への線が一本出る）
- **旧ブログから移した記事**（`blog/posts/<番号>.html`）は本文が HTML のまま。**文章には触れていない。**
  移すときに変えたことは `blog/tools/import_wp.py` の頭に書いてある（画像の置き直し、記事どうしのリンク、見出しを h2 始まりに、など）。
  このスクリプトは一度きりの道具で、もう流さない
- **記事を直したら `modified` を直す**（sitemap の lastmod と構造化データの dateModified がここから出る）
- **タグ**は `blog/src/data/site.ts` の `tags`。`en` は頁の大きな見出しで、o のある語にする（「|」の位置の o が輪になる）
- **書いた人・著書**は公式サイトと同じ一か所（`www/src/data/person.ts`）を読む。直すのは向こう
- 旧ブログから**引き継がなかったもの**：コメント（26件あった。オーナー 2026-11-26「コメントは消して」。投稿フォームも無い）、
  Featured articles（完全食COMPの記事をトップで特別に見せる枠。オーナー同日「特別扱いはしなくてよい」。記事そのものは残っている）、
  Community（Stoked capital）と講演実績一例（公式サイトで載せないと決めたものに合わせた）、
  `/?tags=…&p=…` の絞り込み（いまは `/tags/<名前>` と `/archives`）。**コメントと Featured の枠は戻さない**
- ブログの記事の頁では、輪が頭の見出し（タグの英語の名前）から読み終わりの「Next round」（関連記事）まで左端の線を降りる。
  公式のキャッチ「Mentor to the next round.」に合わせて、関連記事の見出しを「Next round」にしてある
- sitemap（記事の図も image:image で載る）・RSS（`/feed.xml`。本文つき）・`/llms.txt`（各記事の要約つき）・`/llms-full.txt`（全記事の本文）は `posts/` の実体から作る。手で書かない
- 記事の構造化データ（`archives/[id].astro`）は BlogPosting・WebPage・BreadcrumbList。字数（wordCount）・読む時間・目次（hasPart）・書いた人の経歴と SNS（sameAs）・関連記事（relatedLink）を入れてある。記事の終わりに時系列の前後の記事への線がある
- ブログ共通の OGカード：`cd blog && node tools/og.cjs`

## SEO / AIO の決まりごと（オーナー 2026-11-25「バリバリ効かせて」）

- title は30全角以内、description は90〜125全角。**頁に見えている事実だけで書く**
- 構造化データは `index.astro` の `jsonld`（WebSite・Organization・Person・Book×2・WebPage）。**本文に無い事実を書かない。**
  Review・Event・SoftwareApplication・FAQPage は使わない（必須項目を満たせない／本文に無い問いを作ることになる）
- 大きな見出しの h2 は「会社概要 Company」のように日本語の名前を中に持つ（並びは CSS でほどいている）
- `/llms.txt` は `src/pages/llms.txt.ts` が作る。手で書かない。経歴や会社概要を直したら、ここも同じ事実になっているか見る
- `/record`（活動の記録）は Event を使わず、CollectionPage とパンくずだけ（Event は場所などの必須項目を満たせない）
- 頁を足したら `src/pages/sitemap.xml.ts` の `fixed` と `llms.txt.ts` の「頁」に足す（教科書の頁は原稿から自動で入る）
- `sitemap.xml` の lastmod は教科書の頁だけ（原稿の `mod`）。ほかの頁には書いていない（手で書くと直すたびに嘘になるため）
- 一番効くのはブログ165本。記事ごとに BlogPosting とパンくず、canonical（`blog.tsam.co.jp/archives/<番号>`）を入れてある。
  記事の title は題そのまま（30全角を超えるものもあるが、題は変えない）。description は本文の書き出しから 120 字まで（`blog/src/lib/posts.ts`）

## お問い合わせフォーム

届け先は ikemori@tsam.co.jp（オーナー 2026-11-25）。**送信の仕組みは書いてあるが、まだ設置していない（未検証）。**
受け口は Google Apps Script のウェブアプリ（`forms/contact.gs`。設置の手順は `docs/contact-form.md`。オーナーの Google アカウントで作る）。
`site.ts` の `contactEndpoint` が空のあいだは、送信ボタンで内容を入れたメールアプリが開く（mailto）。
受け口の URL を入れると、そこへ POST してその場で送信する動きに切り替わる（`src/components/ContactForm.astro`）。
受け口は失敗しても 200 を返すので、フォームは返ってきた JSON の `ok` を見ている。
機械よけは Cloudflare Turnstile（Dots の方針 2026-11-26）。フォームは、ブラウザが Cloudflare からもらった確認を添えて送り、受け口がそれを確かめる。
`site.ts` の `contactEndpoint` と `turnstileSiteKey` の**両方**が入っているときだけ、その場で送信する。確認の部品はフォームに触ったときに初めて読む。
受け口には通数の上限（1時間10通・1日40通、鍵つき）と送信枠の残りの確認がある（`contact.gs` の頭）。Turnstile のシークレットキーはスクリプトのプロパティにだけ置く（**リポジトリに書かない**）。
**`contact.gs` を直したら `node forms/contact.test.cjs`**（Google と Cloudflare の部品を真似た箱での確認。本物での確認ではない）。
求める権限は「メールを送る」と「外のサービス（Cloudflare）に問い合わせる」の二つ（`forms/appsscript.json`）。スプレッドシートの控えは外した。権限を増やす直しは、オーナーに断ってから。

## 旧サイトから引き継いだもの

- URL：`/pages/privacy-policy` はそのまま。`/archives/<番号>` と `/blog` はブログへ 301。
  `/pages/transaction` `/pages/consulting-fees` `/payment/**` は表紙へ 301（`firebase.json`）
- 旧サイトのアンカー（`/#section-contact` など）は、新しい見出しへ送る（`src/scripts/reveal.js`）
- Google アナリティクスの測定ID（`site.ts`）
- ロゴの形（`src/components/Logo.astro`）
