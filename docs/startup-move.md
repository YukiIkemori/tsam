# 教科書（スタートアップのはじめ方）の引っ越し

off-notes.com/startup/ にあった教科書40頁（目次＋38頁＋用語集）を、tsam.co.jp/startup へ移す（オーナー指示 2026-11-26）。
**tsam 側は組み終わっている（未デプロイ）。off-notes 側はまだ何も変えていない。**この文書は、切り替えの日にやることの手順。

## いまの状態

- 原稿は `www/startup/`（`pages/*.md`・`index.md`・`glossary.md`）。**ここが正。off-notes 側の `_drafts/startup/` はもう直さない**（直すと二つの原稿がずれる）
- 頁の名前（slug）は一字も変えていない。`off-notes.com/startup/<slug>/` → `tsam.co.jp/startup/<slug>`（末尾スラッシュなし）
- 意匠は tsam に合わせて作り直した（CLAUDE.md「教科書」）
- 多言語版は元から無い（off-notes の多言語は記事と表紙だけ）。引っ越しで切り捨てたものは無い
- off-notes から引き継がなかったもの：Microsoft Clarity（tsam には入れていない）。アナリティクスは tsam の測定ID になる

## 引っ越しで原稿を変えたところ（これだけ）

1. 「この棚」→「この教科書」（off-notes の言い方だったので。目次の前書きと、01・23 のよくある質問）
2. 37（IPOとM&A）：狙う語から「バイアウト 意味」を外し、「バイアウトした」の補足から旧ブログ 3676 へ線を張った
3. 36（ピッチのコツ）：Why you の段から旧ブログ 3638 へ線を張った
4. 22（先行優位性）：「上位互換を作れば勝てるわけではない」の節の終わりに、旧ブログ 4960 へ線を張った
5. 頁どうしの線を `/startup/<slug>/` から `/startup/<slug>` に（末尾スラッシュを取った）

2〜4 は、旧ブログと教科書の重複の方針（オーナー了承 2026-11-26）：旧ブログの3本（3676・3638・4960）は検索の主役なので触らず、
教科書からリンクで渡す。ほかの重複は教科書を主役にして、旧ブログの33本の終わりに教科書への線を一本足した
（`blog/posts/<番号>.html` の頭の欄 `textbook:`。本文には触れていない）。**教科書と旧ブログのあいだに 301 は張らない。**

## 切り替えの日にやること

**順番が大事。tsam.co.jp が新サイトに切り替わって、`https://tsam.co.jp/startup/mvp` が開くのを確かめてから、off-notes 側に 301 を入れる。**
先に 301 を入れると、行き先が旧サイト（WordPress）で 404 になり、検索に載っている40頁を落とす。

### 1. tsam 側（docs/dns-cutover.md の「5. サイトを切り替える」のあと）

- `https://tsam.co.jp/startup`、`/startup/mvp`、`/startup/glossary`、`/sitemap.xml` が開くこと
- `https://tsam.co.jp/startup/mvp/`（末尾スラッシュ付き）が `/startup/mvp` へ 301 されること

### 2. off-notes 側（リポジトリ off-notes-yuki-site。main へ push すると本番に出る）

1. `firebase.json` の `redirects` の**頭**に、次の四つを足す（Firebase の模擬環境で、どれも1ホップで着くのを確かめてある。2026-11-26）

   ```json
   { "source": "/startup", "destination": "https://tsam.co.jp/startup", "type": 301 },
   { "source": "/startup/", "destination": "https://tsam.co.jp/startup", "type": 301 },
   { "source": "/startup/:slug", "destination": "https://tsam.co.jp/startup/:slug", "type": 301 },
   { "source": "/startup/:slug/", "destination": "https://tsam.co.jp/startup/:slug", "type": 301 }
   ```

2. 教科書の実体を消す：`_drafts/startup/`、`public/startup/`、`tools-startup-publish.py`、`tools-startup-og.js`
   （リダイレクトは置いてあるファイルより先に効くが、残すと sitemap と llms.txt に載り続ける）
3. `/about/` の「講座のテキストは、この場所に教科書として置いてある」の一行を、`https://tsam.co.jp/startup` への線に直す。
   日本語（`_drafts/about-page.html`）と、英語・繁体字・韓国語（`_drafts/i18n/<lang>/about.html`）の四つ。**文の直し方はオーナーに見てもらう**
4. `python3 tools-publish.py` で書き出し直す（sitemap と llms.txt から教科書が抜ける）→ `node tools-verify.js`
5. off-notes の CLAUDE.md（7章の `/startup/` の段と、6章の「記事ごとの顔」の表）と HANDOVER.md を直す
6. 定期チェックの対象から教科書を外す（`ops/rank/tracked.json` に `/startup/` の語と頁が入っている）

### 3. 検索の側

- Search Console：`off-notes.com` のプロパティで、旧 URL が 301 として読まれていくのを見る。「アドレス変更」は使わない（サイト全体の引っ越しではないので使えない）
- `sc-domain:tsam.co.jp` に `https://tsam.co.jp/sitemap.xml` を送る
- 301 は少なくとも1年は外さない

## 確かめていないこと

- 本番の Firebase での動き（サイトがまだ無い）。URL の動きは模擬環境（firebase emulators）で確かめただけ
- off-notes 側の作業は、この文書を書いただけで、何もしていない
