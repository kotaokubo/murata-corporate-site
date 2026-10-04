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

/** srcset の各候補 URL（記述子を除く） */
export function parseSrcset(srcset) {
  if (!srcset || !String(srcset).trim()) return [];
  return String(srcset)
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
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
 * sitemap XML の <loc> からパスを取り、dist 上の存在を確かめる（サイトマップ XML 向け）
 * @param {string} distDir
 * @param {string} xmlPath
 * @param {string} fromPage
 * @returns {string[]} errors
 */
export function checkSitemapLocs(distDir, xmlPath, fromPage) {
  const errors = [];
  if (!existsSync(xmlPath) || !statSync(xmlPath).isFile()) {
    errors.push(`${fromPage} の sitemap が dist にありません（${xmlPath}）。`);
    return errors;
  }
  const xml = readFileSync(xmlPath, 'utf8');
  const locRe = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m;
  while ((m = locRe.exec(xml)) !== null) {
    const loc = m[1].trim();
    let pathname;
    try {
      if (/^https?:\/\//i.test(loc)) {
        pathname = new URL(loc).pathname;
      } else {
        pathname = loc.startsWith('/') ? loc : '/' + loc;
      }
    } catch {
      errors.push(`${fromPage} の sitemap 内 <loc>${loc}</loc> を URL として読めません。`);
      continue;
    }
    const normalized = normalizePathname(pathname);
    if (normalized == null) {
      errors.push(`${fromPage} の sitemap 内 <loc>${loc}</loc> が dist の外を指しています。`);
      continue;
    }
    const target = resolveDistFile(distDir, normalized);
    // サイトマップの loc は XML ファイル（拡張子 .xml）を想定。ファイルとして存在すればよい
    const distAbs = resolve(distDir);
    const rel = normalized.replace(/^\//, '');
    const direct = resolve(distAbs, rel);
    const okFile =
      (target && existsSync(target) && statSync(target).isFile()) ||
      (direct.startsWith(distAbs) && existsSync(direct) && statSync(direct).isFile());
    if (!okFile) {
      errors.push(
        `${fromPage} の sitemap 内 <loc> が指す「${normalized}」が dist にありません。サイトマップの出力を確かめてください。`,
      );
    }
  }
  return errors;
}

/**
 * @param {string} distDir
 * @returns {{ errors: string[], warnings: string[], checked: number }}
 */
export function checkDist(distDir) {
  const errors = [];
  const warnings = [];
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

      // sitemap: 指す XML と、その中の <loc> のサイトマップ XML も確かめる
      if (kind.startsWith('link[href](sitemap)')) {
        errors.push(...checkSitemapLocs(distDir, targetFile, pageUrl));
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
