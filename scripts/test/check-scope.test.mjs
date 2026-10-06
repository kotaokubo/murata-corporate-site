import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, before, after } from 'node:test';
import readline from 'node:readline';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK_SCOPE = path.join(REPO_ROOT, 'scripts/check-scope.mjs');
const MOCK_API = path.join(REPO_ROOT, 'scripts/test/fixtures/mock-permission-api.mjs');

/** @type {import('node:child_process').ChildProcess | undefined} */
let mockProc;
/** @type {number} */
let mockPort;

before(async () => {
  mockProc = spawn(process.execPath, [MOCK_API], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  mockPort = await new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: mockProc.stdout });
    const timer = setTimeout(() => {
      rl.close();
      reject(new Error('mock permission API did not report port'));
    }, 5000);
    rl.once('line', (line) => {
      clearTimeout(timer);
      rl.close();
      try {
        resolve(JSON.parse(line).port);
      } catch (err) {
        reject(err);
      }
    });
    mockProc.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    mockProc.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`mock permission API exited early: ${code}`));
    });
  });
});

after(() => {
  if (mockProc && !mockProc.killed) mockProc.kill();
});

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
 * check-scope.mjs を子プロセスで起動する（非同期。モックサーバーのイベントループを塞がない）。
 * @param {{ dir: string, baseSha: string, headSha: string, author: string, token?: string | null, repo?: string }} opts
 * @returns {Promise<{ status: number | null, stdout: string, stderr: string }>}
 */
function runCheck(opts) {
  const env = {
    PATH: process.env.PATH,
    BASE_SHA: opts.baseSha,
    HEAD_SHA: opts.headSha,
    PR_AUTHOR: opts.author,
    GITHUB_API_URL: `http://127.0.0.1:${mockPort}`,
  };
  if (opts.token !== null) {
    env.GITHUB_TOKEN = opts.token ?? 't';
  }
  if (opts.repo !== null) {
    env.REPO = opts.repo ?? 'o/r';
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

test('1. 区分 A のみ、作成者 someone、token なし → 0', async () => {
  const repo = makeRepo({ changeA: true });
  const { status } = await runCheck({
    ...repo,
    author: 'someone',
    token: null,
    repo: null,
  });
  assert.equal(status, 0);
});

test('2. 区分 C、作成者 kotaokubo、token なし → 0', async () => {
  const repo = makeRepo({ changeC: true });
  const { status } = await runCheck({
    ...repo,
    author: 'kotaokubo',
    token: null,
    repo: null,
  });
  assert.equal(status, 0);
});

test('3. 区分 C、role write → 0', async () => {
  const repo = makeRepo({ changeC: true });
  const { status } = await runCheck({ ...repo, author: 'writer' });
  assert.equal(status, 0);
});

test('4. 区分 C、role maintain → 0', async () => {
  const repo = makeRepo({ changeC: true });
  const { status } = await runCheck({ ...repo, author: 'maintainer' });
  assert.equal(status, 0);
});

test('5. 区分 C、role read → 1', async () => {
  const repo = makeRepo({ changeC: true });
  const { status, stdout } = await runCheck({ ...repo, author: 'reader' });
  assert.equal(status, 1);
  assert.match(stdout, /Write 以上/);
});

test('6. 区分 C、API が 500 → 1', async () => {
  const repo = makeRepo({ changeC: true });
  const { status, stdout } = await runCheck({ ...repo, author: 'error500' });
  assert.equal(status, 1);
  assert.match(stdout, /権限 API が 500 を返しました/);
});

test('7. 区分 C、GITHUB_TOKEN 未設定 → 1', async () => {
  const repo = makeRepo({ changeC: true });
  const { status, stdout } = await runCheck({
    ...repo,
    author: 'writer',
    token: null,
  });
  assert.equal(status, 1);
  assert.match(stdout, /GITHUB_TOKEN または REPO が未設定/);
});
