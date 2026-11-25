# tsam

株式会社tsam の公式サイト（https://tsam.co.jp/）。静的サイト。

- `www/` — tsam.co.jp。Astro で組んで、`www/dist/` を Firebase Hosting に置く
- `docs/dns-cutover.md` — 旧サイト（さくらVPS の WordPress）から切り替えるときの DNS の手順書（案）
- 作業の決まりごとは `CLAUDE.md`

```bash
cd www
npm install
npm run dev      # http://localhost:4321/
npm run build    # www/dist/ に書き出す
```
