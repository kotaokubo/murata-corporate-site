# 手順書：文言を直す

- お知らせの文言は区分 A。`src/content/news/` の該当ファイルを直す
- トップページの文言は `src/content/pages/home.yml` にあり、区分 A。このファイルを直す
- ほかのページの文言は、いまはページのファイル（`src/pages/`）に直接書かれているので区分 B。Figma のデザインを実装するときに `src/content/pages/` へ移し、区分 A にする
- プライバシーポリシー（`src/content/legal/`）は区分 C。直さず大久保へ連絡する

手順は他と同じ：`main` から `work/text-<内容>` を切る → 直す → build と Playwright を通す → `staging` へ PR → PR へ `@codex review` とコメント → 指摘を直すか理由を返信して解決（直しを足したら再びコメントし、再レビュー（指摘なしのときは PR への 👍）が付き、新しい指摘も解決するまで待つ）→ 必須チェックがすべて成功したことを確かめる → `staging` へマージ。
