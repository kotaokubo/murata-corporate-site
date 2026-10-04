// 警告のみ「pii」。PR の追加行に電話番号・メールらしき文字列があれば GitHub 警告を出す（常に exit 0）
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TEXT_EXT = new Set([
  '.md',
  '.astro',
  '.ts',
  '.js',
  '.json',
  '.yml',
  '.yaml',
  '.html',
  '.txt',
  '.css',
  '.svg',
  '.xml',
  '.csv',
]);
const SKIP_FILES = new Set(['package-lock.json']);
const ZERO_SHA = /^0+$/;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * 全角の数字・記号を半角にし、数字に挟まれたハイフン類を `-` にそろえる
 * @param {string} s
 */
export function normalizePiiText(s) {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code >= 0xff10 && code <= 0xff19) {
      out += String.fromCharCode(code - 0xff10 + 0x30); // ０-９
    } else if (code >= 0xff21 && code <= 0xff3a) {
      out += String.fromCharCode(code - 0xff21 + 0x41); // Ａ-Ｚ
    } else if (code >= 0xff41 && code <= 0xff5a) {
      out += String.fromCharCode(code - 0xff41 + 0x61); // ａ-ｚ
    } else if (ch === '＋') {
      out += '+';
    } else if (ch === '＠') {
      out += '@';
    } else if (ch === '．') {
      out += '.';
    } else if (ch === '（') {
      out += '(';
    } else if (ch === '）') {
      out += ')';
    } else if (ch === '　') {
      out += ' ';
    } else {
      out += ch;
    }
  }
  // 数字に挟まれたハイフン類を ASCII `-` に
  out = out.replace(
    /(?<=\d)[\u002d\u2010\u2011\u2013\u2014\u2212\u30fc\uff0d](?=\d)/g,
    '-',
  );
  return out;
}

/**
 * site.ts の本文から会社の正当な連絡先を正規表現で読む（import しない）
 * @param {string} source
 * @returns {{ phones: Set<string>, emails: Set<string>, found: boolean }}
 */
/**
 * 電話番号を数字だけにそろえる。+81 は先頭を 0 に戻した国内形式にする。
 * @param {string} s
 */
export function toPhoneDigits(s) {
  const normalized = normalizePiiText(s);
  let digits = normalized.replace(/\D/g, '');
  if (/^\s*\+81/.test(normalized) || normalized.includes('+81')) {
    const rest = digits.startsWith('81') ? digits.slice(2) : digits;
    digits = rest.startsWith('0') ? rest : '0' + rest;
  }
  return digits;
}

export function extractCompanyAllowlist(source) {
  const phones = new Set();
  const emails = new Set();

  const telRe = /\btel\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = telRe.exec(source)) !== null) {
    phones.add(toPhoneDigits(m[1]));
  }

  const emailRe = /\bemail\s*:\s*['"]([^'"]+)['"]/g;
  while ((m = emailRe.exec(source)) !== null) {
    emails.add(normalizePiiText(m[1]).toLowerCase());
  }

  return { phones, emails, found: phones.size > 0 || emails.size > 0 };
}

/** 互換エイリアス（normalizePiiText と同じ） */
export function normalizePhone(s) {
  return normalizePiiText(s);
}

/**
 * PII 検査の対象パスか。
 * src/・public/・docs/、ルート直下の *.md、.github/ 配下の .md/.yml/.yaml。
 * package-lock.json は除く。
 * @param {string} path
 */
export function isPiiTargetPath(path) {
  const n = path.replace(/\\/g, '/');
  const base = n.split('/').pop() ?? '';
  if (SKIP_FILES.has(base)) return false;

  if (n.startsWith('src/') || n.startsWith('public/') || n.startsWith('docs/')) {
    return TEXT_EXT.has(extname(n).toLowerCase());
  }
  // リポジトリルート直下の *.md
  if (!n.includes('/') && n.toLowerCase().endsWith('.md')) return true;
  // .github/ 配下のテキスト
  if (n.startsWith('.github/')) {
    const ext = extname(n).toLowerCase();
    return ext === '.md' || ext === '.yml' || ext === '.yaml';
  }
  return false;
}

/**
 * unified diff（-U0）から追加行を取る。
 * ファイルヘッダーの `+++` は hunk の外だけ。hunk 内の `+++` 始まりは追加行。
 * @param {string} diff
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function parseAddedLines(diff) {
  const added = [];
  let file = null;
  let track = false;
  let inHunk = false;
  let newLine = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      inHunk = false;
      continue;
    }
    // ファイルヘッダーの +++ は hunk の外だけ
    if (!inHunk && raw.startsWith('+++ ')) {
      const p = raw.slice(4).trim();
      file = p === '/dev/null' ? null : p.replace(/^b\//, '');
      track = Boolean(file && isPiiTargetPath(file));
      continue;
    }
    if (raw.startsWith('@@ ')) {
      inHunk = true;
      const m = /\+(\d+)/.exec(raw);
      newLine = m ? Number(m[1]) : 0;
      continue;
    }
    if (!track || !inHunk) continue;
    if (raw.startsWith('+')) {
      added.push({ file, line: newLine, text: raw.slice(1) });
      newLine++;
    } else if (raw.startsWith('-') || raw.startsWith('\\')) {
      // 削除行と「No newline」は新側の行番号を進めない
    } else if (raw.startsWith(' ')) {
      newLine++;
    }
  }
  return added;
}

/**
 * 正規化済みテキストから電話番号候補を取る。
 * 0 始まりで間に空白・ハイフン・括弧を許す 10〜11 桁、または +81（(0) 可）。
 * 前後が数字でないこと。
 * @param {string} normalized
 * @returns {string[]}
 */
export function findPhoneMatches(normalized) {
  /** @type {{ start: number, end: number, value: string }[]} */
  const candidates = [];
  // +81 形式（直後に (0) や区切りを許す）
  const plusRe =
    /\+81(?:[\s\-()]*\(0\)|[\s\-()]*)(?:[\s\-()]*\d){9,10}(?!\d)/g;
  // 0 始まり（国内）。括弧の直後の 0 だけは +81 (0)… の一部なので後で重なり除去する
  const zeroRe = /(?<![0-9+])0(?:[\s\-()]*\d){9,10}(?!\d)/g;

  /** @param {RegExp} re */
  const collect = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(normalized)) !== null) {
      const value = m[0];
      const digits = value.replace(/\D/g, '');
      if (value.startsWith('+81')) {
        const national = digits.slice(2);
        const n = national.startsWith('0') ? national : '0' + national;
        if (n.length < 10 || n.length > 11) continue;
      } else if (digits.length < 10 || digits.length > 11) {
        continue;
      } else if (!/^0\d{9,10}$/.test(digits)) {
        continue;
      }
      candidates.push({ start: m.index, end: m.index + value.length, value });
    }
  };

  collect(plusRe);
  collect(zeroRe);
  candidates.sort((a, b) => a.start - b.start || b.end - a.end);
  const hits = [];
  let lastEnd = -1;
  for (const c of candidates) {
    if (c.start < lastEnd) continue;
    hits.push(c.value);
    lastEnd = c.end;
  }
  return hits;
}

/**
 * @param {string} text
 * @param {{ phones: Set<string>, emails: Set<string> }} allow
 * @returns {{ kind: 'phone'|'email', value: string }[]}
 */
export function findPiiInText(text, allow) {
  const normalized = normalizePiiText(text);
  const hits = [];

  for (const value of findPhoneMatches(normalized)) {
    const key = toPhoneDigits(value);
    if (allow.phones.has(key)) continue;
    hits.push({ kind: 'phone', value });
  }

  for (const m of normalized.matchAll(EMAIL_RE)) {
    const value = m[0];
    if (allow.emails.has(value.toLowerCase())) continue;
    hits.push({ kind: 'email', value });
  }
  return hits;
}

/**
 * @param {{ added: { file: string, line: number, text: string }[], allow: { phones: Set<string>, emails: Set<string> } }} opts
 */
export function collectPiiWarnings({ added, allow }) {
  /** @type {{ file: string, line: number, kind: string, value: string, message: string }[]} */
  const warnings = [];
  for (const row of added) {
    for (const hit of findPiiInText(row.text, allow)) {
      const label = hit.kind === 'phone' ? '電話番号' : 'メールアドレス';
      warnings.push({
        file: row.file,
        line: row.line,
        kind: hit.kind,
        value: hit.value,
        message: `個人情報らしき${label}「${hit.value}」が追加されています。公開してよい連絡先か確かめてください。会社の掲載用連絡先なら問題ありません。`,
      });
    }
  }
  return warnings;
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
      '## 個人情報らしき文字列（警告のみ）\n\n最初の push（比較元コミットが無い）のため、調べずに終了します。\n';
    console.log(msg);
    writeSummary(msg);
    process.exit(0);
  }

  const sitePath = join(ROOT, 'src/lib/site.ts');
  /** @type {{ phones: Set<string>, emails: Set<string>, found: boolean }} */
  let allow = { phones: new Set(), emails: new Set(), found: false };
  /** @type {string[]} */
  const metaWarnings = [];

  if (existsSync(sitePath)) {
    allow = extractCompanyAllowlist(readFileSync(sitePath, 'utf8'));
  }
  if (!allow.found) {
    metaWarnings.push(
      '会社の連絡先を読み取れなかったので、除外せずに全件を警告します。`src/lib/site.ts` の `company.contacts[].tel` と `company.email` を確かめてください。',
    );
  }

  const diff = execFileSync(
    'git',
    ['diff', '-U0', '--no-renames', `${BASE_SHA}...${HEAD_SHA}`],
    { encoding: 'utf8', cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
  );
  const added = parseAddedLines(diff);
  const warnings = collectPiiWarnings({ added, allow });

  let summary = `## 個人情報らしき文字列（警告のみ）\n\n`;
  summary +=
    '画像や PDF の中の文字は調べません。テキストファイルの追加行だけを対象にします。\n\n';

  for (const w of metaWarnings) {
    console.log(`::warning::${w}`);
    summary += `- ${w}\n`;
  }

  if (warnings.length === 0 && metaWarnings.length === 0) {
    summary += '追加行に、警告対象の電話番号・メールアドレスはありませんでした。\n';
    console.log(summary);
    writeSummary(summary);
    process.exit(0);
  }

  if (warnings.length) {
    summary += `警告：${warnings.length} 件（このチェックでは失敗しません）\n\n`;
    for (const w of warnings) {
      console.log(`::warning file=${w.file},line=${w.line}::${w.message}`);
      summary += `- \`${w.file}:${w.line}\` ${w.message}\n`;
    }
    summary += '\n';
  } else if (metaWarnings.length) {
    summary += '追加行の電話番号・メールの警告はありませんでした。\n';
  }

  console.log(summary);
  writeSummary(summary);
  process.exit(0);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main();
