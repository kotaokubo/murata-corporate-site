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
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} [opts]
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runHook(payload, opts = {}) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const result = spawnSync(process.execPath, [HOOK], {
    input,
    encoding: 'utf8',
    cwd: opts.cwd ?? REPO_ROOT,
    env: opts.env,
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
 * @returns {string} temp dir path
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
  const { status, stdout, stderr } = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: '/tmp/outside.txt' },
    cwd: REPO_ROOT,
  });
  assert.equal(status, 0);
  assert.equal(stdout, '');
  assert.equal(stderr, '');
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

test('壊れたシンボリックリンクで B の場所から未作成の C を指すとき ask になる', () => {
  const root = withTempDir();
  try {
    gitInit(root);
    const cFile = path.join(root, 'src/lib/site.ts');
    const bLink = path.join(root, 'src/components/broken-link.ts');
    fs.mkdirSync(path.dirname(cFile), { recursive: true });
    fs.mkdirSync(path.dirname(bLink), { recursive: true });
    // C の実体は作らない。壊れたリンクだけ置く。
    fs.symlinkSync(path.relative(path.dirname(bLink), cFile), bLink);

    const { status, stdout } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: bLink },
      cwd: root,
    });
    assert.equal(status, 0);
    assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('多段のシンボリックリンクを辿って C と判定する', () => {
  const root = withTempDir();
  try {
    gitInit(root);
    const cFile = path.join(root, 'src/lib/site.ts');
    const midLink = path.join(root, 'src/components/mid-link.ts');
    const outerLink = path.join(root, 'src/components/outer-link.ts');
    fs.mkdirSync(path.dirname(cFile), { recursive: true });
    fs.mkdirSync(path.dirname(midLink), { recursive: true });
    fs.writeFileSync(cFile, 'export {};\n');
    fs.symlinkSync(path.relative(path.dirname(midLink), cFile), midLink);
    fs.symlinkSync(path.relative(path.dirname(outerLink), midLink), outerLink);

    const { status, stdout } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: outerLink },
      cwd: root,
    });
    assert.equal(status, 0);
    assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('11段以上のシンボリックリンクは区分を判定できず ask になる', () => {
  const root = withTempDir();
  try {
    gitInit(root);
    const linkDir = path.join(root, 'src/components');
    fs.mkdirSync(linkDir, { recursive: true });
    // link0 → link1 → ... → link11（実体なしの鎖。MAX_SYMLINK_DEPTH=10 を超える）
    const depth = 12;
    for (let i = 0; i < depth - 1; i++) {
      const from = path.join(linkDir, `deep-link-${i}.ts`);
      const to = path.join(linkDir, `deep-link-${i + 1}.ts`);
      fs.symlinkSync(path.relative(linkDir, to), from);
    }
    fs.writeFileSync(path.join(linkDir, `deep-link-${depth - 1}.ts`), 'export {};\n');

    const { status, stdout } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: path.join(linkDir, 'deep-link-0.ts') },
      cwd: root,
    });
    assert.equal(status, 0);
    assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
    assert.match(JSON.parse(stdout).hookSpecificOutput.permissionDecisionReason, /区分 C/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('循環シンボリックリンクは区分を判定できず ask になる', () => {
  const root = withTempDir();
  try {
    gitInit(root);
    const linkDir = path.join(root, 'src/components');
    fs.mkdirSync(linkDir, { recursive: true });
    const a = path.join(linkDir, 'cycle-a.ts');
    const b = path.join(linkDir, 'cycle-b.ts');
    fs.symlinkSync(path.relative(linkDir, b), a);
    fs.symlinkSync(path.relative(linkDir, a), b);

    const { status, stdout } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: a },
      cwd: root,
    });
    assert.equal(status, 0);
    assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('破損した .git では stderr に判定不能を出して stdout は空', () => {
  const root = withTempDir();
  try {
    // 空のディレクトリではなく不正な gitfile。git は "not a git repository" 以外で失敗する。
    fs.writeFileSync(path.join(root, '.git'), 'not-a-valid-gitfile\n');
    const targetAbs = path.join(root, 'src/lib/site.ts');
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'export {};\n');

    const { status, stdout, stderr } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: targetAbs },
      cwd: root,
    });
    assert.equal(status, 0);
    assert.equal(stdout, '');
    assert.match(stderr, /claude-scope-hook: git を実行できなかったので区分を判定しなかった/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('別リポジトリの対象は何も出さない', () => {
  const base = withTempDir();
  try {
    const project = path.join(base, 'project');
    const other = path.join(base, 'other');
    fs.mkdirSync(project);
    fs.mkdirSync(other);
    gitInit(project);
    gitInit(other);

    const targetAbs = path.join(other, 'src/lib/site.ts');
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'export {};\n');

    const { status, stdout, stderr } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: targetAbs },
      cwd: project,
    });
    assert.equal(status, 0);
    assert.equal(stdout, '');
    assert.equal(stderr, '');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('worktree 上の区分 C は判定される', () => {
  const base = withTempDir();
  try {
    const mainRepo = path.join(base, 'main');
    const worktree = path.join(base, 'wt');
    fs.mkdirSync(mainRepo);
    gitInit(mainRepo);
    execFileSync('git', ['commit', '--allow-empty', '-m', 'init'], {
      cwd: mainRepo,
      stdio: ['ignore', 'ignore', 'ignore'],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
    });
    execFileSync('git', ['worktree', 'add', worktree, '-b', 'wt-branch'], {
      cwd: mainRepo,
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    const targetAbs = path.join(worktree, 'src/lib/site.ts');
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'export {};\n');

    const { status, stdout } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: targetAbs },
      cwd: mainRepo,
    });
    assert.equal(status, 0);
    assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('git が実行できないときは stderr に1行出して stdout は空', () => {
  const emptyBin = withTempDir();
  try {
    const { status, stdout, stderr } = runHook(editPayload('src/lib/site.ts'), {
      env: { ...process.env, PATH: emptyBin },
    });
    assert.equal(status, 0);
    assert.equal(stdout, '');
    assert.match(stderr, /claude-scope-hook: git を実行できなかったので区分を判定しなかった/);
  } finally {
    fs.rmSync(emptyBin, { recursive: true, force: true });
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
