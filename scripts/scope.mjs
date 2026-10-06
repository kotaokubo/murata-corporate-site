// 変更したファイルを区分 A・B・C に分ける。設計書 15章「作業の区分」と CODEOWNERS に合わせる
// 区分 B の場所にあっても、個人情報や公開設定に関わるものは区分 C にする（CODEOWNERS でも大久保の持ち物）
const SENSITIVE = [
  'src/pages/privacy.astro',           // プライバシーポリシーの画面
  'src/pages/recruit/entry.astro',     // エントリーフォーム（応募者の個人情報、同意文）
  'src/content/pages/entry.yml',       // エントリーフォームの文言（個人情報の同意文、応募案内）
  'src/layouts/BaseLayout.astro',      // 全ページの head（アクセス解析、noindex、canonical、読み込むスクリプト）
];
export function classify(file) {
  if (SENSITIVE.includes(file)) return 'C';
  if (/^src\/content\/news\//.test(file)) return 'A';
  if (/^src\/content\/pages\//.test(file)) return 'A';
  if (/^src\/assets\/images\//.test(file)) return 'A';
  if (/^public\/images\//.test(file)) return 'A';
  if (/^src\/(pages|components|layouts|styles)\//.test(file)) return 'B';
  return 'C';
}
export const LABEL = { A: '区分 A（内容の更新）', B: '区分 B（見た目と構成）', C: '区分 C（大久保と、許可したデザイナーが変える）' };

// 区分 C を変えてよい人の GitHub のユーザー名。大久保と、区分 C を任せるデザイナーを書く。事務の方は書かない（区分 A と B まで）。この一覧の変更も区分 C なので、一覧に載っている人の PR で足す。guard.yml は main 側のこのファイルを使うので、PR の中で一覧を書き換えても、その PR の判定には効かない
export const C_ALLOWED = ['kotaokubo'];

// 区分 C を変えてよい人か。許可リストに載っているときだけ可
export function canChangeC(login) {
  if (!login) return false;
  return C_ALLOWED.includes(login);
}
