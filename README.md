# 村田宝飾 コーポレートサイト

村田宝飾株式会社のコーポレートサイト（予定：https://www.murata-jewelry.co.jp ）のソースです。
Astro で静的サイトを作り、Cloudflare Pages で公開します。

- 設計書：Notion「コーポレートサイト リニューアル 設計書」（村田宝飾さま 配下）
- AI で作業するときのルール：[AGENTS.md](AGENTS.md)
- 定型作業の手順書：[docs/procedures/](docs/procedures/)

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
4. 同じ作業ブランチから `main` へ PR → **大久保がマージ** → 本番に出る
5. `staging` は毎朝 `main` を自動で取り込む（`.github/workflows/sync-staging.yml`）

急ぎの修正は大久保だけが `hotfix/...` で行う（`staging` を通さずに `main` へ入れられる）。

## 必須チェック（`.github/workflows/ci.yml` と `guard.yml`）

| 名前 | 内容 |
| --- | --- |
| `build` | 型の検査（`astro check`）とビルド。お知らせの書式の誤りもここで止まる |
| `playwright` | 全ページが開くか、ブラウザのエラー、お問い合わせ欄、メニュー、下書きが本番に出ないか、noindex、エントリーフォームの入力チェック。撮影画像を Checks 画面に保存 |
| `scope` | 変更したファイルを区分 A・B・C に分ける。大久保以外が区分 C を変えたら失敗。`guard.yml` で動かすので、PR の中から書き換えて緩めることはできない |
| `staging-verified` | `main` への PR の最新の変更が `staging` に入っているか。入っていなければ失敗（大久保の `hotfix/` は例外） |
| `secrets` | パスワードや API キーらしき文字列（gitleaks） |

## 初回の設定（大久保が GitHub と Cloudflare の画面で行う）

コードでは設定できないので、手で入れる。入れたら設計書 15章の「ガードレールが効いているかの試験」を行う。

### GitHub（Settings）

- [ ] General：Issues、Wikis、Discussions、Projects を無効にする
- [ ] General → Pull Requests：「Allow merge commits」だけを有効にし、「Allow squash merging」と「Allow rebase merging」を無効にする。squash や rebase でマージすると、作業ブランチのコミットが `staging` に入らず、`staging-verified` が必ず失敗する
- [ ] General：「Allow auto-merge」は無効のまま
- [ ] Actions → General：「Require approval for all external contributors」にする
- [ ] Rules → Rulesets を作る
  - [ ] **main-protect**（対象：`main`、bypass：なし）：Restrict deletions、Block force pushes、Require a pull request before merging（承認数 0）、Require status checks to pass（`build`、`playwright`、`scope`、`staging-verified`、`secrets`）
  - [ ] **main-lock**（対象：`main`、bypass：Repository admin）：Restrict updates。これで `main` を進められるのは大久保だけになる
    - main-protect に「Require review from Code Owners」は入れない。大久保は自分の PR を承認できないので、大久保自身の区分 C の変更が止まってしまう。`main` は main-lock で大久保しかマージできないので、承認の仕組みは要らない。CODEOWNERS は、PR に大久保をレビュー依頼として自動で付けるために使う
  - [ ] **staging-protect**（対象：`staging`、bypass：なし）：Restrict deletions、Block force pushes
    - `staging` は毎朝の自動取り込みが直接 push するので、PR 必須と必須チェックはかけない。作業ブランチからは PR で入れる（AGENTS.md）
    - そのため `staging` には、区分 C の変更やチェックが失敗した変更も入りうる。入っても検証環境だけの話で、`main` へは main-protect の必須チェックで止まる
- [ ] `staging` ブランチを `main` から作る

### Cloudflare Pages

- [ ] GitHub 連携でこのリポジトリを接続する
- [ ] Build command：`npm run build`、Output：`dist`、環境変数 `NODE_VERSION=22`
- [ ] Production branch：`main`
- [ ] Preview branches：Custom → 含める `staging` のみ
- [ ] プレビューに Cloudflare Access をかける（事務の方、公開判断者、大久保だけ）
- [ ] 本番の環境変数に `PUBLIC_GA4_ID`（GA4 の測定 ID）を入れる

## 公開までに残っていること

- Figma のデザインの実装（いまのページはすべて仮）
- お知らせ詳細と FAQ のデザイン（作成中）
- エントリーフォームの送信（Cloudflare の関数 → メール。いまは送信ボタンを無効にしている）
- プライバシーポリシーの【要確認】を埋め、確認を受ける
- お知らせのサンプル2件（`src/content/news/*sample*`）を消す
- `www` の切り替え（設計書 10章）
