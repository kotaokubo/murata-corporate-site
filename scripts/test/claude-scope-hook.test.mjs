import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HOOK = path.join(REPO_ROOT, 'scripts/claude-scope-hook.mjs');

/**
 * @param {unknown} payload
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runHook(payload) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const result = spawnSync(process.execPath, [HOOK], {
    input,
    encoding: 'utf8',
    cwd: REPO_ROOT,
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
