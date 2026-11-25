# デプロイの準備（GitHub Actions から Firebase Hosting へ）

**【未検証】まだ一度も走らせていない。**main へ push すると `.github/workflows/deploy.yml` が公式（`tsam-co-jp`）とブログ（`tsam-blog`）を出す、という作りだけがある。

## いまの状態（2026-11-26）

- Firebase プロジェクト `my-retro-bbs` に、サイト `tsam-co-jp` と `tsam-blog` は作成済み（Dots）
- 3日だけの見本（プレビューチャンネル。noindex）を Dots がコミット af9019a から出した。2026-11-29 06:48 ごろ失効
  - 公式 https://tsam-co-jp--dot-review-nov26-80v121yi.web.app/
  - ブログ https://tsam-blog--dot-review-nov26-5piv5nsd.web.app/
- 独自ドメイン（tsam.co.jp・blog.tsam.co.jp）は Firebase に仮に登録しただけ（Dots）。行き先はまだ旧サイト。切り替えの段取りは `docs/dns-cutover.md`
- **当面のデプロイは Dots の手で**（Dots 2026-11-26）：Dots の手元の認証で、出す先を二つのサイトに絞って出す
  （`firebase deploy --only hosting:tsam-co-jp,hosting:tsam-blog --project my-retro-bbs`）。
  下の「鍵を置かない方式」は、**Dots が保留にしている。**理由は、Hosting 管理者の役割がプロジェクト単位で、同じプロジェクトの off-notes のサイトにも届くこと。
  サイト単位に絞る方法が確かめられるまでは設定しない。だから下のワークフローは、いまは動かない
- **このリポジトリにはまだ main が無い**（作業ブランチが唯一の枝）。ワークフローは main への push で走る作りなので、main を作るまでは何も起きない

## Google への名乗り方

off-notes は `firebase login:ci` の長く生きるトークン（Secrets の `FIREBASE_TOKEN`）を使っているが、Firebase はこの方式を勧めなくなっている。
tsam は鍵を置かない形にした：GitHub がその場で出す短い証明を Google が確かめ、デプロイ用のサービスアカウントとして動く（Workload Identity Federation）。

### Google Cloud 側でやること（プロジェクト my-retro-bbs。まだ）

1. サービスアカウントを一つ作る。例 `tsam-deploy@my-retro-bbs.iam.gserviceaccount.com`
2. 役割は **Firebase Hosting 管理者（roles/firebasehosting.admin）だけ**。オーナーや編集者は付けない。
   この役割はプロジェクト単位なので、同じプロジェクトの off-notes のサイトにも届く。出す先はワークフローの `--only hosting:tsam-co-jp,hosting:tsam-blog` で絞っている。
   これだけで足りるかは未検証（足りなければ、エラーに出た役割を一つずつ足す）
3. Workload Identity のプールとプロバイダを作る。発行元は `https://token.actions.githubusercontent.com`。
   **条件を付ける**：このリポジトリの main からだけ通す（`assertion.repository == '<所有者>/tsam' && assertion.ref == 'refs/heads/main'`。
   所有者の名前は GitHub に出ているとおりの大文字・小文字で）
4. そのプロバイダ経由の主体に、1 のサービスアカウントの「Workload Identity ユーザー（roles/iam.workloadIdentityUser）」を付ける
5. GitHub の Settings → Secrets and variables → Actions → **Variables** に二つ入れる（どちらも秘密の値ではない）
   - `GCP_WIF_PROVIDER`：`projects/<番号>/locations/global/workloadIdentityPools/<プール>/providers/<プロバイダ>`
   - `GCP_DEPLOY_SA`：1 のサービスアカウントのメールアドレス

### 確かめ方

Actions の画面から `workflow_dispatch` で一度流す。**独自ドメインを付ける前なら、出る先は `*.web.app` だけ**で、本番（旧サイト）には何も起きない。
ただし `*.web.app` は誰でも見られて検索にも載りうるので、独自ドメインを付けるまでは main に出さないか、出すなら切り替えの直前にする。

## 本番に出すまで

1. 作業ブランチ `claude/project-thread-jhecwd` を main に入れる（プルリクエスト）
2. 上の準備をして、一度流す
3. `docs/dns-cutover.md` の順で DNS を切り替える（メールが先。**必ずオーナーの確認のあと**）
4. 教科書の 301 を off-notes 側に入れる（`docs/startup-move.md`。順番を逆にしない）
