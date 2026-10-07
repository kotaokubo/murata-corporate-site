// サイト全体で使う設定。区分 C（大久保と、許可したデザイナーが変える）

/**
 * 本番向けのビルドかどうか。
 * Cloudflare Pages はビルド時に CF_PAGES_BRANCH にブランチ名を入れる。
 * 手元のテストで本番と同じ出力を確かめるときは、SITE_ENV=production を渡す。
 */
export const isProduction =
  process.env.CF_PAGES_BRANCH === 'main' || process.env.SITE_ENV === 'production';

/** GA4 の測定 ID。本番のビルドでだけ読み込む。未設定なら読み込まない */
export const ga4Id = process.env.PUBLIC_GA4_ID ?? '';

export const company = {
  name: '村田宝飾',
  nameEn: 'MURATA JEWELRY',
  // 【要確認】Figma の表示に合わせた仮の値。公開前に村田宝飾に確かめる
  contacts: [
    { label: '松山支店', tel: '089-941-4135' },
    { label: '東京支店', tel: '03-5807-4345' },
  ],
  email: 'info@murata-jewelry.co.jp',
};

// 【要確認】採用の届け先。村田宝飾に確かめる
export const recruitEmail = company.email;

export const nav = [
  { href: '/company/', label: '村田宝飾について', en: 'About Us' },
  { href: '/business/', label: '事業内容', en: 'Our Business' },
  // 【要確認】TJC の URL。HTTPS 化（DSplit 作業）が済んだら https に変える
  { href: 'http://mns.murata-ibrain.jp/', label: 'オンラインショップ', en: 'Online Shop', external: true },
  { href: '/news/', label: 'お知らせ', en: 'News & Topics' },
  { href: '/recruit/', label: '採用情報', en: 'Recruit' },
];

// PC フッター（Figma の並び）
export const footerNavPc = [
  { href: '/company/', label: '会社概要' },
  // 【要確認】TJC の URL。HTTPS 化（DSplit 作業）が済んだら https に変える
  { href: 'http://mns.murata-ibrain.jp/', label: 'オンラインショップ', external: true },
  { href: '/recruit/', label: '採用情報' },
  { href: '/#faq', label: 'FAQ' },
  { href: '#contact', label: 'お問い合わせ' },
  { href: '/partners/', label: '新規取引をご希望の方' },
  { href: '/privacy/', label: 'プライバシーポリシー' },
];

// SP フッター（Figma の並び）
export const footerNavSp = [
  { href: '/company/', label: '会社概要' },
  { href: '/business/', label: '事業内容' },
  // 【要確認】TJC の URL。HTTPS 化（DSplit 作業）が済んだら https に変える
  { href: 'http://mns.murata-ibrain.jp/', label: 'オンラインショップ', external: true },
  { href: '/news/', label: 'お知らせ' },
  { href: '/recruit/', label: '採用情報' },
  { href: '/partners/', label: '新規取引をご希望の方' },
  { href: '/#faq', label: 'FAQ' },
  { href: '#contact', label: 'お問い合わせ' },
  { href: '/privacy/', label: 'プライバシーポリシー' },
];

export const sns = [
  { name: 'Instagram', href: 'https://www.instagram.com/muratajewelry/' },
  { name: 'Facebook', href: 'https://www.facebook.com/muratajewelry/' },
];
