// 必須チェック「変更範囲」。大久保以外が区分 C のファイルを変えた PR を失敗させる
// 使い方：BASE_SHA HEAD_SHA PR_AUTHOR を環境変数で渡す（GitHub Actions から呼ぶ）
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { classify, LABEL } from './scope.mjs';

const OWNER = 'kotaokubo';
const { BASE_SHA, HEAD_SHA, PR_AUTHOR = '', GITHUB_STEP_SUMMARY } = process.env;
if (!BASE_SHA || !HEAD_SHA) {
  console.error('BASE_SHA と HEAD_SHA が必要です');
  process.exit(2);
}
const files = execFileSync('git', ['diff', '--name-only', `${BASE_SHA}...${HEAD_SHA}`], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
const groups = { A: [], B: [], C: [] };
for (const f of files) groups[classify(f)].push(f);

let summary = `## 変更範囲\n\n依頼した人（PR の作成者）：${PR_AUTHOR || '不明'}\n\n`;
for (const k of ['A', 'B', 'C']) {
  if (groups[k].length) summary += `### ${LABEL[k]}\n${groups[k].map((f) => `- \`${f}\``).join('\n')}\n\n`;
}
const blocked = groups.C.length > 0 && PR_AUTHOR !== OWNER;
if (blocked) summary += `**失敗：区分 C のファイルは大久保（${OWNER}）だけが変えられます。** 大久保へ連絡してください。\n`;
console.log(summary);
if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, summary);
process.exit(blocked ? 1 : 0);
