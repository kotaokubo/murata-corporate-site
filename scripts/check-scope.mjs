// 必須チェック「変更範囲」。区分 C のファイルを変えた PR は、PR の作成者（PR_AUTHOR）と、
// 最後に変更を送った人（PR_SENDER）の両方が scripts/scope.mjs の許可リスト（C_ALLOWED）に
// 載っているときだけ通す。権限 API は呼ばない
// 使い方：BASE_SHA HEAD_SHA PR_AUTHOR PR_SENDER を環境変数で渡す（GitHub Actions から呼ぶ）
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { classify, LABEL, canChangeC } from './scope.mjs';

const { BASE_SHA, HEAD_SHA, PR_AUTHOR = '', PR_SENDER = '', GITHUB_STEP_SUMMARY } = process.env;
if (!BASE_SHA || !HEAD_SHA) {
  console.error('BASE_SHA と HEAD_SHA が必要です');
  process.exit(2);
}
// --no-renames：リネームを「元の削除」と「先の追加」に分けて両方を数える。区分 C のファイルを区分 B の場所へ
// 移して判定を逃れることを防ぐ
const files = execFileSync('git', ['diff', '--name-only', '--no-renames', `${BASE_SHA}...${HEAD_SHA}`], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
const groups = { A: [], B: [], C: [] };
for (const f of files) groups[classify(f)].push(f);

let summary = `## 変更範囲\n\n依頼した人（PR の作成者）：${PR_AUTHOR || '不明'}\n最後に変更を送った人：${PR_SENDER || '不明'}\n\n`;
for (const k of ['A', 'B', 'C']) {
  if (groups[k].length) summary += `### ${LABEL[k]}\n${groups[k].map((f) => `- \`${f}\``).join('\n')}\n\n`;
}

let allowed = true;
if (groups.C.length > 0) {
  const authorOk = canChangeC(PR_AUTHOR);
  const senderOk = canChangeC(PR_SENDER);
  allowed = authorOk && senderOk;
  if (!allowed) {
    if (!authorOk) summary += `許可されていない（作成者）：${PR_AUTHOR || '不明'}\n`;
    if (!senderOk) summary += `許可されていない（送った人）：${PR_SENDER || '不明'}\n`;
    summary += '**失敗：区分 C のファイルは、大久保と、許可したデザイナー（`scripts/scope.mjs` の `C_ALLOWED`）だけが変えられます。大久保か、許可したデザイナーに頼んでください。**\n';
  }
}
console.log(summary);
if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, summary);
process.exit(allowed ? 0 : 1);
