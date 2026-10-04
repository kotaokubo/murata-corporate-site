// Claude Code PreToolUse フック。区分 C のファイルを書き換えようとしたら確認を求める。
// 区分の判定は必須チェック scope と同じ scripts/scope.mjs の classify() を使う。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify } from './scope.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASK_REASON = 'このファイルは区分 C（大久保だけが変える）。大久保の依頼で変える場合だけ許可する';

/** @param {string} absPath */
function toRepoRelative(absPath) {
  const relative = path.relative(REPO_ROOT, path.resolve(absPath));
  const normalized = relative.split(path.sep).join('/');
  if (!normalized || normalized === '.') return null;
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return null;
  return normalized;
}

/** @param {unknown} input */
function extractTargetPath(input) {
  if (!input || typeof input !== 'object') return null;
  const toolInput = /** @type {Record<string, unknown>} */ (input).tool_input;
  if (!toolInput || typeof toolInput !== 'object') return null;
  const ti = /** @type {Record<string, unknown>} */ (toolInput);
  const candidate = ti.file_path ?? ti.notebook_path;
  if (typeof candidate !== 'string' || !candidate) return null;
  return candidate;
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, 'utf8');
  } catch (err) {
    console.error(`claude-scope-hook: stdin を読めない: ${err instanceof Error ? err.message : err}`);
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.error('claude-scope-hook: JSON が壊れている');
    process.exit(0);
  }

  const targetPath = extractTargetPath(payload);
  if (!targetPath) {
    console.error('claude-scope-hook: file_path / notebook_path が無い');
    process.exit(0);
  }

  const relative = toRepoRelative(targetPath);
  if (!relative) process.exit(0);

  if (classify(relative) !== 'C') process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: ASK_REASON,
      },
    }),
  );
  process.exit(0);
}

main();
