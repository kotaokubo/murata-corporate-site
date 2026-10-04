// Claude Code PreToolUse フック。区分 C のファイルを書き換えようとしたら確認を求める。
// 区分の判定は必須チェック scope と同じ scripts/scope.mjs の classify() を使う。
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { classify } from './scope.mjs';

const ASK_REASON = 'このファイルは区分 C（大久保だけが変える）。大久保の依頼で変える場合だけ許可する';
const GIT_TIMEOUT_MS = 3000;
const MAX_SYMLINK_DEPTH = 10;

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
 * 対象がシンボリックリンクなら readlink で辿る（最大 MAX_SYMLINK_DEPTH 回）。
 * 壊れたリンク（リンク先がまだ無い）も、リンク先パスへ解決する。
 * MAX_SYMLINK_DEPTH 回辿ってもまだリンクなら tooDeep（循環・深すぎ）。
 * @param {string} absPath
 * @returns {{ kind: 'ok', path: string } | { kind: 'tooDeep' }}
 */
function resolveSymlinkChain(absPath) {
  let current = absPath;
  for (let i = 0; i < MAX_SYMLINK_DEPTH; i++) {
    let st;
    try {
      st = lstatSync(current);
    } catch {
      return { kind: 'ok', path: current };
    }
    if (!st.isSymbolicLink()) return { kind: 'ok', path: current };
    const link = readlinkSync(current);
    current = path.resolve(path.dirname(current), link);
  }
  try {
    if (lstatSync(current).isSymbolicLink()) return { kind: 'tooDeep' };
  } catch {
    // リンク先が消えている等。パスとしては確定している。
  }
  return { kind: 'ok', path: current };
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
 * @typedef {{ kind: 'ok', value: string } | { kind: 'outside' } | { kind: 'unavailable', reason: string }} GitResult
 */

/**
 * execFileSync の失敗が「git を実行できなかった」か「リポジトリ外」かを分ける。
 * 数値の終了コードで失敗したときは、stderr に「not a git repository」を含む場合だけリポジトリ外。
 * @param {unknown} err
 * @returns {string | null} unavailable の理由。null ならリポジトリ外（git は動いた）。
 */
function gitUnavailableReason(err) {
  if (!err || typeof err !== 'object') return String(err);
  const e =
    /** @type {NodeJS.ErrnoException & { killed?: boolean, status?: number | null, stderr?: string }} */ (
      err
    );
  if (e.code === 'ENOENT') return 'ENOENT';
  if (e.code === 'ETIMEDOUT' || e.killed) return 'timeout';
  if (typeof e.status === 'number') {
    const stderr = typeof e.stderr === 'string' ? e.stderr : '';
    if (stderr.includes('not a git repository')) return null;
    const firstLine = stderr.trim().split('\n')[0];
    return firstLine || `exit ${e.status}`;
  }
  return e.message || String(e.code || err);
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {GitResult}
 */
function runGit(args, cwd) {
  try {
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: GIT_TIMEOUT_MS,
      env: { ...process.env, LC_ALL: 'C' },
    });
    return { kind: 'ok', value: out.trim() };
  } catch (err) {
    const reason = gitUnavailableReason(err);
    if (reason === null) return { kind: 'outside' };
    return { kind: 'unavailable', reason };
  }
}

/**
 * @param {string} startDir
 * @returns {GitResult}
 */
function gitCommonDir(startDir) {
  const result = runGit(['rev-parse', '--git-common-dir'], startDir);
  if (result.kind !== 'ok') return result;
  const abs = path.isAbsolute(result.value) ? result.value : path.resolve(startDir, result.value);
  try {
    return { kind: 'ok', value: realpathSync.native(abs) };
  } catch {
    return { kind: 'ok', value: resolveRealPath(abs) };
  }
}

/**
 * @param {string} startDir
 * @returns {GitResult}
 */
function gitRepoRoot(startDir) {
  return runGit(['rev-parse', '--show-toplevel'], startDir);
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

/** @param {string} reason */
function warnGitUnavailable(reason) {
  console.error(`claude-scope-hook: git を実行できなかったので区分を判定しなかった（${reason}）`);
}

function writeAskAndExit() {
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

/**
 * @param {GitResult} result
 * @returns {string | null} ok なら値。それ以外は exit 済みで戻らない想定だが、呼び出し側で null 扱い。
 */
function unwrapGitOrExit(result) {
  if (result.kind === 'ok') return result.value;
  if (result.kind === 'unavailable') {
    warnGitUnavailable(result.reason);
  }
  process.exit(0);
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

  const projectCwd = extractCwd(payload) ?? process.cwd();
  const absolute = resolveTargetPath(targetPath, extractCwd(payload));
  const linkResult = resolveSymlinkChain(absolute);
  if (linkResult.kind === 'tooDeep') writeAskAndExit();

  const real = resolveRealPath(linkResult.path);

  const projectCommon = unwrapGitOrExit(gitCommonDir(projectCwd));
  const targetCommon = unwrapGitOrExit(gitCommonDir(gitStartDir(real)));
  if (projectCommon !== targetCommon) process.exit(0);

  const repoRoot = unwrapGitOrExit(gitRepoRoot(gitStartDir(real)));
  const relative = toRepoRelative(real, repoRoot);
  if (!relative) process.exit(0);

  if (classify(relative) !== 'C') process.exit(0);

  writeAskAndExit();
}

main();
