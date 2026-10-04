# 手順書：お知らせを追加する（区分 A）

1. `main` から作業ブランチ `work/news-<内容>` を切る
2. `src/content/news/` に `YYYY-MM-DD-<英数字の短い名前>.md` を作る（日付は公開日）
3. 先頭に次の項目を書く

```markdown
---
title: 題名
date: 2026-10-15
category: INFO          # EVENT / MEDIA / INFO のどれか
description: 一覧と検索結果に出る短い説明（120字程度まで）
image: ../../assets/images/news/2026-10-15-xxx.jpg   # 画像があるときだけ
imageAlt: 画像の説明                                 # 画像があるときは必須
draft: false
---

本文を書く。
```

4. 画像は `src/assets/images/news/` に置く。形式は jpg、png、webp。長い辺 2000px 程度まで縮めてから置く
5. `npm run build` と `npm run test:e2e` を通す
6. `staging` へ PR を出し、すぐに PR へ `@codex review` とコメントする
7. Codex の指摘を直すか、直さない理由を返信して、すべて解決（Resolve）する。直しを足したら、もう一度 `@codex review` とコメントし、再レビューが付いて新しい指摘もすべて解決するまで待つ
8. 必須チェック（`build`、`playwright`、`scope`、`secrets`、`codex-review` など）がすべて成功したことを PR の画面で確かめてから、`staging` へマージし、検証用の URL で確かめてもらう

**公開日前に漏れて困る内容は、公開日になってから作業する**（リポジトリは公開されている）。
