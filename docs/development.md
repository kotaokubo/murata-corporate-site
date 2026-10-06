# 開発者向けの資料

村田宝飾株式会社のコーポレートサイト（予定：https://www.murata-jewelry.co.jp ）のソースです。
Astro で静的サイトを作り、Cloudflare Pages で公開します。事務の方向けの案内は [README.md](../README.md) にあります。

- 設計書：Notion「コーポレートサイト リニューアル 設計書」（村田宝飾さま 配下）
- AI で作業するときのルール：[AGENTS.md](../AGENTS.md)
- 定型作業の手順書：[procedures/](procedures/)

**このリポジトリは公開（public）です。** 公開日前に漏れて困る情報、顧客名、個人情報、社内資料を入れないでください。

## 手元で動かす

Node.js 22 が要ります。

```sh
npm ci
npx playwright install --with-deps chromium   # 初回と、Playwright を更新したあと（無いと test:e2e がブラウザ無しで失敗する）
npm run dev          # http://localhost:4321 で確認（下書きも表示される）
npm run build        # 型の検査とビルド
npm run test:e2e     # Playwright（本番と同じ出力でテストし、4つの幅で全ページを撮影する）
```

撮影した画像は `test-results/` にできます。

## ブランチと公開の流れ

| ブランチ | 役割 | 公開先 |
| --- | --- | --- |
| `main` | 本番 | www.murata-jewelry.co.jp（切り替えまでは `<プロジェクト名>.pages.dev`） |
| `staging` | 検証 | `staging.<プロジェクト名>.pages.dev`（Cloudflare Access で閲覧を制限中。外す予定。外したあとは、検索には載らない） |
| `work/...` | 作業 | なし |

1. `main` から `work/...` を切る
2. 手元で `npm run build` と `npm run test:e2e` を通す
3. `staging` へ PR → マージ → 検証用 URL で確認
4. 同じ作業ブランチから `main` へ PR → 必須チェックが通り、区分 B を含むなら事務の方が影響するページをすべて確かめる → **事務の方（または大久保）がマージ** → 本番に出る
5. `main` へマージすると、作業ブランチは自動で消える（`.github/workflows/delete-merged-branch.yml`）。`staging` へのマージでは消えない
6. `staging` は毎朝 `main` を自動で取り込む（`.github/workflows/sync-staging.yml`）

急ぎの修正は大久保だけが `hotfix/...` で行う（`staging` を通さずに `main` へ入れられる）。

本番を元の状態に戻す手順は [procedures/rollback.md](procedures/rollback.md)。Cloudflare で戻したあとは、`hotfix/...` で revert か直しを `main` に入れるまで、ほかの変更を `main` に merge しない。

## 必須チェック（`.github/workflows/ci.yml` と `guard.yml`）

| 名前 | 内容 |
| --- | --- |
| `build` | 型の検査（`astro check`）とビルド。お知らせの書式の誤りもここで止まる |
| `playwright` | トップページからサイト内のリンクでたどれるページが開くか、ブラウザのエラー、お問い合わせ欄、メニュー、下書きが本番に出ないか、noindex、エントリーフォームの入力チェック。撮影画像を Checks 画面に保存 |
| `scope` | 変更したファイルを区分 A・B・C に分ける。作成者が `kotaokubo` か、このリポジトリに招待された人（Write 以上）なら区分 C を許可し、それ以外（fork から出した、招待されていない人）が区分 C を変えたら失敗。`guard.yml` で動かすので、PR の中から書き換えて緩めることはできない |
| `staging-verified` | `main` への PR の最新の変更が `staging` に入っているか。入っていなければ失敗（大久保の `hotfix/` は例外） |
| `secrets` | パスワードや API キーらしき文字列（gitleaks） |
| `codex-review` | PR の最新のコミットに Codex のレビュー（または指摘なしの 👍）が付いているか。付くまで最大25分待つ。PR を出したら必ず `@codex review` とコメントしてレビューを依頼する（自動では付かないことがある）。間に合わずに失敗したら、レビューが付いてから再実行する。指摘は「会話の解決」の設定で、すべて解決するまでマージできない |

次の3つも `ci.yml` で動く。
必須チェック（ruleset の Require status checks）に入れるかは大久保が決める。

| 名前 | 内容 |
| --- | --- |
| `images` | PR で追加・変更された画像の形式（jpg / png / webp。拡張子と中身の一致）、ファイルサイズ（3MiB 以下）、長い辺（2400px 以下。推奨は 2000px まで）、お知らせ本文の空の画像説明を調べる。問題があれば失敗する |
| `links` | 本番と同じ条件でビルドした `dist/` を調べ、サイト内のリンク・画像（`srcset` 含む）・CSS・スクリプト・サイトマップの指す先が存在するかを確かめる。無い先があれば失敗する。`#` 付きで移動先の `id` が無いときは警告だけにする |
| `pii` | PR または push の追加行に電話番号やメールアドレスらしき文字列があれば GitHub の警告と Step Summary に出す。会社の掲載用連絡先（`src/lib/site.ts`）は除く。画像や PDF の中の文字は調べない。常に成功する（警告のみ） |

`staging` 向けの PR と `staging` への push では、これら3つのチェック名の末尾にも「 (staging)」が付く（`guard.yml` と同じ理由）。

手元では `npm run check:images`、`npm run check:links`（先に `npm run build`）、`npm run check:pii`（`BASE_SHA` と `HEAD_SHA` が必要）、スクリプトのテストは `npm run test:scripts`。

`staging` 向けの PR でも `guard.yml` は動くが、チェック名の末尾に「 (staging)」が付き、`main` の必須チェックとは別に記録される。チェックの結果はコミットとチェック名の組ごとに1つしか残らないので、同じ名前のままだと、同じブランチから出した `staging` 向けの PR の結果で `main` 向けの PR の結果が上書きされる。

## 前提にしている GitHub と Cloudflare の設定

コードでは設定できないので、大久保が GitHub と Cloudflare の画面で入れている。
設定の手順そのものは、Notion の「環境構築の手順」にある。
設定したあとは、設計書 15章の「ガードレールが効いているかの試験」を行う。

Claude Code では、ファイルを書き換える前に `.claude/settings.json` の PreToolUse フック（`scripts/claude-scope-hook.mjs`）が動く。
区分の判定は必須チェック `scope` と同じ `scripts/scope.mjs` の `classify()` を使う。
区分 C のファイルを変えようとしたときだけ確認を求め、区分 A・B とリポジトリ外はそのまま進める。

このフックには限界がある。
`.claude/settings.json` の deny に当たるファイルは deny が優先され、確認画面は出ずに拒否される。
フックが効くのは deny に無い区分 C のファイルだけである。
また、フックは専用の編集ツールだけを対象にし、Bash などからの書き換えは判定しない。
別のリポジトリのファイルは判定しない。
止める本体は必須チェック `scope` である。

### GitHub（Settings）

- General：Issues、Wikis、Discussions、Projects は無効
- General → Pull Requests：「Allow merge commits」だけを有効にし、「Allow squash merging」と「Allow rebase merging」は無効。squash や rebase でマージすると、作業ブランチのコミットが `staging` に入らず、`staging-verified` が必ず失敗する
- General：「Allow auto-merge」は無効
- General：「Automatically delete head branches」は無効。有効だと `staging` へのマージで作業ブランチが消え、同じブランチから `main` へ PR を出せなくなる。`main` へのマージ後の削除は `delete-merged-branch.yml` が行う
- Actions → General：「Require approval for all external contributors」。外部の人のワークフローは承認制
- Actions の既定の権限：read
- Rules → Rulesets は次の3つ
  - **main-protect**（対象：`main`、bypass：なし）：Restrict deletions、Block force pushes、Require a pull request before merging（承認数 0）、Require status checks to pass（`build`、`playwright`、`scope`、`staging-verified`、`secrets`、`codex-review`）、**Require conversation resolution before merging**（Codex の指摘をすべて解決しないとマージできない）
  - **main-review**（対象：`main`、bypass：Repository admin）：Require a pull request before merging（Require review from Code Owners、Dismiss stale pull request approvals、Require approval of the most recent reviewable push）。**無効にする予定**（大久保の確認待ちで、まだ有効）。理由は、個人のリポジトリには Maintain の権限段階が無く、招待したデザイナーは全員 Write になり、Write は bypass の対象にできないため。有効なままだと、デザイナーの区分 C の PR は大久保の承認待ちで止まる（未実施のあいだは、この状態である）。無効にすると、Code Owners の承認も、最後の push 以外の人の承認も求めなくなる。以下は、有効なあいだ、または ruleset を戻すときの内容である
    - CODEOWNERS で、区分 A（お知らせと画像）と区分 B（`src/pages/`、`src/components/`、`src/layouts/`、`src/styles/`）の持ち主を外している。ただし、その中でも `src/pages/privacy.astro`、`src/pages/recruit/entry.astro`、`src/layouts/BaseLayout.astro` は区分 C として大久保の持ち物に戻している（`scripts/scope.mjs` の `SENSITIVE`）。区分 A・B だけの PR は、必須チェックが通れば事務の方が自分でマージできる。区分 C を含む PR は大久保の承認が要る。無効にしたあとは、CODEOWNERS は効かなくなる（ファイルは、ruleset を戻すときのために残す）
    - 区分 B は承認の代わりに、事務の方が影響するページを検証用の URL で重めに確かめる（AGENTS.md「区分 B のとき」）。全体の動作は必須チェックの Playwright で担保する
    - bypass に大久保（Repository admin）を入れているのは、大久保が自分の PR を承認できないため。bypass は main-review にだけ効き、main-protect の必須チェックは大久保も飛ばせない
    - main-review を無効にしても、main-protect の必須チェック（`build`、`playwright`、`scope`、`staging-verified`、`secrets`、`codex-review`）と会話の解決は、デザイナーにも効いたままである
  - **staging-protect**（対象：`staging`、bypass：なし）：Restrict deletions、Block force pushes
    - `staging` は毎朝の自動取り込みが直接 push するので、PR 必須と必須チェックはかけていない。作業ブランチからは PR で入れる（AGENTS.md）
    - そのため `staging` には、区分 C の変更やチェックが失敗した変更も入りうる。入っても検証環境だけの話で、`main` へは main-protect の必須チェックで止まる
- `staging` ブランチは `main` から作ってある

### Codex（ChatGPT の設定画面）

- Codex に GitHub を接続し、このリポジトリへのアクセスを許可している
- Codex の設定 → Code review で、このリポジトリの自動レビューをオンにしている。ただし自動のレビューは付かないことがあるので、運用では PR ごとに `@codex review` とコメントする（AGENTS.md）
- Codex のアカウント名は `chatgpt-codex-connector[bot]`。指摘があるときは行ごとのコメント付きのレビューを投稿し、指摘がないときは PR に 👍 を付ける（2026-10-04 の試験で確認）。`scripts/check-codex-review.mjs` はこの2つを見て判定する

### Cloudflare Pages

設定済み。本番は https://murata-corporate-site.pages.dev/ で公開している（JST の 2026-10-07 に `main` へ19本を merge）。`www.murata-jewelry.co.jp` はまだ旧サイトで、切り替えていない。設定の内容は次のとおり。

- GitHub 連携でこのリポジトリを接続する
- Build command：`npm run build`、Output：`dist`、環境変数 `NODE_VERSION=22`
- Production branch：`main`
- Preview branches：Custom → 含めるのは `staging` のみ
- プレビューの閲覧の制限（Cloudflare Access）は、外す予定である（大久保が決めた）。2026-10-07 時点では、まだかかっていて、staging の URL は Access のログイン画面へ 302 でリダイレクトされる。Cloudflare の Zero Trust がプラン未選択で設定が読み取り専用のため、大久保がプランを選ぶまで外せない。外すまでは、確認用の URL を開くと Cloudflare Access のログインを求められる
- Access を外したあと、プレビューは Cloudflare が `X-Robots-Tag: noindex` を付ける見込みで、本番以外のビルドは `meta robots noindex` も出すので、検索には載らない。`X-Robots-Tag` は、Access を外したあとに確かめる（未検証）。URL を知っている人は誰でも見られる（URL はリポジトリから推測できる）。下書きのお知らせも staging では表示されるので、公開前に漏れて困る内容は staging にも入れない
- 本番の環境変数に `PUBLIC_GA4_ID`（GA4 の測定 ID）を入れる

## デザイナーを迎えるとき

外部のデザイナーには、区分 C を含めて任せる。作業環境は Codex の Web 版（ChatGPT の Codex 画面）である。

招待した人は全員、区分 C を変えられる。
将来、事務の方を招待すると、事務の方も同じ権限になる。そのとき、事務の方の依頼で区分 C を変えないことは、AGENTS.md の AI への指示だけで守ることになる。
また、区分 C を任せると、必須チェックの定義（`.github/workflows/` と `scripts/`）そのものも書き換えられる。必須チェックが防げるのはうっかりしたミスまでで、悪意ある変更や、乗っ取られたアカウントは防げない。
招待は、デザイナーを信頼できる場合に限る。
デザイナー本人に渡す手順書は [designer-guide.md](designer-guide.md) である。
デザイナーの人数と GitHub アカウントは未定。大久保が、迎えるたびに次を行う。

- ruleset main-review を無効にしたことを GitHub の画面で確かめる（初回のみ）。有効なままだと、デザイナーの区分 C の PR は大久保の承認待ちで止まる
- デザイナーから GitHub のユーザー名を受け取る。アカウントが無ければ、[designer-guide.md](designer-guide.md) の「2. GitHub のアカウントを作る」を案内する
- GitHub のリポジトリの Settings → Collaborators → Add people で、受け取ったユーザー名を追加し、個人のリポジトリでは役割を選ぶ画面は出ず、招待された人は全員 Write 相当になる。招待の有効期限は7日で、切れたら招待をやり直す
- [designer-guide.md](designer-guide.md) をデザイナーに渡し、確認用の URL（staging のプレビュー）を伝える。Codex の GitHub 連携とセットアップ用スクリプト（`npm ci` と `npx playwright install --with-deps chromium`、Node 22）の作り方も、この手順書に書いてある
- デザイナーの PR で `@codex review` のコメントが動くか（Codex のレビューが付き、`codex-review` が成功するか）を確かめる。**未検証**。動かなければ、デザイナーの代わりに大久保がコメントするなどの扱いを決める
- 設計書（Notion）と Figma を共有する。Figma のリンクとフレームの ID は、このリポジトリに書かない
- デザイナーの区分 C の PR で、必須チェック `scope` が成功し、main-review を無効にしたあとは大久保の承認なしに、デザイナー本人が GitHub の画面で `main` へ merge できることを確かめる
- Codex の Web 版が出す PR の作成者が、デザイナー本人になるかを確かめる。**未検証**。bot の名前になると、`scope` が失敗する
