// 必須チェック「codex-review」。PR の最新のコミットに Codex のレビューが付くまで待ち、付かなければ失敗させる
// Codex は、指摘があればレビュー（行ごとのコメント付き）を投稿し、指摘がなければ PR に 👍 を付ける、と説明されている
// どちらでも「最新のコミットを見た」と判断できるようにする。指摘の解決は ruleset の「会話の解決」で止める
//
// 【要確認】Codex のアカウント名と、指摘がないときの振る舞いは、リポジトリでの試験で確かめる
import { appendFileSync } from 'node:fs';

const BOT = process.env.CODEX_BOT ?? 'chatgpt-codex-connector[bot]';
const { GITHUB_TOKEN, REPO, PR_NUMBER, HEAD_SHA, PR_UPDATED_AT, GITHUB_STEP_SUMMARY } = process.env;
const TIMEOUT_MIN = Number(process.env.TIMEOUT_MIN ?? 25);
const INTERVAL_SEC = 30;

const write = (s) => { console.log(s); if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, s + '\n'); };
const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

async function reviewed() {
  const reviews = await api(`/pulls/${PR_NUMBER}/reviews?per_page=100`);
  const onHead = reviews.filter((r) => r.user?.login === BOT && r.commit_id === HEAD_SHA);
  if (onHead.length) return `Codex のレビューが最新のコミット（${HEAD_SHA.slice(0, 7)}）に付いています（${onHead.length}件）。指摘がある場合は、すべて解決するまでマージできません。`;
  // 指摘がないときの 👍。この PR が最後に更新された（＝最新のコミットが push された）時刻より後に付いたものだけを数える。
  // コミットの日時はコミットする側が書き換えられるので使わない。PR_UPDATED_AT は GitHub が記録する時刻
  const headTime = new Date(PR_UPDATED_AT).getTime();
  if (Number.isNaN(headTime)) throw new Error('PR_UPDATED_AT が必要です');
  const reactions = await api(`/issues/${PR_NUMBER}/reactions?per_page=100`);
  const ok = reactions.find((r) => r.user?.login === BOT && r.content === '+1' && new Date(r.created_at).getTime() >= headTime);
  if (ok) return `Codex が最新のコミットを見て、指摘なし（👍）としています。`;
  return null;
}

const deadline = Date.now() + TIMEOUT_MIN * 60_000;
while (true) {
  const result = await reviewed();
  if (result) { write(result); process.exit(0); }
  if (Date.now() > deadline) break;
  await new Promise((r) => setTimeout(r, INTERVAL_SEC * 1000));
}
write(`**失敗：最新のコミット（${HEAD_SHA.slice(0, 7)}）に Codex のレビューが付いていません。** PR に \`@codex review\` とコメントしてレビューを依頼し、レビューが付いたら、この PR の Checks 画面で「Re-run」を押してください。`);
process.exit(1);
