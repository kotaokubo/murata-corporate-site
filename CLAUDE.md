@AGENTS.md

## Claude Code だけに当てはまること

- 禁止している操作は `.claude/settings.json` にもある。設定で止まった操作は、回避しようとせず事務の方に伝える
- `gh pr merge` は実行前に必ず確認を求める設定にしてある（`.claude/settings.json` の ask）。AGENTS.md の「本番へのリリース」の確認を済ませてから実行する
- 大久保の端末で動くときは、大久保の権限（承認の例外）で動いている。承認が要る PR を、承認なしでマージしない
