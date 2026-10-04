// 変更したファイルを区分 A・B・C に分ける。設計書 15章「作業の区分」と CODEOWNERS に合わせる
// 区分 B の場所にあっても、個人情報や公開設定に関わるものは区分 C にする（CODEOWNERS でも大久保の持ち物）
const SENSITIVE = [
  'src/pages/privacy.astro',        // プライバシーポリシーの画面
  'src/pages/recruit/entry.astro',  // エントリーフォーム（応募者の個人情報、同意文）
  'src/layouts/BaseLayout.astro',   // 全ページの head（アクセス解析、noindex、canonical、読み込むスクリプト）
];
export function classify(file) {
  if (SENSITIVE.includes(file)) return 'C';
  if (/^src\/content\/news\//.test(file)) return 'A';
  if (/^src\/assets\/images\//.test(file)) return 'A';
  if (/^public\/images\//.test(file)) return 'A';
  if (/^src\/(pages|components|layouts|styles)\//.test(file)) return 'B';
  return 'C';
}
export const LABEL = { A: '区分 A（内容の更新）', B: '区分 B（見た目と構成）', C: '区分 C（大久保だけが変える）' };
