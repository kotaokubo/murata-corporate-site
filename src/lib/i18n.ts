// 言語ごとの共通文言と、訳ありページの判定。区分 C

export type Lang = 'ja' | 'en' | 'zh';

export const langs: Lang[] = ['ja', 'en', 'zh'];

/** 今回までに訳があるページ（パスは末尾 /。トップは /） */
export const translatedPages: readonly string[] = ['/'];

/** 将来訳す5ページ（ナビの言語切り替え・リンク方針の前提） */
export const translatablePaths: readonly string[] = [
  '/',
  '/company/',
  '/history/',
  '/business/',
  '/partners/',
];

export const htmlLang: Record<Lang, string> = {
  ja: 'ja',
  en: 'en',
  zh: 'zh-Hans',
};

export const hreflangCode: Record<Lang, string> = {
  ja: 'ja',
  en: 'en',
  zh: 'zh-Hans',
};

export const ogLocale: Record<Lang, string> = {
  ja: 'ja_JP',
  en: 'en_US',
  zh: 'zh_CN',
};

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  ja: {
    siteName: '村田宝飾',
    companyName: '村田宝飾株式会社',
    companyNameEn: 'MURATA JEWELRY',
    titleSeparator: '｜',
    contactBranchMatsuyama: '松山支店',
    contactBranchTokyo: '東京支店',
    contactMail: 'メール',
    contactMailSp: 'メールアドレス',
    contactTitle: 'お問い合わせ',
    contactLeadPc: 'ご質問・ご相談はお電話またはメールにてお問い合わせください。',
    contactLeadSp: 'ご質問・ご相談はお電話またはメールにてお気軽にお問い合わせください。',
    headerContact: 'お問い合わせ',
    navGlobal: 'グローバルナビゲーション',
    navFooter: 'フッターナビゲーション',
    menuOpen: 'メニューを開く',
    menuClose: 'メニューを閉じる',
    menuLabel: 'メニュー',
    mailInquiry: 'メールで問い合わせ',
    langLabel: '言語',
    langJa: '日本語',
    langEn: 'English',
    langZh: '中文',
    japaneseOnlySuffix: '',
    navAbout: '村田宝飾について',
    navBusiness: '事業内容',
    navShop: 'オンラインショップ',
    navNews: 'お知らせ',
    navRecruit: '採用情報',
    footerCompany: '会社概要',
    footerShop: 'オンラインショップ',
    footerRecruit: '採用情報',
    footerFaq: 'FAQ',
    footerContact: 'お問い合わせ',
    footerPartners: '新規取引をご希望の方',
    footerPrivacy: 'プライバシーポリシー',
    footerBusiness: '事業内容',
    footerNews: 'お知らせ',
    heroAria: 'メインビジュアル',
    heroAlt:
      '人が輝く　世界で翔く　MURATA JEWELRY　星空を背景にした蝶と星のダイヤモンドのネックレス',
    altConcept1: '角形のサファイアのペンダントとダイヤのリング',
    altConcept2: 'ターコイズの猫と肉球のリングとチェーン',
    altAbout: '色石とダイヤの指輪とペンダント、パールとオニキスのネックレスを並べた写真',
    altOnlineShop: '星と蝶のダイヤのネックレスと「The Jewelry Concierge」の文字',
    draftBadge: '下書き',
    notFoundTitle: 'ページが見つかりません',
    notFoundDescription: 'お探しのページは見つかりませんでした。',
    notFoundBody: 'お探しのページは移動または削除された可能性があります。',
    notFoundLink: 'トップページへ',
  },
  en: {
    siteName: 'Murata Jewelry',
    companyName: 'Murata Jewelry Co., Ltd.',
    companyNameEn: 'MURATA JEWELRY',
    titleSeparator: ' | ',
    contactBranchMatsuyama: 'Matsuyama Branch',
    contactBranchTokyo: 'Tokyo Branch',
    contactMail: 'Email',
    contactMailSp: 'Email',
    contactTitle: 'Contact',
    contactLeadPc: 'Please contact us by phone or email with any questions or inquiries.',
    contactLeadSp: 'Please feel free to contact us by phone or email with any questions or inquiries.',
    headerContact: 'Contact',
    navGlobal: 'Global navigation',
    navFooter: 'Footer navigation',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    menuLabel: 'Menu',
    mailInquiry: 'Email us',
    langLabel: 'Language',
    langJa: '日本語',
    langEn: 'English',
    langZh: '中文',
    japaneseOnlySuffix: ' (Japanese)',
    navAbout: 'About Us',
    navBusiness: 'Our Business',
    navShop: 'Online Shop',
    navNews: 'News & Topics',
    navRecruit: 'Recruit',
    footerCompany: 'Company Overview',
    footerShop: 'Online Shop',
    footerRecruit: 'Recruit',
    footerFaq: 'FAQ',
    footerContact: 'Contact',
    footerPartners: 'New Business Inquiries',
    footerPrivacy: 'Privacy Policy',
    footerBusiness: 'Our Business',
    footerNews: 'News & Topics',
    heroAria: 'Main visual',
    heroAlt:
      'People shine, soar in the world. MURATA JEWELRY. A butterfly and star diamond necklace against a starry sky',
    altConcept1: 'Square sapphire pendant and diamond ring',
    altConcept2: 'Turquoise cat and paw-print rings with a chain',
    altAbout: 'Colored-stone and diamond rings and pendants with pearl and onyx necklaces',
    altOnlineShop: 'Star and butterfly diamond necklace with the words “The Jewelry Concierge”',
    draftBadge: 'Draft',
    notFoundTitle: 'Page not found',
    notFoundDescription: 'The page you are looking for could not be found.',
    notFoundBody: 'The page you are looking for may have been moved or deleted.',
    notFoundLink: 'Back to top',
  },
  zh: {
    siteName: '村田宝饰',
    companyName: '村田宝饰株式会社',
    companyNameEn: 'MURATA JEWELRY',
    titleSeparator: '｜',
    contactBranchMatsuyama: '松山支店',
    contactBranchTokyo: '东京支店',
    contactMail: '邮件',
    contactMailSp: '电子邮箱',
    contactTitle: '联系我们',
    contactLeadPc: '如有疑问或咨询，请通过电话或邮件与我们联系。',
    contactLeadSp: '如有疑问或咨询，欢迎通过电话或邮件随时与我们联系。',
    headerContact: '联系我们',
    navGlobal: '全站导航',
    navFooter: '页脚导航',
    menuOpen: '打开菜单',
    menuClose: '关闭菜单',
    menuLabel: '菜单',
    mailInquiry: '邮件咨询',
    langLabel: '语言',
    langJa: '日本語',
    langEn: 'English',
    langZh: '中文',
    japaneseOnlySuffix: ' (日文)',
    navAbout: '关于村田宝饰',
    navBusiness: '业务内容',
    navShop: '网上商店',
    navNews: '通知',
    navRecruit: '招聘信息',
    footerCompany: '公司概要',
    footerShop: '网上商店',
    footerRecruit: '招聘信息',
    footerFaq: 'FAQ',
    footerContact: '联系我们',
    footerPartners: '希望开展新交易的客户',
    footerPrivacy: '隐私政策',
    footerBusiness: '业务内容',
    footerNews: '通知',
    heroAria: '主视觉',
    heroAlt: '人因闪耀而辉映世界 MURATA JEWELRY 星空背景下的蝴蝶与星星钻石项链',
    altConcept1: '方形蓝宝石吊坠与钻石戒指',
    altConcept2: '绿松石猫咪与肉垫戒指及链条',
    altAbout: '彩色宝石与钻石戒指、吊坠，以及珍珠与玛瑙项链的陈列',
    altOnlineShop: '星星与蝴蝶钻石项链及“The Jewelry Concierge”字样',
    draftBadge: '草稿',
    notFoundTitle: '找不到页面',
    notFoundDescription: '找不到您要访问的页面。',
    notFoundBody: '您要访问的页面可能已移动或删除。',
    notFoundLink: '返回首页',
  },
};

export function t(lang: Lang, key: string): string {
  const value = dictionaries[lang][key] ?? dictionaries.ja[key];
  if (value === undefined) {
    throw new Error(`i18n key not found: ${key}`);
  }
  return value;
}

/** パスを正規化（クエリ・ハッシュを除き、トップ以外は末尾 /） */
export function normalizePath(pathname: string): string {
  const bare = pathname.split('?')[0]?.split('#')[0] ?? '/';
  if (bare === '' || bare === '/') return '/';
  return bare.endsWith('/') ? bare : `${bare}/`;
}

/** /en/... や /zh/... を除いたページキー（例: /en/company/ → /company/） */
export function pageKeyFromPath(pathname: string): string {
  const path = normalizePath(pathname);
  if (path === '/en/' || path === '/zh/') return '/';
  if (path.startsWith('/en/')) return path.slice(3);
  if (path.startsWith('/zh/')) return path.slice(3);
  return path;
}

export function langFromPath(pathname: string): Lang {
  const path = normalizePath(pathname);
  if (path === '/en/' || path.startsWith('/en/')) return 'en';
  if (path === '/zh/' || path.startsWith('/zh/')) return 'zh';
  return 'ja';
}

export function isTranslatedPage(pageKey: string): boolean {
  return translatedPages.includes(normalizePath(pageKey));
}

/** 言語プレフィックス付きのパス（defaultLocale はプレフィックスなし） */
export function localizedPath(pageKey: string, lang: Lang): string {
  const key = normalizePath(pageKey);
  if (lang === 'ja') return key;
  if (key === '/') return `/${lang}/`;
  return `/${lang}${key}`;
}

/**
 * ナビ・フッター用のリンク先。
 * 訳があるページはその言語の URL、無いページ（または今回未訳）は日本語 URL。
 */
export function hrefForLang(pageKey: string, lang: Lang): string {
  const key = normalizePath(pageKey);
  if (lang === 'ja') return key;
  if (isTranslatedPage(key)) return localizedPath(key, lang);
  return key;
}

/** 訳が無いページへ英語・中国語から張るときの接尾辞 */
export function untranslatedSuffix(lang: Lang): string {
  if (lang === 'ja') return '';
  return t(lang, 'japaneseOnlySuffix');
}

export function labelWithUntranslatedSuffix(label: string, pageKey: string, lang: Lang): string {
  if (lang === 'ja' || isTranslatedPage(pageKey)) return label;
  return `${label}${untranslatedSuffix(lang)}`;
}

/**
 * 言語切り替えの行き先。
 * いまのページに訳があれば同じページの別言語、無ければその言語のトップ。
 */
export function languageSwitchHref(currentPathname: string, targetLang: Lang): string {
  const key = pageKeyFromPath(currentPathname);
  if (isTranslatedPage(key)) return localizedPath(key, targetLang);
  return localizedPath('/', targetLang);
}

export function homeEntryId(lang: Lang): string {
  return lang === 'ja' ? 'home' : `${lang}/home`;
}

export function buildFullTitle(title: string, lang: Lang): string {
  const siteName = t(lang, 'siteName');
  if (title === siteName) return title;
  return `${title}${t(lang, 'titleSeparator')}${siteName}`;
}

export type Alternate = { lang: Lang; href: string };

/** トップなど訳ありページの alternate 一覧（絶対 URL） */
export function homeAlternates(site: URL | string): Alternate[] {
  const base = typeof site === 'string' ? site : site.href;
  const origin = base.replace(/\/$/, '');
  return [
    { lang: 'ja', href: `${origin}/` },
    { lang: 'en', href: `${origin}/en/` },
    { lang: 'zh', href: `${origin}/zh/` },
  ];
}
