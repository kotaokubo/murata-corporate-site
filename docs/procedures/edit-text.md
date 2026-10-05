# 手順書：文言を直す

ページの見出しや本文などの文言は、だいたい `src/content/pages/` の YAML にあります。
お知らせ本文は `src/content/news/` です。

## どのファイルを直すか

| ページ | ファイル | 区分 |
| --- | --- | --- |
| トップ | `src/content/pages/home.yml` | A |
| 村田宝飾について（会社概要） | `src/content/pages/company.yml` | A |
| 沿革 | `src/content/pages/history.yml` | A |
| 事業内容 | `src/content/pages/business.yml` | A |
| 採用情報 | `src/content/pages/recruit.yml` | A |
| 新規お取引 | `src/content/pages/partners.yml` | A |
| お知らせ一覧 | `src/content/pages/news.yml` | A |
| エントリーフォーム | `src/content/pages/entry.yml` | C（大久保へ） |
| お知らせの各記事 | `src/content/news/` の該当ファイル | A |
| プライバシーポリシー | `src/content/legal/` | C（大久保へ） |

英語の訳は `src/content/pages/en/`、中国語の訳は `src/content/pages/zh/` にあります。
日本語を直したら、訳も直してください（AI に頼めます）。

エントリーフォームの文言（個人情報の同意文や応募の案内）は区分 C です。直さず大久保へ連絡してください。

## 手順（区分 A）

1. `main` から作業ブランチ `work/text-<内容>` を切る
2. 上の表で該当する YAML（またはお知らせの Markdown）を開き、文言を直す
3. 項目名（キー）は変えない。書き間違えるとビルドが止まり、エラーに項目名が出る
4. 日本語を直したページに英語・中国語の訳があるときは、`en/` と `zh/` の同じファイルも直す
5. `npm run build` と `npm run test:e2e` を通す
6. `staging` へ PR を出し、すぐに PR へ `@codex review` とコメントする
7. Codex の指摘を直すか、直さない理由を返信して、すべて解決（Resolve）する。直しを足したら、もう一度 `@codex review` とコメントし、再レビュー（指摘なしのときは PR への 👍）が付き、新しい指摘もすべて解決するまで待つ
8. 必須チェックがすべて成功したことを PR の画面で確かめてから、`staging` へマージし、検証用の URL で確かめてもらう
