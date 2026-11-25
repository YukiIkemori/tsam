# DNS 切り替えの手順書（案）

**まだ何も実行していない。実行の前に、必ずオーナー（ユウキさん）の確認を取る。**
DNS を触るのはオーナーか Dots。さくらのサーバーにはログインしない前提で書いてある。
オーナーの一番の心配は「さくらのメールに色んなアドレスを紐づけている。壊れたら参る」（2026-11-25）。
だから順番は **メールを先に安全な場所へ逃がす → 確かめる → それからサイト** で、逆にしない。

## いまの状態（2026-11-25、dns.google で確認）

| 名前 | 種類 | 値 |
|---|---|---|
| tsam.co.jp | NS | 01〜04.dnsv.jp（お名前.com） |
| tsam.co.jp | A | 160.16.226.77（さくらVPS。nginx） |
| tsam.co.jp | MX | `10 tsam.co.jp.` |
| tsam.co.jp | TXT | `v=spf1 ip4:160.16.226.77 -all` |
| tsam.co.jp | TXT | google-site-verification=…（Search Console） |
| tsam.co.jp | TXT | openai-domain-verification=… |
| blog.tsam.co.jp | CNAME | tsam.co.jp |
| 101.tsam.co.jp | CNAME | tsam.co.jp |
| investors.tsam.co.jp | CNAME | tsam.co.jp（「Startup Investors Community」の頁が出ている。2026-11-26 に証明書の公開記録から見つけた） |
| test.tsam.co.jp | CNAME | tsam.co.jp（公式サイトの写し） |
| wp.tsam.co.jp | CNAME | tsam.co.jp（題が「未使用 (実験場)」の WordPress。noindex） |
| www / mail / _dmarc.tsam.co.jp | — | 無い |
| tsam.jp（別のドメイン） | A / MX | 160.16.226.77 / `10 tsam.jp.`（同じさくらVPS。Gmail の送信はこの名前で繋いでいる） |

外から見えるのはここまで。**DKIM のセレクタや、ほかのサブドメインは外からは列挙できない。**
手順 0 でお名前.com の画面から全部を控えるのはそのため。

### ここから分かること

- **MX が tsam.co.jp そのものを指している。**サイトの A を新しい置き場所へ変えると、メールも一緒にそちらへ行って届かなくなる。
  先に `mail.tsam.co.jp` を作って MX を付け替える必要がある
- blog と 101 は本体への相乗り（CNAME）。本体の A を変えると一緒に動く
- **いまのブログは、記事を `tsam.co.jp/wp-json/…` から読んでいる**（2026-11-25、ブラウザの通信で確認）。
  つまり blog.tsam.co.jp だけさくらに残しても、本体の A を変えた時点でブログは記事を読めなくなる。
  **本体の切り替えは、ブログの静的化が終わってから、二つ同時に**
  （静的なブログは 2026-11-26 に `blog/` にできた。165本とも移してある。まだ Firebase には出していない）
- メールの流れ（コーディネーターが Gmail のヘッダで確認）：tsam.co.jp 宛て → さくらVPS で受ける → Gmail へ転送。
  POP で取りに行く形ではないので、受信は MX さえ正しければサイトの切り替えの影響を受けない
- Startup 101（101.tsam.co.jp）は残さない（オーナー 2026-11-25）
- **Gmail の送信設定（2026-11-26、Dots が画面で確認）**：一つ目の Gmail には ikemori@tsam.co.jp が登録されていて、
  SMTP サーバーは **`tsam.jp`・465番・SSL**。`tsam.co.jp` ではない。だから tsam.co.jp の A を変えても、この Gmail からの送信は止まらない。
  **もう一つの Gmail は未確認**（手順 4）
- **investors・test・wp も本体への相乗り**（CNAME）。本体の A を変えると一緒に Firebase を向き、「頁がありません」になる。
  investors は `tsam.co.jp/tsam-data/investors.js` も読んでいるので、名前だけさくらに向け直しても中身が出ない。
  **investors は消す**（オーナー 2026-11-26。Startup 101 と同じ扱い）。test と wp も消す（オーナー同日「消していいや」）
- **証明書（2026-11-26、公開の発行記録 crt.sh で確認。サーバーに繋いで見たものではない）**：さくらVPS には Let's Encrypt の証明書が二枚ある。
  一枚は `tsam.jp` だけのもの、もう一枚は `tsam.co.jp`・blog・101・investors・test・wp の六つをまとめたもの。
  - メールの送信が使うのは `tsam.jp` のほうのはずなので、サイトを移しても更新は止まらない（SMTP が実際にどちらを出しているかは未確認）
  - 六つまとめたほうは、tsam.co.jp と blog が Firebase へ移ると更新が通らなくなる（六つとも確かめられないと出ない）。
    六つとも Firebase へ移すか消すかなので（investors も消すと決まった）、この証明書は切り替えのあとは要らなくなる
  - **二枚とも期限が 2026-11-30 03:05（日本時間）で、新しいものの発行がまだ記録に出ていない。**ふだんは期限の30日ほど前に更新されている。
    今年の6月には、期限が切れて4時間後に発行された回がある。記録の反映が遅れているだけかもしれないが、
    更新されなければ 11-30 の未明から、いまのサイトが警告つきになり、**Gmail からの送信（tsam.jp:465）も止まりうる。**
    切り替えとは関係なく起きることなので、Dots とオーナーに知らせた（2026-11-26）

## 手順

### 0. 控える
お名前.com の DNS 設定画面で、tsam.co.jp の全レコードを控える（画面の写しでよい）。上の表に無いものがあれば、この文書に足す。

### 1. メール用の名前を作る（見た目は何も変わらない）
`mail.tsam.co.jp`　A　`160.16.226.77`　を足す。数分待って引けることを確かめる。

### 2. MX を付け替える
`10 tsam.co.jp.` → `10 mail.tsam.co.jp.`
行き先のサーバーは同じなので、この時点でメールの届き方は変わらない。
SPF（`ip4:160.16.226.77`）は IP で書いてあるので、そのままでよい。

### 3. メールを確かめる（ここを通るまで先へ進まない）
古い値が消えるまで待つ（いまの TTL は 3600 秒。念のため 2 時間）。そのうえで、
- 外のアドレスから、よく使う tsam.co.jp のアドレス数本へ送り、Gmail に届くこと
- tsam.co.jp のアドレスを差出人にして送り、相手に届くこと（迷惑メールに入らないこと）

### 4. 送信側の設定を確かめる【一つ目の Gmail は確認済み。もう一つが未確認】
一つ目の Gmail は SMTP が `tsam.jp`（465・SSL）なので、**書き換えは要らない。**tsam.co.jp の A を変えても送信は続く。
`mail.tsam.co.jp` は受信（MX）のためだけに作る名前で、送信の設定には使わない。

残り：
- **もう一つの Gmail の「他のアドレスから送信」を見る。**SMTP サーバーが `tsam.co.jp` になっていたら、切り替えの前に `tsam.jp` へ書き換える
  （一つ目と同じ名前にそろえる。`mail.tsam.co.jp` にすると、証明書の名前が合わずに断られる）
- Gmail のほかに tsam.co.jp のアドレスで送っている道具（スマホのメールアプリなど）があれば、同じところを見る
- SPF（`v=spf1 ip4:160.16.226.77 -all`）は、さくらVPS の IP を直に書いたもの。メールはこれからも同じ IP から出るので**変えない。**
  新しいサイト（Firebase）はメールを送らない。お問い合わせフォームの通知は Google のアカウントから Gmail のアドレスで出るので、tsam.co.jp の SPF には関わらない

### 5. サイトを切り替える（メールが確かめられたあとにだけ）
前提：新しい公式（このリポジトリの `www/`）と、静的化したブログの両方が、Firebase Hosting で本番と同じ中身を返していること。
1. Firebase Hosting に `tsam.co.jp`（サイト `tsam-co-jp`）と `blog.tsam.co.jp`（サイト `tsam-blog`）をカスタムドメインとして足す。Firebase が示す TXT（所有確認）を足す
2. Firebase が示す値に、`tsam.co.jp` の A と `blog.tsam.co.jp` を書き換える（値はそのとき Firebase の画面に出るものを使う。ここに書かない）
3. `101.tsam.co.jp` `investors.tsam.co.jp` `test.tsam.co.jp` `wp.tsam.co.jp` のレコードを消す（四つともオーナー了承済み）。
   101 を消すと、活動の記録の 2023-05-27「Startup 101 を開催」のリンク（`https://101.tsam.co.jp/`）が行き先を失う。
   同じ日に `www/src/data/activities.json` のその一件からリンクだけ外す（文字は残す）
4. 既存の TXT（SPF・Search Console・OpenAI）は消さない
5. 証明書が出るまで待ち、`https://tsam.co.jp/` `https://blog.tsam.co.jp/archives/<番号>` が開くことを確かめる
6. もう一度、手順 3 の送受信テストをやる
7. `https://tsam.co.jp/startup/mvp` が開くのを確かめてから、off-notes.com 側に教科書の 301 を入れる（`docs/startup-move.md`。**順番を逆にしない**）

### 戻し方
サイトがおかしければ、`tsam.co.jp` の A を `160.16.226.77` に、`blog.tsam.co.jp` を元の CNAME に戻す。さくらのサーバーは止めないので、戻せば元のサイトが出る。
`mail.tsam.co.jp` と MX はそのままでよい（どちらを向いていてもさくらに届く）。

## さくらのサーバーについて
メール用に残す（オーナー 2026-11-25）。WordPress はサイトの切り替え後は使われなくなるが、**消すのは切り替えが落ち着いてから、別に確認を取って。**
