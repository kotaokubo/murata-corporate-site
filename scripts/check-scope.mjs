// 必須チェック「変更範囲」。区分 C のファイルを変えた PR は、大久保か、このリポジトリに
// 招待された人（Write 以上：admin / maintain / write）だけ通す。大久保は API を呼ばずに常に許可する
// 使い方：BASE_SHA HEAD_SHA PR_AUTHOR を環境変数で渡す（GitHub Actions から呼ぶ）。
// 区分 C があり作成者が大久保以外のときは GITHUB_TOKEN と REPO も必要
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { classify, LABEL, canChangeC } from './scope.mjs';

const OWNER = 'kotaokubo';
const { BASE_SHA, HEAD_SHA, PR_AUTHOR = '', GITHUB_STEP_SUMMARY, GITHUB_TOKEN, REPO } = process.env;
const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';
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

let summary = `## 変更範囲\n\n依頼した人（PR の作成者）：${PR_AUTHOR || '不明'}\n\n`;
for (const k of ['A', 'B', 'C']) {
  if (groups[k].length) summary += `### ${LABEL[k]}\n${groups[k].map((f) => `- \`${f}\``).join('\n')}\n\n`;
}

async function resolveCPermission() {
  if (groups.C.length === 0) return { allowed: true };
  if (PR_AUTHOR === OWNER) return { allowed: true };
  if (!GITHUB_TOKEN || !REPO) {
    return { allowed: false, reason: 'GITHUB_TOKEN または REPO が未設定のため、権限を確認できませんでした' };
  }
  try {
    const res = await fetch(
      `${GITHUB_API_URL}/repos/${REPO}/collaborators/${encodeURIComponent(PR_AUTHOR)}/permission`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) {
      return { allowed: false, reason: `権限 API が ${res.status} を返しました` };
    }
    const data = await res.json();
    const roleName = data.role_name;
    return { allowed: canChangeC(PR_AUTHOR, roleName), roleName };
  } catch (err) {
    return { allowed: false, reason: `権限 API の呼び出しに失敗しました：${err.message}` };
  }
}

const { allowed, roleName, reason } = await resolveCPermission();
if (roleName !== undefined) summary += `作成者の権限：${roleName}\n\n`;
if (reason) summary += `権限の確認結果：${reason}\n\n`;
if (!allowed) {
  summary += '**失敗：区分 C のファイルは、大久保か、このリポジトリに招待された人（Write 以上）だけが変えられます。大久保へ連絡してください。**\n';
}
console.log(summary);
if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, summary);
process.exit(allowed ? 0 : 1);
