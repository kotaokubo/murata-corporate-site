// 警告のみ「i18n」。日本語ページ YAML が変わったのに en/zh 訳が同じ PR で変わっていなければ警告（常に exit 0）
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ZERO_SHA = /^0+$/;

/** 訳対象ページ（ファイル名の stem）。home / company / history / business / partners */
export const TRANSLATABLE_PAGES = ['home', 'company', 'history', 'business', 'partners'];

/**
 * 変更されたパス一覧から、日本語 YAML が変わり訳ファイルが揃っていないページを拾う。
 * 訳ファイルがまだ無いページは対象外。
 * @param {string[]} changedPaths
 * @param {(rel: string) => boolean} existsFn
 */
export function findStaleTranslations(changedPaths, existsFn = (rel) => existsSync(resolve(ROOT, rel))) {
  const normalized = changedPaths.map((p) => p.replace(/\\/g, '/'));
  const changed = new Set(normalized);
  /** @type {{ page: string, ja: string, missing: string[] }[]} */
  const stale = [];

  for (const page of TRANSLATABLE_PAGES) {
    const ja = `src/content/pages/${page}.yml`;
    const en = `src/content/pages/en/${page}.yml`;
    const zh = `src/content/pages/zh/${page}.yml`;
    // この PR で消した訳（差分にあるが、もう存在しない）
    const deleted = [en, zh].filter((p) => changed.has(p) && !existsFn(p));

    /** @type {string[]} */
    const missing = [...deleted];
    if (changed.has(ja)) {
      // 訳ファイルがまだ無いページは対象外
      const hasTranslation = [en, zh].some((p) => existsFn(p) || changed.has(p));
      if (!hasTranslation) continue;
      // 変えていない訳を挙げる
      for (const p of [en, zh]) {
        if (!changed.has(p) && !missing.includes(p)) missing.push(p);
      }
    }
    if (missing.length) stale.push({ page, ja, missing });
  }
  return stale;
}

/**
 * git diff --name-only の出力を行に分ける
 * @param {string} output
 */
export function parseChangedPaths(output) {
  return output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function writeSummary(text) {
  const { GITHUB_STEP_SUMMARY } = process.env;
  if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, text);
}

function main() {
  const { BASE_SHA, HEAD_SHA } = process.env;
  if (!BASE_SHA || !HEAD_SHA) {
    process.exit(0);
  }

  if (ZERO_SHA.test(BASE_SHA)) {
    const msg =
      '## 翻訳の鮮度（警告のみ）\n\n最初の push（比較元コミットが無い）のため、調べずに終了します。\n';
    console.log(msg);
    writeSummary(msg);
    process.exit(0);
  }

  const output = execFileSync(
    'git',
    ['diff', '--name-only', '--no-renames', `${BASE_SHA}...${HEAD_SHA}`],
    { encoding: 'utf8', cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
  );
  const changed = parseChangedPaths(output);
  const stale = findStaleTranslations(changed);

  let summary = `## 翻訳の鮮度（警告のみ）\n\n`;

  if (stale.length === 0) {
    summary += '日本語ページの文言変更に対し、未更新の英語・中国語訳はありませんでした。\n';
    console.log(summary);
    writeSummary(summary);
    process.exit(0);
  }

  summary += `警告：${stale.length} 件（このチェックでは失敗しません）\n\n`;
  for (const row of stale) {
    const missingList = row.missing.map((m) => `\`${m}\``).join('、');
    const message = `\`${row.ja}\` の英語と中国語の訳が、日本語と合っていないおそれがあります（${missingList} が変わっていないか、消えています）。訳も直すか、直さない理由を PR に書いてください。`;
    console.log(`::warning file=${row.ja}::${message}`);
    summary += `- ${message}\n`;
  }
  summary += '\n';

  console.log(summary);
  writeSummary(summary);
  process.exit(0);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main();
