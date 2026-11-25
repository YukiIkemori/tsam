# tsam

株式会社tsam の公式サイト（https://tsam.co.jp/）とブログ（https://blog.tsam.co.jp/）。どちらも静的サイト。

- `www/` — tsam.co.jp。Astro で組んで、`www/dist/` を Firebase Hosting に置く
- `blog/` — blog.tsam.co.jp。Astro。記事は `blog/posts/<番号>.html`（旧ブログから移した165本）か `.md`（これから書く記事）。`blog/dist/` を Firebase Hosting に置く
- `docs/dns-cutover.md` — 旧サイト（さくらVPS の WordPress）から切り替えるときの DNS の手順書（案）
- 作業の決まりごとは `CLAUDE.md`

```bash
cd www
npm install
npm run dev      # http://localhost:4321/
npm run build    # www/dist/ に書き出す
```

```bash
cd blog          # 先に www/ で npm install を済ませておく（意匠の部品を www から読むため）
npm install
npm run dev      # http://localhost:4321/
npm run build    # blog/dist/ に書き出す
```
