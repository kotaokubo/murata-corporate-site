// 必須候補チェック「images」。追加・変更された画像の形式・大きさ・寸法と、お知らせ本文の空の画像説明を調べる
// 空の説明は同一行の ![](…) / ![][ref] / <img alt=""> / alt 無し <img> のみ対象。複数行にまたがる書き方は対象外。
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectFormat, readImageSize } from './image-size.mjs';

/** 3 MiB */
const MAX_BYTES = 3_145_728;
const MAX_EDGE = 2400;
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_FORMAT = new Set(['jpeg', 'png', 'webp']);
const EXT_TO_FORMAT = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' };

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** @param {string} p repo-relative path with / */
export function isImageTargetPath(p) {
  const n = p.replace(/\\/g, '/');
  // 拡張子で先に絞らない。通常ファイルはすべて候補
  if (n.startsWith('src/assets/images/') || n.startsWith('public/images/')) return true;
  // news 配下は .md 以外を画像候補にする
  if (n.startsWith('src/content/news/') && !n.endsWith('.md')) return true;
  return false;
}

/** @param {string} p */
export function isNewsMarkdown(p) {
  const n = p.replace(/\\/g, '/');
  return n.startsWith('src/content/news/') && n.endsWith('.md');
}

/**
 * @param {string} filePath
 * @param {Buffer} buf
 * @param {{ size: number }} stats
 * @returns {string[]} 問題の説明（日本語）
 */
export function checkImageBuffer(filePath, buf, stats) {
  const problems = [];
  const ext = extname(filePath).toLowerCase();
  const format = detectFormat(buf);

  if (!ALLOWED_EXT.has(ext)) {
    problems.push(
      `${filePath}: 形式が jpg / jpeg / png / webp 以外です（拡張子 ${ext || 'なし'}）。対応する形式に変換してください。`,
    );
  } else if (!format || !ALLOWED_FORMAT.has(format)) {
    problems.push(
      `${filePath}: ファイルの中身が jpg / png / webp ではありません。壊れているか、別の形式の可能性があります。`,
    );
  } else if (EXT_TO_FORMAT[ext] !== format) {
    problems.push(
      `${filePath}: 拡張子は ${ext} ですが中身は ${format} です。拡張子と中身を揃えてください。`,
    );
  }

  if (stats.size > MAX_BYTES) {
    const mb = (stats.size / (1024 * 1024)).toFixed(1);
    problems.push(
      `${filePath}: ファイルサイズが ${mb}MB で 3MiB（3,145,728 バイト）を超えています。圧縮するか長い辺を縮めてください。`,
    );
  }

  // 許可形式として通ったものだけ寸法を見る。寸法が読めなければ失敗
  if (ALLOWED_EXT.has(ext) && format && ALLOWED_FORMAT.has(format) && EXT_TO_FORMAT[ext] === format) {
    const dim = readImageSize(buf);
    if (!dim) {
      problems.push(
        `${filePath}: 画像の構造が不正か、縦横サイズを読めません。ファイルが切れていないか確かめてください。`,
      );
    } else {
      const long = Math.max(dim.width, dim.height);
      if (long > MAX_EDGE) {
        problems.push(
          `${filePath}: 長い辺が ${long}px で ${MAX_EDGE}px を超えています（${dim.width}×${dim.height}）。推奨は長い辺 2000px まで。2400px を超えると失敗します。`,
        );
      }
    }
  } else if (ALLOWED_EXT.has(ext) && format && ALLOWED_FORMAT.has(format)) {
    // 拡張子と中身が食い違っている場合も寸法は読もうとしない（上で既に失敗）
  } else if (ALLOWED_EXT.has(ext) && (!format || !ALLOWED_FORMAT.has(format))) {
    // 中身不正は上で報告済み。寸法も読めない旨は重複するので足さない
  }

  return problems;
}

/**
 * Markdown / HTML の画像で説明（alt）が空のもの。
 * 同一行のみ。複数行にまたがる書き方は対象外。
 * @param {string} content
 * @param {string} filePath
 * @returns {string[]}
 */
export function checkMarkdownImageAlts(content, filePath) {
  const problems = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // ![alt](url) — alt が空または空白のみ
    const inlineRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let m;
    while ((m = inlineRe.exec(line)) !== null) {
      if (m[1].trim() === '') {
        problems.push(
          `${filePath}:${lineNo}: 画像の説明（![説明](パス) の「説明」）が空です。何の画像か分かる短い説明を書いてください。`,
        );
      }
    }

    // ![alt][ref] — alt が空または空白のみ
    const refRe = /!\[([^\]]*)\]\[([^\]]+)\]/g;
    while ((m = refRe.exec(line)) !== null) {
      if (m[1].trim() === '') {
        problems.push(
          `${filePath}:${lineNo}: 画像の説明（![説明][参照] の「説明」）が空です。何の画像か分かる短い説明を書いてください。`,
        );
      }
    }

    // <img ...> — alt が無い、または空
    const imgRe = /<img\b([^>]*)>/gi;
    while ((m = imgRe.exec(line)) !== null) {
      const attrs = m[1];
      const altM = /\balt\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      if (!altM) {
        problems.push(
          `${filePath}:${lineNo}: <img> に alt がありません。何の画像か分かる短い説明を alt に書いてください。`,
        );
        continue;
      }
      const alt = altM[2] ?? altM[3] ?? altM[4] ?? '';
      if (alt.trim() === '') {
        problems.push(
          `${filePath}:${lineNo}: <img> の alt が空です。何の画像か分かる短い説明を書いてください。`,
        );
      }
    }
  }

  return problems;
}

/** @param {string} dir absolute */
function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, out);
    else if (name.isFile()) out.push(p);
  }
  return out;
}

/** @returns {string[]} repo-relative paths */
export function listTargetFiles({ baseSha, headSha, root = ROOT } = {}) {
  if (baseSha && headSha) {
    const buf = execFileSync(
      'git',
      ['diff', '-z', '--name-only', '--diff-filter=AM', '--no-renames', `${baseSha}...${headSha}`],
      { cwd: root, maxBuffer: 32 * 1024 * 1024 },
    );
    const names = buf.toString('utf8').split('\0').filter(Boolean);
    return names.filter((p) => isImageTargetPath(p) || isNewsMarkdown(p));
  }

  const found = [];
  for (const rel of ['src/assets/images', 'public/images', 'src/content/news']) {
    const abs = join(root, rel);
    for (const f of walkFiles(abs)) {
      const r = relative(root, f).replace(/\\/g, '/');
      if (isImageTargetPath(r) || isNewsMarkdown(r)) found.push(r);
    }
  }
  return found;
}

/**
 * @param {{ files?: string[], root?: string }} opts
 * @returns {{ problems: string[], checked: number }}
 */
export function runImageChecks({ files, root = ROOT } = {}) {
  const targets = files ?? listTargetFiles({ root });
  const problems = [];
  let checked = 0;

  for (const rel of targets) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const st = statSync(abs);
    if (!st.isFile()) continue;

    if (isNewsMarkdown(rel)) {
      checked++;
      problems.push(...checkMarkdownImageAlts(readFileSync(abs, 'utf8'), rel));
      continue;
    }
    if (!isImageTargetPath(rel)) continue;

    checked++;
    const buf = readFileSync(abs);
    problems.push(...checkImageBuffer(rel, buf, { size: st.size }));
  }

  return { problems, checked };
}

function writeSummary(text) {
  const { GITHUB_STEP_SUMMARY } = process.env;
  if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, text);
}

function main() {
  const { BASE_SHA, HEAD_SHA } = process.env;
  const files = listTargetFiles({ baseSha: BASE_SHA, headSha: HEAD_SHA });
  const { problems, checked } = runImageChecks({ files });

  let summary = `## 画像チェック\n\n調べたファイル：${checked} 件\n\n`;
  if (problems.length === 0) {
    summary += '問題はありませんでした。\n';
    console.log(summary);
    writeSummary(summary);
    process.exit(0);
  }

  summary += '**失敗：次の問題を直してください。**\n\n';
  for (const p of problems) summary += `- ${p}\n`;
  summary += '\n';
  console.error(summary);
  writeSummary(summary);
  process.exit(1);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main();
