// 必須チェック「検証済みか」。main への PR の最新コミットが staging に入っていなければ失敗させる
// 例外：大久保が出した hotfix/ で始まるブランチ
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const OWNER = 'kotaokubo';
const { HEAD_SHA, HEAD_REF = '', PR_AUTHOR = '', GITHUB_STEP_SUMMARY } = process.env;
const write = (s) => { console.log(s); if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, s + '\n'); };

if (HEAD_REF.startsWith('hotfix/') && PR_AUTHOR === OWNER) {
  write('急ぎの修正（大久保の hotfix/）なので、staging での確認を省略します。');
  process.exit(0);
}
try {
  execFileSync('git', ['merge-base', '--is-ancestor', HEAD_SHA, 'origin/staging']);
  write('この PR の最新の変更は staging に入っています（検証済み）。');
  process.exit(0);
} catch {
  write('**失敗：この PR の最新の変更が staging に入っていません。** 先に同じ作業ブランチを staging へ入れて、検証用の URL で確認してください。確認のあとに直しを足した場合も、もう一度 staging へ入れてください。');
  process.exit(1);
}
