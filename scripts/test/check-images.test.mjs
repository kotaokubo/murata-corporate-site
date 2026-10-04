import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkImageBuffer,
  checkMarkdownImageAlts,
  isImageTargetPath,
  runImageChecks,
} from '../check-images.mjs';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const tmp = join(dirname(fileURLToPath(import.meta.url)), '.tmp-images');

describe('check-images', () => {
  before(() => {
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(join(tmp, 'src/assets/images'), { recursive: true });
    mkdirSync(join(tmp, 'src/content/news'), { recursive: true });
  });
  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('GIF を失敗として検出する', () => {
    const buf = readFileSync(join(fixtures, '1x1.gif'));
    const problems = checkImageBuffer('src/assets/images/a.gif', buf, { size: buf.length });
    assert.ok(problems.some((p) => p.includes('jpg / jpeg / png / webp 以外')));
  });

  it('拡張子と中身が違う画像を失敗として検出する', () => {
    const buf = readFileSync(join(fixtures, 'jpeg-as.png'));
    const problems = checkImageBuffer('src/assets/images/x.png', buf, { size: buf.length });
    assert.ok(problems.some((p) => p.includes('拡張子は') && p.includes('中身は')));
  });

  it('3MiB 超を失敗として検出する', () => {
    const head = readFileSync(join(fixtures, '1x1.png'));
    const buf = Buffer.concat([head, Buffer.alloc(3_145_728)]);
    const problems = checkImageBuffer('src/assets/images/big.png', buf, { size: buf.length });
    assert.ok(problems.some((p) => p.includes('3MiB') || p.includes('3,145,728')));
  });

  it('長い辺 2400 超を失敗として検出する（推奨 2000px の文言あり）', () => {
    const buf = readFileSync(join(fixtures, '2401x10.png'));
    const problems = checkImageBuffer('src/assets/images/wide.png', buf, { size: buf.length });
    assert.ok(problems.some((p) => p.includes('2400px を超えて') && p.includes('2000px')));
  });

  it('空の画像説明 ![](x.jpg) を失敗として検出する', () => {
    const problems = checkMarkdownImageAlts('hello\n\n![](x.jpg)\n', 'src/content/news/a.md');
    assert.equal(problems.length, 1);
    assert.ok(problems[0].includes('説明'));
  });

  it('空白のみの説明と参照形式と空 alt の img を失敗にする', () => {
    const md = [
      '![   ](x.jpg)',
      '![][ref]',
      '![  ][ref2]',
      '<img src="a.jpg" alt="">',
      '<img src="b.jpg">',
      '![ok](c.jpg)',
      '<img src="d.jpg" alt="写真">',
    ].join('\n');
    const problems = checkMarkdownImageAlts(md, 'src/content/news/a.md');
    assert.ok(problems.length >= 5);
    assert.ok(!problems.some((p) => p.includes('ok') || p.includes('写真')));
  });

  it('大文字の拡張子 .PNG も許可する', () => {
    const buf = readFileSync(join(fixtures, '1x1.png'));
    const problems = checkImageBuffer('src/assets/images/OK.PNG', buf, { size: buf.length });
    assert.deepEqual(problems, []);
  });

  it('切れた画像は寸法が読めず失敗する', () => {
    const buf = readFileSync(join(fixtures, '1x1.png')).subarray(0, 16);
    const problems = checkImageBuffer('src/assets/images/cut.png', buf, { size: buf.length });
    assert.ok(problems.some((p) => p.includes('サイズを読めません') || p.includes('構造が不正')));
  });

  it('拡張子で先に絞らず assets 配下の全ファイルが対象', () => {
    assert.equal(isImageTargetPath('src/assets/images/note.txt'), true);
    assert.equal(isImageTargetPath('src/content/news/photo.webp'), true);
    assert.equal(isImageTargetPath('src/content/news/a.md'), false);
  });

  it('正常な PNG は問題なし', () => {
    const buf = readFileSync(join(fixtures, '1x1.png'));
    const problems = checkImageBuffer('src/assets/images/ok.png', buf, { size: buf.length });
    assert.deepEqual(problems, []);
  });

  it('一時ディレクトリで runImageChecks が失敗を集める', () => {
    writeFileSync(join(tmp, 'src/assets/images/bad.gif'), readFileSync(join(fixtures, '1x1.gif')));
    writeFileSync(join(tmp, 'src/content/news/n.md'), '![ ](a.jpg)\n');
    const { problems } = runImageChecks({
      root: tmp,
      files: ['src/assets/images/bad.gif', 'src/content/news/n.md'],
    });
    assert.ok(problems.length >= 2);
  });
});
