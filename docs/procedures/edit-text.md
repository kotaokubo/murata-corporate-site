# 手順書：文言を直す

- お知らせの文言は区分 A。`src/content/news/` の該当ファイルを直す
- ページの文言は、いまはページのファイル（`src/pages/`）に直接書かれているので区分 B。Figma のデザインを実装する段階で `src/content/` へ移し、区分 A にする予定
- プライバシーポリシー（`src/content/legal/`）は区分 C。直さず大久保へ連絡する

手順は他と同じ：`main` から `work/text-<内容>` を切る → 直す → build と Playwright を通す → `staging` へ PR。
