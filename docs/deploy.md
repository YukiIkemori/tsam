# デプロイ（GitHub Actions から Firebase Hosting へ）

**2026-11-27 から、main に入れたものを GitHub から出せる。**ワークフローは `.github/workflows/deploy-tsam.yml`。
それまでは Dots の手元の認証でしか出せなかった（オーナー 2026-11-27「このサイト、君自身で更新できるように設定して」）。

## 出し方

1. 作業の枝で直す → build と `tools/verify.cjs` → プルリクエストで main に入れる
2. ワークフロー `deploy-tsam.yml` を **ref＝main** で流す（Actions の画面の「Run workflow」か、API の workflow_dispatch）。入力は二つ
   - `target`：`preview`（3日で消える見本の URL に出す。本番には何も起きない）／`live`（本番）
   - `site`：`www`（公式）／`blog`（ブログ）／`both`
3. 中身を変えたときは、まず `preview` で流し、ログの最後に出る見本の URL（`https://tsam-co-jp--ci-preview-….web.app`）を
   `URL=<見本の URL> node tools/verify.cjs` で見る。よければ `live`
4. `live` のあと、本番で `URL=https://tsam.co.jp node tools/verify.cjs`（ブログは `URL=https://blog.tsam.co.jp`）

- 一回 40〜50 秒
- **www の部品（`www/src`）を直したらブログも変わる**ので、`both` で出す
- **いまは手で流すときだけ走る。**main に入れただけでは出ない
- 作業の枝（`claude/…`）を ref にして流しても、job は走らない（ワークフローの `if`。Google の側でも断られる）

## Google への名乗り方（鍵を置かない）

off-notes は `firebase login:ci` の長く生きるトークン（Secrets の `FIREBASE_TOKEN`）を使っているが、tsam は鍵を置かない形にした。
GitHub がその場で出す短い証明を Google が確かめ、デプロイ用のサービスアカウントとして動く（Workload Identity Federation）。
Google の側は Dots が 2026-11-27 に作った（プロジェクト `my-retro-bbs`）。

- サービスアカウント：`tsam-github-deploy@my-retro-bbs.iam.gserviceaccount.com`。役割は **Firebase Hosting 管理者だけ**。JSON の鍵は作っていない
- プロバイダ：`projects/1031066255762/locations/global/workloadIdentityPools/tsam-github/providers/github-tsam-main`
- 通る条件：このリポジトリ（ID 1472125952、持ち主の ID 313269116）の、**main の `.github/workflows/deploy-tsam.yml`** から、workflow_dispatch か push で来たものだけ
- 二つの値は秘密ではないので、ワークフローの `env` に直に書いてある（GitHub の Variables は使っていない）

**決まりごと**

- **ワークフローのファイルの名前を変えない。**Google の側が名前で絞っているので、変えると断られる
- **`--only hosting:tsam-co-jp` / `hosting:tsam-blog` を外さない。**Hosting 管理者の役割はプロジェクト単位で、同じプロジェクトの off-notes のサイトにも届く。
  出す先を絞っているのは、この引数だけ（Dots はこの点から tsam 専用のプロジェクトを勧めた。オーナーは 2026-11-27 に「今の Firebase のまま」を選んだ）
- firebase-tools は版を決めてある（`env` の `FIREBASE_TOOLS`）。上げるときは `preview` で一度確かめる
- ログに出る「Unable to add channel domain to Firebase Auth」は、役割が Hosting だけなので出る。配信には関係ない

## 経過

- 2026-11-26：サイト `tsam-co-jp`・`tsam-blog` を Dots が作り、Dots の手元から 69f17dc を出した。同じ夜に独自ドメインを切り替えた（`docs/dns-cutover.md`）
- 2026-11-27 05:12：News 一件（11/24）を、Dots が「69f17dc＋その一行」で出した
- 2026-11-27 05:20〜：main を作った（af25a73。配信に関わる中身は、公開中のものと同じ）。Dots が Google 側を作り、値を main に入れた（007bab3）
- 05:27：`preview` / `www`（run 1）。見本の 11 個のファイルが本番とバイト単位で同じ、44 頁の検査は問題 0
- 05:29：`live` / `www`（run 2）。本番 44 頁の検査は問題 0。ブログと off-notes は流していない

## まだのこと

- **ブログを GitHub から出すのは未検証。**中身を変える用事ができたら、`preview` / `blog` で本番と同じに出ることを確かめてから `live`
- **main への push で自動で出す形**にはしていない（Google の側は push も通す）。入れるなら別の差分で、Dots に知らせてから
- **既定の枝がまだ作業の枝**（`claude/project-thread-jhecwd`）。GitHub の Settings → Branches で main に変えるのはオーナー。
  workflow_dispatch は「既定の枝にも同じ名前のワークフローがあること」が条件なので、**既定の枝を変えるまでは、作業の枝からこのファイルを消さない**
- main の保護（直接の push を止める等）は未設定
- `firebase.json` の「合言葉の道」の 302 は入れていない（さくらの証明書の件。`docs/dns-cutover.md`）。入れるなら別の差分で
