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
npm run dev          # http://localhost:4321 で確認（下書きも表示される）
npm run build        # 型の検査とビルド
npm run test:e2e     # Playwright（本番と同じ出力でテストし、4つの幅で全ページを撮影する）
```

撮影した画像は `test-results/` にできます。

## ブランチと公開の流れ

| ブランチ | 役割 | 公開先 |
| --- | --- | --- |
| `main` | 本番 | www.murata-jewelry.co.jp（切り替えまでは `<プロジェクト名>.pages.dev`） |
| `staging` | 検証 | `staging.<プロジェクト名>.pages.dev`（Cloudflare Access で閲覧制限） |
| `work/...` | 作業 | なし |

1. `main` から `work/...` を切る
2. 手元で `npm run build` と `npm run test:e2e` を通す
3. `staging` へ PR → マージ → 検証用 URL で確認
4. 同じ作業ブランチから `main` へ PR → 必須チェックが通り、区分 B を含むなら事務の方が影響するページをすべて確かめる → **事務の方（または大久保）がマージ** → 本番に出る
5. `main` へマージすると、作業ブランチは自動で消える（`.github/workflows/delete-merged-branch.yml`）。`staging` へのマージでは消えない
6. `staging` は毎朝 `main` を自動で取り込む（`.github/workflows/sync-staging.yml`）

急ぎの修正は大久保だけが `hotfix/...` で行う（`staging` を通さずに `main` へ入れられる）。

## 必須チェック（`.github/workflows/ci.yml` と `guard.yml`）

| 名前 | 内容 |
| --- | --- |
| `build` | 型の検査（`astro check`）とビルド。お知らせの書式の誤りもここで止まる |
| `playwright` | 全ページが開くか、ブラウザのエラー、お問い合わせ欄、メニュー、下書きが本番に出ないか、noindex、エントリーフォームの入力チェック。撮影画像を Checks 画面に保存 |
| `scope` | 変更したファイルを区分 A・B・C に分ける。大久保以外が区分 C を変えたら失敗。`guard.yml` で動かすので、PR の中から書き換えて緩めることはできない |
| `staging-verified` | `main` への PR の最新の変更が `staging` に入っているか。入っていなければ失敗（大久保の `hotfix/` は例外） |
| `secrets` | パスワードや API キーらしき文字列（gitleaks） |
| `codex-review` | PR の最新のコミットに Codex のレビュー（または指摘なしの 👍）が付いているか。付くまで最大25分待つ。PR を出したら必ず `@codex review` とコメントしてレビューを依頼する（自動では付かないことがある）。間に合わずに失敗したら、レビューが付いてから再実行する。指摘は「会話の解決」の設定で、すべて解決するまでマージできない |

`staging` 向けの PR でも `guard.yml` は動くが、チェック名の末尾に「 (staging)」が付き、`main` の必須チェックとは別に記録される。チェックの結果はコミットとチェック名の組ごとに1つしか残らないので、同じ名前のままだと、同じブランチから出した `staging` 向けの PR の結果で `main` 向けの PR の結果が上書きされる。

## 前提にしている GitHub と Cloudflare の設定

コードでは設定できないので、大久保が GitHub と Cloudflare の画面で入れている。
設定の手順そのものは、Notion の「環境構築の手順」にある。
設定したあとは、設計書 15章の「ガードレールが効いているかの試験」を行う。

### GitHub（Settings）

- General：Issues、Wikis、Discussions、Projects は無効
- General → Pull Requests：「Allow merge commits」だけを有効にし、「Allow squash merging」と「Allow rebase merging」は無効。squash や rebase でマージすると、作業ブランチのコミットが `staging` に入らず、`staging-verified` が必ず失敗する
- General：「Allow auto-merge」は無効
- General：「Automatically delete head branches」は無効。有効だと `staging` へのマージで作業ブランチが消え、同じブランチから `main` へ PR を出せなくなる。`main` へのマージ後の削除は `delete-merged-branch.yml` が行う
- Actions → General：「Require approval for all external contributors」。外部の人のワークフローは承認制
- Actions の既定の権限：read
- Rules → Rulesets は次の3つ
  - **main-protect**（対象：`main`、bypass：なし）：Restrict deletions、Block force pushes、Require a pull request before merging（承認数 0）、Require status checks to pass（`build`、`playwright`、`scope`、`staging-verified`、`secrets`、`codex-review`）、**Require conversation resolution before merging**（Codex の指摘をすべて解決しないとマージできない）
  - **main-review**（対象：`main`、bypass：Repository admin）：Require a pull request before merging（Require review from Code Owners、Dismiss stale pull request approvals、Require approval of the most recent reviewable push）
    - CODEOWNERS で、区分 A（お知らせと画像）と区分 B（`src/pages/`、`src/components/`、`src/layouts/`、`src/styles/`）の持ち主を外している。区分 A・B だけの PR は、必須チェックが通れば事務の方が自分でマージできる。区分 C を含む PR は大久保の承認が要る
    - 区分 B は承認の代わりに、事務の方が影響するページを検証用の URL で重めに確かめる（AGENTS.md「区分 B のとき」）。全体の動作は必須チェックの Playwright で担保する
    - bypass に大久保（Repository admin）を入れているのは、大久保が自分の PR を承認できないため。bypass は main-review にだけ効き、main-protect の必須チェックは大久保も飛ばせない
  - **staging-protect**（対象：`staging`、bypass：なし）：Restrict deletions、Block force pushes
    - `staging` は毎朝の自動取り込みが直接 push するので、PR 必須と必須チェックはかけていない。作業ブランチからは PR で入れる（AGENTS.md）
    - そのため `staging` には、区分 C の変更やチェックが失敗した変更も入りうる。入っても検証環境だけの話で、`main` へは main-protect の必須チェックで止まる
- `staging` ブランチは `main` から作ってある

### Codex（ChatGPT の設定画面）

- Codex に GitHub を接続し、このリポジトリへのアクセスを許可している
- Codex の設定 → Code review で、このリポジトリの自動レビューをオンにしている。ただし自動のレビューは付かないことがあるので、運用では PR ごとに `@codex review` とコメントする（AGENTS.md）
- Codex のアカウント名は `chatgpt-codex-connector[bot]`。指摘があるときは行ごとのコメント付きのレビューを投稿し、指摘がないときは PR に 👍 を付ける（2026-10-04 の試験で確認）。`scripts/check-codex-review.mjs` はこの2つを見て判定する

### Cloudflare Pages

2026-10-04 時点では未設定。村田宝飾名義の Cloudflare アカウントができてから、次の内容で入れる。

- GitHub 連携でこのリポジトリを接続する
- Build command：`npm run build`、Output：`dist`、環境変数 `NODE_VERSION=22`
- Production branch：`main`
- Preview branches：Custom → 含めるのは `staging` のみ
- プレビューに Cloudflare Access をかける（事務の方、公開判断者、大久保だけ）
- 本番の環境変数に `PUBLIC_GA4_ID`（GA4 の測定 ID）を入れる
