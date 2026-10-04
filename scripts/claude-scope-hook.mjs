// Claude Code PreToolUse フック。区分 C のファイルを書き換えようとしたら確認を求める。
// 区分の判定は必須チェック scope と同じ scripts/scope.mjs の classify() を使う。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { classify } from './scope.mjs';

const ASK_REASON = 'このファイルは区分 C（大久保だけが変える）。大久保の依頼で変える場合だけ許可する';

/**
 * 相対パスなら cwd（無ければ process.cwd()）を基準に絶対パスへ解決する。
 * @param {string} targetPath
 * @param {string | undefined} cwd
 */
function resolveTargetPath(targetPath, cwd) {
  if (path.isAbsolute(targetPath)) return path.resolve(targetPath);
  const base = typeof cwd === 'string' && cwd ? cwd : process.cwd();
  return path.resolve(base, targetPath);
}

/**
 * 存在するパスは realpathSync.native で正規化する。
 * 無ければ存在する一番近い祖先を正規化し、残りの断片をつなぐ。
 * @param {string} absPath
 */
function resolveRealPath(absPath) {
  if (existsSync(absPath)) {
    return realpathSync.native(absPath);
  }

  const parts = [];
  let current = absPath;
  while (true) {
    parts.unshift(path.basename(current));
    const parent = path.dirname(current);
    if (parent === current) {
      return absPath;
    }
    if (existsSync(parent)) {
      return path.join(realpathSync.native(parent), ...parts);
    }
    current = parent;
  }
}

/**
 * git rev-parse を走らせるディレクトリ。対象の親、無ければ存在する一番近い祖先。
 * @param {string} absPath
 */
function gitStartDir(absPath) {
  let current = path.dirname(absPath);
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

/**
 * @param {string} startDir
 * @returns {string | null}
 */
function gitRepoRoot(startDir) {
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: startDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * @param {string} absPath
 * @param {string} repoRoot
 */
function toRepoRelative(absPath, repoRoot) {
  const relative = path.relative(repoRoot, absPath);
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

/** @param {unknown} input */
function extractCwd(input) {
  if (!input || typeof input !== 'object') return undefined;
  const cwd = /** @type {Record<string, unknown>} */ (input).cwd;
  return typeof cwd === 'string' && cwd ? cwd : undefined;
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

  const absolute = resolveTargetPath(targetPath, extractCwd(payload));
  const real = resolveRealPath(absolute);
  const repoRoot = gitRepoRoot(gitStartDir(real));
  if (!repoRoot) process.exit(0);

  const relative = toRepoRelative(real, repoRoot);
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
