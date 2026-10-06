import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractCompanyAllowlist,
  findPiiInText,
  parseAddedLines,
  collectPiiWarnings,
  normalizePiiText,
  normalizePhone,
  toPhoneDigits,
  isPiiTargetPath,
} from '../check-pii.mjs';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('check-pii', () => {
  const allow = extractCompanyAllowlist(readFileSync(join(fixtures, 'site.ts'), 'utf8'));

  it('site.ts から会社の連絡先を読む', () => {
    assert.ok(allow.found);
    assert.ok(allow.phones.has(toPhoneDigits('089-941-4135')));
    assert.ok(allow.phones.has(toPhoneDigits('03-5807-4345')));
    assert.ok(allow.emails.has('info@murata-jewelry.co.jp'));
  });

  it('追加行の電話番号とメールを警告する', () => {
    const hits = findPiiInText('連絡先は 090-1234-5678 と secret@example.com です', allow);
    assert.equal(hits.length, 2);
    assert.ok(hits.some((h) => h.kind === 'phone' && h.value.includes('090')));
    assert.ok(hits.some((h) => h.kind === 'email' && h.value === 'secret@example.com'));
  });

  it('会社の連絡先は警告しない（完全一致）', () => {
    const hits = findPiiInText('松山 089-941-4135 / info@murata-jewelry.co.jp', allow);
    assert.deepEqual(hits, []);
  });

  it('会社電話は表記ゆれ（空白・+81）も除外する', () => {
    assert.deepEqual(findPiiInText('東京 03-5807-4345', allow), []);
    assert.deepEqual(findPiiInText('東京 03 5807 4345', allow), []);
    assert.deepEqual(findPiiInText('東京 +81-3-5807-4345', allow), []);
    assert.equal(toPhoneDigits('03-5807-4345'), toPhoneDigits('03 5807 4345'));
    assert.equal(toPhoneDigits('03-5807-4345'), toPhoneDigits('+81-3-5807-4345'));
  });

  it('ハイフン無しと +81 も検出する', () => {
    const a = findPiiInText('tel:09012345678', allow);
    const b = findPiiInText('国際 +81-90-1234-5678', allow);
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
  });

  it('全角の電話番号を半角にそろえて検出する', () => {
    const hits = findPiiInText('電話：０９０−１２３４−５６７８', allow);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, 'phone');
  });

  it('+81 (0)3 形式を検出する', () => {
    const hits = findPiiInText('東京 +81 (0)3-1234-5678', allow);
    assert.equal(hits.length, 1);
    assert.ok(hits[0].value.includes('+81'));
  });

  it('site.ts から読めないときは found が false', () => {
    const empty = extractCompanyAllowlist('export const x = 1;');
    assert.equal(empty.found, false);
    assert.equal(empty.phones.size, 0);
    const hits = findPiiInText('089-941-4135', empty);
    assert.equal(hits.length, 1);
  });

  it('対象拡張子に css / svg / xml / csv を含む', () => {
    assert.equal(isPiiTargetPath('src/styles/a.css'), true);
    assert.equal(isPiiTargetPath('public/icon.svg'), true);
    assert.equal(isPiiTargetPath('src/data/a.xml'), true);
    assert.equal(isPiiTargetPath('src/data/a.csv'), true);
  });

  it('docs / ルート md / .github も対象、package-lock は除外', () => {
    assert.equal(isPiiTargetPath('docs/guide.md'), true);
    assert.equal(isPiiTargetPath('README.md'), true);
    assert.equal(isPiiTargetPath('CHANGELOG.md'), true);
    assert.equal(isPiiTargetPath('.github/workflows/ci.yml'), true);
    assert.equal(isPiiTargetPath('.github/PULL_REQUEST_TEMPLATE.md'), true);
    assert.equal(isPiiTargetPath('.github/foo.yaml'), true);
    assert.equal(isPiiTargetPath('package-lock.json'), false);
    assert.equal(isPiiTargetPath('src/package-lock.json'), false);
    assert.equal(isPiiTargetPath('scripts/x.mjs'), false);
  });

  it('unified diff の追加行だけを取る', () => {
    const diff = [
      'diff --git a/src/pages/x.astro b/src/pages/x.astro',
      '--- a/src/pages/x.astro',
      '+++ b/src/pages/x.astro',
      '@@ -10,0 +11,2 @@',
      '+電話 090-1111-2222',
      '+mail me@example.com',
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1,0 +2 @@',
      '+090-9999-8888',
    ].join('\n');
    const added = parseAddedLines(diff);
    assert.equal(added.length, 3);
    assert.equal(added[0].file, 'src/pages/x.astro');
    assert.equal(added[0].line, 11);
    assert.equal(added[1].line, 12);
    assert.equal(added[2].file, 'README.md');
    assert.equal(added[2].line, 2);
  });

  it('hunk 内の +++ 始まり行は追加行として扱う', () => {
    const diff = [
      'diff --git a/src/a.md b/src/a.md',
      '--- a/src/a.md',
      '+++ b/src/a.md',
      '@@ -1,0 +1,2 @@',
      '+++ heading style line',
      '+normal 090-1111-2222',
    ].join('\n');
    const added = parseAddedLines(diff);
    assert.equal(added.length, 2);
    assert.equal(added[0].text, '++ heading style line');
    assert.equal(added[1].text, 'normal 090-1111-2222');
  });

  it('collectPiiWarnings がメッセージを付ける', () => {
    const warnings = collectPiiWarnings({
      added: [{ file: 'src/a.ts', line: 3, text: 'x@y.zz に送る' }],
      allow,
    });
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].message.includes('メールアドレス'));
  });

  it('normalizePhone は normalizePiiText と互換', () => {
    assert.equal(normalizePhone('０３−５８０７−４３４５'), normalizePiiText('０３−５８０７−４３４５'));
  });
});
