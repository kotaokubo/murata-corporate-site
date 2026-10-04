// 必須候補チェック「links」。ビルドした dist/ のサイト内リンク先が存在するかを調べる
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ORIGIN = 'https://check.invalid';

/** @param {string} dir */
function walkHtml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkHtml(p, out);
    else if (name.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/**
 * HTML から属性値を雑に取る（静的ビルド向け。依存なし）
 * @param {string} html
 * @param {string} tag
 * @param {string} attr
 */
export function extractAttrs(html, tag, attr) {
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
  const attrRe = new RegExp(`\\b${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const values = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const am = attrRe.exec(attrs);
    if (!am) continue;
    values.push({ value: am[2] ?? am[3] ?? am[4] ?? '', attrs, index: m.index });
  }
  return values;
}

/** @param {string} html */
export function extractIds(html) {
  const ids = new Set();
  const re = /\bid\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[2] ?? m[3] ?? m[4] ?? '';
    if (id) ids.add(id);
  }
  return ids;
}

/** サイト内の参照かどうか */
export function isInternalRef(url) {
  if (url == null) return false;
  const t = String(url).trim();
  // 空・クエリのみ・フラグメントのみは「今のページ」として調べる
  if (t === '' || t.startsWith('#') || t.startsWith('?')) return true;
  if (t.startsWith('mailto:') || t.startsWith('tel:')) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (t.startsWith('//')) return false;
  if (t.startsWith('data:') || t.startsWith('javascript:') || t.startsWith('blob:')) return false;
  return true;
}

/**
 * パスを %xx 復号し、`.` / `..` を処理する。ルートの外へ出たら null。
 * @param {string} pathname URL の pathname（先頭 /）
 * @returns {string | null}
 */
export function normalizePathname(pathname) {
  let raw = pathname || '/';
  if (!raw.startsWith('/')) raw = '/' + raw;
  const hadTrailingSlash = raw.length > 1 && raw.endsWith('/');
  const segments = raw.split('/');
  const out = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i === 0 && seg === '') continue; // 先頭の空（/ の前）
    let decoded;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      return null;
    }
    if (decoded === '' || decoded === '.') continue;
    if (decoded === '..') {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    // パス区切りを含む復号結果はルート外または不正
    if (decoded.includes('/') || decoded.includes('\\') || decoded.includes('\0')) return null;
    out.push(decoded);
  }
  if (out.length === 0) return '/';
  return '/' + out.join('/') + (hadTrailingSlash ? '/' : '');
}

/**
 * ページの公開 URL を基準に WHATWG URL で解決する。
 * href="" / "?" / "#id" は今のページ。クエリは無視。フラグメントは残す。
 * dist の外（.. でルート超え）は outside: true。
 * @param {string} pageUrl 例 /company/ や /404.html
 * @param {string} href
 * @returns {{ pathname: string, fragment: string | null, outside?: boolean } | null}
 */
export function resolveRef(pageUrl, href) {
  const raw = href == null ? '' : String(href);
  // ファイル URL（/404.html）はそのファイルをベースに、ディレクトリ（/company/）はディレクトリをベースに
  let baseHref;
  if (pageUrl === '/') baseHref = ORIGIN + '/';
  else if (pageUrl.endsWith('/')) baseHref = ORIGIN + pageUrl;
  else baseHref = ORIGIN + pageUrl;

  let resolved;
  try {
    resolved = new URL(raw === '' ? baseHref : raw, baseHref);
  } catch {
    return null;
  }

  // 外部スキームは isInternalRef で弾いている想定。ここに来たら無視
  if (resolved.origin !== ORIGIN) return null;

  const fragment = resolved.hash ? resolved.hash.slice(1) : null;
  const normalized = normalizePathname(resolved.pathname);
  if (normalized == null) {
    return { pathname: resolved.pathname, fragment: fragment || null, outside: true };
  }
  return { pathname: normalized, fragment: fragment || null };
}

/**
 * dist 上の実ファイルパスを探す。
 * /company と /company/ → company/index.html
 * /foo.png → foo.png、/foo.html → foo.html
 * ディレクトリが存在するだけでは成功にしない。
 * @param {string} distDir
 * @param {string} pathname
 * @returns {string | null}
 */
export function resolveDistFile(distDir, pathname) {
  const distAbs = resolve(distDir);
  let p = pathname;
  if (!p.startsWith('/')) p = '/' + p;

  /** @param {string} relPosix */
  const asAbs = (relPosix) => {
    const abs = resolve(distAbs, relPosix);
    const rel = relative(distAbs, abs);
    if (rel.startsWith('..') || rel === '' && abs !== distAbs) {
      // dist 外
      if (!abs.startsWith(distAbs + sep) && abs !== distAbs) return null;
    }
    if (!abs.startsWith(distAbs)) return null;
    return abs;
  };

  const rel = p.replace(/^\//, '');

  // 末尾 / または拡張子なし → index.html を要求
  const last = rel.split('/').filter(Boolean).pop() ?? '';
  const hasExt = last.includes('.');

  if (p.endsWith('/') || (rel !== '' && !hasExt)) {
    const idxRel = (rel.replace(/\/$/, '') ? rel.replace(/\/$/, '') + '/' : '') + 'index.html';
    const idx = asAbs(idxRel);
    if (idx && existsSync(idx) && statSync(idx).isFile()) return idx;
    return null;
  }

  // ファイル（拡張子あり）
  const file = asAbs(rel);
  if (file && existsSync(file) && statSync(file).isFile()) return file;
  return null;
}

/** HTML ファイルからサイト内 URL を求める */
export function pageUrlFromFile(distDir, htmlFile) {
  let rel = relative(distDir, htmlFile).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  if (rel.endsWith('.html')) return '/' + rel;
  return '/' + rel;
}

/**
 * srcset の各候補を HTML の解析規則どおりに分ける。
 * 候補 URL は空白まで読み（data: URL はカンマを含みうる）、
 * その後の記述子はカンマまで読む。data: の候補は検査対象外。
 * @param {string} srcset
 * @returns {string[]}
 */
export function parseSrcset(srcset) {
  if (!srcset || !String(srcset).trim()) return [];
  const s = String(srcset);
  /** @type {string[]} */
  const urls = [];
  let pos = 0;

  while (pos < s.length) {
    // 先頭の空白を飛ばす
    while (pos < s.length && /\s/.test(s[pos])) pos++;
    if (pos >= s.length) break;

    // 候補 URL = 空白以外の連続（data: はカンマを含みうる）
    const urlStart = pos;
    while (pos < s.length && !/\s/.test(s[pos])) pos++;
    let url = s.slice(urlStart, pos);

    if (url.endsWith(',')) {
      // 末尾カンマは記述子なしの候補区切り。カンマを除く
      url = url.replace(/,+$/, '');
    } else {
      // 記述子は次のカンマ（または終端）まで。カンマは消費する
      while (pos < s.length && s[pos] !== ',') pos++;
      if (pos < s.length && s[pos] === ',') pos++;
    }

    if (url && !url.startsWith('data:')) urls.push(url);
  }
  return urls;
}

const LINK_RELS = new Set(['stylesheet', 'icon', 'sitemap', 'preload', 'manifest']);

/**
 * @param {string} html
 * @returns {{ kind: string, url: string }[]}
 */
export function collectRefs(html) {
  const refs = [];
  for (const { value } of extractAttrs(html, 'a', 'href')) {
    refs.push({ kind: 'a[href]', url: value });
  }
  for (const { value } of extractAttrs(html, 'img', 'src')) {
    refs.push({ kind: 'img[src]', url: value });
  }
  for (const { value } of extractAttrs(html, 'img', 'srcset')) {
    for (const u of parseSrcset(value)) refs.push({ kind: 'img[srcset]', url: u });
  }
  for (const { value } of extractAttrs(html, 'source', 'srcset')) {
    for (const u of parseSrcset(value)) refs.push({ kind: 'source[srcset]', url: u });
  }
  for (const { value, attrs } of extractAttrs(html, 'link', 'href')) {
    const relM = /\brel\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const relRaw = (relM ? (relM[2] ?? relM[3] ?? relM[4] ?? '') : '').toLowerCase();
    const tokens = relRaw.split(/\s+/).filter(Boolean);
    const isIcon = tokens.some((t) => t === 'icon' || t.endsWith('-icon'));
    const label = tokens.find((t) => LINK_RELS.has(t)) || (isIcon ? 'icon' : null);
    if (label) {
      refs.push({ kind: `link[href](${label})`, url: value });
    }
  }
  for (const { value } of extractAttrs(html, 'script', 'src')) {
    refs.push({ kind: 'script[src]', url: value });
  }
  return refs;
}

/**
 * astro.config.mjs の本文から site（オリジン）を正規表現で読む。
 * @param {string} source
 * @returns {string | null} 例 https://www.murata-jewelry.co.jp
 */
export function readSiteOrigin(source) {
  const m = /\bsite\s*:\s*['"](https?:\/\/[^'"]+)['"]/.exec(source);
  if (!m) return null;
  try {
    const u = new URL(m[1]);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * dist 上のファイルパスを探す（ページ解決 + .xml の直接解決）。
 * @param {string} distDir
 * @param {string} pathname
 * @returns {string | null}
 */
function resolveSitemapTarget(distDir, pathname) {
  const page = resolveDistFile(distDir, pathname);
  if (page) return page;
  const distAbs = resolve(distDir);
  const rel = pathname.replace(/^\//, '');
  const direct = resolve(distAbs, rel);
  if (direct.startsWith(distAbs + sep) || direct === distAbs) {
    if (existsSync(direct) && statSync(direct).isFile()) return direct;
  }
  return null;
}

/**
 * 子の sitemap XML が最低限の形をしているか確かめる。
 * - （任意の XML 宣言のあと）`<urlset` または `<sitemapindex` で始まる
 * - 対応する閉じタグで終わる
 * - `<loc>` の開きと閉じの数が一致し、1 つ以上ある
 * @param {string} xml
 * @returns {string | null} 問題があれば理由、なければ null
 */
export function validateSitemapXmlShape(xml) {
  const trimmed = String(xml).replace(/^\uFEFF/, '').trim();
  // 先頭の XML 宣言は許す
  const body = trimmed.replace(/^<\?xml\b[^>]*\?>\s*/i, '');
  const openUrlset = /^<urlset\b/i.test(body);
  const openIndex = /^<sitemapindex\b/i.test(body);
  if (!openUrlset && !openIndex) {
    return '先頭が <urlset> または <sitemapindex> ではありません';
  }
  const closeTag = openUrlset ? '</urlset>' : '</sitemapindex>';
  const closeRe = openUrlset ? /<\/urlset>\s*$/i : /<\/sitemapindex>\s*$/i;
  if (!closeRe.test(body)) {
    return `対応する閉じタグ ${closeTag} で終わっていません`;
  }
  const openLocs = (body.match(/<loc\b/gi) || []).length;
  const closeLocs = (body.match(/<\/loc>/gi) || []).length;
  if (openLocs !== closeLocs) {
    return `<loc> の開き（${openLocs}）と閉じ（${closeLocs}）の数が一致しません`;
  }
  if (openLocs < 1) {
    return '<loc> が 1 つもありません';
  }
  return null;
}

/**
 * sitemap XML の <loc> を確かめる。
 * - ホストは siteOrigin と一致必須
 * - パスは dist に存在すること
 * - サイトマップインデックスの子 XML 内の <loc> はページとして解決する
 * - 子 XML は形（urlset/sitemapindex・loc の対応）を満たすこと
 * @param {string} distDir
 * @param {string} xmlPath
 * @param {string} fromPage
 * @param {string} siteOrigin
 * @param {{ asPages?: boolean }} [opts] asPages=true なら子（urlset）の loc をページとして扱う
 * @returns {string[]} errors
 */
export function checkSitemapLocs(distDir, xmlPath, fromPage, siteOrigin, opts = {}) {
  const { asPages = false } = opts;
  const errors = [];
  if (!existsSync(xmlPath) || !statSync(xmlPath).isFile()) {
    errors.push(`${fromPage} の sitemap が dist にありません（${xmlPath}）。`);
    return errors;
  }
  const xml = readFileSync(xmlPath, 'utf8');

  // 子 XML（asPages）は形を確かめてから loc を読む
  if (asPages) {
    const shapeError = validateSitemapXmlShape(xml);
    if (shapeError) {
      errors.push(`${fromPage} の sitemap 子 XML（${xmlPath}）が不正です: ${shapeError}。`);
      return errors;
    }
  }

  const isIndex = /<sitemapindex\b/i.test(xml);
  const locRe = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m;
  while ((m = locRe.exec(xml)) !== null) {
    const loc = m[1].trim();
    let url;
    try {
      url = new URL(loc);
    } catch {
      errors.push(
        `${fromPage} の sitemap 内 <loc>${loc}</loc> を URL として読めません。絶対 URL（${siteOrigin}…）にしてください。`,
      );
      continue;
    }
    if (url.origin !== siteOrigin) {
      errors.push(
        `${fromPage} の sitemap 内 <loc>${loc}</loc> のホストが site（${siteOrigin}）と一致しません。`,
      );
      continue;
    }
    const normalized = normalizePathname(url.pathname);
    if (normalized == null) {
      errors.push(`${fromPage} の sitemap 内 <loc>${loc}</loc> が dist の外を指しています。`);
      continue;
    }

    if (asPages || (!isIndex && !normalized.endsWith('.xml'))) {
      // ページとして dist に存在するか（既存のページ解決規則）
      const target = resolveDistFile(distDir, normalized);
      if (!target) {
        errors.push(
          `${fromPage} の sitemap 内 <loc> が指すページ「${normalized}」が dist にありません。サイトマップの出力を確かめてください。`,
        );
      }
      continue;
    }

    // インデックスの子 XML、または .xml への参照
    const target = resolveSitemapTarget(distDir, normalized);
    if (!target) {
      errors.push(
        `${fromPage} の sitemap 内 <loc> が指す「${normalized}」が dist にありません。サイトマップの出力を確かめてください。`,
      );
      continue;
    }
    if (isIndex && target.endsWith('.xml')) {
      // 子 XML の <loc> をページとして確かめる
      errors.push(...checkSitemapLocs(distDir, target, fromPage, siteOrigin, { asPages: true }));
    }
  }
  return errors;
}

/**
 * @param {string} distDir
 * @param {{ siteOrigin?: string | null }} [options]
 * @returns {{ errors: string[], warnings: string[], checked: number }}
 */
export function checkDist(distDir, options = {}) {
  const errors = [];
  const warnings = [];

  let siteOrigin = options.siteOrigin;
  if (siteOrigin === undefined) {
    const configPath = join(ROOT, 'astro.config.mjs');
    if (!existsSync(configPath)) {
      return {
        errors: ['astro.config.mjs がありません。site を読めないためリンクチェックを続けられません。'],
        warnings: [],
        checked: 0,
      };
    }
    siteOrigin = readSiteOrigin(readFileSync(configPath, 'utf8'));
  }
  if (!siteOrigin) {
    return {
      errors: [
        'astro.config.mjs から site を読めませんでした。`site: \'https://…\'` の形になっているか確かめてください。',
      ],
      warnings: [],
      checked: 0,
    };
  }

  const htmlFiles = walkHtml(distDir);
  /** @type {Map<string, Set<string>>} */
  const idCache = new Map();

  const idsFor = (file) => {
    if (!idCache.has(file)) idCache.set(file, extractIds(readFileSync(file, 'utf8')));
    return idCache.get(file);
  };

  let checked = 0;
  for (const htmlFile of htmlFiles) {
    const pageUrl = pageUrlFromFile(distDir, htmlFile);
    const html = readFileSync(htmlFile, 'utf8');
    const pageIds = extractIds(html);
    idCache.set(htmlFile, pageIds);

    for (const ref of collectRefs(html)) {
      const { kind, url } = ref;
      if (!isInternalRef(url)) continue;
      const resolved = resolveRef(pageUrl, url);
      if (!resolved) continue;
      checked++;

      if (resolved.outside) {
        errors.push(
          `${pageUrl} の ${kind}「${url}」→ dist の外を指しています。パスを直してください。`,
        );
        continue;
      }

      const targetFile = resolveDistFile(distDir, resolved.pathname);
      if (!targetFile) {
        errors.push(
          `${pageUrl} の ${kind}「${url}」→ 指す先（${resolved.pathname}）が dist にありません。リンク先のパスを直すか、ページを足してください。`,
        );
        continue;
      }

      // sitemap: 指す XML と、インデックスの子 XML 内の <loc>（ページ）も確かめる
      if (kind.startsWith('link[href](sitemap)')) {
        errors.push(...checkSitemapLocs(distDir, targetFile, pageUrl, siteOrigin));
      }

      if (resolved.fragment) {
        const ids = targetFile === htmlFile ? pageIds : idsFor(targetFile);
        if (!ids.has(resolved.fragment)) {
          warnings.push(
            `${pageUrl} の ${kind}「${url}」→ 移動先に id="${resolved.fragment}" がありません（警告のみ）。該当する見出しや欄に id を付けるか、リンクを外してください。`,
          );
        }
      }
    }
  }

  return { errors, warnings, checked };
}

function writeSummary(text) {
  const { GITHUB_STEP_SUMMARY } = process.env;
  if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, text);
}

function main() {
  const distDir = resolve(ROOT, process.argv[2] || 'dist');
  if (!existsSync(distDir)) {
    console.error('dist がありません。先に npm run build を実行してください。');
    process.exit(2);
  }

  const { errors, warnings, checked } = checkDist(distDir);
  let summary = `## サイト内リンクチェック\n\n調べた参照：${checked} 件\n\n`;

  if (warnings.length) {
    summary += '### 警告（失敗にはしません）\n\n';
    for (const w of warnings) summary += `- ${w}\n`;
    summary += '\n';
  }
  if (errors.length) {
    summary += '**失敗：次のリンク先が見つかりません。**\n\n';
    for (const e of errors) summary += `- ${e}\n`;
    summary += '\n';
    console.error(summary);
    writeSummary(summary);
    process.exit(1);
  }

  if (!warnings.length) summary += '問題はありませんでした。\n';
  else summary += 'リンク切れはありませんでした（警告のみ）。\n';
  console.log(summary);
  writeSummary(summary);
  process.exit(0);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main();
