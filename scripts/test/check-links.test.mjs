import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDist,
  resolveRef,
  isInternalRef,
  resolveDistFile,
  parseSrcset,
  normalizePathname,
} from '../check-links.mjs';

const tmp = join(dirname(fileURLToPath(import.meta.url)), '.tmp-links');

describe('check-links', () => {
  before(() => {
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(join(tmp, 'company'), { recursive: true });
    mkdirSync(join(tmp, 'empty-dir'), { recursive: true });
    writeFileSync(
      join(tmp, 'index.html'),
      `<!doctype html><html><body>
        <a href="/company/">会社</a>
        <a href="/company">会社（スラッシュ無し）</a>
        <a href="/missing/">無い</a>
        <a href="/#faq">FAQ</a>
        <a href="#contact">問い合わせ</a>
        <a href="">今のページ</a>
        <a href="?x=1">クエリのみ</a>
        <a href="#missing-id">無い id</a>
        <a href="https://example.com/">外部</a>
        <a href="mailto:a@b.c">mail</a>
        <a href="/%2e%2e%2f%2e%2e%2fsecret.txt">エンコードされた ..（ルート外）</a>
        <section id="contact">c</section>
        <img src="/logo.png" srcset="/logo.png 1x, /missing@2x.png 2x" />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="sitemap" href="/sitemap-index.xml" />
        <script src="/app.js"></script>
      </body></html>`,
    );
    writeFileSync(
      join(tmp, 'company/index.html'),
      `<!doctype html><html><body>
        <h1 id="about">会社</h1>
        <a href="../logo.png">相対</a>
        <img srcset="/logo.png 1x, /styles.css 2x" />
      </body></html>`,
    );
    writeFileSync(join(tmp, '404.html'), `<!doctype html><html><body><a href="/company/">c</a></body></html>`);
    writeFileSync(join(tmp, 'logo.png'), 'x');
    writeFileSync(join(tmp, 'styles.css'), 'body{}');
    writeFileSync(join(tmp, 'app.js'), '');
    writeFileSync(
      join(tmp, 'sitemap-index.xml'),
      `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://www.example.com/sitemap-0.xml</loc></sitemap></sitemapindex>`,
    );
    writeFileSync(join(tmp, 'sitemap-0.xml'), `<?xml version="1.0"?><urlset></urlset>`);
  });
  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('外部と mailto は調べない', () => {
    assert.equal(isInternalRef('https://example.com/'), false);
    assert.equal(isInternalRef('mailto:a@b.c'), false);
    assert.equal(isInternalRef('/company/'), true);
    assert.equal(isInternalRef('#contact'), true);
    assert.equal(isInternalRef(''), true);
    assert.equal(isInternalRef('?x'), true);
  });

  it('パスを WHATWG URL で解決する', () => {
    assert.deepEqual(resolveRef('/', '/company/?x=1#about'), {
      pathname: '/company/',
      fragment: 'about',
    });
    assert.deepEqual(resolveRef('/news/a/', '../b/'), { pathname: '/news/b/', fragment: null });
    assert.deepEqual(resolveRef('/', '#faq'), { pathname: '/', fragment: 'faq' });
    assert.deepEqual(resolveRef('/company/', ''), { pathname: '/company/', fragment: null });
    assert.deepEqual(resolveRef('/404.html', '#x'), { pathname: '/404.html', fragment: 'x' });
  });

  it('.. で dist の外を指すと outside', () => {
    // WHATWG は通常の .. をルートで止めるので、%2e%2e%2f のように1セグメントに仕込んだものを使う
    const r = resolveRef('/', '/%2e%2e%2f%2e%2e%2fsecret.txt');
    assert.equal(r.outside, true);
  });

  it('パーセントエンコードを復号する', () => {
    assert.equal(normalizePathname('/a%2Fb'), null); // 復号後に / を含む → ルート外扱い
    assert.equal(normalizePathname('/foo%2ebar'), '/foo.bar');
  });

  it('srcset の候補を分ける', () => {
    assert.deepEqual(parseSrcset('/a.png 1x, /b.png 2x'), ['/a.png', '/b.png']);
  });

  it('/company と /company/ の両方を index.html に解決する', () => {
    assert.ok(resolveDistFile(tmp, '/company/').endsWith('company/index.html'));
    assert.ok(resolveDistFile(tmp, '/company').endsWith('company/index.html'));
    assert.ok(resolveDistFile(tmp, '/logo.png').endsWith('logo.png'));
    assert.ok(resolveDistFile(tmp, '/404.html').endsWith('404.html'));
  });

  it('ディレクトリがあるだけでは成功にしない', () => {
    assert.equal(resolveDistFile(tmp, '/empty-dir/'), null);
    assert.equal(resolveDistFile(tmp, '/empty-dir'), null);
  });

  it('存在するページは成功、無いページは失敗、無い id は警告だけ', () => {
    const { errors, warnings } = checkDist(tmp);
    assert.ok(errors.some((e) => e.includes('/missing/')));
    assert.ok(!errors.some((e) => e.includes('「/company/') && e.includes('ありません')));
    assert.ok(warnings.some((w) => w.includes('id="faq"')));
    assert.ok(warnings.some((w) => w.includes('id="missing-id"')));
    assert.ok(!warnings.some((w) => w.includes('id="contact"')));
    assert.ok(!errors.some((e) => e.includes('#faq')));
  });

  it('srcset の欠けた候補を失敗にする', () => {
    const { errors } = checkDist(tmp);
    assert.ok(errors.some((e) => e.includes('missing@2x.png')));
  });

  it('dist の外への参照を失敗にする', () => {
    const { errors } = checkDist(tmp);
    assert.ok(errors.some((e) => e.includes('外を指して')));
  });

  it('404.html も検査対象に含む', () => {
    // 404.html 内の /company/ は成功するので、エラーに 404 由来の欠けは出ない
    // pageUrl /404.html が検査されていることの煙テスト: ファイルを壊して確認
    writeFileSync(join(tmp, '404.html'), `<!doctype html><a href="/no-from-404/"></a>`);
    const { errors } = checkDist(tmp);
    assert.ok(errors.some((e) => e.includes('/404.html') && e.includes('/no-from-404/')));
    // 後続テストのため戻す
    writeFileSync(join(tmp, '404.html'), `<!doctype html><html><body><a href="/company/">c</a></body></html>`);
  });
});
