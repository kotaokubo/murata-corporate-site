import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HOOK = path.join(REPO_ROOT, 'scripts/claude-scope-hook.mjs');

/**
 * @param {unknown} payload
 * @param {{ cwd?: string }} [opts]
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runHook(payload, opts = {}) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const result = spawnSync(process.execPath, [HOOK], {
    input,
    encoding: 'utf8',
    cwd: opts.cwd ?? REPO_ROOT,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/** @param {string} relative */
function editPayload(relative) {
  return {
    tool_name: 'Edit',
    tool_input: { file_path: path.join(REPO_ROOT, relative) },
    cwd: REPO_ROOT,
  };
}

/** @param {string} dir */
function gitInit(dir) {
  execFileSync('git', ['init'], {
    cwd: dir,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

/**
 * @param {() => void} fn
 * @returns {string} temp dir path (cleaned in finally of caller via returned cleanup)
 */
function withTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-scope-hook-'));
}

test('区分 A（news）は何も出さない', () => {
  const { status, stdout } = runHook(editPayload('src/content/news/a.md'));
  assert.equal(status, 0);
  assert.equal(stdout, '');
});

test('区分 B（components）は何も出さない', () => {
  const { status, stdout } = runHook(editPayload('src/components/Header.astro'));
  assert.equal(status, 0);
  assert.equal(stdout, '');
});

test('区分 C（scripts/scope.mjs）は ask を出す', () => {
  const { status, stdout } = runHook(editPayload('scripts/scope.mjs'));
  assert.equal(status, 0);
  const out = JSON.parse(stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /区分 C/);
});

test('区分 C（.github/workflows/ci.yml）は ask を出す', () => {
  const { status, stdout } = runHook(editPayload('.github/workflows/ci.yml'));
  assert.equal(status, 0);
  assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('区分 C（src/lib/site.ts）は ask を出す', () => {
  const { status, stdout } = runHook(editPayload('src/lib/site.ts'));
  assert.equal(status, 0);
  assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('区分 C（BaseLayout.astro / SENSITIVE）は ask を出す', () => {
  const { status, stdout } = runHook(editPayload('src/layouts/BaseLayout.astro'));
  assert.equal(status, 0);
  assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('リポジトリの外のパスは何も出さない', () => {
  const { status, stdout } = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: '/tmp/outside.txt' },
    cwd: REPO_ROOT,
  });
  assert.equal(status, 0);
  assert.equal(stdout, '');
});

test('NotebookEdit の notebook_path を判定する', () => {
  const { status, stdout } = runHook({
    tool_name: 'NotebookEdit',
    tool_input: { notebook_path: path.join(REPO_ROOT, 'src/lib/site.ts') },
    cwd: REPO_ROOT,
  });
  assert.equal(status, 0);
  assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('壊れた JSON は何も出さず exit 0', () => {
  const { status, stdout, stderr } = runHook('{not-json');
  assert.equal(status, 0);
  assert.equal(stdout, '');
  assert.match(stderr, /JSON/);
});

test('パスが無い入力は何も出さず exit 0', () => {
  const { status, stdout, stderr } = runHook({
    tool_name: 'Edit',
    tool_input: {},
    cwd: REPO_ROOT,
  });
  assert.equal(status, 0);
  assert.equal(stdout, '');
  assert.match(stderr, /path/);
});

test('入れ子の git リポジトリでは内側のルートから相対パスを取る', () => {
  const outer = withTempDir();
  try {
    gitInit(outer);
    const inner = path.join(outer, 'inner');
    fs.mkdirSync(inner);
    gitInit(inner);
    // 内側に scripts/scope.mjs は置かない。classify はフックが import する本体を使う。
    const targetRel = 'src/lib/site.ts';
    const targetAbs = path.join(inner, targetRel);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'export {};\n');

    const { status, stdout } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: targetAbs },
      cwd: inner,
    });
    assert.equal(status, 0);
    assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('シンボリックリンクで B の場所から C を指すとき C と判定する', () => {
  const root = withTempDir();
  try {
    gitInit(root);
    const cFile = path.join(root, 'src/lib/site.ts');
    const bLink = path.join(root, 'src/components/linked.ts');
    fs.mkdirSync(path.dirname(cFile), { recursive: true });
    fs.mkdirSync(path.dirname(bLink), { recursive: true });
    fs.writeFileSync(cFile, 'export {};\n');
    fs.symlinkSync(path.relative(path.dirname(bLink), cFile), bLink);

    const { status, stdout } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: bLink },
      cwd: root,
    });
    assert.equal(status, 0);
    assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('大文字小文字違いのパスでも実体で判定する', { skip: !isCaseInsensitiveFs() }, () => {
  const { status, stdout } = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: path.join(REPO_ROOT, 'src/layouts/baselayout.astro') },
    cwd: REPO_ROOT,
  });
  assert.equal(status, 0);
  assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('相対パスは入力 JSON の cwd を基準に解決する', () => {
  const { status, stdout } = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: 'src/lib/site.ts' },
    cwd: REPO_ROOT,
  });
  assert.equal(status, 0);
  assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
});

/** @returns {boolean} */
function isCaseInsensitiveFs() {
  const probe = path.join(REPO_ROOT, 'src/layouts/BaseLayout.astro');
  if (!fs.existsSync(probe)) return false;
  const lower = path.join(REPO_ROOT, 'src/layouts/baselayout.astro');
  try {
    const real = fs.realpathSync.native(lower);
    return path.basename(real) === 'BaseLayout.astro';
  } catch {
    return false;
  }
}
