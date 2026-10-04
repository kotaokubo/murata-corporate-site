import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSLATABLE_PAGES,
  findStaleTranslations,
  parseChangedPaths,
} from '../check-i18n.mjs';

describe('check-i18n', () => {
  it('訳対象ページ一覧を持つ', () => {
    assert.deepEqual(TRANSLATABLE_PAGES, ['home', 'company', 'history', 'business', 'partners']);
  });

  it('name-only 出力をパス一覧にする', () => {
    const paths = parseChangedPaths('src/content/pages/home.yml\nsrc/lib/i18n.ts\n');
    assert.deepEqual(paths, ['src/content/pages/home.yml', 'src/lib/i18n.ts']);
  });

  it('日本語だけ変わって en/zh が無いとき警告する', () => {
    const exists = (p) =>
      p === 'src/content/pages/en/home.yml' || p === 'src/content/pages/zh/home.yml';
    const stale = findStaleTranslations(['src/content/pages/home.yml'], exists);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].page, 'home');
    assert.deepEqual(stale[0].missing, [
      'src/content/pages/en/home.yml',
      'src/content/pages/zh/home.yml',
    ]);
  });

  it('en と zh も同じ差分に含まれていれば警告しない', () => {
    const exists = () => true;
    const stale = findStaleTranslations(
      [
        'src/content/pages/home.yml',
        'src/content/pages/en/home.yml',
        'src/content/pages/zh/home.yml',
      ],
      exists,
    );
    assert.deepEqual(stale, []);
  });

  it('訳ファイルがまだ無いページは対象外', () => {
    const exists = () => false;
    const stale = findStaleTranslations(['src/content/pages/company.yml'], exists);
    assert.deepEqual(stale, []);
  });

  it('en だけ更新漏れでも警告する', () => {
    const exists = () => true;
    const stale = findStaleTranslations(
      ['src/content/pages/home.yml', 'src/content/pages/zh/home.yml'],
      exists,
    );
    assert.equal(stale.length, 1);
    assert.deepEqual(stale[0].missing, ['src/content/pages/en/home.yml']);
  });
});
