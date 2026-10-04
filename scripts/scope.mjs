// 変更したファイルを区分 A・B・C に分ける。設計書 15章「作業の区分」と CODEOWNERS に合わせる
export function classify(file) {
  if (/^src\/content\/news\//.test(file)) return 'A';
  if (/^src\/assets\/images\//.test(file)) return 'A';
  if (/^public\/images\//.test(file)) return 'A';
  if (/^src\/(pages|components|layouts|styles)\//.test(file)) return 'B';
  return 'C';
}
export const LABEL = { A: '区分 A（内容の更新）', B: '区分 B（見た目と構成）', C: '区分 C（大久保だけが変える）' };
