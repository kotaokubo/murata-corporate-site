import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK_SCOPE = path.join(REPO_ROOT, 'scripts/check-scope.mjs');

/**
 * 一時 git リポジトリを作り、base/head コミットを用意する。
 * @param {{ changeC?: boolean, changeA?: boolean }} opts
 * @returns {{ dir: string, baseSha: string, headSha: string }}
 */
function makeRepo(opts = {}) {
  const { changeC = false, changeA = false } = opts;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-scope-'));
  const git = (args) =>
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  git(['init']);
  fs.mkdirSync(path.join(dir, 'src/content/news'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"tmp"}\n');
  fs.writeFileSync(path.join(dir, 'src/content/news/x.md'), '# news\n');
  git(['add', '.']);
  git(['commit', '-m', 'base']);
  const baseSha = git(['rev-parse', 'HEAD']).trim();

  if (changeC) {
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"tmp","version":"2"}\n');
  }
  if (changeA) {
    fs.writeFileSync(path.join(dir, 'src/content/news/x.md'), '# news updated\n');
  }
  if (changeC || changeA) {
    git(['add', '.']);
    git(['commit', '-m', 'head']);
  }
  const headSha = git(['rev-parse', 'HEAD']).trim();
  return { dir, baseSha, headSha };
}

/**
 * check-scope.mjs を子プロセスで起動する。
 * @param {{ dir: string, baseSha: string, headSha: string, author: string, sender?: string | null }} opts
 * @returns {Promise<{ status: number | null, stdout: string, stderr: string }>}
 */
function runCheck(opts) {
  const env = {
    PATH: process.env.PATH,
    BASE_SHA: opts.baseSha,
    HEAD_SHA: opts.headSha,
    PR_AUTHOR: opts.author,
  };
  if (opts.sender !== null && opts.sender !== undefined) {
    env.PR_SENDER = opts.sender;
  }

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CHECK_SCOPE], {
      cwd: opts.dir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

test('1. 区分 A のみ、作成者 someone、送った人 someone → 0', async () => {
  const repo = makeRepo({ changeA: true });
  const { status } = await runCheck({
    ...repo,
    author: 'someone',
    sender: 'someone',
  });
  assert.equal(status, 0);
});

test('2. 区分 C、作成者 kotaokubo、送った人 kotaokubo → 0', async () => {
  const repo = makeRepo({ changeC: true });
  const { status } = await runCheck({
    ...repo,
    author: 'kotaokubo',
    sender: 'kotaokubo',
  });
  assert.equal(status, 0);
});

test('3. 区分 C、作成者 someone、送った人 someone → 1', async () => {
  const repo = makeRepo({ changeC: true });
  const { status, stdout } = await runCheck({
    ...repo,
    author: 'someone',
    sender: 'someone',
  });
  assert.equal(status, 1);
  assert.match(stdout, /C_ALLOWED/);
});

test('4. 区分 C、作成者 kotaokubo、送った人 someone → 1', async () => {
  const repo = makeRepo({ changeC: true });
  const { status, stdout } = await runCheck({
    ...repo,
    author: 'kotaokubo',
    sender: 'someone',
  });
  assert.equal(status, 1);
  assert.match(stdout, /C_ALLOWED/);
});

test('5. 区分 C、作成者 someone、送った人 kotaokubo → 1', async () => {
  const repo = makeRepo({ changeC: true });
  const { status, stdout } = await runCheck({
    ...repo,
    author: 'someone',
    sender: 'kotaokubo',
  });
  assert.equal(status, 1);
  assert.match(stdout, /C_ALLOWED/);
});

test('6. 区分 C、作成者 kotaokubo、PR_SENDER 未設定 → 1', async () => {
  const repo = makeRepo({ changeC: true });
  const { status, stdout } = await runCheck({
    ...repo,
    author: 'kotaokubo',
    sender: null,
  });
  assert.equal(status, 1);
  assert.match(stdout, /C_ALLOWED/);
});

test('7. 区分 A と C が混在、作成者 someone → 1', async () => {
  const repo = makeRepo({ changeA: true, changeC: true });
  const { status, stdout } = await runCheck({
    ...repo,
    author: 'someone',
    sender: 'someone',
  });
  assert.equal(status, 1);
  assert.match(stdout, /C_ALLOWED/);
});
